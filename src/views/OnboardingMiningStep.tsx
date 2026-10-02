import { useState } from "react";

import { Badge, Button, Select, Switch, TextField } from "../ds";
import { registerParity } from "../test/parity";
import { OnboardingInfoButton, OnboardingNotice } from "./OnboardingPrimitives";
import {
  DEFAULT_THRESHOLD,
  NO_CAP_THRESHOLD,
  type AutoClaimTarget,
  type PowAccount,
} from "./onboardingTypes";
import "./onboarding.css";

// Onboarding — Fund step (OnboardingMiningStep.qml + PowConfigView + PowAutoClaimTargets).
// Mining config: how a fresh node self-funds. Written whole by one powConfigure call.
registerParity([
  "onboard-fund-autoclaim-switch",
  "onboard-fund-autoclaim-off-note",
  "onboard-fund-targets-add",
  "onboard-fund-targets-remove",
  "onboard-fund-targets-info",
  "onboard-fund-threads-auto",
  "onboard-fund-tickets-field",
  "onboard-fund-tick-field",
  "onboard-fund-validation",
]);

export interface PowFormState {
  autoThreads: boolean;
  threads: string;
  tickets: string;
  tick: string;
}

export interface OnboardingMiningStepProps {
  accounts: PowAccount[];
  autoClaimOn: boolean;
  onAutoClaimChange: (on: boolean) => void;
  targets: AutoClaimTarget[];
  onAddTarget: (target: AutoClaimTarget) => void;
  onRemoveTarget: (index: number) => void;
  pow: PowFormState;
  onPowChange: (next: PowFormState) => void;
  busy: boolean;
  errorMessage: string;
}

export const isPositiveInt = (s: string): boolean =>
  /^[0-9]+$/.test(s) && Number.parseInt(s, 10) >= 1;

const isDigits = (s: string): boolean => /^[0-9]+$/.test(s) && s.length > 0;

export function powFieldsValid(pow: PowFormState): boolean {
  return (
    (pow.autoThreads || isPositiveInt(pow.threads)) &&
    isPositiveInt(pow.tickets) &&
    isPositiveInt(pow.tick)
  );
}

function labelFor(accounts: PowAccount[], address: string): string {
  const a = accounts.find((acc) => acc.address === address);
  return a?.label ?? "";
}

export function OnboardingMiningStep({
  accounts,
  autoClaimOn,
  onAutoClaimChange,
  targets,
  onAddTarget,
  onRemoveTarget,
  pow,
  onPowChange,
  busy,
  errorMessage,
}: OnboardingMiningStepProps) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [noCap, setNoCap] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  const accountOptions = accounts.map((a) => ({
    label: a.label || a.address,
    value: a.address,
  }));

  const alreadyAdded = (key: string) => targets.some((t) => t.public_key === key);

  const canAdd =
    !busy &&
    selectedAccount !== "" &&
    !alreadyAdded(selectedAccount) &&
    (noCap || isDigits(threshold));

  const addTarget = () => {
    if (!canAdd) return;
    onAddTarget({
      public_key: selectedAccount,
      threshold: noCap ? NO_CAP_THRESHOLD : threshold,
    });
    setSelectedAccount("");
    setThreshold(DEFAULT_THRESHOLD);
  };

  const thresholdLabel = (value: string) =>
    value === NO_CAP_THRESHOLD ? "No cap" : `to ${value}`;

  const powValid = powFieldsValid(pow);
  const needsTarget = autoClaimOn && targets.length === 0;

  return (
    <div className="onboarding-step" data-testid="onboarding-mining-step">
      <h3 className="onboarding-step__heading">Fund your node</h3>
      <p className="onboarding-step__hint">
        A node needs stake before it can propose blocks. Your node can earn that stake itself by
        mining in the background — no faucet, no manual funding.
      </p>

      {/* Auto-claim card */}
      <div className="onboarding-card">
        <div className="onboarding-row">
          <span style={{ fontWeight: 500 }}>Claim mined rewards automatically</span>
          <Badge color="var(--success)" data-testid="mining-recommended-badge">
            Recommended
          </Badge>
          <span className="onboarding-footer__spacer" />
          <Switch
            checked={autoClaimOn}
            onChange={onAutoClaimChange}
            id="auto-claim-switch"
          />
        </div>

        <p className="onboarding-step__hint">
          Mined tickets have to be claimed before they expire. Leave this on and the node claims
          them for you, into an account you name below.
        </p>

        {!autoClaimOn && (
          <p className="onboarding-step__fine" data-testid="autoclaim-off-note">
            Off. Mining still works — press Fund on the node screen — and your mining settings
            below are still written. You claim the rewards yourself from the Rewards tab.
          </p>
        )}

        {autoClaimOn && (
          <div className="onboarding-targets" data-testid="auto-claim-targets">
            <div className="onboarding-row">
              <span style={{ fontWeight: 500 }}>Pays into</span>
              <span className="onboarding-footer__spacer" />
              <OnboardingInfoButton
                data-testid="targets-info"
                topic="powAutoClaimTargets"
                title="Auto-claim targets"
              />
            </div>
            <p className="onboarding-step__hint">
              Threshold is the balance an account should reach — not an amount to pay. Once an
              account is at or above it, the node stops paying that one.
            </p>

            <div className="onboarding-row">
              <Select
                aria-label="Account"
                options={accountOptions}
                value={selectedAccount}
                placeholder="Account…"
                onChange={setSelectedAccount}
              />
              <span>No cap</span>
              <Switch checked={noCap} onChange={setNoCap} id="no-cap-switch" />
              {!noCap && (
                <TextField
                  aria-label="Target balance"
                  data-testid="threshold-field"
                  inputMode="numeric"
                  placeholder="Target balance"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              )}
              <span className="onboarding-footer__spacer" />
              <Button
                variant="primary"
                data-testid="add-target-button"
                disabled={!canAdd}
                onClick={addTarget}
              >
                Add
              </Button>
            </div>

            {targets.map((t, i) => (
              <div className="onboarding-target-row" key={t.public_key} data-testid="target-row">
                {labelFor(accounts, t.public_key) && (
                  <span style={{ color: "var(--text-secondary)" }}>
                    {labelFor(accounts, t.public_key)}
                  </span>
                )}
                <span className="onboarding-target-row__key">{t.public_key}</span>
                <span>{thresholdLabel(t.threshold)}</span>
                <span className="onboarding-footer__spacer" />
                <Button
                  data-testid="remove-target-button"
                  disabled={busy}
                  onClick={() => onRemoveTarget(i)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mining settings (PowConfigView, embedded) */}
      <div className="onboarding-card" data-testid="mining-pow-form">
        <span style={{ fontWeight: 500 }}>Mining settings</span>

        <div className="onboarding-row">
          <span style={{ color: "var(--text-secondary)" }}>Search threads</span>
          <span className="onboarding-footer__spacer" />
          <span style={{ color: "var(--text-secondary)" }}>Auto</span>
          <Switch
            checked={pow.autoThreads}
            onChange={(v) => onPowChange({ ...pow, autoThreads: v })}
            id="auto-threads-switch"
          />
          {!pow.autoThreads && (
            <TextField
              aria-label="Search threads"
              data-testid="threads-field"
              inputMode="numeric"
              value={pow.threads}
              onChange={(e) => onPowChange({ ...pow, threads: e.target.value })}
            />
          )}
          <OnboardingInfoButton topic="powSearchThreads" title="Search threads" />
        </div>

        <div className="onboarding-row">
          <span style={{ color: "var(--text-secondary)" }}>Tickets in flight per block</span>
          <span className="onboarding-footer__spacer" />
          <TextField
            aria-label="Tickets in flight per block"
            data-testid="tickets-field"
            inputMode="numeric"
            value={pow.tickets}
            onChange={(e) => onPowChange({ ...pow, tickets: e.target.value })}
          />
          <OnboardingInfoButton topic="powTicketsPerBlock" title="Tickets in flight per block" />
        </div>

        <div className="onboarding-row">
          <span style={{ color: "var(--text-secondary)" }}>Claim attempt period (seconds)</span>
          <span className="onboarding-footer__spacer" />
          <TextField
            aria-label="Claim attempt period (seconds)"
            data-testid="tick-field"
            inputMode="numeric"
            value={pow.tick}
            onChange={(e) => onPowChange({ ...pow, tick: e.target.value })}
          />
          <OnboardingInfoButton topic="powClaimPeriod" title="Claim attempt period" />
        </div>

        {!powValid && (
          <p
            data-testid="pow-mining-field-error"
            style={{ color: "var(--error)", margin: 0, fontSize: "var(--text-secondary-size, 13px)" }}
          >
            Search threads, tickets per block and the claim period must each be a whole number of
            at least 1.
          </p>
        )}
      </div>

      <p className="onboarding-step__fine">
        These are defaults — you can change them any time in the node's config file. Leaving
        auto-claim targets empty is a valid choice: it simply leaves auto-claim off.
      </p>

      {/* Fund-step validation surface: needs ≥1 target when auto-claim on. */}
      <OnboardingNotice
        data-testid="fund-validation-notice"
        shown={needsTarget}
        severity="warning"
        title="Auto-claim has nowhere to pay"
        message="Add an account for auto-claim to pay, or switch it off."
      />

      <OnboardingNotice
        data-testid="mining-error-notice"
        shown={errorMessage.length > 0}
        severity="error"
        title="Could not save the mining settings"
        message={errorMessage}
        copyable
      />
    </div>
  );
}
