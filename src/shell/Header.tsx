// Header — the node operation page top bar, replicating BlockchainView.qml `opPage`:
//   [Logos λ icon]  "Blockchain Node"  ………  [Fund]  [Start/Stop Node]
// Persistent across all six tabs.
//
// Self-contained for P1: plain elements styled with var(--token). The two buttons are
// inert placeholders — the real mining/lifecycle wiring (powStartMining/powStopMining,
// startBlockchain/stopBlockchain) lands in P2.

export interface HeaderProps {
  title?: string;
  /** Fund ↔ Stop Mining flips on miningActive (BlockchainView.qml fundMiningButton). */
  miningActive?: boolean;
  /** Start Node ↔ Stop Node flips on nodeRunning (nodeRunButton). */
  nodeRunning?: boolean;
}

export function Header({
  title = "Blockchain Node",
  miningActive = false,
  nodeRunning = false,
}: HeaderProps) {
  return (
    <header className="shell-header" data-testid="shell-header">
      {/* TODO(P2): <LogosIcon> Logos λ mark from src/ds */}
      <span className="shell-logo" aria-hidden="true">
        λ
      </span>
      <h1 className="shell-title">{title}</h1>
      <div className="shell-header-spacer" />
      {/* TODO(P2): wire to api.powStartMining()/powStopMining(); DS <LogosButton> */}
      <button type="button" className="shell-btn" data-testid="fund-button">
        {miningActive ? "Stop Mining" : "Fund"}
      </button>
      {/* TODO(P2): wire to api start/stopBlockchain(); DS <LogosButton variant="primary"> */}
      <button type="button" className="shell-btn shell-btn-primary" data-testid="run-button">
        {nodeRunning ? "Stop Node" : "Start Node"}
      </button>
    </header>
  );
}
