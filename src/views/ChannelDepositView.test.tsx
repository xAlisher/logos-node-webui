import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import {
  ChannelDepositView,
  type NotesState,
} from "./ChannelDepositView";
import type { WalletAccount } from "./WalletView";

const A = "a".repeat(64);
const B = "c".repeat(64);
const CHANNEL = "d".repeat(64);
const TIP = "e".repeat(64);

const ACC_A: WalletAccount = { address: A, name: "Acct A", roleLabel: "key", balance: "", notes: {} };
const ACC_B: WalletAccount = { address: B, name: "Acct B", roleLabel: "key", balance: "", notes: {} };

const NOTES: NotesState = {
  loading: false,
  notes: { n1: 1000000000, n2: 2000000000 },
  tip: "",
  error: "",
  loadedAddress: "",
};

function setup(props: Partial<React.ComponentProps<typeof ChannelDepositView>> = {}) {
  const onGetNotes = vi.fn();
  const onSubmit = vi.fn();
  const onReset = vi.fn();
  const utils = render(
    <ChannelDepositView
      accounts={[ACC_A, ACC_B]}
      nodeRunning
      nodeOffReason=""
      nodeOffSeverity="info"
      lezChannelId=""
      notes={NOTES}
      onGetNotes={onGetNotes}
      onSubmit={onSubmit}
      onReset={onReset}
      result={{ pending: false, success: false, text: "" }}
      {...props}
    />,
  );
  return { onGetNotes, onSubmit, onReset, ...utils };
}

async function pickAccount() {
  await userEvent.click(screen.getByRole("button", { name: "Deposit from" }));
  await userEvent.click(screen.getByText("Acct A"));
}

test("node-off banner + 'Step 1 of 4' indicator", () => {
  setup({ nodeOffReason: "Node is off." });
  expect(screen.getByTestId("node-off-notice")).toHaveTextContent("Node is off.");
  expect(screen.getByTestId("deposit-step-indicator")).toHaveTextContent("Step 1 of 4");
});

test("notes states: choose-account → loading → list", async () => {
  const { onGetNotes, rerender } = setup();
  expect(screen.getByTestId("deposit-notes-choose")).toBeInTheDocument();
  await pickAccount();
  expect(onGetNotes).toHaveBeenCalledWith(A);
  // list is visible because the notes prop is populated
  expect(screen.getByTestId("deposit-note-selector")).toHaveTextContent("n1");

  rerender(
    <ChannelDepositView
      accounts={[ACC_A, ACC_B]}
      nodeRunning
      nodeOffReason=""
      nodeOffSeverity="info"
      lezChannelId=""
      notes={{ ...NOTES, loading: true, notes: {} }}
      onGetNotes={onGetNotes}
      onSubmit={vi.fn()}
      onReset={vi.fn()}
      result={{ pending: false, success: false, text: "" }}
    />,
  );
  expect(screen.getByTestId("deposit-notes-loading")).toBeInTheDocument();
});

test("selecting a note updates the running total and gates Next", async () => {
  setup();
  await pickAccount();
  expect(screen.getByTestId("deposit-next")).toBeDisabled();
  await userEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(screen.getByTestId("deposit-note-total")).toHaveTextContent(/1 selected/);
  expect(screen.getByTestId("deposit-next")).toBeEnabled();
});

test("channel-id field validation error for non-64-hex", async () => {
  setup();
  await pickAccount();
  await userEvent.click(screen.getAllByRole("checkbox")[0]);
  await userEvent.click(screen.getByTestId("deposit-next"));

  fireEvent.change(screen.getByTestId("deposit-channel-id-field"), { target: { value: "nothex" } });
  expect(screen.getByTestId("deposit-channel-id-error")).toBeInTheDocument();
  fireEvent.change(screen.getByTestId("deposit-channel-id-field"), { target: { value: CHANNEL } });
  expect(screen.queryByTestId("deposit-channel-id-error")).toBeNull();
});

test("LEZ preset prefills the channel id and makes the field read-only", async () => {
  setup({ lezChannelId: CHANNEL });
  await pickAccount();
  await userEvent.click(screen.getAllByRole("checkbox")[0]);
  await userEvent.click(screen.getByTestId("deposit-next"));

  const field = screen.getByTestId("deposit-channel-id-field") as HTMLInputElement;
  const preset = screen.getByTestId("deposit-lez-preset").querySelector("input")!;
  await userEvent.click(preset);
  expect(field.value).toBe(CHANNEL);
  expect(field).toHaveAttribute("readonly");
  await userEvent.click(preset);
  expect(field.value).toBe("");
});

test("funding list: add a second account, then remove it", async () => {
  setup();
  await pickAccount();
  await userEvent.click(screen.getAllByRole("checkbox")[0]);
  await userEvent.click(screen.getByTestId("deposit-next"));

  // Prefilled with the deposit-from account.
  expect(screen.getByTestId("deposit-funding-remove-0")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Funding account" }));
  await userEvent.click(screen.getByText("Acct B"));
  await userEvent.click(screen.getByTestId("deposit-funding-add"));
  expect(screen.getByTestId("deposit-funding-remove-1")).toBeInTheDocument();

  await userEvent.click(screen.getByTestId("deposit-funding-remove-1"));
  expect(screen.queryByTestId("deposit-funding-remove-1")).toBeNull();
});

test("'Use query tip' fills the tip field from the notes query", async () => {
  setup({ notes: { ...NOTES, tip: TIP } });
  await pickAccount();
  await userEvent.click(screen.getAllByRole("checkbox")[0]);
  await userEvent.click(screen.getByTestId("deposit-next"));
  await userEvent.click(screen.getByTestId("deposit-use-query-tip"));
  expect((screen.getByTestId("deposit-tip-field") as HTMLInputElement).value).toBe(TIP);
});

test("confirm step guards the deposit; only Confirm & deposit submits the exact payload", async () => {
  const { onSubmit } = setup();
  await pickAccount();
  await userEvent.click(screen.getAllByRole("checkbox")[0]);
  await userEvent.click(screen.getByTestId("deposit-next")); // → fields

  fireEvent.change(screen.getByTestId("deposit-channel-id-field"), { target: { value: CHANNEL } });
  fireEvent.change(screen.getByTestId("deposit-max-fee-field"), { target: { value: "1" } });
  await userEvent.click(screen.getByTestId("deposit-next")); // → confirm

  expect(screen.getByTestId("deposit-confirm-review")).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();

  await userEvent.click(screen.getByTestId("deposit-confirm-submit"));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit.mock.calls[0][0]).toEqual({
    channelIdHex: CHANNEL,
    inputNoteIds: ["n1"],
    metadataBase58: "",
    changePublicKey: A,
    fundingPublicKeys: [A],
    maxTxFee: "1",
    tipHex: "",
  });
});

test("Confirm & deposit is disabled when the node is off", async () => {
  setup({ nodeRunning: false });
  await pickAccount();
  await userEvent.click(screen.getAllByRole("checkbox")[0]);
  await userEvent.click(screen.getByTestId("deposit-next"));
  fireEvent.change(screen.getByTestId("deposit-channel-id-field"), { target: { value: CHANNEL } });
  fireEvent.change(screen.getByTestId("deposit-max-fee-field"), { target: { value: "1" } });
  await userEvent.click(screen.getByTestId("deposit-next"));
  expect(screen.getByTestId("deposit-confirm-submit")).toBeDisabled();
});

test("result: submitting spinner → success hash + New deposit resets", async () => {
  const { onReset, rerender } = setup({
    result: { pending: true, success: false, text: "" },
  });
  // Jump to the result step by submitting is internal; render the result panel
  // directly via the wizard reaching step 3 is covered by state — assert the
  // pending + success rendering through props.
  const base = {
    accounts: [ACC_A, ACC_B],
    nodeRunning: true,
    nodeOffReason: "",
    nodeOffSeverity: "info" as const,
    lezChannelId: "",
    notes: NOTES,
    onGetNotes: vi.fn(),
    onSubmit: vi.fn(),
    onReset,
  };

  // Drive the wizard to the result step, then flip result to success.
  await pickAccount();
  await userEvent.click(screen.getAllByRole("checkbox")[0]);
  await userEvent.click(screen.getByTestId("deposit-next"));
  fireEvent.change(screen.getByTestId("deposit-channel-id-field"), { target: { value: CHANNEL } });
  fireEvent.change(screen.getByTestId("deposit-max-fee-field"), { target: { value: "1" } });
  await userEvent.click(screen.getByTestId("deposit-next"));
  await userEvent.click(screen.getByTestId("deposit-confirm-submit"));

  rerender(<ChannelDepositView {...base} result={{ pending: true, success: false, text: "" }} />);
  expect(screen.getByTestId("deposit-submitting")).toBeInTheDocument();

  rerender(<ChannelDepositView {...base} result={{ pending: false, success: true, text: "0xhash" }} />);
  expect(screen.getByTestId("deposit-result")).toHaveTextContent("Deposit submitted");
  expect(screen.getByTestId("deposit-result")).toHaveTextContent("0xhash");

  await userEvent.click(screen.getByTestId("deposit-new-deposit"));
  expect(onReset).toHaveBeenCalled();
});
