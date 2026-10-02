import { registerParity } from "../test/parity";
import { ViewStub } from "./ViewStub";

// Auto-claim target editor, used in the Onboarding Fund step (and mirrored on the Mining
// tab's read-only rows). P2 owns the "view": "Onboarding Fund" ids for this widget
// (account combo + No-cap switch + threshold field + Add, removable target list, info
// button, "add an account or switch it off" advance hint).
registerParity([
  // TODO(P2): "fund-auto-claim-targets-*" ids
]);

export function PowAutoClaimTargets() {
  return <ViewStub id="pow-auto-claim-targets" title="Auto-claim Targets" />;
}
