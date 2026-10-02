// The REAL tab order, index-for-index with the section stack, read from the official
// BlockchainView.qml (sectionTabs + operationStack). This supersedes the stale inline
// comment in that file ("0 Dashboard · 1 Explorer · 2 Rewards · 3 Mining · 4 Wallet"),
// which does NOT match the wired order. See docs/spec/ui-inventory.md §0b + "Ambiguities".

import type { ComponentType } from "react";

import {
  ExplorerView,
  LeaderRewardsView,
  MiningView,
  NodeDashboardView,
  NodeSettingsView,
  WalletView,
} from "../views";
import type { NodeViewProps } from "../views/types";

export interface TabDef {
  /** Stable key for routing/testing. */
  key: string;
  /** Visible label (matches qsTr() text in BlockchainView.qml). */
  label: string;
  /** The view rendered when this tab is active. */
  component: ComponentType<NodeViewProps>;
}

export const TABS: readonly TabDef[] = [
  { key: "node", label: "Node", component: NodeDashboardView },
  { key: "rewards", label: "Rewards", component: LeaderRewardsView },
  { key: "explorer", label: "Explorer", component: ExplorerView },
  { key: "wallet", label: "Wallet", component: WalletView },
  { key: "mining", label: "Mining", component: MiningView },
  { key: "settings", label: "Settings", component: NodeSettingsView },
];
