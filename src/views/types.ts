import type { NoticeSeverity } from "../shell/NodeOffNotice";

// Props the shell passes to each node-dependent tab view: the single computed
// node-off reason + severity (see docs/spec/ui-inventory.md §0). Each view renders
// one <NodeOffNotice/> from these at the top of its layout.
export interface NodeViewProps {
  nodeOffReason: string;
  nodeOffSeverity: NoticeSeverity;
}
