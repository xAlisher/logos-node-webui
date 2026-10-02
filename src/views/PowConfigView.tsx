import { registerParity } from "../test/parity";
import { ViewStub } from "./ViewStub";

// Embedded mining settings, used in the Onboarding Fund step. P2 owns the
// parity-checklist.json "view": "Onboarding Fund" ids for the PowConfig widgets
// (Auto threads switch + Search threads, Tickets-in-flight, Claim-period fields + info
// buttons, integer>=1 validation).
registerParity([
  // TODO(P2): "fund-pow-config-*" ids
]);

export function PowConfigView() {
  return <ViewStub id="pow-config" title="Mining Settings" />;
}
