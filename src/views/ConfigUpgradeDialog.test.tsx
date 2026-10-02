import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { ConfigUpgradeDialog } from "./ConfigUpgradeDialog";

test("renders nothing when hidden", () => {
  render(<ConfigUpgradeDialog configState="hidden" />);
  expect(screen.queryByTestId("config-upgrade-dialog")).toBeNull();
});

// --- dialog-config-upgrade-stale: stale + keystore face ---
test("stale + keystore: 'out of date' heading, Update config + Not now", async () => {
  const onUpgrade = vi.fn();
  const onDismiss = vi.fn();
  render(
    <ConfigUpgradeDialog
      configState="stale"
      hasKeystore
      onUpgrade={onUpgrade}
      onDismiss={onDismiss}
    />
  );
  expect(screen.getByTestId("config-upgrade-dialog")).toHaveAttribute("data-face", "stale");
  expect(screen.getByTestId("config-upgrade-title")).toHaveTextContent("Your config is out of date");

  await userEvent.click(screen.getByTestId("config-upgrade-update"));
  expect(onUpgrade).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByTestId("config-upgrade-dismiss"));
  expect(onDismiss).toHaveBeenCalledOnce();
  // No "Start fresh" / "Start node" on this face.
  expect(screen.queryByTestId("config-upgrade-start-fresh")).toBeNull();
  expect(screen.queryByTestId("config-upgrade-start-node")).toBeNull();
});

// --- dialog-config-upgrade-nokeystore: stale, no keystore ---
test("stale, no keystore: 'can't be updated' + Start fresh", async () => {
  const onStartFresh = vi.fn();
  render(
    <ConfigUpgradeDialog configState="stale" hasKeystore={false} onStartFresh={onStartFresh} />
  );
  expect(screen.getByTestId("config-upgrade-dialog")).toHaveAttribute("data-face", "nokeystore");
  expect(screen.getByTestId("config-upgrade-title")).toHaveTextContent("This config can't be updated");
  expect(screen.queryByTestId("config-upgrade-update")).toBeNull();
  await userEvent.click(screen.getByTestId("config-upgrade-start-fresh"));
  expect(onStartFresh).toHaveBeenCalledOnce();
});

// --- dialog-config-upgrade-unreadable ---
test("unreadable: shows the refusal reason, Not now only", () => {
  render(
    <ConfigUpgradeDialog
      configState="unreadable"
      refusalReason="missing field `genesis`"
    />
  );
  expect(screen.getByTestId("config-upgrade-title")).toHaveTextContent("This config can't be read");
  expect(screen.getByTestId("config-upgrade-body")).toHaveTextContent("missing field `genesis`");
  expect(screen.getByTestId("config-upgrade-dismiss")).toBeInTheDocument();
  expect(screen.queryByTestId("config-upgrade-update")).toBeNull();
  expect(screen.queryByTestId("config-upgrade-start-node")).toBeNull();
});

// --- dialog-config-upgrade-upgraded + dialog-config-upgrade-dropped-copy ---
test("upgraded: dropped list (copyable) + backup/report paths + Start node", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  const onStartNode = vi.fn();
  render(
    <ConfigUpgradeDialog
      configState="upgraded"
      configDropped={["blend.core.backend.core_peering_degree", "pow.threads"]}
      configBackupPath="/home/x/config.bak.yaml"
      mergeConfigReportPath="/home/x/merge-report.txt"
      onStartNode={onStartNode}
    />
  );
  expect(screen.getByTestId("config-upgrade-title")).toHaveTextContent("Config updated");
  const dropped = screen.getByTestId("config-upgrade-dropped");
  expect(dropped).toHaveTextContent("core_peering_degree");
  expect(dropped).toHaveTextContent("pow.threads");
  expect(screen.getByTestId("config-upgrade-backup-path")).toHaveTextContent("config.bak.yaml");
  expect(screen.getByTestId("config-upgrade-report-path")).toHaveTextContent("merge-report.txt");

  // Copy the dropped list — joined with newlines.
  await userEvent.click(within_dropped_copy());
  expect(writeText).toHaveBeenCalledWith(
    "blend.core.backend.core_peering_degree\npow.threads"
  );

  // No "Not now" on the upgraded face; Start node is the only exit.
  expect(screen.queryByTestId("config-upgrade-dismiss")).toBeNull();
  await userEvent.click(screen.getByTestId("config-upgrade-start-node"));
  expect(onStartNode).toHaveBeenCalledOnce();

  function within_dropped_copy() {
    return dropped.querySelector("button") as HTMLElement;
  }
});

// --- dialog-config-upgrade-busy ---
test("busy: shows the Updating… row and disables every action", () => {
  render(<ConfigUpgradeDialog configState="stale" hasKeystore busy />);
  expect(screen.getByTestId("config-upgrade-busy")).toHaveTextContent("Updating…");
  expect(screen.getByTestId("config-upgrade-update")).toBeDisabled();
  expect(screen.getByTestId("config-upgrade-dismiss")).toBeDisabled();
});

test("error notice shows when an error is set and not busy", () => {
  const { rerender } = render(
    <ConfigUpgradeDialog configState="stale" hasKeystore upgradeError="disk full" />
  );
  expect(screen.getByTestId("config-upgrade-error")).toHaveTextContent("disk full");
  // Hidden while busy (QML shown: error && !busy).
  rerender(<ConfigUpgradeDialog configState="stale" hasKeystore upgradeError="disk full" busy />);
  expect(screen.queryByTestId("config-upgrade-error")).toBeNull();
});
