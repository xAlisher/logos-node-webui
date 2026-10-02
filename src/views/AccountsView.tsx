import { registerParity } from "../test/parity";
import { ViewStub } from "./ViewStub";

// Embedded in WalletView (section nav panel). P2 owns parity-checklist.json
// "view": "Accounts" (accountsModel rows, Refresh button, per-row copy, empty/off states).
registerParity([
  // TODO(P2): "accounts-*" ids
]);

export function AccountsView() {
  return <ViewStub id="accounts" title="Accounts" />;
}
