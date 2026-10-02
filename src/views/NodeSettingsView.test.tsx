import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { NodeSettingsView, type NodeSettingsApi } from "./NodeSettingsView";

const noNodeOff = { nodeOffReason: "", nodeOffSeverity: "info" as const };

function stubApi(over: Partial<NodeSettingsApi> = {}): Partial<NodeSettingsApi> {
  return {
    backupKeystore: vi.fn().mockResolvedValue(undefined),
    upgradeConfig: vi.fn().mockResolvedValue({ dropped: [], backupPath: "", reportPath: "" }),
    startNode: vi.fn(),
    startNewNode: vi.fn(),
    startFresh: vi.fn(),
    ...over,
  };
}

// --- Layout: the three cards + the node-off notice ---
test("renders the three cards; default (never-run) node shows the absent states", () => {
  render(<NodeSettingsView {...noNodeOff} />);
  expect(screen.getByTestId("settings-config-card")).toBeInTheDocument();
  expect(screen.getByTestId("settings-keys-card")).toBeInTheDocument();
  expect(screen.getByTestId("settings-reset-db-card")).toBeInTheDocument();
  // No keystore / db yet → both absent notices.
  expect(screen.getByTestId("settings-keystore-absent")).toBeInTheDocument();
  expect(screen.getByTestId("settings-db-absent")).toBeInTheDocument();
  // Download disabled with no keystore.
  expect(screen.getByTestId("settings-keys-download")).toBeDisabled();
});

test("renders the node-off notice when the node is off", () => {
  render(<NodeSettingsView nodeOffReason="Node is stopped" nodeOffSeverity="warning" />);
  expect(screen.getByTestId("node-off-notice")).toHaveTextContent("Node is stopped");
});

// --- settings-user-config-field: editingFinished sets userConfig + change notice + copy ---
test("editing the user-config field sets the path, reveals copy + the config-changed notice", async () => {
  render(<NodeSettingsView {...noNodeOff} />);
  const field = screen.getByTestId("settings-user-config-field");
  await userEvent.type(field, "/home/x/node.yaml");
  await userEvent.tab(); // blur → editingFinished

  expect(screen.getByTestId("settings-config-changed-notice")).toHaveTextContent(
    "Config changed. Start the node to use it."
  );
  expect(screen.getByTitle("Copy user config path")).toBeInTheDocument();
});

// --- settings-user-config-browse: the Browse button drives the (hidden) file picker ---
test("Browse selects a user-config path via the file input", async () => {
  render(<NodeSettingsView {...noNodeOff} />);
  const file = new File(["---"], "picked.yaml", { type: "text/yaml" });
  await userEvent.upload(screen.getByTestId("settings-user-config-file"), file);
  expect(screen.getByTestId("settings-user-config-field")).toHaveValue("picked.yaml");
});

// --- settings-deployment-field / browse ---
test("deployment config field + browse", async () => {
  render(<NodeSettingsView {...noNodeOff} />);
  const dep = screen.getByTestId("settings-deployment-field");
  await userEvent.type(dep, "/etc/deploy.yaml");
  await userEvent.tab();
  expect(screen.getByTitle("Copy deployment config path")).toBeInTheDocument();
});

// --- settings-update-config: visible only when configStale ---
test("Update config appears only when the config is stale", () => {
  const { unmount } = render(<NodeSettingsView {...noNodeOff} />);
  expect(screen.queryByTestId("settings-update-config")).toBeNull();
  unmount();
  render(<NodeSettingsView {...noNodeOff} initial={{ configStale: true }} />);
  expect(screen.getByTestId("settings-update-config")).toBeInTheDocument();
});

// --- settings-start-new-node ---
test("Start a new node fires the host flow", async () => {
  const api = stubApi();
  render(<NodeSettingsView {...noNodeOff} api={api} />);
  await userEvent.click(screen.getByTestId("settings-start-new-node"));
  expect(api.startNewNode).toHaveBeenCalledOnce();
});

// --- settings-config-canchange: disabled while the node is running ---
test("config fields + buttons are disabled while the node is running (canChange=false)", () => {
  render(
    <NodeSettingsView
      {...noNodeOff}
      initial={{ canChange: false, nodeRunning: true, configStale: true }}
    />
  );
  expect(screen.getByTestId("settings-config-card")).toHaveAttribute("data-can-change", "false");
  expect(screen.getByTestId("settings-user-config-field")).toBeDisabled();
  expect(screen.getByTestId("settings-user-config-browse")).toBeDisabled();
  expect(screen.getByTestId("settings-deployment-field")).toBeDisabled();
  expect(screen.getByTestId("settings-deployment-browse")).toBeDisabled();
  expect(screen.getByTestId("settings-update-config")).toBeDisabled();
  expect(screen.getByTestId("settings-start-new-node")).toBeDisabled();
});

// --- settings-keys-download SUCCESS: shell toast (not inline), Done badge, callback ---
test("keystore backup success raises a shell toast + Done badge, no inline error", async () => {
  const onBackupSuccess = vi.fn();
  const api = stubApi();
  render(
    <NodeSettingsView
      {...noNodeOff}
      api={api}
      onBackupSuccess={onBackupSuccess}
      initial={{ nodeKeystorePath: "/home/x/keystore.yaml" }}
    />
  );
  const download = screen.getByTestId("settings-keys-download");
  expect(download).toBeEnabled();
  await userEvent.click(download);

  expect(api.backupKeystore).toHaveBeenCalledOnce();
  // Success is a shell-level toast + the "Done" badge, NOT an inline Settings element.
  expect(await screen.findByTestId("keystore-backup-toast")).toHaveTextContent("Keystore saved");
  expect(screen.getByTestId("settings-keys-done-badge")).toBeInTheDocument();
  expect(onBackupSuccess).toHaveBeenCalledOnce();
  expect(screen.queryByTestId("settings-keys-backup-error")).toBeNull();
});

// --- settings-keys-backup-error FAILURE: inline, closable + copy, no toast ---
test("keystore backup failure shows the inline error (closable + copy), no toast", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  const api = stubApi({ backupKeystore: vi.fn().mockRejectedValue(new Error("permission denied")) });
  render(
    <NodeSettingsView
      {...noNodeOff}
      api={api}
      initial={{ nodeKeystorePath: "/home/x/keystore.yaml" }}
    />
  );
  await userEvent.click(screen.getByTestId("settings-keys-download"));

  const err = await screen.findByTestId("settings-keys-backup-error");
  expect(err).toHaveTextContent("permission denied");
  expect(screen.queryByTestId("keystore-backup-toast")).toBeNull();

  // Copy the error, then dismiss the notice.
  await userEvent.click(within(err).getByTitle("Copy error"));
  expect(writeText).toHaveBeenCalledWith("permission denied");
  await userEvent.click(screen.getByLabelText("Dismiss"));
  expect(screen.queryByTestId("settings-keys-backup-error")).toBeNull();
});

// --- Config-upgrade flow: Update config → dialog → upgrade → upgraded face → Start node ---
test("Update config opens the dialog and runs the upgrade to the upgraded face", async () => {
  const api = stubApi({
    upgradeConfig: vi.fn().mockResolvedValue({
      dropped: ["pow.threads"],
      backupPath: "/home/x/config.bak.yaml",
      reportPath: "/home/x/report.txt",
    }),
  });
  render(
    <NodeSettingsView
      {...noNodeOff}
      api={api}
      initial={{ configStale: true, nodeKeystorePath: "/home/x/keystore.yaml" }}
    />
  );
  // Open the dialog from Settings.
  await userEvent.click(screen.getByTestId("settings-update-config"));
  expect(screen.getByTestId("config-upgrade-dialog")).toHaveAttribute("data-face", "stale");

  // Run the (mocked) upgrade.
  await userEvent.click(screen.getByTestId("config-upgrade-update"));
  expect(api.upgradeConfig).toHaveBeenCalledOnce();

  // Upgraded face with the dropped list + paths.
  const dialog = await screen.findByTestId("config-upgrade-dialog");
  expect(dialog).toHaveAttribute("data-face", "upgraded");
  expect(screen.getByTestId("config-upgrade-dropped")).toHaveTextContent("pow.threads");

  // Start node closes the dialog.
  await userEvent.click(screen.getByTestId("config-upgrade-start-node"));
  expect(api.startNode).toHaveBeenCalledOnce();
  expect(screen.queryByTestId("config-upgrade-dialog")).toBeNull();
});

test("a failing upgrade surfaces the dialog error notice", async () => {
  const api = stubApi({ upgradeConfig: vi.fn().mockRejectedValue(new Error("merge failed")) });
  render(
    <NodeSettingsView
      {...noNodeOff}
      api={api}
      initial={{ configStale: true, nodeKeystorePath: "/home/x/keystore.yaml" }}
    />
  );
  await userEvent.click(screen.getByTestId("settings-update-config"));
  await userEvent.click(screen.getByTestId("config-upgrade-update"));
  expect(await screen.findByTestId("config-upgrade-error")).toHaveTextContent("merge failed");
});
