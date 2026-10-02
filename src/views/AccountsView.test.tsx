import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { AccountsView } from "./AccountsView";
import type { WalletAccount } from "./WalletView";

const ACC: WalletAccount = {
  address: "a".repeat(64),
  name: "Acct A",
  roleLabel: "Mining / claim key",
  balance: "5000000000", // 5 LGO
  notes: {},
};

function renderView(props: Partial<React.ComponentProps<typeof AccountsView>> = {}) {
  const onRefresh = vi.fn();
  render(
    <AccountsView
      accounts={[ACC]}
      nodeOffReason=""
      nodeOffSeverity="info"
      onRefresh={onRefresh}
      {...props}
    />,
  );
  return { onRefresh };
}

test("node-off banner shows and suppresses the empty/list region", () => {
  render(
    <AccountsView
      accounts={[]}
      nodeOffReason="The node isn't running yet."
      nodeOffSeverity="info"
      onRefresh={vi.fn()}
    />,
  );
  expect(screen.getByTestId("node-off-notice")).toHaveTextContent("isn't running");
  expect(screen.queryByTestId("accounts-empty")).toBeNull();
  // Refresh is disabled when the node is off.
  expect(screen.getByTestId("accounts-refresh")).toBeDisabled();
});

test("empty state when the node is on and the wallet has no accounts", () => {
  renderView({ accounts: [] });
  expect(screen.getByTestId("accounts-empty")).toHaveTextContent(
    "No accounts in this wallet yet.",
  );
});

test("renders a row per account: name, role, address, formatted balance + copy", () => {
  renderView();
  const list = screen.getByTestId("accounts-list");
  expect(list).toHaveTextContent("Acct A");
  expect(list).toHaveTextContent("Mining / claim key");
  expect(list).toHaveTextContent("a".repeat(64));
  expect(list.textContent).toMatch(/5\s*LGO/);
  expect(screen.getByRole("button", { name: "Copy address" })).toBeInTheDocument();
});

test("Refresh is enabled when node on and calls onRefresh", async () => {
  const { onRefresh } = renderView();
  const btn = screen.getByTestId("accounts-refresh");
  expect(btn).toBeEnabled();
  await userEvent.click(btn);
  expect(onRefresh).toHaveBeenCalledOnce();
});
