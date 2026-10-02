import { registerParity } from "../test/parity";
import type { NodeViewProps } from "./types";
import { ViewStub } from "./ViewStub";

// P2: parity-checklist.json "view": "Settings" — three cards (Node config with
// Browse/copy/Update/Start-a-new-node, Back up your keys with Download keystore, Reset
// the database guidance) + their canChange/stale/backup states. Leave empty until P2.
registerParity([
  // TODO(P2): "settings-*" ids
]);

export function NodeSettingsView({ nodeOffReason, nodeOffSeverity }: NodeViewProps) {
  return (
    <ViewStub
      id="node-settings"
      title="Node Settings"
      nodeOffReason={nodeOffReason}
      nodeOffSeverity={nodeOffSeverity}
    />
  );
}
