// Pure node-status derivation — a web port of the status logic in
// src/qml/views/NodeDashboardView.qml (the `d` QtObject) and the NodeStatusMonitor
// described in BlockchainView.qml. Kept pure and framework-free so the ~13 computed
// hero states can be unit-tested by feeding a model, exactly as the monitor would.

/** Backend lifecycle enum, mirroring BlockchainBackend. -1 = not connected / unknown. */
export enum BackendStatus {
  NotConnected = -1,
  NotStarted = 0,
  Starting = 1,
  Running = 2,
  Stopping = 3,
  Stopped = 4,
  Error = 5,
}

/** Blend role, mirroring BlockchainBackend's role enum. */
export enum BlendRole {
  Unknown = 0,
  Core = 1,
  Edge = 2,
  Inactive = 3,
}

/** Semantic tone → a tokens.css custom property. `text` is the default foreground. */
export type Tone = "error" | "warning" | "success" | "muted" | "text";

export const TONE_VAR: Record<Tone, string> = {
  error: "var(--error)",
  warning: "var(--warning)",
  success: "var(--success)",
  muted: "var(--text-secondary)",
  text: "var(--text)",
};

/**
 * The full set of inputs the hero/lane/tiles derive from — a 1:1 mirror of the
 * QML view's public properties. The monitor produces one of these per poll; tests
 * feed one directly to drive any state.
 */
export interface NodeStatusModel {
  status: BackendStatus;
  connected: boolean;
  moduleReachable: boolean;
  everConnected: boolean;
  statusMessage: string;
  nodeRecovering: boolean;
  synced: boolean;
  hasBeenOnline: boolean;
  // Stale-poll modifiers.
  statusStale: boolean;
  statusNextPollSeconds: number;
  statusSilentSeconds: number;
  // Substantiated sync failures.
  syncStalled: boolean;
  blockStreamEnded: boolean;
  genesisPending: boolean;
  genesisUnixMs: number;
  // Stopping sub-line.
  stopSlow: boolean;
  stopBehindCatchUp: boolean;
  // Uptime.
  uptimeSeconds: number;
  // Lane (wallet half).
  walletFunded: boolean;
  stakeNoteCount: number;
  voucherCount: number;
  // Blend.
  blendRole: BlendRole;
  // Mining lane busy label.
  miningActive: boolean;
}

export function defaultModel(): NodeStatusModel {
  return {
    status: BackendStatus.NotConnected,
    connected: false,
    moduleReachable: true,
    everConnected: false,
    statusMessage: "",
    nodeRecovering: false,
    synced: false,
    hasBeenOnline: false,
    statusStale: false,
    statusNextPollSeconds: 0,
    statusSilentSeconds: 0,
    syncStalled: false,
    blockStreamEnded: false,
    genesisPending: false,
    genesisUnixMs: 0,
    stopSlow: false,
    stopBehindCatchUp: false,
    uptimeSeconds: 0,
    walletFunded: false,
    stakeNoteCount: 0,
    voucherCount: -1,
    blendRole: BlendRole.Unknown,
    miningActive: false,
  };
}

export interface HeroState {
  label: string;
  sub: string;
  tone: Tone;
  dots: boolean;
  isError: boolean;
}

const LONG_SILENCE_SECONDS = 120;

function genesisText(genesisUnixMs: number): string {
  return genesisUnixMs > 0 ? new Date(genesisUnixMs).toLocaleDateString() : "in the future";
}

function silenceText(seconds: number): string {
  if (seconds < 120) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 120) return `${minutes} minutes`;
  return `${Math.floor(minutes / 60)} hours`;
}

/**
 * The hero's six-plus states, most specific first — a direct port of the QML `d.state`.
 * Losing contact is handled by the !connected branch; the stale-poll overlay is applied
 * separately in computeDisplay().
 */
export function computeHeroState(m: NodeStatusModel): HeroState {
  const running = m.status === BackendStatus.Running;

  // First, because `status` freezes when the link drops.
  if (!m.connected) {
    return m.everConnected
      ? {
          label: "Disconnected",
          sub: "Lost contact with the backend — restart the app to reconnect.",
          tone: "error",
          dots: false,
          isError: true,
        }
      : { label: "Not started", sub: "", tone: "muted", dots: false, isError: false };
  }

  if (!m.moduleReachable) {
    return {
      label: "Node stopped",
      sub: m.statusMessage || "The node process stopped unexpectedly. Start it again.",
      tone: "error",
      dots: false,
      isError: true,
    };
  }

  if (m.status === BackendStatus.Error) {
    return {
      label: "Error",
      sub: m.statusMessage || "Node error.",
      tone: "error",
      dots: false,
      isError: true,
    };
  }

  // Above the recovery branch: the backend leaves nodeRecovering set when you
  // stop a replaying node, so Stopping must be tested first.
  if (m.status === BackendStatus.Stopping) {
    return {
      label: "Stopping",
      sub: !m.stopSlow
        ? ""
        : m.stopBehindCatchUp
          ? "The node is busy catching up — stopping can take a while."
          : "Still waiting on the node to shut down.",
      tone: "warning",
      dots: true,
      isError: false,
    };
  }

  // Replay (from disk) and bootstrap (from peers) are one wait: catching up.
  if (m.nodeRecovering || (running && !m.synced)) {
    // Genesis first: the one case that can never resolve on its own.
    if (running && m.genesisPending) {
      return {
        label: "Bootstrapping",
        sub:
          `Genesis is ${genesisText(m.genesisUnixMs)} — the node can't finish syncing until ` +
          "then. Its config likely points at the wrong network.",
        tone: "error",
        dots: false,
        isError: true,
      };
    }
    if (running && (m.blockStreamEnded || m.syncStalled)) {
      return {
        label: "Bootstrapping",
        sub: m.blockStreamEnded
          ? "Block updates have stopped arriving — restart the node to resubscribe."
          : "No block progress for 10 minutes — the node may have lost its peers. Try stopping and starting it.",
        tone: "error",
        dots: false,
        isError: true,
      };
    }
    return {
      label: "Bootstrapping",
      sub: m.nodeRecovering
        ? "Catching up — replaying stored blocks."
        : m.hasBeenOnline
          ? "Fell behind — catching up"
          : "Syncing with the chain",
      tone: "warning",
      dots: true,
      isError: false,
    };
  }

  if (m.status === BackendStatus.Starting) {
    return {
      label: "Starting",
      sub: "Checking configuration",
      tone: "warning",
      dots: true,
      isError: false,
    };
  }

  if (running) {
    if (m.blockStreamEnded) {
      return {
        label: "Online",
        sub: "Block updates have stopped arriving — restart the node to resubscribe.",
        tone: "success",
        dots: false,
        isError: true,
      };
    }
    return {
      label: "Online",
      sub: "Following the chain",
      tone: "success",
      dots: false,
      isError: false,
    };
  }

  // NotStarted, Stopped and "replica not valid yet" all read the same.
  return { label: "Not started", sub: m.statusMessage, tone: "muted", dots: false, isError: false };
}

/**
 * What the hero actually renders — the QML `d.display`. A stale poll keeps the last
 * known headline, greys it, stops the pulse and explains the gap underneath, rather
 * than replacing it with a scarier state.
 */
export function computeDisplay(m: NodeStatusModel): HeroState {
  const state = computeHeroState(m);
  if (!m.statusStale) return state;
  return {
    label: state.label,
    sub:
      m.statusSilentSeconds >= LONG_SILENCE_SECONDS
        ? `No response from the node for ${silenceText(m.statusSilentSeconds)} — it may be busy ` +
          "replaying, or the connection may have dropped."
        : `Status unavailable — retrying in ${m.statusNextPollSeconds}s`,
    tone: "muted",
    dots: false,
    isError: false,
  };
}

// ---- Lifecycle lane --------------------------------------------------------

export const LANE_STAGES = ["Started", "Online", "Funded", "Aged", "Proposing", "Earning"] as const;

/** Where the wallet half stands right now, 2..5 (later conditions imply the earlier). */
export function walletStage(m: Pick<NodeStatusModel, "voucherCount" | "stakeNoteCount" | "walletFunded">): number {
  if (m.voucherCount > 0) return 5; // Earning
  if (m.stakeNoteCount > 0) return 4; // Proposing
  if (m.walletFunded) return 3; // Aged
  return 2; // Funded
}

export interface LifecycleState {
  currentIndex: number;
  busy: boolean;
  failed: boolean;
}

/**
 * The lane position — a port of `d.lifeCurrentIndex`. `walletHighWater` is the
 * caller-held high-water mark (the wallet half holds at its best, since claiming a
 * reward empties the voucher list and must not walk the lane backwards).
 */
export function computeLifecycle(m: NodeStatusModel, walletHighWater: number): LifecycleState {
  let currentIndex: number;
  if (m.status < 0 || m.status === BackendStatus.NotStarted) currentIndex = -1;
  else if (m.status === BackendStatus.Error) currentIndex = 0;
  else if (m.nodeRecovering) currentIndex = 1;
  else if (m.status === BackendStatus.Starting) currentIndex = 0;
  else if (m.status !== BackendStatus.Running) currentIndex = -1;
  else if (!m.synced) currentIndex = 1;
  else currentIndex = Math.max(2, walletHighWater);

  return {
    currentIndex,
    busy: currentIndex >= 0 && currentIndex < 5,
    failed: m.status === BackendStatus.Error,
  };
}

/** The Funded stage's busy label flips with mining activity. */
export function fundedBusyLabel(miningActive: boolean): string {
  return miningActive ? "Funding" : "Fund your wallet";
}

// ---- Blend tile ------------------------------------------------------------

export interface BlendDisplay {
  label: string;
  caption: string;
  colorVar: string;
}

export function computeBlend(role: BlendRole): BlendDisplay {
  switch (role) {
    case BlendRole.Core:
      return { label: "Core", caption: "Mixing your proposals", colorVar: "var(--accent-yellow-soft)" };
    case BlendRole.Edge:
      return { label: "Edge", caption: "Mixed by the core network", colorVar: "var(--info)" };
    case BlendRole.Inactive:
      return { label: "Not active", caption: "Proposals not mixed", colorVar: "var(--text-secondary)" };
    default:
      return { label: "—", caption: "", colorVar: "var(--text)" };
  }
}

// ---- Small formatters shared with the view ---------------------------------

/** Head-and-tail shortening for a hash on a tile; copy carries the whole value. */
export function shorten(s: string): string {
  if (!s || s.length === 0) return "—";
  return s.length > 14 ? s.substring(0, 6) + "…" + s.substring(s.length - 4) : s;
}

/** Uptime as s / m+s / h+m / d+h — the contract the backend ticks against. */
export function uptimeText(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** MB below a gigabyte, else one-decimal GB — matches the QML sizeText. */
export function sizeText(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${Math.round(mb)}MB`;
}

/** "<1%" for a working node, else a rounded integer percent. */
export function percentText(p: number): string {
  return p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`;
}
