import { registerParity } from "../test/parity";
import { ViewStub } from "./ViewStub";

// Embedded in WalletView (section nav panel). P2 owns parity-checklist.json
// "view": "Channel Deposit" — the 4-step wizard (Select notes / Fields / Confirm /
// Result), footer nav, LEZ preset, funding-key list, all validation + submit states.
registerParity([
  // TODO(P2): "channel-deposit-*" ids
]);

export function ChannelDepositView() {
  return <ViewStub id="channel-deposit" title="Channel Deposit" />;
}
