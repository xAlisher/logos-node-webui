import { Button, CopyButton } from "../ds";
import { registerParity } from "../test/parity";
import { OnboardingNotice } from "./OnboardingPrimitives";
import type { KeystoreKey } from "./onboardingTypes";
import "./onboarding.css";

// Onboarding — Keys step (OnboardingKeysStep.qml). The keystore back-up gate —
// the one step that refuses to be skipped.
registerParity([
  "onboard-keys-list",
  "onboard-keys-download",
  "onboard-keys-ack",
  "onboard-keys-warning",
  "onboard-keys-error",
]);

export interface OnboardingKeysStepProps {
  keys: KeystoreKey[];
  keystorePath: string;
  alreadyBackedUp: boolean;
  acknowledged: boolean;
  onAcknowledgeChange: (checked: boolean) => void;
  onDownload: () => void;
  errorMessage: string;
}

export function OnboardingKeysStep({
  keys,
  keystorePath,
  alreadyBackedUp,
  acknowledged,
  onAcknowledgeChange,
  onDownload,
  errorMessage,
}: OnboardingKeysStepProps) {
  return (
    <div className="onboarding-step" data-testid="onboarding-keys-step">
      <h3 className="onboarding-step__heading">Back up your node keys</h3>

      <OnboardingNotice
        data-testid="keys-shown-once-notice"
        shown={!alreadyBackedUp}
        severity="warning"
        title="One copy, on this machine"
        message={
          `Generating your config created a keystore of ${keys.length} key${keys.length === 1 ? "" : "s"}, which control ` +
          "your node's identity, stake and rewards. It lives with this app's data — if that is " +
          "lost, wiped or reinstalled, nothing can reissue these keys or what they hold. Keep a " +
          "copy somewhere else."
        }
      />
      <OnboardingNotice
        data-testid="keys-already-backed-up-notice"
        shown={alreadyBackedUp}
        severity="success"
        title="Keys saved"
        message="The keystore for this config has already been backed up. You can save another copy if you want one."
      />

      {keys.length > 0 ? (
        <div className="onboarding-keys-list" data-testid="keys-list">
          {keys.map((k, i) => (
            <div className="onboarding-key-row" key={k.address || i} data-testid="key-row">
              <span className="onboarding-key-row__label">{k.label || "Untitled key"}</span>
              <span className="onboarding-key-row__addr">{k.address || ""}</span>
              <CopyButton value={k.address || ""} title="Copy address" />
            </div>
          ))}
        </div>
      ) : (
        <p className="onboarding-step__fine" data-testid="keys-not-listed">
          The keystore's contents could not be listed. That does not stop you backing it up — the
          file is what matters, and Download saves it.
        </p>
      )}

      <div className="onboarding-row">
        <Button
          data-testid="keys-download-button"
          disabled={keystorePath.length === 0}
          onClick={onDownload}
        >
          Download keystore.yaml
        </Button>
      </div>

      {!alreadyBackedUp && (
        <label className="onboarding-row">
          <input
            type="checkbox"
            data-testid="keys-acknowledge-checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledgeChange(e.target.checked)}
          />
          <span>I've backed up my keys somewhere safe</span>
        </label>
      )}

      <OnboardingNotice
        data-testid="keys-error-notice"
        shown={errorMessage.length > 0}
        severity="error"
        title="Backup failed"
        message={errorMessage}
        copyable
      />
    </div>
  );
}
