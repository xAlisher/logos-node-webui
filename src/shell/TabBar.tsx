// TabBar — the top-level section nav, replicating LogosTabBar/LogosTabButton in
// BlockchainView.qml (objectName "sectionTabs"). No tab is gated/disabled; each view
// states in-place why it can't answer.
//
// Self-contained for P1: an ARIA tablist of plain <button>s, styled with var(--token).
// TODO(P2): swap for <LogosTabBar>/<LogosTabButton> from src/ds.

import type { TabDef } from "./tabs";

export interface TabBarProps {
  tabs: readonly TabDef[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export function TabBar({ tabs, activeKey, onSelect }: TabBarProps) {
  return (
    <div role="tablist" aria-label="Node sections" className="shell-tabbar">
      {tabs.map((tab) => {
        const selected = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={selected}
            data-active={selected}
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
