// Accounts panel (embedded in WalletView) — the known wallet addresses, what
// each one is for, and its balance. Faithful replica of the official
// `AccountsView.qml`: one Refresh covers the lot (the backend reads addresses +
// balances in the same pass, so there is nothing per-row to press) and a per-row
// copy button for the address. States: node-off banner / empty / list.
//
// Pure presentation — WalletView owns the data + the refresh call and passes
// everything in, mirroring the QML host that drives `accountsModel`.

import { Button } from "../ds/Button";
import { CopyButton } from "../ds/CopyButton";
import { NodeOffNotice, type NoticeSeverity } from "../shell/NodeOffNotice";
import { registerParity } from "../test/parity";
import { format } from "./units";
import type { WalletAccount } from "./WalletView";

// parity-checklist.json "view": "Accounts".
registerParity([
  "accounts-node-off-banner",
  "accounts-list",
  "accounts-refresh",
  "accounts-copy-address",
  "accounts-empty",
]);

export interface AccountsViewProps {
  accounts: WalletAccount[];
  nodeOffReason: string;
  nodeOffSeverity: NoticeSeverity;
  /** Refresh in flight — disables the button and announces the load. */
  loading?: boolean;
  onRefresh: () => void;
}

export function AccountsView({
  accounts,
  nodeOffReason,
  nodeOffSeverity,
  loading = false,
  onRefresh,
}: AccountsViewProps) {
  const nodeOn = nodeOffReason.length === 0;
  const empty = nodeOn && accounts.length === 0;

  return (
    <section className="wallet-accounts" data-testid="view-accounts">
      <NodeOffNotice reason={nodeOffReason} severity={nodeOffSeverity} />

      <div className="wallet-accounts__toolbar">
        <Button
          size="compact"
          onClick={onRefresh}
          disabled={!nodeOn || loading}
          title="Refreshes every wallet account and its balance"
          data-testid="accounts-refresh"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {empty && (
        <p className="wallet-accounts__empty" data-testid="accounts-empty">
          No accounts in this wallet yet.
        </p>
      )}

      {accounts.length > 0 && (
        <ul className="wallet-accounts__list" data-testid="accounts-list">
          {accounts.map((a) => (
            <li className="wallet-accounts__row" key={a.address}>
              <div className="wallet-accounts__id">
                <span className="wallet-accounts__name">{a.name}</span>
                {a.roleLabel && (
                  <span className="wallet-accounts__role">{a.roleLabel}</span>
                )}
                <code className="wallet-accounts__address" title={a.address}>
                  {a.address}
                </code>
              </div>
              <div className="wallet-accounts__right">
                <span className="wallet-accounts__balance">
                  {format(a.balance) || "—"}
                </span>
                <CopyButton value={a.address} title="Copy address" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
