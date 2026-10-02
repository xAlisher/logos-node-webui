import { registerParity } from "../test/parity";
import type { NodeViewProps } from "./types";
import { ViewStub } from "./ViewStub";

// P2: parity-checklist.json "view": "Wallet" — the SectionNav container (Accounts /
// Transfer / Channel Deposit) + a StackLayout of the three panels. The panels are the
// AccountsView / TransferView / ChannelDepositView stubs (their own ids). Leave empty
// until P2.
registerParity([
  // TODO(P2): "wallet-*" ids (section nav)
]);

export function WalletView({ nodeOffReason, nodeOffSeverity }: NodeViewProps) {
  return (
    <ViewStub
      id="wallet"
      title="Wallet"
      nodeOffReason={nodeOffReason}
      nodeOffSeverity={nodeOffSeverity}
    />
  );
}
