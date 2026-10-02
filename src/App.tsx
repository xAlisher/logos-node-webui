import { useEffect, useState } from "react";
import { getCryptarchiaInfo, type CryptarchiaInfo } from "./api/client";

// Minimal foundation shell. The real app shell + navigation (replicating BlockchainView.qml:
// Onboarding, Node Dashboard, Wallet, Accounts, Transfer, Mining, Leader Rewards, Blocks,
// Explorer, Channel Deposit, Node Settings) is implemented per docs/spec/ui-inventory.md.
export function App() {
  const [info, setInfo] = useState<CryptarchiaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCryptarchiaInfo().then(setInfo).catch((e) => setError(String(e)));
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "var(--font-body, sans-serif)" }}>
      <h1>Logos Node</h1>
      <p style={{ color: "var(--color-muted, #888)" }}>
        Web UI foundation — screens are built per <code>docs/spec/</code>.
      </p>
      {error && <p role="alert">Node unreachable: {error}</p>}
      {info && (
        <dl data-testid="node-status">
          <dt>State</dt><dd>{info.cryptarchia_info.state}</dd>
          <dt>Height</dt><dd>{info.cryptarchia_info.height}</dd>
          <dt>Phase</dt><dd>{info.phase}</dd>
        </dl>
      )}
    </main>
  );
}
