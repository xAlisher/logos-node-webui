// ConfigUpgradeDialog — faithful web replica of dialogs/ConfigUpgradeDialog.qml.
//
// One dialog with FOUR faces, chosen by `configState` alone (QML's d.stale /
// d.upgraded / d.unreadable + the no-keystore split of stale):
//   stale + keystore  → "Your config is out of date"  + Update config + Not now
//   stale, no keystore→ "This config can't be updated" + Start fresh   + Not now
//   unreadable        → "This config can't be read" (refusal reason)   + Not now
//   upgraded          → "Config updated" (dropped list + backup/report paths) + Start node
// Every other state leaves it hidden. Modal, NO auto-close (NoAutoClose in QML):
// the actions are the only way out, so we pass no onClose to the DS Modal.
// Busy: spinner + "Updating…", all actions disabled; error notice otherwise.

import { CopyButton } from "../ds";
import { Button } from "../ds";
import { Modal } from "../ds";
import { Toast } from "../ds";
import { registerParity } from "../test/parity";

// Config Upgrade Dialog parity ids (view "Config Upgrade Dialog").
registerParity([
  "dialog-config-upgrade-stale",
  "dialog-config-upgrade-nokeystore",
  "dialog-config-upgrade-unreadable",
  "dialog-config-upgrade-upgraded",
  "dialog-config-upgrade-action",
  "dialog-config-upgrade-dropped-copy",
  "dialog-config-upgrade-busy",
]);

/** The subset of BlockchainBackend.ConfigState the dialog reacts to (+ hidden). */
export type ConfigUpgradeState = "hidden" | "stale" | "unreadable" | "upgraded";

export interface ConfigUpgradeDialogProps {
  /** One of BlockchainBackend.ConfigState; anything but the three faces hides it. */
  configState: ConfigUpgradeState;
  /** Whether a keystore sits beside the config (gates Update vs Start fresh). */
  hasKeystore?: boolean;
  /** Settings this release no longer recognises (dotted keys / merge conflict lines). */
  configDropped?: string[];
  /** Where the merge report was written (empty = clean upgrade). */
  mergeConfigReportPath?: string;
  /** Where the pre-upgrade config was saved. */
  configBackupPath?: string;
  /** The node's own words for why it refused the config (unreadable face). */
  refusalReason?: string;
  /** An upgrade is in flight: spinner + every action disabled. */
  busy?: boolean;
  /** Why the last attempt failed, or empty. */
  upgradeError?: string;

  onUpgrade?: () => void;
  onStartNode?: () => void;
  onStartFresh?: () => void;
  onDismiss?: () => void;
}

export function ConfigUpgradeDialog({
  configState,
  hasKeystore = false,
  configDropped = [],
  mergeConfigReportPath = "",
  configBackupPath = "",
  refusalReason = "",
  busy = false,
  upgradeError = "",
  onUpgrade,
  onStartNode,
  onStartFresh,
  onDismiss,
}: ConfigUpgradeDialogProps) {
  const stale = configState === "stale";
  const upgraded = configState === "upgraded";
  const unreadable = configState === "unreadable";
  const canUpgrade = stale && hasKeystore;
  const hasDropped = configDropped.length > 0;
  const shouldShow = stale || upgraded || unreadable;

  if (!shouldShow) return null;

  // QML d.heading / d.body / d.accent, line for line.
  const heading = upgraded
    ? "Config updated"
    : unreadable
      ? "This config can't be read"
      : canUpgrade
        ? "Your config is out of date"
        : "This config can't be updated";

  const body = upgraded
    ? hasDropped
      ? "Your settings and keys were carried over. These couldn't be — they no longer exist in this release:"
      : "Your settings and keys were carried over."
    : unreadable
      ? refusalReason
      : canUpgrade
        ? "It was written for an older release, so the node won't start with it. Updating rebuilds it against this release and keeps your settings and your keys."
        : "No keystore was found next to it, so a replacement can't be built from your keys. Starting fresh will create a new keystore — a new wallet, and a new set of keys.";

  const accent = upgraded ? "success" : unreadable ? "error" : "primary";

  // Which face is live — a single attribute the test reads instead of re-deriving.
  const face = upgraded
    ? "upgraded"
    : unreadable
      ? "unreadable"
      : canUpgrade
        ? "stale"
        : "nokeystore";

  const footer = (
    <div className="config-upgrade__actions">
      {/* leftActions: "Not now" — hidden on the upgraded face (QML visible: !d.upgraded). */}
      {!upgraded && (
        <Button
          data-testid="config-upgrade-dismiss"
          disabled={busy}
          onClick={onDismiss}
        >
          Not now
        </Button>
      )}
      <span className="config-upgrade__actions-spacer" />
      {/* rightActions, visibility exactly as the QML. */}
      {canUpgrade && (
        <Button
          data-testid="config-upgrade-update"
          variant="primary"
          disabled={busy}
          onClick={onUpgrade}
        >
          Update config
        </Button>
      )}
      {stale && !hasKeystore && (
        <Button
          data-testid="config-upgrade-start-fresh"
          disabled={busy}
          onClick={onStartFresh}
        >
          Start fresh
        </Button>
      )}
      {upgraded && (
        <Button
          data-testid="config-upgrade-start-node"
          variant="primary"
          disabled={busy}
          onClick={onStartNode}
        >
          Start node
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      open
      className="config-upgrade"
      title={
        <span data-testid="config-upgrade-title" data-accent={accent} data-face={face}>
          {heading}
        </span>
      }
      footer={footer}
    >
      <div data-testid="config-upgrade-dialog" data-face={face} data-busy={busy}>
        <p data-testid="config-upgrade-body" className="config-upgrade__body">
          {body}
        </p>

        {/* Upgraded face: dropped-settings list (copyable) + the "comments aren't
            carried over" caption. */}
        {upgraded && (
          <div className="config-upgrade__report">
            {hasDropped && (
              <div className="config-upgrade__dropped" data-testid="config-upgrade-dropped">
                <div className="config-upgrade__dropped-copy">
                  <CopyButton
                    value={configDropped.join("\n")}
                    title="Copy dropped settings"
                  />
                </div>
                <ul className="config-upgrade__dropped-list">
                  {configDropped.map((line, i) => (
                    <li key={i} className="config-upgrade__dropped-item">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="config-upgrade__caption">
              Comments and formatting from the original aren't carried over.
            </p>
          </div>
        )}

        {/* SavedFileRow: previous-config backup + merge report, only when upgraded. */}
        {upgraded && configBackupPath.length > 0 && (
          <div className="config-upgrade__file-row" data-testid="config-upgrade-backup-path">
            <span className="config-upgrade__file-label">Previous config</span>
            <span className="config-upgrade__file-path" title={configBackupPath}>
              {configBackupPath}
            </span>
            <CopyButton value={configBackupPath} title="Copy backup path" />
          </div>
        )}
        {upgraded && mergeConfigReportPath.length > 0 && (
          <div className="config-upgrade__file-row" data-testid="config-upgrade-report-path">
            <span className="config-upgrade__file-label">What wasn't carried over</span>
            <span className="config-upgrade__file-path" title={mergeConfigReportPath}>
              {mergeConfigReportPath}
            </span>
            <CopyButton value={mergeConfigReportPath} title="Copy report path" />
          </div>
        )}

        {/* Error notice — hidden while busy (QML shown: error && !busy). */}
        {upgradeError.length > 0 && !busy && (
          <Toast
            variant="error"
            className="config-upgrade__error"
            message={
              <span data-testid="config-upgrade-error">
                <strong>Couldn't update the config</strong> — {upgradeError}
              </span>
            }
          />
        )}

        {/* Busy row: spinner + "Updating…". */}
        {busy && (
          <div className="config-upgrade__busy" data-testid="config-upgrade-busy" role="status">
            <span className="config-upgrade__spinner" aria-hidden="true" />
            <span>Updating…</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
