// PowConfigView — embedded mining settings, used in the Onboarding Fund step.
// Faithful web replica of the official PowConfigView.qml: everything in the node's
// `pow` section except the auto-claim targets (those live in PowAutoClaimTargets).
//
// These values are read ONCE, when the node's PoW service starts, so they are set
// here before the first start and there is no runtime setter for them. On the Fund
// step the whole pow section is written by one powConfigure call. This component is
// therefore a controlled form: it owns the field values + their validity and reports
// them up; it performs no API call itself.
//
// Spec: docs/spec/ui-inventory.md §12, docs/spec/parity-checklist.json view
// "Onboarding Fund" (the mining-settings + validation ids).

import { useEffect, useMemo, useState } from "react";

import { Switch, TextField, Toast, Tooltip } from "../ds";
import { registerParity } from "../test/parity";
import {
  DEFAULT_CLAIM_TICK_SECONDS,
  DEFAULT_MAX_THREADS,
  DEFAULT_TICKETS_PER_BLOCK,
  type PowSection,
} from "./onboardingTypes";

import "./pow.css";

// Parity ids this view OWNS (implements + tests). Source of truth:
// parity-checklist.json entries with "view": "Onboarding Fund" that belong to the
// embedded mining-settings form (+ the mining-field/save validation state, which
// this form raises).
registerParity([
  "onboard-fund-threads-auto",
  "onboard-fund-tickets-field",
  "onboard-fund-tick-field",
  "onboard-fund-validation",
]);

/** The mining knobs this form owns (the pow section minus auto_claim_targets). */
export type PowMiningConfig = Pick<
  PowSection,
  "max_threads" | "max_tickets_per_block" | "tick_seconds"
>;

export interface PowConfigViewProps {
  /** Seed values (e.g. from an existing config). Read once on mount. */
  initial?: PowSection;
  /** `false` renders the standalone heading + blurb; `true` the embedded label. */
  embedded?: boolean;
  /** Disables every field while a save is in flight. */
  busy?: boolean;
  /** A "could not save the mining settings" error to surface (+ copy). */
  errorMessage?: string;
  /** Fires on every edit with the current config and whether it is valid. */
  onChange?: (config: PowMiningConfig, valid: boolean) => void;
}

/** Whole number ≥ 1 — the node types the mining counts as non-zero integers. */
function isIntAtLeast1(text: string): boolean {
  return /^[0-9]+$/.test(text) && Number(text) >= 1;
}

/** A small "i" info affordance mirroring LogosInfoButton (opens its topic text). */
function InfoButton({ label, text, testId }: { label: string; text: string; testId: string }) {
  return (
    <Tooltip label={text}>
      <span
        className="pow-info"
        role="button"
        tabIndex={0}
        aria-label={label}
        data-testid={testId}
      >
        i
      </span>
    </Tooltip>
  );
}

export function PowConfigView({
  initial,
  embedded = false,
  busy = false,
  errorMessage = "",
  onChange,
}: PowConfigViewProps) {
  const seeded = useMemo(() => {
    const autoThreads = initial?.max_threads === null;
    return {
      autoThreads,
      maxThreads:
        initial?.max_threads != null ? String(initial.max_threads) : String(DEFAULT_MAX_THREADS),
      maxTickets:
        initial?.max_tickets_per_block != null
          ? String(initial.max_tickets_per_block)
          : String(DEFAULT_TICKETS_PER_BLOCK),
      tickSeconds:
        initial?.tick_seconds != null
          ? String(initial.tick_seconds)
          : String(DEFAULT_CLAIM_TICK_SECONDS),
    };
    // Seed once from the initial prop; subsequent edits are local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [autoThreads, setAutoThreads] = useState(seeded.autoThreads);
  const [maxThreads, setMaxThreads] = useState(seeded.maxThreads);
  const [maxTickets, setMaxTickets] = useState(seeded.maxTickets);
  const [tickSeconds, setTickSeconds] = useState(seeded.tickSeconds);

  const valid =
    (autoThreads || isIntAtLeast1(maxThreads)) &&
    isIntAtLeast1(maxTickets) &&
    isIntAtLeast1(tickSeconds);

  useEffect(() => {
    onChange?.(
      {
        max_threads: autoThreads ? null : parseInt(maxThreads, 10),
        max_tickets_per_block: parseInt(maxTickets, 10),
        tick_seconds: parseInt(tickSeconds, 10),
      },
      valid,
    );
    // Report up on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoThreads, maxThreads, maxTickets, tickSeconds, valid]);

  return (
    <div className="pow-config" data-testid="pow-config">
      {!embedded ? (
        <>
          <p className="pow-config__title">Proof of Work</p>
          <p className="pow-config__blurb">
            Mining searches for tickets your node can redeem for rewards. These settings
            are read once when the node starts, so they are set here rather than while it
            is running.
          </p>
          <p className="pow-config__section">Mining</p>
        </>
      ) : (
        <p className="pow-config__section">Mining settings</p>
      )}

      {/* onboard-fund-threads-auto: Auto switch + Search threads field */}
      <div className="pow-row">
        <span className="pow-row__label">Search threads</span>
        <span className="pow-row__spacer" />
        <span className="pow-row__aux">Auto</span>
        <Switch
          checked={autoThreads}
          disabled={busy}
          onChange={setAutoThreads}
          id="pow-auto-threads"
        />
        {!autoThreads && (
          <TextField
            className="pow-row__field"
            inputMode="numeric"
            value={maxThreads}
            disabled={busy}
            aria-label="Search threads"
            data-testid="pow-max-threads"
            onChange={(e) => setMaxThreads(e.target.value)}
          />
        )}
        <InfoButton
          label="About search threads"
          testId="pow-info-threads"
          text="How many CPU threads mining uses to search for tickets. Auto lets the node pick."
        />
      </div>

      {/* onboard-fund-tickets-field: Tickets in flight per block + info */}
      <div className="pow-row">
        <span className="pow-row__label">Tickets in flight per block</span>
        <span className="pow-row__spacer" />
        <TextField
          className="pow-row__field"
          inputMode="numeric"
          value={maxTickets}
          disabled={busy}
          aria-label="Tickets in flight per block"
          data-testid="pow-max-tickets"
          onChange={(e) => setMaxTickets(e.target.value)}
        />
        <InfoButton
          label="About tickets in flight per block"
          testId="pow-info-tickets"
          text="How many tickets the node will try to have in flight per block."
        />
      </div>

      {/* onboard-fund-tick-field: Claim attempt period (seconds) + info */}
      <div className="pow-row">
        <span className="pow-row__label">Claim attempt period (seconds)</span>
        <span className="pow-row__spacer" />
        <TextField
          className="pow-row__field"
          inputMode="numeric"
          value={tickSeconds}
          disabled={busy}
          aria-label="Claim attempt period (seconds)"
          data-testid="pow-claim-tick"
          onChange={(e) => setTickSeconds(e.target.value)}
        />
        <InfoButton
          label="About the claim attempt period"
          testId="pow-info-tick"
          text="How often, in seconds, the node attempts to claim mined tickets."
        />
      </div>

      {/* onboard-fund-validation: field rule + the powConfigure save error */}
      {!valid && (
        <p className="pow-error" data-testid="pow-mining-field-error">
          Search threads, tickets per block and the claim period must each be a whole
          number of at least 1.
        </p>
      )}
      {errorMessage && (
        <div data-testid="pow-save-error">
          <Toast variant="error" message={`Could not save the mining settings: ${errorMessage}`} />
        </div>
      )}
    </div>
  );
}
