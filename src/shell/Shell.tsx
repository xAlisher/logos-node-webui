// Shell — the app shell, replicating BlockchainView.qml's node operation page:
// header + section tab bar + a StackLayout-equivalent that renders the active tab, plus
// the chain-id footer. One computed node-off reason/severity is passed down to the active
// (node-dependent) view, which renders the single <NodeOffNotice/>.
//
// SELF-CONTAINED for P1 (parallel with the src/ds + src/api agents): no imports from
// src/ds or src/api. Styling via src/styles/tokens.css custom properties.
//
// TODO(P2): the real shell state machine (ready/everReady/hasConfig/needsSetup/
// setupOpen/nodeRunning/moduleReachable → page 0 OnboardingFlow vs page 1 node UI, the
// Connecting… state, global dialogs/toasts, graceful shutdown, voucher refresh) wires in
// once src/api lands. For now we render page 1 directly with the node reported off.

import { useState } from "react";

import { Header } from "./Header";
import { NodeOffNotice, type NoticeSeverity } from "./NodeOffNotice";
import { TabBar } from "./TabBar";
import { TABS } from "./tabs";

import "./shell.css";

export interface ShellProps {
  /** Tab key to start on (defaults to the first tab, "node"). */
  initialTab?: string;
  /** Computed "why the node can't answer" string; "" means the node is answering. */
  nodeOffReason?: string;
  nodeOffSeverity?: NoticeSeverity;
  /** Chain id for the footer; omit/"" hides the footer (parity: visible only when known). */
  chainId?: string;
}

export function Shell({
  initialTab = TABS[0].key,
  // P1 default: no API yet, so the node is reported off and every view shows the banner.
  // P2 computes this from live backend status (see docs/spec/ui-inventory.md §0).
  nodeOffReason = "The node isn't running yet. Start it from the header to see live data.",
  nodeOffSeverity = "info",
  chainId = "",
}: ShellProps) {
  const [activeKey, setActiveKey] = useState<string>(initialTab);

  const active = TABS.find((t) => t.key === activeKey) ?? TABS[0];
  const ActiveView = active.component;

  return (
    <div className="app-shell" data-testid="app-shell">
      <Header />

      <TabBar tabs={TABS} activeKey={active.key} onSelect={setActiveKey} />

      {/* StackLayout-equivalent: only the active section is mounted. */}
      <main className="shell-stack" role="tabpanel" data-active-tab={active.key}>
        <ActiveView nodeOffReason={nodeOffReason} nodeOffSeverity={nodeOffSeverity} />
      </main>

      {/* Footer: "Chain ID: <id>" + copy — visible only when a chain id is reported. */}
      {chainId ? (
        <footer className="shell-footer" data-testid="chain-footer">
          <span>Chain ID: {chainId}</span>
          {/* TODO(P2): DS <LogosCopyButton> routed through the shell clipboard helper */}
          <button type="button" className="shell-copy" aria-label="Copy chain id">
            Copy
          </button>
        </footer>
      ) : null}
    </div>
  );
}

// Re-export so views and tests can reach the notice primitive from one place.
export { NodeOffNotice };
