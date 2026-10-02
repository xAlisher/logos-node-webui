import { registerParity } from "../test/parity";
import { ViewStub } from "./ViewStub";

// Embedded in WalletView (section nav panel). P2 owns parity-checklist.json
// "view": "Transfer" (From combo, To hex field, Amount field + validator, Send button,
// available/over-balance states, result notice).
registerParity([
  // TODO(P2): "transfer-*" ids
]);

export function TransferView() {
  return <ViewStub id="transfer" title="Transfer" />;
}
