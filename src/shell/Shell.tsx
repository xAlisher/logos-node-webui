// Shell — the app shell, a faithful web replica of BlockchainView.qml (§0 of
// docs/spec/ui-inventory.md). It owns the global state machine and routing:
//
//   • Connecting state (spinner + "Connecting to blockchain backend…") while !ready.
//   • A StackLayout-equivalent: page 0 = OnboardingFlow, page 1 = the node operation
//     page (Header + TabBar + the active section + ChainFooter).
//   • The single computed nodeOffReason/severity fed to every node-dependent view.
//   • Global overlays: the ConfigUpgradeDialog + a bottom-centre ToastHost
//     (keystore-backup success, stop/update failure).
//   • Graceful shutdown, the clipboard helper, claimable-poll gating, the coalesced
//     voucher refresh, and programmatic "Open in Explorer" navigation.
//
// Backend-derived fields (ready/hasConfig/status/configState/synced/miningActive)
// arrive as a ShellModel — prop-driven here, fed by the live NodeStatusMonitor in
// production — so the routing/gating/derivation stays pure and unit-testable (the
// same split nodeStatus.ts uses for the dashboard hero). Setup-open and the upgrade
// dialog are UI state the shell owns.

import { useEffect, useMemo, useState } from "react";

import {
  ExplorerView,
  LeaderRewardsView,
  MiningView,
  NodeDashboardView,
  NodeSettingsView,
  WalletView,
  OnboardingFlow,
  ConfigUpgradeDialog,
  type ConfigUpgradeState,
  type NodeSettingsModel,
  type NodeSettingsApi,
} from "../views";
import type { OnboardingBackend } from "../views/onboardingTypes";
import type { LeaderClaimVouchers } from "../api/endpoints";
import { startMining as apiStartMining, stopMining as apiStopMining } from "../api/endpoints";
import { registerParity } from "../test/parity";

import { ChainFooter } from "./ChainFooter";
import { useGracefulShutdown } from "./gracefulShutdown";
import { Header } from "./Header";
import { NodeOffNotice, type NoticeSeverity } from "./NodeOffNotice";
import {
  canStart as computeCanStart,
  canStop as computeCanStop,
  claimablePollActive as computeClaimablePoll,
  computeNodeOff,
  ConfigState,
  currentPage as computeCurrentPage,
  liveDefaultModel,
  fundEnabled as computeFundEnabled,
  isConnecting,
  isStopping,
  needsSetup as computeNeedsSetup,
  startTriggersUpgrade,
  voucherGateOpen,
  type ShellModel,
} from "./shellState";
import { TabBar } from "./TabBar";
import { TABS } from "./tabs";
import { ToastHost, useToastHost } from "./ToastHost";
import { useVoucherRefresh } from "./voucherRefresh";

import "./shell.css";

// Global orchestration ids this shell OWNS (parity-checklist.json "view": "App Shell",
// plus the programmatic-nav id from "Node Header"). The header/tabs/footer own their
// own ids in Header.tsx / TabBar.tsx / ChainFooter.tsx.
registerParity([
  "shell-connecting-state",
  "shell-page-routing",
  "shell-onboarding-vs-running",
  "shell-needs-setup-reopen",
  "shell-graceful-shutdown",
  "shell-clipboard-copy",
  "shell-keystore-backup-toast",
  "shell-stop-failed-toast",
  "shell-claimable-poll-gating",
  "shell-voucher-refresh",
  "shell-node-off-reason",
  "shell-programmatic-nav-explorer",
]);

/** Injected side effects — defaulted to the live wiring, overridable in tests. */
export interface ShellDeps {
  /** Start the node (native lifecycle; no HTTP endpoint on a remote node → no-op). */
  startNode?: () => void | Promise<void>;
  /** Stop the node. Rejecting surfaces the stop-failed toast. */
  stopNode?: () => void | Promise<void>;
  startMining?: () => void | Promise<void>;
  stopMining?: () => void | Promise<void>;
  /** Rebuild a stale config. Rejecting surfaces the "Couldn't update the config" toast. */
  updateConfig?: () => void | Promise<void>;
  /** Close the window (graceful shutdown). */
  closeWindow?: () => void;
  /** Injected voucher fetch for the coalesced refresh. */
  fetchVouchers?: () => Promise<LeaderClaimVouchers>;
}

export interface ShellProps {
  /** Tab key to start on (defaults to the first tab, "node"). */
  initialTab?: string;
  /** Backend-derived shell state; merged over defaults. */
  model?: Partial<ShellModel>;
  /** Injected onboarding backend for page 0. */
  onboardingBackend?: OnboardingBackend;
  /** Host model + actions for the Settings tab (the shell owns these in production). */
  settingsModel?: Partial<NodeSettingsModel>;
  settingsApi?: Partial<NodeSettingsApi>;
  /** Chain id for the footer; omit/"" hides the footer. */
  chainId?: string;
  /** Injected side effects. */
  deps?: ShellDeps;
  /**
   * Back-compat / test override: an explicit nodeOffReason for every node view,
   * bypassing computeNodeOff. `""` means the node is answering.
   */
  nodeOffReason?: string;
  nodeOffSeverity?: NoticeSeverity;
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e ?? "");
}

export function Shell({
  initialTab = TABS[0].key,
  model: modelProp,
  onboardingBackend,
  settingsModel,
  settingsApi,
  chainId = "",
  deps = {},
  nodeOffReason: nodeOffOverride,
  nodeOffSeverity: nodeOffSeverityOverride,
}: ShellProps) {
  const [activeKey, setActiveKey] = useState<string>(initialTab);
  // Setup-open + upgrade-dialog are UI state the shell owns on top of the backend model.
  const [setupOpen, setSetupOpen] = useState<boolean>(modelProp?.setupOpen ?? false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  // Programmatic "Open in Explorer" request (term + a bumping nonce).
  const [openRequest, setOpenRequest] = useState<{ term: string; nonce: number } | undefined>();

  const toast = useToastHost();

  // The effective backend model (defaults ← prop), with the shell's own setupOpen.
  const model: ShellModel = useMemo(
    () => ({ ...liveDefaultModel(), ...modelProp, setupOpen: setupOpen || (modelProp?.setupOpen ?? false) }),
    [modelProp, setupOpen],
  );

  // needs-setup-reopen: ready but no config → setup opens itself, re-armed (if the
  // config ever disappears this fires again). (shell-needs-setup-reopen)
  useEffect(() => {
    if (computeNeedsSetup(model) && !model.setupOpen) setSetupOpen(true);
  }, [model]);

  // The single computed node-off reason/severity (or the explicit override).
  const off = useMemo(() => computeNodeOff(model), [model]);
  const nodeOffReason = nodeOffOverride !== undefined ? nodeOffOverride : off.reason;
  const nodeOffSeverity: NoticeSeverity =
    nodeOffSeverityOverride !== undefined ? nodeOffSeverityOverride : off.severity;

  // Coalesced voucher refresh while running + online. (shell-voucher-refresh)
  useVoucherRefresh({ gateOpen: voucherGateOpen(model), fetchVouchers: deps.fetchVouchers });

  // Graceful shutdown. (shell-graceful-shutdown)
  const shutdown = useGracefulShutdown(model, {
    stopNode: () => void handleStop(),
    closeWindow: deps.closeWindow ?? (() => typeof window !== "undefined" && window.close()),
  });

  // ---- Node control handlers (wired to the mutations) ----------------------
  async function handleFund() {
    try {
      if (model.miningActive) await (deps.stopMining ?? apiStopMining)();
      else await (deps.startMining ?? apiStartMining)();
    } catch {
      /* miningError surfaces on the Dashboard's Mining Rewards card, not a shell toast */
    }
  }

  async function handleStop() {
    try {
      await (deps.stopNode ?? (() => undefined))();
    } catch (e) {
      // shell-stop-failed-toast
      toast.showToast({ variant: "error", title: "Couldn't stop the node", detail: errText(e), durationMs: 12000 });
    }
  }

  async function handleStart() {
    await (deps.startNode ?? (() => undefined))();
  }

  async function handleUpdateConfig() {
    try {
      await (deps.updateConfig ?? (() => undefined))();
      setUpgradeOpen(false);
    } catch (e) {
      // shell-stop-failed-toast (shares the failure channel: "Couldn't update the config")
      toast.showToast({ variant: "error", title: "Couldn't update the config", detail: errText(e), durationMs: 12000 });
    }
  }

  // keystore-backup success toast, raised by Settings + Onboarding. (shell-keystore-backup-toast)
  function onKeystoreSaved(path: string) {
    toast.showToast({ variant: "success", title: "Keystore saved", detail: path });
  }

  // Programmatic nav to Explorer + run a search. (shell-programmatic-nav-explorer)
  function openInExplorer(id: string) {
    if (!id) return;
    setActiveKey("explorer");
    setOpenRequest((prev) => ({ term: id, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  // ---- Connecting state (shell-connecting-state) ---------------------------
  if (isConnecting(model)) {
    return (
      <div className="app-shell app-shell--connecting" data-testid="app-shell">
        <div className="shell-connecting" data-testid="shell-connecting" role="status">
          <span className="shell-spinner" aria-hidden="true" />
          <span>Connecting to blockchain backend…</span>
        </div>
      </div>
    );
  }

  const page = computeCurrentPage(model);

  // ---- Page 0: onboarding (shell-onboarding-vs-running) --------------------
  if (page === 0) {
    return (
      <div className="app-shell" data-testid="app-shell">
        <div
          className="shell-stack"
          data-testid="shell-stack-layout"
          data-page={page}
          data-setup-open={String(model.setupOpen)}
        >
          <div data-testid="shell-onboarding">
            <OnboardingFlow
              backend={onboardingBackend}
              canExit={model.hasConfig}
              onFinished={() => {
                setSetupOpen(false);
                void handleStart();
              }}
              onExitRequested={() => setSetupOpen(false)}
              onKeystoreSaved={onKeystoreSaved}
            />
          </div>
        </div>
        <ToastHost controller={toast} />
      </div>
    );
  }

  // ---- Page 1: node operation page -----------------------------------------
  const canStop = computeCanStop(model);
  const canStart = computeCanStart(model);
  const claimablePoll = computeClaimablePoll(model, activeKey);

  // Map the backend config-readiness to the dialog's face; "hidden" until the Start
  // button (or an upgrade) arms it.
  const upgradeState: ConfigUpgradeState = !upgradeOpen
    ? "hidden"
    : model.configState === ConfigState.Stale
      ? "stale"
      : model.configState === ConfigState.Unreadable
        ? "unreadable"
        : model.configState === ConfigState.Upgraded
          ? "upgraded"
          : "hidden";

  return (
    <div className="app-shell" data-testid="app-shell">
      <Header
        miningActive={model.miningActive}
        fundEnabled={computeFundEnabled(model)}
        canStart={canStart}
        canStop={canStop}
        stopping={isStopping(model)}
        startWouldUpgrade={startTriggersUpgrade(model)}
        onFund={() => void handleFund()}
        onStart={() => void handleStart()}
        onStop={() => void handleStop()}
        onRequestUpgrade={() => setUpgradeOpen(true)}
      />

      <TabBar tabs={TABS} activeKey={activeKey} onSelect={setActiveKey} />

      {/* claimable-poll gating marker: the Mining tab's claimable polling is active only
          while that tab is mounted/open. (shell-claimable-poll-gating) */}
      <span
        hidden
        data-testid="shell-claimable-poll"
        data-active={String(claimablePoll)}
        aria-hidden="true"
      />

      {/* StackLayout-equivalent: only the active section is mounted. (shell-page-routing) */}
      <main
        className="shell-stack"
        role="tabpanel"
        data-testid="shell-stack-layout"
        data-page={page}
        data-active-tab={activeKey}
      >
        <ActiveSection
          tabKey={activeKey}
          nodeOffReason={nodeOffReason}
          nodeOffSeverity={nodeOffSeverity}
          openRequest={openRequest}
          onOpenInExplorer={openInExplorer}
          onKeystoreSaved={onKeystoreSaved}
          settingsModel={settingsModel}
          settingsApi={settingsApi}
        />
      </main>

      <ChainFooter chainId={chainId} />

      {/* Global overlays. */}
      <ConfigUpgradeDialog
        configState={upgradeState}
        hasKeystore={model.hasConfig}
        onUpgrade={() => void handleUpdateConfig()}
        onStartNode={() => {
          setUpgradeOpen(false);
          void handleStart();
        }}
        onStartFresh={() => {
          setUpgradeOpen(false);
          setSetupOpen(true);
        }}
        onDismiss={() => setUpgradeOpen(false)}
      />
      <ToastHost controller={toast} />

      {/* Graceful-shutdown state, surfaced for wiring/testing. */}
      <span hidden data-testid="shell-quitting" data-quitting={String(shutdown.quitting)} aria-hidden="true" />
    </div>
  );
}

interface ActiveSectionProps {
  tabKey: string;
  nodeOffReason: string;
  nodeOffSeverity: NoticeSeverity;
  openRequest?: { term: string; nonce: number };
  onOpenInExplorer: (id: string) => void;
  onKeystoreSaved: (path: string) => void;
  settingsModel?: Partial<NodeSettingsModel>;
  settingsApi?: Partial<NodeSettingsApi>;
}

/** Renders the active section, injecting the per-view props the shell wires. */
function ActiveSection({
  tabKey,
  nodeOffReason,
  nodeOffSeverity,
  openRequest,
  onOpenInExplorer,
  onKeystoreSaved,
  settingsModel,
  settingsApi,
}: ActiveSectionProps) {
  const off = { nodeOffReason, nodeOffSeverity };
  switch (tabKey) {
    case "node":
      return <NodeDashboardView />;
    case "rewards":
      return <LeaderRewardsView {...off} onOpenInExplorer={onOpenInExplorer} />;
    case "explorer":
      return <ExplorerView {...off} openRequest={openRequest} />;
    case "wallet":
      return <WalletView {...off} />;
    case "mining":
      return <MiningView {...off} onOpenInExplorer={onOpenInExplorer} />;
    case "settings":
      return (
        <NodeSettingsView
          {...off}
          initial={settingsModel}
          api={settingsApi}
          onBackupSuccess={onKeystoreSaved}
        />
      );
    default:
      return <NodeDashboardView />;
  }
}

// Re-export so views and tests can reach the notice primitive from one place.
export { NodeOffNotice };
