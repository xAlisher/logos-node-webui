import { registerParity } from "../test/parity";
import type { NodeViewProps } from "./types";
import { ViewStub } from "./ViewStub";

// P2: register the parity ids this view owns — parity-checklist.json "view": "Rewards"
// (Claim button, Ready-to-claim / Submitted stat cards, claim-result notice, history
// filter + rows, voucher-detail dialog trigger). The Voucher Dialog ids live with
// InfoDialog/VoucherDialog stubs. Leave empty until P2.
registerParity([
  // TODO(P2): "rewards-*" ids
]);

export function LeaderRewardsView({ nodeOffReason, nodeOffSeverity }: NodeViewProps) {
  return (
    <ViewStub
      id="leader-rewards"
      title="Leader Rewards"
      nodeOffReason={nodeOffReason}
      nodeOffSeverity={nodeOffSeverity}
    />
  );
}
