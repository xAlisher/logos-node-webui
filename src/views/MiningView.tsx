// MiningView — Tab "Mining" (section 4). Faithful web replica of the official
// MiningView.qml: Proof-of-Work mining & claiming — the only place an operator
// can see whether claiming is actually working (tickets Ready to claim, claims
// Awaiting payout, settled Mining Rewards), plus auto-claim arming, manual claim,
// and claim history.
//
// Data (reads): GET /pow/status (mining/rewards flags + auto-claim block),
//   GET /pow/rewards/claimable (tickets + per-ticket slots-until-expiry),
//   GET /time/info (slot→date for history).
// Mutations (MUTATING — each gated behind an explicit confirm dialog):
//   PUT /pow/auto-claim/start|stop (arm/disarm — a RUNTIME override that a node
//   restart undoes; it is NOT written to the config, unlike the Fund step's
//   pow-section write), POST /pow/claim (manual claim).
//
// Spec: docs/spec/ui-inventory.md §5, docs/spec/api-map.md (MiningView row),
// docs/spec/parity-checklist.json view "Mining".

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getPowRewardsClaimable,
  getPowStatus,
  getTimeInfo,
  powClaim,
  startAutoClaim,
  stopAutoClaim,
  type PowRewardsClaimable,
  type PowStatus,
  type TimeInfo,
} from "../api/endpoints";
import { Button, Card, Modal, Select, Switch, Toast } from "../ds";
import { NodeOffNotice } from "../shell/NodeOffNotice";
import { registerParity } from "../test/parity";
import { NO_CAP_THRESHOLD, type PowAccount } from "./onboardingTypes";
import type { NodeViewProps } from "./types";

import "./MiningView.css";

// Parity ids this view OWNS (implements + tests). Source of truth:
// parity-checklist.json entries with "view": "Mining".
registerParity([
  "mining-node-off-banner",
  "mining-header",
  "mining-card-ready-to-claim",
  "mining-card-awaiting-payout",
  "mining-card-mining-rewards",
  "mining-card-info-buttons",
  "mining-claimable-error",
  "mining-into-nothing",
  "mining-no-rewards-chain",
  "mining-autoclaim-switch",
  "mining-autoclaim-gating",
  "mining-autoclaim-hint",
  "mining-autoclaim-tick",
  "mining-claim-targets",
  "mining-manual-account-combo",
  "mining-manual-clear",
  "mining-manual-claim",
  "mining-claim-busy",
  "mining-claim-result",
  "mining-history-filter",
  "mining-history-list",
  "mining-history-empty",
  "mining-history-open-explorer",
]);

/** A session-local claim-history entry (the QML `claimsModel` has no backing GET). */
export interface MiningClaimRecord {
  id: string;
  /** Lepta value of the claim once settled ("" while unknown). */
  valueLepta?: string;
  /** Slot the claim settled at (turned into a date via /time/info). */
  slot?: number;
  /** Payee account address. */
  payee?: string;
  /** Tx hash — opens as a Tx in Explorer. */
  txHash?: string;
  /** Block id — opens as a Block in Explorer. */
  blockId?: string;
  /** false once the claim is believed to have reached finality. */
  pending: boolean;
}

export interface MiningViewProps extends NodeViewProps {
  /**
   * Chain-online signal from the shell (cryptarchia online). The PoW service
   * answers nothing until the chain is online, so the auto-claim control can
   * only be read/changed after then. Defaults to "online once /pow/status
   * answered" — pass explicitly to surface a pow_status-less module (chain up,
   * state unknown).
   */
  chainOnline?: boolean;
  /** Wallet-key accounts the manual-claim combo + target labels read. */
  accounts?: PowAccount[];
  /** Settled mining rewards (lepta) from the shell's dashboard model. */
  powRewardsLepta?: string;
  /** Manual claims sent from here but not yet seen on chain (shell model). */
  submittedCount?: number;
  /** Claims in flight / settling (shell model). */
  pendingCount?: number;
  /** Claim history; `null` = still loading (no model resolved yet). */
  claims?: MiningClaimRecord[] | null;
  /** Programmatic "Open in Explorer": jumps to the Explorer tab and searches `id`. */
  onOpenInExplorer?: (id: string) => void;
}

const NO_CAP_NUM = Number(NO_CAP_THRESHOLD);

function isNoCap(threshold: number): boolean {
  // u64::MAX is lossy as a JS number; treat anything near it as "no cap".
  return threshold >= NO_CAP_NUM * 0.999;
}

function short(hex: string): string {
  return hex.length > 16 ? `${hex.slice(0, 8)}…${hex.slice(-6)}` : hex;
}

/** Compact lepta formatter (mirrors Units.compact closely enough for parity). */
function compact(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  const tiers: ReadonlyArray<readonly [number, string]> = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [factor, suffix] of tiers) {
    if (Math.abs(n) >= factor) {
      return `${(n / factor).toFixed(2).replace(/\.?0+$/, "")}${suffix}`;
    }
  }
  return n.toLocaleString("en-US");
}

/** One auto-claim target row, derived from /pow/status. */
interface TargetRow {
  address: string;
  label: string;
  thresholdLepta: number;
  balanceLepta: number;
  reached: boolean;
  noCap: boolean;
}

type Pending =
  | { kind: "autoclaim"; enable: boolean }
  | { kind: "claim"; address: string }
  | null;

export function MiningView({
  nodeOffReason,
  nodeOffSeverity,
  chainOnline,
  accounts = [],
  powRewardsLepta = "",
  submittedCount: submittedProp = 0,
  pendingCount = 0,
  claims = [],
  onOpenInExplorer,
}: MiningViewProps) {
  const nodeRunning = nodeOffReason === "";

  const [status, setStatus] = useState<PowStatus | null>(null);
  const [claimable, setClaimable] = useState<PowRewardsClaimable | null>(null);
  const [claimableError, setClaimableError] = useState<string>("");
  const [time, setTime] = useState<TimeInfo | null>(null);

  // Manual claims sent this session that have not been seen on chain yet.
  const [localSubmitted, setLocalSubmitted] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimResult, setClaimResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [autoClaimBusy, setAutoClaimBusy] = useState(false);

  const [pendingOnly, setPendingOnly] = useState(false);
  const [confirm, setConfirm] = useState<Pending>(null);
  const [infoTopic, setInfoTopic] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!nodeRunning) return;
    try {
      const s = await getPowStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    }
  }, [nodeRunning]);

  const loadClaimable = useCallback(async () => {
    if (!nodeRunning) return;
    setClaimableError("");
    try {
      const c = await getPowRewardsClaimable();
      setClaimable(c);
    } catch (err) {
      setClaimable(null);
      setClaimableError(err instanceof Error ? err.message : "The claimable-tickets read failed.");
    }
  }, [nodeRunning]);

  useEffect(() => {
    if (!nodeRunning) return;
    void loadStatus();
    void loadClaimable();
    void getTimeInfo()
      .then(setTime)
      .catch(() => setTime(null));
  }, [nodeRunning, loadStatus, loadClaimable]);

  // ---- Derived state (ported from MiningView.qml's QtObject `d`) ----------
  const powStatusKnown = status !== null;
  const online = chainOnline ?? powStatusKnown;
  const miningActive = status?.is_mining ?? false;
  const powRewardsEnabled = status?.are_rewards_enabled ?? false;
  const autoClaimArmed = status?.auto_claim.is_armed ?? false;
  const autoClaimTick = status?.auto_claim.tick.value ?? 0;
  const autoClaimTickUnit = status?.auto_claim.tick.unit ?? "";

  const targets = useMemo<TargetRow[]>(() => {
    const rows = status?.auto_claim.targets ?? [];
    return rows.map((t) => {
      const noCap = isNoCap(t.threshold);
      const label =
        accounts.find((a) => a.address === t.public_key)?.label ?? "";
      return {
        address: t.public_key,
        label,
        thresholdLepta: t.threshold,
        balanceLepta: t.balance,
        reached: !noCap && t.balance >= t.threshold,
        noCap,
      };
    });
  }, [status, accounts]);

  // Off because every target is done, rather than off because someone said so.
  const autoClaimSelfDisarmed =
    powStatusKnown &&
    !autoClaimArmed &&
    targets.length > 0 &&
    targets.every((t) => t.reached);

  const claimableLoaded = claimable !== null;
  const claimableTickets = claimable?.claimable_tickets ?? 0;
  const { soonestExpirySlots, soonestExpiryCount } = useMemo(() => {
    const slots = claimable?.slots_until_expiry ?? [];
    if (slots.length === 0) return { soonestExpirySlots: -1, soonestExpiryCount: 0 };
    const min = Math.min(...slots);
    return {
      soonestExpirySlots: min,
      soonestExpiryCount: slots.filter((s) => s === min).length,
    };
  }, [claimable]);

  const expiryCaption =
    claimableLoaded && soonestExpirySlots >= 0
      ? `${soonestExpiryCount} expiring in ${soonestExpirySlots} slots`
      : "";

  const submittedCount = submittedProp + localSubmitted;
  const awaitingPayout = submittedCount + pendingCount;
  const awaitingPayoutCaption =
    submittedCount > 0 && pendingCount > 0
      ? `${submittedCount} sent · ${pendingCount} settling`
      : pendingCount > 0
        ? `${pendingCount} settling`
        : submittedCount > 0
          ? `${submittedCount} sent, not seen yet`
          : "";

  // One line under the switch; the first that applies wins (QML order).
  const autoClaimHint = (() => {
    if (!nodeRunning) return "";
    if (!powStatusKnown && !online) return "Available once the node is online.";
    if (!powStatusKnown)
      return "This node's module does not report auto-claim's state, so the switch shows what was last asked for.";
    if (targets.length === 0)
      return "No auto-claim targets configured — add them under pow.auto_claim.targets in the config, then restart the node.";
    if (autoClaimSelfDisarmed)
      return "Every target has reached the balance it stops at, so the node turns auto-claim off again as soon as it is switched on. Raise a threshold in the config's pow section to resume.";
    if (autoClaimArmed && !miningActive)
      return "On, but there is nothing to claim until mining is running.";
    return "";
  })();

  const miningIntoNothing =
    powStatusKnown && miningActive && !autoClaimArmed && claimableTickets > 0;

  // With no target the node refuses to arm and the switch would snap back, so it
  // can only be turned off then. A module without pow_status reports no targets
  // at all, which is not the same as having none.
  const autoClaimEnabled =
    nodeRunning &&
    (online || powStatusKnown) &&
    (autoClaimArmed || !powStatusKnown || targets.length > 0);

  const tickText =
    autoClaimTick > 0
      ? autoClaimTickUnit === "slots"
        ? `every ${autoClaimTick} slot${autoClaimTick === 1 ? "" : "s"}`
        : `every ${autoClaimTick} second${autoClaimTick === 1 ? "" : "s"}`
      : "";

  // ---- Actions (all MUTATING — fired only after the confirm dialog) -------
  const applyAutoClaim = useCallback(
    async (enable: boolean) => {
      setConfirm(null);
      setAutoClaimBusy(true);
      try {
        if (enable) await startAutoClaim();
        else await stopAutoClaim();
        await loadStatus();
      } catch (err) {
        setClaimResult({
          ok: false,
          text: err instanceof Error ? err.message : "Could not change auto-claim.",
        });
      } finally {
        setAutoClaimBusy(false);
      }
    },
    [loadStatus],
  );

  const doClaim = useCallback(
    async (address: string) => {
      setConfirm(null);
      setClaimBusy(true);
      setClaimResult(null);
      try {
        const res = await powClaim(address ? { claim_address: address } : undefined);
        setLocalSubmitted((n) => n + 1);
        setClaimResult({
          ok: true,
          text: res?.tx_hash ? `Claim submitted: ${short(res.tx_hash)}` : "Claim submitted.",
        });
        void loadClaimable();
      } catch (err) {
        setClaimResult({
          ok: false,
          text: err instanceof Error ? err.message : "Claim failed. The node rejected the request.",
        });
      } finally {
        setClaimBusy(false);
      }
    },
    [loadClaimable],
  );

  const accountOptions = accounts.map((a) => ({
    label: a.label && a.label.length > 0 ? a.label : short(a.address),
    value: a.address,
  }));

  const shownClaims = pendingOnly ? (claims ?? []).filter((c) => c.pending) : claims ?? [];
  const historyLoading = claims === null;
  const historyEmpty = !historyLoading && shownClaims.length === 0;

  const canClaim = nodeRunning && !claimBusy && claimableTickets > 0;
  const nodeOff = !nodeRunning;

  const slotDate = (slot?: number): string => {
    if (slot === undefined || !time) return "";
    const ms = time.genesis_time_unix_ms + slot * time.slot_duration_ms;
    return new Date(ms).toLocaleString("en-US");
  };

  return (
    <section className="view-stub mining-view" data-testid="view-mining">
      {/* mining-node-off-banner */}
      <NodeOffNotice reason={nodeOffReason} severity={nodeOffSeverity} />

      {/* mining-header */}
      <header className="mining-header">
        <h2 className="mining-header__title">Tickets</h2>
        <p className="mining-header__subtitle">
          Mining searches for tickets; unclaimed tickets expire.
        </p>
        <button
          type="button"
          className="mining-info"
          aria-label="About mining"
          data-testid="mining-info-overview"
          onClick={() => setInfoTopic("mining")}
        >
          i
        </button>
      </header>

      {/* mining-card-* + mining-card-info-buttons */}
      <div className="mining-cards">
        <Card className="mining-card" data-testid="mining-card-ready-to-claim">
          <button
            type="button"
            className="mining-card__info"
            aria-label="About ready-to-claim tickets"
            data-testid="mining-info-ready"
            onClick={() => setInfoTopic("readyToClaim")}
          >
            i
          </button>
          <span className="mining-card__value" data-testid="mining-ready-value">
            {claimableLoaded ? String(claimableTickets) : "—"}
          </span>
          <span className="mining-card__label">Ready to claim</span>
          {expiryCaption && <span className="mining-card__sub">{expiryCaption}</span>}
        </Card>

        <Card className="mining-card" data-testid="mining-card-awaiting-payout">
          <button
            type="button"
            className="mining-card__info"
            aria-label="About awaiting payout"
            data-testid="mining-info-awaiting"
            onClick={() => setInfoTopic("awaitingPayout")}
          >
            i
          </button>
          <span className="mining-card__value" data-testid="mining-awaiting-value">
            {String(awaitingPayout)}
          </span>
          <span className="mining-card__label">Awaiting payout</span>
          {awaitingPayoutCaption && (
            <span className="mining-card__sub">{awaitingPayoutCaption}</span>
          )}
        </Card>

        <Card className="mining-card" data-testid="mining-card-mining-rewards">
          <button
            type="button"
            className="mining-card__info"
            aria-label="About mining rewards"
            data-testid="mining-info-rewards"
            onClick={() => setInfoTopic("miningRewards")}
          >
            i
          </button>
          <span className="mining-card__value" data-testid="mining-rewards-value">
            {compact(powRewardsLepta.length > 0 ? powRewardsLepta : "0")}
          </span>
          <span className="mining-card__label">Mining Rewards</span>
        </Card>
      </div>

      {/* mining-claimable-error */}
      {claimableError && !nodeOff && (
        <Toast
          variant="warning"
          message={`Can't read claimable tickets: ${claimableError}`}
          onDismiss={() => setClaimableError("")}
        />
      )}

      {/* mining-into-nothing */}
      {miningIntoNothing && (
        <div data-testid="mining-into-nothing-notice">
          <Toast
            variant="warning"
            message={
              autoClaimSelfDisarmed
                ? "Auto-claim is off and every claim target has already reached the balance it stops at, so switching it on would stop it again at once. Tickets expire unclaimed until a threshold is raised or you claim by hand below."
                : "Mining is on and auto-claim is off. Tickets expire unclaimed until auto-claim is switched on below or you claim by hand."
            }
          />
        </div>
      )}

      {/* mining-no-rewards-chain */}
      {powStatusKnown && !powRewardsEnabled && (
        <div data-testid="mining-no-rewards-notice">
          <Toast
            variant="info"
            message="This chain pays no mining rewards. The node reports PoW rewards as disabled for this deployment, so mining here produces nothing to claim."
          />
        </div>
      )}

      {/* ---- Auto-claim ---- */}
      <section className="mining-section">
        <div className="mining-section__head">
          <h3 className="mining-section__title">Auto-claim</h3>
          <button
            type="button"
            className="mining-info"
            aria-label="About auto-claim"
            data-testid="mining-info-autoclaim"
            onClick={() => setInfoTopic("autoClaim")}
          >
            i
          </button>
          <span className="mining-section__spacer" />
          {/* mining-autoclaim-tick */}
          {tickText && (
            <span className="mining-tick" data-testid="mining-autoclaim-tick">
              {tickText}
            </span>
          )}
          {/* mining-autoclaim-switch + mining-autoclaim-gating */}
          <Switch
            checked={autoClaimArmed}
            disabled={!autoClaimEnabled || autoClaimBusy}
            onChange={(next) => setConfirm({ kind: "autoclaim", enable: next })}
            id="mining-autoclaim-switch"
          />
        </div>

        {/* mining-autoclaim-hint */}
        {autoClaimHint && (
          <p className="mining-hint" data-testid="mining-autoclaim-hint">
            {autoClaimHint}
          </p>
        )}
        <p className="mining-hint mining-hint--muted">
          Switching this on is a runtime override: a node restart turns it back to
          what the config asks for.
        </p>

        {/* mining-claim-targets */}
        {targets.length > 0 && (
          <ul className="mining-targets" data-testid="mining-claim-targets">
            {targets.map((t) => (
              <li className="mining-target" key={t.address} data-testid="mining-target-row">
                {t.label && <span className="mining-target__label">{t.label}</span>}
                <span className="mining-target__addr" title={t.address}>
                  {short(t.address)}
                </span>
                {t.reached && (
                  <span className="mining-badge" data-testid="mining-target-reached">
                    Threshold reached
                  </span>
                )}
                <span className="mining-target__balance">
                  {t.noCap
                    ? `${compact(t.balanceLepta)} · no cap`
                    : `${compact(t.balanceLepta)} / ${compact(t.thresholdLepta)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Manual claim ---- */}
      <section className="mining-section">
        <h3 className="mining-section__title">Manual claim</h3>
        <p className="mining-hint mining-hint--muted">
          Pays the tickets mined so far. Leave the account unset to let the node pay
          whichever claim target is furthest below its threshold — the same choice
          auto-claim makes.
        </p>
        <div className="mining-manual">
          {/* mining-manual-account-combo */}
          <Select
            className="mining-manual__combo"
            options={accountOptions}
            value={selectedAddress || undefined}
            placeholder="Let the node choose"
            disabled={!nodeRunning || claimBusy}
            onChange={setSelectedAddress}
            aria-label="Claim account"
          />
          {/* mining-manual-clear */}
          {selectedAddress && (
            <Button
              data-testid="mining-manual-clear"
              disabled={claimBusy}
              onClick={() => setSelectedAddress("")}
            >
              Clear
            </Button>
          )}
          {/* mining-manual-claim + mining-claim-busy */}
          <Button
            variant="primary"
            data-testid="mining-manual-claim"
            disabled={!canClaim}
            onClick={() => setConfirm({ kind: "claim", address: selectedAddress })}
          >
            {claimBusy ? "Claiming…" : "Claim"}
          </Button>
        </div>

        {/* mining-claim-result */}
        {claimResult && (
          <div className="mining-result" data-testid="mining-claim-result">
            <Toast
              variant={claimResult.ok ? "success" : "error"}
              message={claimResult.text}
              onDismiss={() => setClaimResult(null)}
            />
          </div>
        )}
      </section>

      {/* ---- Claim history ---- */}
      <section className="mining-section">
        <div className="mining-section__head">
          <h3 className="mining-section__title">History</h3>
          <span className="mining-section__spacer" />
          {/* mining-history-filter */}
          {(pendingCount > 0 || pendingOnly) && (
            <Switch
              checked={pendingOnly}
              onChange={setPendingOnly}
              label="Show only pending"
              id="mining-history-filter"
            />
          )}
        </div>

        {/* mining-history-list / mining-history-empty */}
        {historyLoading ? (
          <div className="mining-empty" data-testid="mining-history-empty">
            Loading…
          </div>
        ) : historyEmpty ? (
          <div className="mining-empty" data-testid="mining-history-empty">
            {pendingOnly
              ? "Nothing pending — every claim has reached finality."
              : "No claims recorded yet. Rewards appear here once a claim settles."}
          </div>
        ) : (
          <ul className="mining-history" data-testid="mining-history-list">
            {shownClaims.map((c) => (
              <li className="mining-claim" key={c.id} data-testid="mining-history-row">
                <div className="mining-claim__main">
                  <span className="mining-claim__value">
                    {c.valueLepta ? compact(c.valueLepta) : "—"}
                  </span>
                  <span className="mining-claim__meta">
                    {slotDate(c.slot) || (c.slot !== undefined ? `slot ${c.slot}` : "")}
                    {c.payee ? ` · ${short(c.payee)}` : ""}
                  </span>
                </div>
                <div className="mining-claim__links">
                  {/* mining-history-open-explorer */}
                  {c.txHash && (
                    <button
                      type="button"
                      className="mining-link"
                      data-testid="mining-history-tx-link"
                      onClick={() => onOpenInExplorer?.(c.txHash!)}
                    >
                      Tx {short(c.txHash)}
                    </button>
                  )}
                  {c.blockId && (
                    <button
                      type="button"
                      className="mining-link"
                      data-testid="mining-history-block-link"
                      onClick={() => onOpenInExplorer?.(c.blockId!)}
                    >
                      Block
                    </button>
                  )}
                </div>
                <span
                  className={`mining-badge ${c.pending ? "mining-badge--pending" : "mining-badge--landed"}`}
                >
                  {c.pending ? "Finalizing…" : "Settled"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Confirm dialog — the MUTATING auto-claim/claim calls are gated here. */}
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === "autoclaim"
            ? confirm.enable
              ? "Arm auto-claim?"
              : "Disarm auto-claim?"
            : "Submit manual claim?"
        }
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant="primary"
              data-testid="mining-confirm"
              onClick={() => {
                if (confirm?.kind === "autoclaim") void applyAutoClaim(confirm.enable);
                else if (confirm?.kind === "claim") void doClaim(confirm.address);
              }}
            >
              {confirm?.kind === "autoclaim"
                ? confirm.enable
                  ? "Arm"
                  : "Disarm"
                : "Claim"}
            </Button>
          </>
        }
      >
        <p className="mining-dialog__text">
          {confirm?.kind === "autoclaim"
            ? confirm.enable
              ? "The node will claim mined tickets for you into the configured targets. This is a runtime change and a restart undoes it."
              : "The node will stop claiming tickets automatically. Tickets keep accruing and can be claimed by hand."
            : "This submits a claim transaction for the tickets mined so far. This cannot be undone."}
        </p>
      </Modal>

      {/* Info dialog — opened by the header / card / auto-claim info buttons. */}
      <Modal
        open={infoTopic !== null}
        onClose={() => setInfoTopic(null)}
        title={INFO_TITLES[infoTopic ?? ""] ?? "Mining"}
        footer={<Button onClick={() => setInfoTopic(null)}>Close</Button>}
      >
        <div className="mining-dialog__section">
          <h4 className="mining-dialog__heading">What is it</h4>
          <p className="mining-dialog__text">{INFO_BODIES[infoTopic ?? ""] ?? ""}</p>
        </div>
      </Modal>
    </section>
  );
}

const INFO_TITLES: Record<string, string> = {
  mining: "Mining",
  readyToClaim: "Ready to claim",
  awaitingPayout: "Awaiting payout",
  miningRewards: "Mining Rewards",
  autoClaim: "Auto-claim",
};

const INFO_BODIES: Record<string, string> = {
  mining:
    "Proof-of-Work mining searches for tickets your node can redeem for rewards. These counters are the only place you can see whether claiming is working.",
  readyToClaim:
    "Tickets mined and ready to be claimed. Unclaimed tickets expire, so a climbing count with no payouts is the warning sign.",
  awaitingPayout: "Claims submitted but not yet seen on chain, plus claims still settling.",
  miningRewards: "Rewards that have settled on chain from claimed tickets.",
  autoClaim:
    "When armed, the node claims mined tickets for you on a timer into the configured targets. Arming here is a runtime override that a restart undoes.",
};
