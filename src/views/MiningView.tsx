import { registerParity } from "../test/parity";
import type { NodeViewProps } from "./types";
import { ViewStub } from "./ViewStub";

// P2: parity-checklist.json "view": "Mining" (three counter cards + info buttons,
// auto-claim switch + target rows, manual claim combo/Clear/Claim, history filter +
// rows, all the claimable/auto-claim states). The Fund-step mining config widgets are
// the PowConfigView / PowAutoClaimTargets stubs. Leave empty until P2.
registerParity([
  // TODO(P2): "mining-*" ids
]);

export function MiningView({ nodeOffReason, nodeOffSeverity }: NodeViewProps) {
  return (
    <ViewStub
      id="mining"
      title="Mining"
      nodeOffReason={nodeOffReason}
      nodeOffSeverity={nodeOffSeverity}
    />
  );
}
