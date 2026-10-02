// TabBar — the top-level section nav, replicating LogosTabBar/LogosTabButton in
// BlockchainView.qml (objectName "sectionTabs"). No tab is gated/disabled; each view
// states in-place why it can't answer.
//
// Self-contained for P1: an ARIA tablist of plain <button>s, styled with var(--token).
// TODO(P2): swap for <LogosTabBar>/<LogosTabButton> from src/ds.

import { registerParity } from "../test/parity";
import type { TabDef } from "./tabs";

// The six-tab bar and each tab's section selection (parity-checklist.json
// "view": "Node Header", the navigation ids). The programmatic-nav id
// (shell-programmatic-nav-explorer) is owned by the Shell, which wires the
// jump-to-Explorer-and-search flow.
registerParity([
  "shell-tab-bar",
  "shell-tab-node",
  "shell-tab-rewards",
  "shell-tab-explorer",
  "shell-tab-wallet",
  "shell-tab-mining",
  "shell-tab-settings",
]);

export interface TabBarProps {
  tabs: readonly TabDef[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export function TabBar({ tabs, activeKey, onSelect }: TabBarProps) {
  return (
    <div role="tablist" aria-label="Node sections" className="shell-tabbar" data-testid="shell-tab-bar">
      {tabs.map((tab) => {
        const selected = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={selected}
            data-active={selected}
            data-testid={`shell-tab-${tab.key}`}
            className="shell-tab"
            onClick={() => onSelect(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
