// Header — the node operation page top bar, a faithful web replica of
// BlockchainView.qml `opPage`'s header RowLayout:
//   [Logos λ icon]  "Blockchain Node"  ………  [Fund/Stop Mining]  [Start/Stop Node]
// Persistent across all six tabs.
//
// Presentational: the shell computes the gating booleans (canStart/canStop/stopping,
// the Fund enablement) from shellState.ts and passes them in, plus the action
// callbacks wired to the node mutations (powStartMining/powStopMining, start/stop).
// The Run button replicates the QML onClicked branch exactly, including the
// start-with-stale-config → open ConfigUpgradeDialog path.

import { Button, Tooltip } from "../ds";
import { registerParity } from "../test/parity";
import { LogosIcon } from "./LogosIcon";

// Parity ids this header OWNS (implements + tests). Source of truth:
// parity-checklist.json entries with "view": "Node Header" that are header controls.
registerParity([
  "header-logos-icon",
  "header-title",
  "header-fund-button",
  "header-fund-tooltip",
  "header-fund-gating",
  "header-run-button",
  "header-run-button-stopping",
  "header-run-gating",
  "header-start-triggers-upgrade",
]);

export interface HeaderProps {
  title?: string;
  /** Fund ↔ Stop Mining flips on miningActive (fundMiningButton). */
  miningActive?: boolean;
  /**
   * Fund enabled only when node running AND (already mining OR synced) — mining a
   * chain we haven't caught up with burns CPU for nothing. (header-fund-gating)
   */
  fundEnabled?: boolean;
  /** Run button: canStart/canStop/stopping, computed by the shell. (header-run-gating) */
  canStart?: boolean;
  canStop?: boolean;
  stopping?: boolean;
  /** Live "Stopping… Ns" counter while stopping. (header-run-button-stopping) */
  stoppingSeconds?: number;
  /**
   * Pressing Start with a stale/unreadable config opens the ConfigUpgradeDialog
   * instead of starting. The shell passes this; the Run onClick honours it.
   * (header-start-triggers-upgrade)
   */
  startWouldUpgrade?: boolean;

  onFund?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onRequestUpgrade?: () => void;
}

export function Header({
  title = "Blockchain Node",
  miningActive = false,
  fundEnabled = false,
  canStart = false,
  canStop = false,
  stopping = false,
  stoppingSeconds = 0,
  startWouldUpgrade = false,
  onFund,
  onStart,
  onStop,
  onRequestUpgrade,
}: HeaderProps) {
  // The QML onClicked branch, line for line: stop first, then the stale-config
  // detour, then start.
  const onRun = () => {
    if (canStop) {
      onStop?.();
      return;
    }
    if (startWouldUpgrade) {
      onRequestUpgrade?.();
      return;
    }
    onStart?.();
  };

  const runLabel = stopping
    ? stoppingSeconds > 0
      ? `Stopping… ${stoppingSeconds}s`
      : "Stopping…"
    : canStop
      ? "Stop Node"
      : "Start Node";

  return (
    <header className="shell-header" data-testid="shell-header">
      <LogosIcon />
      <h1 className="shell-title" data-testid="header-title">
        {title}
      </h1>
      <div className="shell-header-spacer" />

      {/* Fund / Stop Mining — tooltip spells out the one thing it can't say itself. */}
      <Tooltip label="Mining runs until you stop it">
        <Button
          data-testid="header-fund-button"
          disabled={!fundEnabled}
          onClick={onFund}
        >
          {miningActive ? "Stop Mining" : "Fund"}
        </Button>
      </Tooltip>

      {/* Start / Stop Node (Primary). Disabled while stopping, or when neither
          start nor stop is available. */}
      <Button
        variant="primary"
        data-testid="header-run-button"
        disabled={stopping || !(canStop || canStart)}
        onClick={onRun}
      >
        {runLabel}
      </Button>
    </header>
  );
}
