import { Button } from "../ds";
import { registerParity } from "../test/parity";
import { OnboardingNotice } from "./OnboardingPrimitives";
import "./onboarding.css";

// Onboarding Welcome (OnboardingWelcome.qml). First screen of the flow: backdrop,
// title, Quick start / Advanced, a busy overlay, and a bottom error notice.
registerParity([
  "onboard-welcome-screen",
  "onboard-quick-start",
  "onboard-advanced",
  "onboard-welcome-busy",
  "onboard-welcome-error",
  "onboard-quick-start-hidden",
]);

export interface OnboardingWelcomeProps {
  busy: boolean;
  busyMessage: string;
  errorMessage: string;
  /** Quick start shows only when bootstrap peers are configured. */
  quickStartAvailable: boolean;
  onQuickStart: () => void;
  onAdvanced: () => void;
}

export function OnboardingWelcome({
  busy,
  busyMessage,
  errorMessage,
  quickStartAvailable,
  onQuickStart,
  onAdvanced,
}: OnboardingWelcomeProps) {
  return (
    <div className="onboarding-welcome" data-testid="onboarding-welcome">
      <div className="onboarding-welcome__backdrop" aria-hidden="true" />

      {!busy && (
        <div className="onboarding-welcome__panel">
          <h2 className="onboarding-welcome__title">Blockchain Node</h2>

          {quickStartAvailable && (
            <Button
              variant="primary"
              data-testid="quick-start-button"
              disabled={busy}
              onClick={onQuickStart}
            >
              {busy ? busyMessage || "Working…" : "Quick start"}
            </Button>
          )}

          <Button
            data-testid="advanced-setup-button"
            disabled={busy}
            onClick={onAdvanced}
          >
            {quickStartAvailable ? "Advanced" : "Set up your node"}
          </Button>
        </div>
      )}

      {busy && (
        <div className="onboarding-welcome__busy" data-testid="welcome-busy-overlay" role="status">
          <span className="onboarding-welcome__spinner" aria-hidden="true" />
          <p style={{ margin: 0, fontWeight: 500 }}>{busyMessage || "Working…"}</p>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            Writing your config, creating your keys, and starting the node.
          </p>
        </div>
      )}

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3 }}>
        <OnboardingNotice
          data-testid="welcome-error-notice"
          shown={errorMessage.length > 0}
          severity="error"
          title="Could not generate a config"
          message={errorMessage}
          copyable
        />
      </div>
    </div>
  );
}
