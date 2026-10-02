import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { Shell } from "./Shell";
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
