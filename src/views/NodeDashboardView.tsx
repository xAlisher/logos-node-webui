import { registerParity } from "../test/parity";
import type { NodeViewProps } from "./types";
import { ViewStub } from "./ViewStub";

// P2: register the parity ids this view owns. Source of truth: parity-checklist.json
// entries with "view": "Dashboard" (status hero + lifecycle lane + metric tiles + their
// info/copy buttons and states). Leave empty until P2 implements + tests each.
registerParity([
  // TODO(P2): "dashboard-*" ids
]);

export function NodeDashboardView({ nodeOffReason, nodeOffSeverity }: NodeViewProps) {
  return (
    <ViewStub
      id="node-dashboard"
      title="Node Dashboard"
      nodeOffReason={nodeOffReason}
      nodeOffSeverity={nodeOffSeverity}
    />
  );
}
