import { registerParity } from "../test/parity";
import type { NodeViewProps } from "./types";
import { ViewStub } from "./ViewStub";

// P2: parity-checklist.json "view": "Explorer" (search bar + Ctrl+K, info button, result
// cards, copy-raw-JSON, lookup states). The blocks table is the embedded BlocksView stub
// (its own ids, "view": "Blocks Table"). Leave empty until P2.
registerParity([
  // TODO(P2): "explorer-*" ids
]);

export function ExplorerView({ nodeOffReason, nodeOffSeverity }: NodeViewProps) {
  return (
    <ViewStub
      id="explorer"
      title="Explorer"
      nodeOffReason={nodeOffReason}
      nodeOffSeverity={nodeOffSeverity}
    />
  );
}
