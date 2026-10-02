// PowAutoClaimTargets — the auto-claim block of the Onboarding Fund step.
// Faithful web replica of PowAutoClaimTargets.qml (the target editor) plus the
// surrounding auto-claim enable switch / off-note that OnboardingMiningStep.qml
// wraps it in — folded in here so the control is self-contained and reusable.
//
// The accounts auto-claim pays into, and the only thing that turns auto-claim on:
// the node arms it at startup precisely when pow.auto_claim.targets is non-empty.
// This is the PERSISTENT path — the Fund step writes these into the config's pow
// section (contrast the MiningView switch, a non-persistent runtime override).
//
// Spec: docs/spec/ui-inventory.md §12, docs/spec/parity-checklist.json view
// "Onboarding Fund" (the auto-claim switch / off-note / targets ids).

import { useEffect, useState } from "react";

import { Badge, Button, Select, Switch, TextField, Tooltip } from "../ds";
import { registerParity } from "../test/parity";
import {
  DEFAULT_THRESHOLD,
  NO_CAP_THRESHOLD,
  type AutoClaimTarget,
  type PowAccount,
} from "./onboardingTypes";

import "./pow.css";

// Parity ids this view OWNS (implements + tests). Source of truth:
// parity-checklist.json entries with "view": "Onboarding Fund" for the auto-claim
// enable switch, its off-note, and the targets editor.
registerParity([
  "onboard-fund-autoclaim-switch",
  "onboard-fund-autoclaim-off-note",
  "onboard-fund-targets-add",
  "onboard-fund-targets-remove",
  "onboard-fund-targets-info",
]);

export interface PowAutoClaimTargetsProps {
  /** Wallet-key accounts the combo reads ({ address, label }). */
  accounts?: PowAccount[];
  /** Targets to seed the list with (from an existing config). Read once. */
  initialTargets?: AutoClaimTarget[];
  /** Prefilled into the threshold field. */
  defaultThreshold?: string;
  /** Disables Add / Remove while a save is in flight. */
  busy?: boolean;
  /** Controlled auto-claim on/off (Recommended, on by default). */
  enabled?: boolean;
  /** Fires when the auto-claim switch is toggled. */
  onEnabledChange?: (on: boolean) => void;
  /** Fires whenever the target list changes. */
  onChange?: (targets: AutoClaimTarget[]) => void;
}

function short(hex: string): string {
  return hex.length > 16 ? `${hex.slice(0, 8)}…${hex.slice(-6)}` : hex;
}

function isDigits(text: string): boolean {
  return /^[0-9]+$/.test(text);
}

function labelFor(accounts: PowAccount[], publicKey: string): string {
  return accounts.find((a) => a.address === publicKey)?.label ?? "";
}

export function PowAutoClaimTargets({
  accounts = [],
  initialTargets = [],
  defaultThreshold = DEFAULT_THRESHOLD,
  busy = false,
  enabled,
  onEnabledChange,
  onChange,
}: PowAutoClaimTargetsProps) {
  const [on, setOn] = useState(enabled ?? true);
  const [targets, setTargets] = useState<AutoClaimTarget[]>(() =>
    initialTargets.filter((t) => t && t.public_key).map((t) => ({ ...t, threshold: String(t.threshold) })),
  );
  const [account, setAccount] = useState<string>("");
  const [noCap, setNoCap] = useState(false);
  const [threshold, setThreshold] = useState(defaultThreshold);

  useEffect(() => {
    onChange?.(targets);
    // Report the list up on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets]);

  const alreadyAdded = (key: string) => targets.some((t) => t.public_key === key);

  const canAdd =
    !busy && account !== "" && (noCap || isDigits(threshold)) && !alreadyAdded(account);

  const toggleEnabled = (next: boolean) => {
    setOn(next);
    onEnabledChange?.(next);
  };

  const addTarget = () => {
    if (!canAdd) return;
    setTargets((prev) => [
      ...prev,
      { public_key: account, threshold: noCap ? NO_CAP_THRESHOLD : threshold },
    ]);
    setAccount("");
    setThreshold(defaultThreshold);
  };

  const removeTarget = (publicKey: string) => {
    setTargets((prev) => prev.filter((t) => t.public_key !== publicKey));
  };

  const accountOptions = accounts.map((a) => ({
    label: a.label && a.label.length > 0 ? a.label : short(a.address),
    value: a.address,
  }));

  const thresholdLabel = (value: string) =>
    value === NO_CAP_THRESHOLD ? "No cap" : `to ${value}`;

  const needsTarget = on && targets.length === 0;

  return (
    <div className="pow-targets" data-testid="pow-auto-claim-targets">
      {/* onboard-fund-autoclaim-switch: Recommended, on by default */}
      <div className="pow-targets__enable">
        <span className="pow-targets__enable-label">Claim mined rewards automatically</span>
        <Badge color="var(--success)">Recommended</Badge>
        <span className="pow-row__spacer" />
        <Switch
          checked={on}
          disabled={busy}
          onChange={toggleEnabled}
          id="pow-autoclaim-enable"
        />
      </div>

      <p className="pow-targets__blurb">
        Mined tickets have to be claimed before they expire. Leave this on and the node
        claims them for you, into an account you name below.
      </p>

      {/* onboard-fund-autoclaim-off-note */}
      {!on && (
        <p className="pow-targets__off-note" data-testid="pow-autoclaim-off-note">
          Off. Mining still works and your mining settings below are still written. You
          claim the rewards yourself from the Rewards tab.
        </p>
      )}

      {on && (
        <>
          <div className="pow-row">
            <span className="pow-row__label">Pays into</span>
            <span className="pow-row__spacer" />
            {/* onboard-fund-targets-info */}
            <Tooltip label="The accounts auto-claim pays into. The node arms auto-claim at startup only when at least one target is configured.">
              <span
                className="pow-info"
                role="button"
                tabIndex={0}
                aria-label="About auto-claim targets"
                data-testid="pow-targets-info"
              >
                i
              </span>
            </Tooltip>
          </div>

          <p className="pow-targets__blurb">
            Threshold is the balance an account should reach — not an amount to pay. Once
            an account is at or above it, the node stops paying that one.
          </p>

          {/* onboard-fund-targets-add: combo + No cap switch + threshold + Add */}
          <div className="pow-row pow-targets__add">
            <Select
              className="pow-targets__combo"
              options={accountOptions}
              value={account || undefined}
              placeholder="Account…"
              disabled={busy}
              onChange={setAccount}
              aria-label="Auto-claim account"
            />
            <span className="pow-row__aux">No cap</span>
            <Switch checked={noCap} disabled={busy} onChange={setNoCap} id="pow-no-cap" />
            {!noCap && (
              <TextField
                className="pow-targets__threshold"
                inputMode="numeric"
                value={threshold}
                disabled={busy}
                placeholder="Target balance"
                aria-label="Target balance"
                data-testid="pow-threshold"
                onChange={(e) => setThreshold(e.target.value)}
              />
            )}
            <span className="pow-row__spacer" />
            <Button
              variant="primary"
              data-testid="pow-add-target"
              disabled={!canAdd}
              onClick={addTarget}
            >
              Add
            </Button>
          </div>

          {/* The added targets, each removable. */}
          {targets.length > 0 && (
            <ul className="pow-targets__list" data-testid="pow-targets-list">
              {targets.map((t) => {
                const label = labelFor(accounts, t.public_key);
                return (
                  <li className="pow-target" key={t.public_key} data-testid="pow-target-row">
                    <span className="pow-target__account">
                      {label && <span className="pow-target__label">{label}</span>}
                      <span className="pow-target__addr" title={t.public_key}>
                        {short(t.public_key)}
                      </span>
                    </span>
                    <span className="pow-target__threshold">{thresholdLabel(t.threshold)}</span>
                    <span className="pow-row__spacer" />
                    {/* onboard-fund-targets-remove */}
                    <Button
                      data-testid="pow-remove-target"
                      disabled={busy}
                      onClick={() => removeTarget(t.public_key)}
                    >
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Advance hint: auto-claim on needs ≥1 target (owned by PowConfigView's
              validation id; rendered here where the choice is made). */}
          {needsTarget && (
            <p className="pow-error" data-testid="pow-targets-needed">
              Add an account for auto-claim to pay, or switch it off.
            </p>
          )}
        </>
      )}
    </div>
  );
}
