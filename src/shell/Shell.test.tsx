import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { Shell } from "./Shell";
import { BackendStatus, ConfigState } from "./shellState";
import { TABS } from "./tabs";

test("shell renders header, the six tabs in order, and the first section", () => {
  render(<Shell />);

  expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  expect(screen.getByTestId("shell-header")).toHaveTextContent("Blockchain Node");

  // The REAL tab order: Node, Rewards, Explorer, Wallet, Mining, Settings.
  const tabs = screen.getAllByRole("tab");
  expect(tabs.map((t) => t.textContent)).toEqual([
    "Node",
    "Rewards",
    "Explorer",
    "Wallet",
    "Mining",
    "Settings",
  ]);
  expect(TABS.map((t) => t.label)).toEqual(tabs.map((t) => t.textContent));

  // First tab active, its section mounted.
  expect(screen.getByRole("tab", { name: "Node" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByTestId("view-node-dashboard")).toBeInTheDocument();
});

test("tab switching mounts the selected section and unmounts the previous", async () => {
  const user = userEvent.setup();
  render(<Shell />);

  expect(screen.getByTestId("view-node-dashboard")).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "Mining" }));
  expect(screen.getByRole("tab", { name: "Mining" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByTestId("view-mining")).toBeInTheDocument();
  // StackLayout-equivalent renders only the active section.
  expect(screen.queryByTestId("view-node-dashboard")).not.toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "Settings" }));
  expect(screen.getByTestId("view-node-settings")).toBeInTheDocument();
});

test("NodeOffNotice shows in a node-dependent view when the node is off", async () => {
  const user = userEvent.setup();
  // The Node (dashboard) tab conveys node status through its own status hero (a
  // faithful replica of NodeDashboardView.qml, which carries no NodeOffNotice), so
  // assert the shared banner on another node-dependent view — here, Mining.
  render(<Shell nodeOffReason="The node isn't running yet." nodeOffSeverity="warning" />);
  await user.click(screen.getByRole("tab", { name: "Mining" }));

  const panel = screen.getByRole("tabpanel");
  const notice = within(panel).getByTestId("node-off-notice");
  expect(notice).toHaveTextContent("The node isn't running yet.");
  expect(notice).toHaveAttribute("data-severity", "warning");
});

test("NodeOffNotice is absent when the node is answering (empty reason)", () => {
  render(<Shell nodeOffReason="" />);
  expect(screen.queryByTestId("node-off-notice")).not.toBeInTheDocument();
});

test("chain-id footer appears only when a chain id is reported", () => {
  const { rerender } = render(<Shell />);
  expect(screen.queryByTestId("chain-footer")).not.toBeInTheDocument();

  rerender(<Shell chainId="logos-testnet-0.3.0" />);
  expect(screen.getByTestId("chain-footer")).toHaveTextContent("logos-testnet-0.3.0");
});

// ---------------------------------------------------------------------------
// Global orchestration (§0)
// ---------------------------------------------------------------------------

describe("Shell — connecting state (shell-connecting-state)", () => {
  test("while not ready, shows the centered spinner + connecting text and no node UI", () => {
    render(<Shell model={{ ready: false }} />);
    expect(screen.getByTestId("shell-connecting")).toHaveTextContent("Connecting to blockchain backend");
    expect(screen.queryByTestId("shell-header")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});

describe("Shell — page routing (shell-page-routing, shell-onboarding-vs-running)", () => {
  test("ready + no config → onboarding page 0", () => {
    render(<Shell model={{ ready: true, hasConfig: false }} />);
    const stack = screen.getByTestId("shell-stack-layout");
    expect(stack).toHaveAttribute("data-page", "0");
    expect(screen.getByTestId("shell-onboarding")).toBeInTheDocument();
    expect(screen.queryByTestId("shell-header")).toBeNull();
  });

  test("ready + config + setup closed → node page 1", () => {
    render(<Shell model={{ ready: true, hasConfig: true }} />);
    expect(screen.getByTestId("shell-stack-layout")).toHaveAttribute("data-page", "1");
    expect(screen.getByTestId("shell-header")).toBeInTheDocument();
  });

  test("setup open routes to onboarding even with a config", () => {
    render(<Shell model={{ ready: true, hasConfig: true, setupOpen: true }} />);
    expect(screen.getByTestId("shell-onboarding")).toBeInTheDocument();
  });
});

describe("Shell — needs-setup re-open (shell-needs-setup-reopen)", () => {
  test("config disappearing while ready re-opens setup automatically", () => {
    const { rerender } = render(<Shell model={{ ready: true, hasConfig: true }} />);
    expect(screen.getByTestId("shell-stack-layout")).toHaveAttribute("data-page", "1");

    // Config goes away → onboarding returns, and setup is re-armed (setup-open true).
    rerender(<Shell model={{ ready: true, hasConfig: false }} />);
    const stack = screen.getByTestId("shell-stack-layout");
    expect(stack).toHaveAttribute("data-page", "0");
    expect(stack).toHaveAttribute("data-setup-open", "true");
  });
});

describe("Shell — node-off reason feeds views (shell-node-off-reason)", () => {
  test("computed reason/severity from the model reaches a node-dependent view", async () => {
    const user = userEvent.setup();
    render(<Shell model={{ ready: true, hasConfig: true, status: BackendStatus.Error, moduleReachable: true }} />);
    await user.click(screen.getByRole("tab", { name: "Mining" }));
    const notice = within(screen.getByRole("tabpanel")).getByTestId("node-off-notice");
    expect(notice).toHaveTextContent("stopped unexpectedly");
    expect(notice).toHaveAttribute("data-severity", "error");
  });
});

describe("Shell — claimable-poll gating (shell-claimable-poll-gating)", () => {
  test("the poll marker is active only while the Mining tab is open and the node runs", async () => {
    const user = userEvent.setup();
    render(<Shell model={{ ready: true, hasConfig: true, status: BackendStatus.Running, synced: true }} />);

    // Node tab open → poll inactive.
    expect(screen.getByTestId("shell-claimable-poll")).toHaveAttribute("data-active", "false");

    await user.click(screen.getByRole("tab", { name: "Mining" }));
    expect(screen.getByTestId("shell-claimable-poll")).toHaveAttribute("data-active", "true");

    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.getByTestId("shell-claimable-poll")).toHaveAttribute("data-active", "false");
  });
});

describe("Shell — stop-failed toast (shell-stop-failed-toast)", () => {
  test("a failing stopNode raises the 'Couldn't stop the node' toast", async () => {
    const user = userEvent.setup();
    render(
      <Shell
        model={{ ready: true, hasConfig: true, status: BackendStatus.Running }}
        deps={{ stopNode: () => Promise.reject(new Error("timeout")) }}
      />,
    );
    // Running → the Run button is Stop Node.
    const run = screen.getByTestId("header-run-button");
    expect(run).toHaveTextContent("Stop Node");
    await user.click(run);
    await waitFor(() =>
      expect(screen.getByTestId("shell-toast-error")).toHaveTextContent("Couldn't stop the node"),
    );
  });
});

describe("Shell — keystore-backup toast (shell-keystore-backup-toast)", () => {
  test("a successful keystore backup in Settings raises the 'Keystore saved' toast", async () => {
    const user = userEvent.setup();
    const backupKeystore = vi.fn().mockResolvedValue(undefined);
    render(
      <Shell
        initialTab="settings"
        model={{ ready: true, hasConfig: true, status: BackendStatus.NotStarted }}
        settingsModel={{ nodeKeystorePath: "/home/x/keystore.yaml" }}
        settingsApi={{ backupKeystore }}
      />,
    );
    await user.click(screen.getByTestId("settings-keys-download"));
    expect(backupKeystore).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTestId("shell-toast-success")).toHaveTextContent("Keystore saved"),
    );
    expect(screen.getByTestId("shell-toast-success")).toHaveTextContent("/home/x/keystore.yaml");
  });
});

describe("Shell — Start triggers the config-upgrade dialog (header-start-triggers-upgrade)", () => {
  test("pressing Start with a stale config opens the ConfigUpgradeDialog instead of starting", async () => {
    const user = userEvent.setup();
    const startNode = vi.fn();
    render(
      <Shell
        model={{ ready: true, hasConfig: true, status: BackendStatus.Stopped, configState: ConfigState.Stale }}
        deps={{ startNode }}
      />,
    );
    const run = screen.getByTestId("header-run-button");
    expect(run).toHaveTextContent("Start Node");
    await user.click(run);
    // The dialog shows its stale face; the node was NOT started.
    expect(screen.getByTestId("config-upgrade-dialog")).toBeInTheDocument();
    expect(startNode).not.toHaveBeenCalled();
  });
});
