import { Button, TextField } from "../ds";
import { registerParity } from "../test/parity";
import { OnboardingChoiceCard } from "./OnboardingChoiceCard";
import { OnboardingNotice } from "./OnboardingPrimitives";
import type { OnboardingMode } from "./onboardingTypes";
import "./onboarding.css";

// Onboarding — Setup step (OnboardingSetupStep.qml). Where the config comes from.
registerParity([
  "onboard-setup-choice",
  "onboard-setup-user-config",
  "onboard-setup-deployment",
  "onboard-setup-error",
  "onboard-setup-gating",
]);

export interface OnboardingSetupStepProps {
  mode: OnboardingMode;
  onModePicked: (mode: OnboardingMode) => void;
  userConfigPath: string;
  onUserConfigPathChange: (path: string) => void;
  deploymentConfigPath: string;
  onDeploymentConfigPathChange: (path: string) => void;
  onBrowseUserConfig: () => void;
  onBrowseDeployment: () => void;
  errorMessage: string;
}

export function OnboardingSetupStep({
  mode,
  onModePicked,
  userConfigPath,
  onUserConfigPathChange,
  deploymentConfigPath,
  onDeploymentConfigPathChange,
  onBrowseUserConfig,
  onBrowseDeployment,
  errorMessage,
}: OnboardingSetupStepProps) {
  const existing = mode === "existing";
  return (
    <div className="onboarding-step" data-testid="onboarding-setup-step">
      <h3 className="onboarding-step__heading">How do you want to start?</h3>

      <OnboardingChoiceCard
        data-testid="setup-generate-card"
        title="Generate a new node"
        badge="Recommended"
        description="Create a fresh config and keystore. Best if this is your first node."
        selected={mode === "generate"}
        onPick={() => onModePicked("generate")}
      />
      <OnboardingChoiceCard
        data-testid="setup-existing-card"
        title="Use an existing config"
        description="Point at a user config you already have (e.g. moving to a new machine). Nothing in it is rewritten."
        selected={existing}
        onPick={() => onModePicked("existing")}
      />

      {/* Existing-path fields are hidden until "existing" is chosen (gating). */}
      {existing && (
        <div className="onboarding-step" data-testid="setup-existing-fields">
          <p className="onboarding-step__hint">Point to your files</p>

          <div className="onboarding-field-row">
            <span className="onboarding-field-row__label">User config</span>
            <TextField
              aria-label="User config"
              data-testid="setup-user-config-field"
              placeholder="~/.logos/node/user_config.yaml"
              value={userConfigPath}
              onChange={(e) => onUserConfigPathChange(e.target.value.trimStart())}
            />
            <Button data-testid="setup-browse-user-config" onClick={onBrowseUserConfig}>
              Browse
            </Button>
          </div>

          <div className="onboarding-field-row">
            <span className="onboarding-field-row__label">Deployment</span>
            <TextField
              aria-label="Deployment config"
              data-testid="setup-deployment-field"
              placeholder="Optional — defaults to the public testnet"
              value={deploymentConfigPath}
              onChange={(e) => onDeploymentConfigPathChange(e.target.value.trimStart())}
            />
            <Button data-testid="setup-browse-deployment" onClick={onBrowseDeployment}>
              Browse
            </Button>
          </div>

          <p className="onboarding-step__fine">
            Your keys stay where they are — the node reads them from beside your config.
          </p>
        </div>
      )}

      <OnboardingNotice
        data-testid="setup-error-notice"
        shown={errorMessage.length > 0}
        severity="error"
        title="Setup failed"
        message={errorMessage}
        copyable
      />
    </div>
  );
}
