// Pure shell state — a framework-free port of the global state model in
// BlockchainView.qml (§0 of docs/spec/ui-inventory.md). The orchestration in
// Shell.tsx feeds one ShellModel through these functions to decide which page
// shows, whether the header's node controls are enabled, and the single
// nodeOffReason / nodeOffSeverity every node-dependent view renders.
//
// Kept pure so the routing / gating / reason derivation is unit-testable without
// rendering, exactly as nodeStatus.ts is for the dashboard hero.

import { BackendStatus } from "../views/nodeStatus";
import type { NoticeSeverity } from "./NodeOffNotice";

export { BackendStatus };

/** BlockchainBackend.ConfigState — the config-readiness enum the header reads. */
export enum ConfigState {
  Unknown = "unknown",
  Ok = "ok",
  Stale = "stale",
  Unreadable = "unreadable",
  Upgraded = "upgraded",
}

/** The global inputs the shell routes on — a 1:1 mirror of BlockchainView's `root`. */
export interface ShellModel {
  /** Backend replica Valid + acquired. While false → the Connecting state. */
  ready: boolean;
  /** Distinguishes a never-connected launch from a dropped connection. */
  everReady: boolean;
  /** The app has a user config to run from. */
  hasConfig: boolean;
  /** The setup wizard is open (backend `setupInProgress`). */
  setupOpen: boolean;
  /** Backend lifecycle status. */
  status: BackendStatus;
  /** Config-readiness. */
  configState: ConfigState;
  /** The node module subprocess is alive. */
  moduleReachable: boolean;
  /** cryptarchia online + following (monitor.synced). */
  synced: boolean;
  /** PoW mining is on (backend miningActive) — flips the Fund button label. */
  miningActive: boolean;
}

export function defaultShellModel(): ShellModel {
  return {
    ready: false,
    everReady: false,
    hasConfig: false,
    setupOpen: false,
    status: BackendStatus.NotStarted,
    configState: ConfigState.Unknown,
    moduleReachable: true,
    synced: false,
    miningActive: false,
  };
}

/**
 * The Shell COMPONENT's base when no model is supplied: a ready, configured node
 * showing the operation page (node not yet started). Tests/wiring override fields
 * on top of this; defaultShellModel() is the truly-initial (not-connected) launch
 * state used by the pure-fn tests and the production live feed.
 */
export function liveDefaultModel(): ShellModel {
  return {
    ...defaultShellModel(),
    ready: true,
    everReady: true,
    hasConfig: true,
    configState: ConfigState.Ok,
  };
}

/**
 * Fund button enablement: node running AND (already mining OR synced). Mining a
 * chain we haven't caught up with burns CPU for nothing. (header-fund-gating)
 */
export function fundEnabled(m: ShellModel): boolean {
  return isNodeRunning(m) && (m.miningActive || m.synced);
}

/** ready && status === Running — the node is up (not necessarily synced). */
export function isNodeRunning(m: ShellModel): boolean {
  return m.ready && m.status === BackendStatus.Running;
}

/**
 * needsSetup — ready but no config. Re-armed (not one-shot): if the config ever
 * goes away, this is true again and setup must re-open. Shell.tsx watches this.
 */
export function needsSetup(m: ShellModel): boolean {
  return m.ready && !m.hasConfig;
}

/**
 * Which StackLayout page shows: 0 = onboarding, 1 = node operation. Setup being
 * open (or no config yet) routes to onboarding; otherwise the node UI.
 */
export function currentPage(m: ShellModel): 0 | 1 {
  if (!m.ready) return 0; // irrelevant while Connecting; onboarding is page 0
  return m.setupOpen || !m.hasConfig ? 0 : 1;
}

/** Whether the Connecting… state (spinner + text) is shown. */
export function isConnecting(m: ShellModel): boolean {
  return !m.ready;
}

/**
 * canStart — NotStarted/Stopped, or Error while the module is unreachable (Start
 * re-probes; Stop cannot help a dead module). Mirrors BlockchainView `canStart`.
 */
export function canStart(m: ShellModel): boolean {
  return (
    m.hasConfig &&
    (m.status === BackendStatus.NotStarted ||
      m.status === BackendStatus.Stopped ||
      (m.status === BackendStatus.Error && !m.moduleReachable))
  );
}

/**
 * canStop — Running/Starting/Error while the module is reachable (Starting
 * included so a long IBD can be aborted). Mirrors BlockchainView `canStop`.
 */
export function canStop(m: ShellModel): boolean {
  return (
    m.moduleReachable &&
    (m.status === BackendStatus.Running ||
      m.status === BackendStatus.Starting ||
      m.status === BackendStatus.Error)
  );
}

/** The stop is already in flight — the header shows the "Stopping… Ns" counter. */
export function isStopping(m: ShellModel): boolean {
  return m.status === BackendStatus.Stopping;
}

/**
 * Pressing Start with a stale/unreadable config must open the ConfigUpgradeDialog
 * instead of starting the node (header-start-triggers-upgrade).
 */
export function startTriggersUpgrade(m: ShellModel): boolean {
  return m.configState === ConfigState.Stale || m.configState === ConfigState.Unreadable;
}

/** The node is busy (Running/Starting/Stopping) — graceful shutdown vetoes close. */
export function isNodeBusy(m: ShellModel): boolean {
  return (
    m.status === BackendStatus.Running ||
    m.status === BackendStatus.Starting ||
    m.status === BackendStatus.Stopping
  );
}

export interface NodeOff {
  reason: string;
  severity: NoticeSeverity;
}

/**
 * The single computed "why the node can't answer right now" string + severity,
 * passed to every node-dependent view (shell-node-off-reason). A direct port of
 * BlockchainView's nodeOffReason / nodeOffSeverity. "" means the node is answering.
 */
export function computeNodeOff(m: ShellModel): NodeOff {
  if (!m.ready) {
    return { reason: "Connecting to the node service…", severity: "info" };
  }
  if (!m.moduleReachable) {
    return {
      reason: "The node service stopped responding. Restart the app.",
      severity: "error",
    };
  }
  if (m.configState === ConfigState.Stale) {
    return {
      reason: "This config needs updating before the node can start.",
      severity: "info",
    };
  }
  if (m.configState === ConfigState.Unreadable) {
    return {
      reason: "This config can't be read, so the node can't start.",
      severity: "error",
    };
  }
  switch (m.status) {
    case BackendStatus.Running:
      return m.synced
        ? { reason: "", severity: "info" }
        : { reason: "The node is still catching up.", severity: "info" };
    case BackendStatus.Starting:
      return { reason: "The node is starting…", severity: "info" };
    case BackendStatus.Stopping:
      return { reason: "The node is stopping…", severity: "info" };
    case BackendStatus.Error:
      return {
        reason: "The node stopped unexpectedly. Start it again from the Node tab.",
        severity: "error",
      };
    default:
      return { reason: "Start the node from the Node tab.", severity: "info" };
  }
}

/** claimable-count polling is active only while the node runs AND the Mining tab is open. */
export function claimablePollActive(m: ShellModel, activeTabKey: string): boolean {
  return isNodeRunning(m) && currentPage(m) === 1 && activeTabKey === "mining";
}

/** The coalesced voucher-refresh gate: node running AND online (synced). */
export function voucherGateOpen(m: ShellModel): boolean {
  return isNodeRunning(m) && m.synced;
}
