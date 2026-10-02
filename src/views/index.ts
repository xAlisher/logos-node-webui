// Barrel for all view stubs. Importing this module loads every view module, so each
// view's module-scope registerParity(...) call runs — which is how the parity gate's
// registry gets populated. Keep every view (tab views AND embedded sub-views) exported
// here so none is tree-shaken out of the parity accounting.

export { NodeDashboardView } from "./NodeDashboardView";
export { LeaderRewardsView } from "./LeaderRewardsView";
export { ExplorerView } from "./ExplorerView";
export { WalletView } from "./WalletView";
export { MiningView } from "./MiningView";
export { NodeSettingsView } from "./NodeSettingsView";

// Embedded sub-views (rendered inside their parents in P2).
export { BlocksView } from "./BlocksView";
export { AccountsView } from "./AccountsView";
export { TransferView } from "./TransferView";
export { ChannelDepositView } from "./ChannelDepositView";
export { PowConfigView } from "./PowConfigView";
export { PowAutoClaimTargets } from "./PowAutoClaimTargets";
export { OnboardingFlow } from "./OnboardingFlow";
export { InfoDialog } from "./InfoDialog";

export type { NodeViewProps } from "./types";
