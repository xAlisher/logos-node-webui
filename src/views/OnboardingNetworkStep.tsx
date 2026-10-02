import { Button, TextField } from "../ds";
import { registerParity } from "../test/parity";
import { OnboardingChoiceCard } from "./OnboardingChoiceCard";
import { OnboardingInfoButton, OnboardingNotice } from "./OnboardingPrimitives";
import "./onboarding.css";

// Onboarding — Network step (OnboardingNetworkStep.qml). Which chain, and who to dial.
registerParity([
  "onboard-network-choice",
  "onboard-network-custom-path",
  "onboard-network-peers",
  "onboard-network-peers-info",
  "onboard-network-locked",
  "onboard-network-validation",
]);

export interface OnboardingNetworkStepProps {
  locked: boolean;
  /** Where the config that locked this step lives (for the locked notice). */
  userConfigPath: string;
  custom: boolean;
  onCustomChange: (custom: boolean) => void;
  customDeploymentPath: string;
  onCustomDeploymentPathChange: (path: string) => void;
  onBrowseDeployment: () => void;
  peersText: string;
  onPeersTextChange: (text: string) => void;
  /** True when validation is unmet (custom w/o deployment, or no peers). */
  needsDeployment: boolean;
  needsPeers: boolean;
  errorMessage: string;
}

export function OnboardingNetworkStep({
  locked,
  userConfigPath,
  custom,
  onCustomChange,
  customDeploymentPath,
  onCustomDeploymentPathChange,
  onBrowseDeployment,
  peersText,
  onPeersTextChange,
  needsDeployment,
  needsPeers,
  errorMessage,
}: OnboardingNetworkStepProps) {
  const lockedMessage = userConfigPath.length > 0
    ? "Your node config exists, and it cannot be generated a second time, so nothing typed here would reach it. To change the peers or the deployment, edit the file directly:\n\n" +
      userConfigPath
    : "Your node config exists, and it cannot be generated a second time, so nothing typed here would reach it. Settings shows you where the file is.";

  return (
    <div className="onboarding-step" data-testid="onboarding-network-step">
      <h3 className="onboarding-step__heading">Network</h3>

      <OnboardingNotice
        data-testid="network-locked-notice"
        shown={locked}
        severity="info"
        title="These settings are already written"
        message={lockedMessage}
      />

      <OnboardingChoiceCard
        data-testid="network-default-card"
        title="Default (public testnet)"
        badge="Recommended"
        description="Uses the deployment config this build ships with."
        selected={!custom}
        disabled={locked}
        onPick={() => onCustomChange(false)}
      />
      <OnboardingChoiceCard
        data-testid="network-custom-card"
        title="Custom deployment file"
        description="Supply your own deployment YAML (private net or a pinned genesis)."
        selected={custom}
        disabled={locked}
        onPick={() => onCustomChange(true)}
      />

      {custom && (
        <div className="onboarding-field-row">
          <span className="onboarding-field-row__label">Deployment</span>
          <TextField
            aria-label="Deployment path"
            data-testid="network-deployment-path-field"
            placeholder="Choose or paste a deployment config path"
            readOnly={locked}
            value={customDeploymentPath}
            onChange={(e) => onCustomDeploymentPathChange(e.target.value)}
          />
          {!locked && (
            <Button data-testid="network-browse-deployment" onClick={onBrowseDeployment}>
              Browse
            </Button>
          )}
        </div>
      )}

      <div className="onboarding-row">
        <span className="onboarding-step__hint" style={{ fontWeight: 500 }}>
          Bootstrap peers
        </span>
        <span className="onboarding-footer__spacer" />
        <OnboardingInfoButton
          data-testid="network-peers-info"
          topic="bootstrapPeers"
          title="Bootstrap peers"
        />
      </div>
      <p className="onboarding-step__hint">
        The node dials these on start to find the chain (one multiaddr per line). Required —
        the deployment above does not provide them.
      </p>

      <textarea
        className="onboarding-peers"
        data-testid="network-peers-field"
        aria-label="Bootstrap peers"
        readOnly={locked}
        placeholder="/ip4/…/udp/3000/quic-v1/p2p/12D3KooW…"
        value={peersText}
        onChange={(e) => onPeersTextChange(e.target.value)}
      />

      {!locked && (
        <p className="onboarding-step__fine">
          Generating writes your config. These settings cannot be changed afterwards without
          editing the file by hand.
        </p>
      )}

      {/* Validation hint shown inline when a required field is missing. */}
      <OnboardingNotice
        data-testid="network-validation-notice"
        shown={!locked && (needsDeployment || needsPeers)}
        severity="warning"
        title="Not ready to generate"
        message={
          needsDeployment
            ? "Choose a deployment file to continue."
            : "Add at least one bootstrap peer to continue."
        }
      />

      <OnboardingNotice
        data-testid="network-error-notice"
        shown={errorMessage.length > 0}
        severity="error"
        title="Could not generate a config"
        message={errorMessage}
        copyable
      />
    </div>
  );
}
