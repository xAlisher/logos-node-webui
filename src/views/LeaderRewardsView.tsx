// LeaderRewardsView — Tab "Rewards" (section 1). Faithful web replica of the official
// LeaderRewardsView.qml: leader (block-proposal) reward vouchers — view, claim, and
// claim history.
//
// Data: GET /leader/claim/vouchers (tip, reward_amount, total_claimable, vouchers[]),
//       GET /leader/aged-notes (stake: count + total_value), GET /time/info (epoch).
// Mutation: POST /leader/claim (no body) — submits reward-claim txs for aged vouchers.
//   MUTATING: gated behind an explicit confirm dialog before it fires.
//
// Spec: docs/spec/ui-inventory.md §2 (+ §20 voucher dialog), docs/spec/api-map.md
// (LeaderRewardsView row), docs/spec/parity-checklist.json view "Rewards".

import { useCallback, useEffect, useState } from "react";

import {
  getLeaderAgedNotes,
  getLeaderClaimVouchers,
  getTimeInfo,
  leaderClaim,
  type LeaderAgedNotes,
  type LeaderClaimVouchers,
  type TimeInfo,
} from "../api/endpoints";
import { Button, Card, CopyButton, HashRow, Modal, Switch, Toast } from "../ds";
import { NodeOffNotice } from "../shell/NodeOffNotice";
import { registerParity } from "../test/parity";
import type { NodeViewProps } from "./types";

import "./LeaderRewardsView.css";

// Parity ids this view OWNS (implements + tests). Source of truth:
// parity-checklist.json entries with "view": "Rewards". The Voucher Dialog
// ("view": "Voucher Dialog") and Info Dialog ("view": "Info Dialog") content
// ids are owned by their own stubs — this view only owns the triggers.
registerParity([
  "rewards-node-off-banner",
  "rewards-vouchers-header",
  "rewards-claim-button",
  "rewards-card-ready-to-claim",
  "rewards-card-ready-clickable",
  "rewards-card-submitted",
  "rewards-info-buttons",
  "rewards-claim-result-notice",
  "rewards-history-filter",
  "rewards-history-list",
  "rewards-history-empty",
  "rewards-history-open-explorer",
  // The Voucher Detail Dialog (§20) lives here — this view builds it, so it owns
  // its ids (the dialog is opened by the clickable Ready-to-claim card above).
  "dialog-voucher-detail",
  "dialog-voucher-claim",
  "dialog-voucher-tip-copy",
]);

/** A session-local claim-history entry (the QML `claimsModel` has no backing GET). */
interface ClaimRecord {
  id: string;
  /** Vouchers redeemed by this claim. */
  voucherCount: number;
  /** tip (header id) the claim was computed against — opens as a Block in Explorer. */
  tip: string;
  /** Any tx hashes returned by POST /leader/claim — open as Tx in Explorer. */
  txHashes: string[];
  /** false until the claim is believed to have landed. */
  pending: boolean;
}

export interface LeaderRewardsViewProps extends NodeViewProps {
  /** Programmatic "Open in Explorer": jumps to the Explorer tab and searches `id`. */
  onOpenInExplorer?: (id: string) => void;
}

function short(hex: string): string {
  return hex.length > 16 ? `${hex.slice(0, 8)}…${hex.slice(-6)}` : hex;
}

function fmt(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US");
}

/** Pull any hash-like hex strings out of the opaque POST /leader/claim response. */
function extractHashes(res: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (v: unknown): void => {
    if (typeof v === "string") {
      if (/^[0-9a-fA-F]{32,}$/.test(v) && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    } else if (Array.isArray(v)) {
      v.forEach(visit);
    } else if (v && typeof v === "object") {
      Object.values(v as Record<string, unknown>).forEach(visit);
    }
  };
  visit(res);
  return out;
}

export function LeaderRewardsView({
  nodeOffReason,
  nodeOffSeverity,
  onOpenInExplorer,
}: LeaderRewardsViewProps) {
  const nodeOff = nodeOffReason !== "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [vouchers, setVouchers] = useState<LeaderClaimVouchers | null>(null);
  const [aged, setAged] = useState<LeaderAgedNotes | null>(null);
  const [time, setTime] = useState<TimeInfo | null>(null);

  const [history, setHistory] = useState<ClaimRecord[]>([]);
  const [pendingOnly, setPendingOnly] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [infoTopic, setInfoTopic] = useState<"ready" | "submitted" | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (nodeOff) return;
    setLoading(true);
    setError("");
    try {
      const [v, a, t] = await Promise.all([
        getLeaderClaimVouchers(),
        getLeaderAgedNotes(),
        getTimeInfo(),
      ]);
      setVouchers(v);
      setAged(a);
      setTime(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read reward vouchers.");
    } finally {
      setLoading(false);
    }
  }, [nodeOff]);

  useEffect(() => {
    void load();
  }, [load]);

  const voucherCount = vouchers?.vouchers.length ?? 0;
  const submittedCount = history.filter((h) => h.pending).reduce((n, h) => n + h.voucherCount, 0);
  const hasVouchers = voucherCount > 0;

  const doClaim = useCallback(async () => {
    setConfirmOpen(false);
    setVoucherDialogOpen(false);
    setClaiming(true);
    setResult(null);
    try {
      const res = await leaderClaim();
      const tip = vouchers?.tip ?? "";
      const txHashes = extractHashes(res);
      setHistory((prev) => [
        {
          id: `${Date.now()}`,
          voucherCount,
          tip,
          txHashes,
          pending: true,
        },
        ...prev,
      ]);
      setResult({ ok: true, text: `Claim submitted for ${voucherCount} voucher${voucherCount === 1 ? "" : "s"}.` });
      // Re-read: the claimed vouchers should drop out of the claimable set.
      void load();
    } catch (err) {
      setResult({
        ok: false,
        text: err instanceof Error ? err.message : "Claim failed. The node rejected the request.",
      });
    } finally {
      setClaiming(false);
    }
  }, [vouchers, voucherCount, load]);

  const shownHistory = pendingOnly ? history.filter((h) => h.pending) : history;

  const openInExplorer = (id: string) => {
    if (id) onOpenInExplorer?.(id);
  };

  return (
    <section className="view-stub lr-view" data-testid="view-leader-rewards">
      {/* rewards-node-off-banner */}
      <NodeOffNotice reason={nodeOffReason} severity={nodeOffSeverity} />

      {/* rewards-vouchers-header + rewards-claim-button */}
      <header className="lr-header">
        <div>
          <h2 className="lr-header__title">Vouchers</h2>
          <p className="lr-header__subtitle">One claim redeems one voucher.</p>
        </div>
        <Button
          variant="primary"
          data-testid="rewards-claim-button"
          disabled={nodeOff || !hasVouchers || claiming}
          onClick={() => setConfirmOpen(true)}
        >
          {claiming ? "Claiming…" : "Claim"}
        </Button>
      </header>

      {error && !nodeOff && (
        <Toast variant="error" message={error} onDismiss={() => setError("")} />
      )}

      {/* Stake (aged notes) — the eligible leader stake behind these vouchers. */}
      <Card className="lr-stake" data-testid="rewards-stake">
        <div className="lr-stake__head">
          <span className="lr-stake__label">Stake (aged notes)</span>
          <span className="lr-stake__value">
            {nodeOff || aged === null ? "—" : fmt(aged.total_value)}
          </span>
        </div>
        <span className="lr-card__sub">
          {nodeOff || aged === null
            ? "Start the node to see your eligible stake."
            : `${fmt(aged.count)} aged note${aged.count === 1 ? "" : "s"} eligible to lead` +
              (time ? ` · epoch ${time.current_epoch}` : "")}
        </span>
      </Card>

      {/* Stat cards: Ready to claim (clickable) + Submitted, each with an info button. */}
      <div className="lr-cards">
        {/* rewards-card-ready-to-claim + rewards-card-ready-clickable */}
        <Card
          className={`lr-card${hasVouchers ? " lr-card--clickable" : ""}`}
          data-testid="rewards-card-ready"
          role={hasVouchers ? "button" : undefined}
          tabIndex={hasVouchers ? 0 : undefined}
          onClick={hasVouchers ? () => setVoucherDialogOpen(true) : undefined}
          onKeyDown={
            hasVouchers
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setVoucherDialogOpen(true);
                  }
                }
              : undefined
          }
        >
          {/* rewards-info-buttons */}
          <button
            type="button"
            className="lr-card__info"
            aria-label="About ready-to-claim vouchers"
            data-testid="rewards-info-ready"
            onClick={(e) => {
              e.stopPropagation();
              setInfoTopic("ready");
            }}
          >
            i
          </button>
          <span className="lr-card__value" data-testid="rewards-ready-value">
            {nodeOff || vouchers === null ? "—" : fmt(voucherCount)}
          </span>
          <span className="lr-card__label">Ready to claim</span>
          <span className="lr-card__sub">
            {nodeOff || vouchers === null
              ? "Waiting for the wallet to report."
              : `≈ ${fmt(vouchers.total_claimable)} before fees`}
          </span>
        </Card>

        {/* rewards-card-submitted */}
        <Card className="lr-card" data-testid="rewards-card-submitted">
          <button
            type="button"
            className="lr-card__info"
            aria-label="About submitted claims"
            data-testid="rewards-info-submitted"
            onClick={() => setInfoTopic("submitted")}
          >
            i
          </button>
          <span className="lr-card__value" data-testid="rewards-submitted-value">
            {fmt(submittedCount)}
          </span>
          <span className="lr-card__label">Submitted</span>
          <span className="lr-card__sub">waiting to land</span>
        </Card>
      </div>

      {/* rewards-claim-result-notice — closable, with a copy action. */}
      {result && (
        <div className="lr-notice" data-testid="rewards-claim-notice">
          <Toast
            variant={result.ok ? "success" : "error"}
            message={result.text}
            onDismiss={() => setResult(null)}
          />
          <CopyButton value={result.text} title="Copy result" />
        </div>
      )}

      {/* History: filter + list / empty. */}
      <section className="lr-history">
        <div className="lr-history__head">
          <h3 className="lr-history__title">Claim history</h3>
          {/* rewards-history-filter */}
          <Switch
            checked={pendingOnly}
            onChange={setPendingOnly}
            label="Show only pending"
            id="rewards-history-filter"
          />
        </div>

        {/* rewards-history-list / rewards-history-empty */}
        {loading && history.length === 0 ? (
          <div className="lr-loading" data-testid="rewards-history-empty">
            Loading…
          </div>
        ) : shownHistory.length === 0 ? (
          <div className="lr-empty" data-testid="rewards-history-empty">
            {history.length === 0
              ? "No claims recorded yet."
              : "Nothing pending — all recorded claims have landed."}
          </div>
        ) : (
          <div className="lr-history__list" data-testid="rewards-history-list">
            {shownHistory.map((h) => (
              <div className="lr-row" key={h.id} data-testid="rewards-history-row">
                <div className="lr-row__main">
                  <span className="lr-row__title">
                    Claimed {h.voucherCount} voucher{h.voucherCount === 1 ? "" : "s"}
                  </span>
                  <span className="lr-row__meta">as of tip {short(h.tip) || "—"}</span>
                </div>
                <div className="lr-row__links">
                  {/* rewards-history-open-explorer */}
                  {h.txHashes.map((tx) => (
                    <button
                      key={tx}
                      type="button"
                      className="lr-link"
                      onClick={() => openInExplorer(tx)}
                    >
                      Tx {short(tx)}
                    </button>
                  ))}
                  {h.tip && (
                    <button
                      type="button"
                      className="lr-link"
                      data-testid="rewards-history-block-link"
                      onClick={() => openInExplorer(h.tip)}
                    >
                      Block
                    </button>
                  )}
                </div>
                <span
                  className={`lr-badge ${h.pending ? "lr-badge--pending" : "lr-badge--landed"}`}
                >
                  {h.pending ? "Finalizing…" : "Landed"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirm dialog — the MUTATING claim is gated behind this. */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit reward claim?"
        className="lr-confirm"
        footer={
          <>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="primary" data-testid="rewards-claim-confirm" onClick={() => void doClaim()}>
              Claim {voucherCount} voucher{voucherCount === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        <p className="lr-dialog__text">
          This submits reward-claim transactions for {voucherCount} aged voucher
          {voucherCount === 1 ? "" : "s"}
          {vouchers ? ` (≈ ${fmt(vouchers.total_claimable)} before fees)` : ""}. One claim
          redeems one voucher. This cannot be undone.
        </p>
      </Modal>

      {/* Voucher detail dialog — opened by the clickable Ready-to-claim card (§20). */}
      <Modal
        open={voucherDialogOpen}
        onClose={() => setVoucherDialogOpen(false)}
        title="Claimable vouchers"
        className="lr-voucher-dialog"
        footer={
          <Button
            variant="primary"
            data-testid="dialog-voucher-claim"
            disabled={!hasVouchers || claiming}
            onClick={() => {
              setVoucherDialogOpen(false);
              setConfirmOpen(true);
            }}
          >
            Claim all
          </Button>
        }
      >
        {/* dialog-voucher-detail: per-voucher index/value/commitment/nullifier as of tip. */}
        <div data-testid="dialog-voucher-detail">
          {vouchers && (
            // dialog-voucher-tip-copy: the tip, copyable, above the per-voucher rows.
            <span data-testid="dialog-voucher-tip-copy">
              <HashRow label="As of tip" value={vouchers.tip} />
            </span>
          )}
          <div className="lr-dialog__list">
            {vouchers?.vouchers.map((v, i) => (
              <div className="lr-voucher" key={v.nullifier || i}>
                <div className="lr-voucher__head">
                  <span>Voucher #{i + 1}</span>
                  <span>≈ {fmt(vouchers.reward_amount)} before fees</span>
                </div>
                {/* dialog-voucher-tip-copy also covers the per-voucher hash copies. */}
                <HashRow label="Commitment" value={v.commitment} />
                <HashRow label="Nullifier" value={v.nullifier} />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Info dialog — opened by the per-card info buttons. */}
      <Modal
        open={infoTopic !== null}
        onClose={() => setInfoTopic(null)}
        title={infoTopic === "submitted" ? "Submitted claims" : "Ready to claim"}
        className="lr-info-dialog"
        footer={<Button onClick={() => setInfoTopic(null)}>Close</Button>}
      >
        <div className="lr-dialog__section">
          <h4 className="lr-dialog__heading">What is it</h4>
          <p className="lr-dialog__text">
            {infoTopic === "submitted"
              ? "Claims you have submitted this session that are still waiting to land on-chain."
              : "Reward vouchers aged enough to claim. One claim redeems one voucher; the total is an estimate before transaction fees."}
          </p>
        </div>
      </Modal>
    </section>
  );
}
