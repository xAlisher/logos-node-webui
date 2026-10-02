import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { TransferView } from "./TransferView";
import type { WalletAccount } from "./WalletView";

const FROM = "a".repeat(64);
const TO = "b".repeat(64);
const ACC: WalletAccount = {
  address: FROM,
  name: "Acct A",
  roleLabel: "key",
  balance: "5000000000", // 5 LGO
  notes: {},
};

function renderView(props: Partial<React.ComponentProps<typeof TransferView>> = {}) {
  const onTransfer = vi.fn();
  const utils = render(
    <TransferView
      accounts={[ACC]}
      nodeRunning
      nodeOffReason=""
      nodeOffSeverity="info"
      onTransfer={onTransfer}
      result={null}
      {...props}
    />,
  );
  return { onTransfer, ...utils };
}

async function selectFrom() {
  await userEvent.click(screen.getByRole("button", { name: "From account" }));
  await userEvent.click(screen.getByText(/Acct A/));
}

test("node-off banner renders from the computed reason", () => {
  renderView({ nodeRunning: false, nodeOffReason: "Node is catching up." });
  expect(screen.getByTestId("node-off-notice")).toHaveTextContent("catching up");
});

test("selecting a source shows its available balance; Send stays gated until valid", async () => {
  renderView();
  expect(screen.getByTestId("transfer-send-button")).toBeDisabled();
  await selectFrom();
  expect(screen.getByTestId("transfer-available-hint")).toHaveTextContent(/Available:\s*5/);
});

test("amount field rejects non-numeric input", () => {
  renderView();
  const amount = screen.getByTestId("transfer-amount-field") as HTMLInputElement;
  fireEvent.change(amount, { target: { value: "abc" } });
  expect(amount.value).toBe("");
  fireEvent.change(amount, { target: { value: "1.5" } });
  expect(amount.value).toBe("1.5");
});

test("over-balance shows the error and keeps Send disabled", async () => {
  renderView();
  await selectFrom();
  fireEvent.change(screen.getByTestId("transfer-to-field"), { target: { value: TO } });
  fireEvent.change(screen.getByTestId("transfer-amount-field"), { target: { value: "9" } });
  expect(screen.getByTestId("transfer-overbalance")).toBeInTheDocument();
  expect(screen.getByTestId("transfer-send-button")).toBeDisabled();
});

test("Send is guarded by a confirm modal; only confirm fires the transfer", async () => {
  const { onTransfer } = renderView();
  await selectFrom();
  fireEvent.change(screen.getByTestId("transfer-to-field"), { target: { value: TO } });
  fireEvent.change(screen.getByTestId("transfer-amount-field"), { target: { value: "2" } });

  const send = screen.getByTestId("transfer-send-button");
  expect(send).toBeEnabled();
  await userEvent.click(send);

  // Confirm dialog up, but the mutating call has NOT fired yet.
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(onTransfer).not.toHaveBeenCalled();

  await userEvent.click(screen.getByTestId("transfer-confirm"));
  expect(onTransfer).toHaveBeenCalledWith(FROM, TO, "2");
});

test("result notice: success shows the hash + copy, error shows the message", () => {
  const { rerender } = renderView({ result: { hash: "0xdeadbeef" } });
  expect(screen.getByTestId("transfer-result-notice")).toHaveTextContent("Transaction sent");
  expect(screen.getByTestId("transfer-result-notice")).toHaveTextContent("0xdeadbeef");
  expect(screen.getByRole("button", { name: "Copy tx hash" })).toBeInTheDocument();

  rerender(
    <TransferView
      accounts={[ACC]}
      nodeRunning
      nodeOffReason=""
      nodeOffSeverity="info"
      onTransfer={vi.fn()}
      result={{ error: "insufficient funds" }}
    />,
  );
  expect(screen.getByTestId("transfer-result-notice")).toHaveTextContent("Transfer failed");
  expect(screen.getByTestId("transfer-result-notice")).toHaveTextContent("insufficient funds");
});
