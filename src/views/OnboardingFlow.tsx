import { registerParity } from "../test/parity";
import { ViewStub } from "./ViewStub";

// Page 0 of the shell StackLayout (first-run setup / re-armed setup). Not node-dependent.
// P2 owns the onboarding ids across parity-checklist.json views: "Onboarding Welcome",
// "Onboarding Stepper", "Onboarding Setup", "Onboarding Network", "Onboarding Keys",
// "Onboarding Fund" (the Fund step embeds PowConfigView + PowAutoClaimTargets).
registerParity([
  // TODO(P2): "onboarding-*" ids (welcome + stepper chrome + the four steps)
]);

export function OnboardingFlow() {
  return <ViewStub id="onboarding-flow" title="Onboarding" />;
}
