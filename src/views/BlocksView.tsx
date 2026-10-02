import { registerParity } from "../test/parity";
import { ViewStub } from "./ViewStub";

// Embedded in ExplorerView (the resting-state block table). P2 owns parity-checklist.json
// "view": "Blocks Table" (expandable block/tx delegates, PoL subgroup, copy buttons,
// decorative sort triangles, empty states).
registerParity([
  // TODO(P2): "blocks-*" ids
]);

export function BlocksView() {
  return <ViewStub id="blocks" title="Blocks Table" />;
}
