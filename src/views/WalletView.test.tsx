import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { WalletView } from "./WalletView";

// WalletView owns every HTTP call; mock the endpoint module so no network is hit
// and the mutating calls can be asserted.
vi.mock("../api/endpoints", () => ({
  getPowStatus: vi.fn(),
  getLeaderAgedNotes: vi.fn(),
  getWalletBalance: vi.fn(),
  transferFunds: vi.fn(),
  channelDeposit: vi.fn(),
}));

import {
  channelDeposit,
  getLeaderAgedNotes,
  getPowStatus,
  getWalletBalance,
  transferFunds,
} from "../api/endpoints";

const A = "a".repeat(64);
const TO = "b".repeat(64);
const CHANNEL = "d".repeat(64);

beforeEach(() => {
  vi.mocked(getPowStatus).mockReset();
  vi.mocked(getLeaderAgedNotes).mockReset();
  vi.mocked(getWalletBalance).mockReset();
  vi.mocked(transferFunds).mockReset();
  vi.mocked(channelDeposit).mockReset();

  // No aged notes by default → accounts come from the PoW targets alone.
  vi.mocked(getLeaderAgedNotes).mockResolvedValue({ tip: "tip0", count: 0, total_value: 0, notes: [] });

  vi.mocked(getPowStatus).mockResolvedValue({
    is_mining: true,
    are_rewards_enabled: true,
    auto_claim: {
      is_armed: true,
      tick: { unit: "seconds", value: 10 },
      targets: [{ public_key: A, threshold: 1, balance: 5000000000 }],
    },
  });
  vi.mocked(getWalletBalance).mockResolvedValue({
    tip: "tip0",
    balance: 5000000000,
    notes: { n1: 1000000000, n2: 2000000000 },
    address: A,
  });
});

function renderWallet() {
  return render(<WalletView nodeOffReason="" nodeOffSeverity="info" />);
}

test("section nav switches between the three panels", async () => {
  renderWallet();
  // Defaults to Accounts; the fetched account row lands after mount.
  await screen.findByTestId("accounts-list");
  expect(getPowStatus).toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Transfer" }));
  expect(screen.getByTestId("view-transfer")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Channel Deposit" }));
  expect(screen.getByTestId("view-channel-deposit")).toBeInTheDocument();
});

test("accounts are built from pow targets + per-key balance", async () => {
  renderWallet();
  const list = await screen.findByTestId("accounts-list");
  expect(list).toHaveTextContent(A);
  expect(list.textContent).toMatch(/5\s*LGO/);
  expect(getWalletBalance).toHaveBeenCalledWith(A);
});

test("staking keys from aged notes are merged in (deduped against pow targets)", async () => {
  const B = "b".repeat(64);
  // A is also a pow target (above); B owns aged notes only → a Staking key.
  vi.mocked(getLeaderAgedNotes).mockResolvedValue({
    tip: "tip0",
    count: 1,
    total_value: 1000000000,
    notes: [
      { public_key: A, value: 1000000000 },
      { public_key: B, value: 1000000000 },
    ] as never,
  });
  renderWallet();
  const list = await screen.findByTestId("accounts-list");
  // B (aged-notes-only) is a Staking key; A keeps the mining/claim role (pow wins).
  await waitFor(() => expect(list.textContent).toContain("Staking key"));
  expect(list.textContent).toContain("Mining / claim key");
  expect(getWalletBalance).toHaveBeenCalledWith(B);
});

test("transfer: the mutating POST fires only after the confirm step", async () => {
  vi.mocked(transferFunds).mockResolvedValue({ hash: "0xsent" });
  renderWallet();
  await screen.findByTestId("accounts-list");

  await userEvent.click(screen.getByRole("button", { name: "Transfer" }));
  await userEvent.click(screen.getByRole("button", { name: "From account" }));
  await userEvent.click(screen.getByText(/aaaaaa/));
  await userEvent.type(screen.getByTestId("transfer-to-field"), TO);
  await userEvent.type(screen.getByTestId("transfer-amount-field"), "2");

  await userEvent.click(screen.getByTestId("transfer-send-button"));
  expect(transferFunds).not.toHaveBeenCalled(); // guarded

  await userEvent.click(screen.getByTestId("transfer-confirm"));
  expect(transferFunds).toHaveBeenCalledWith(
    expect.objectContaining({
      tip: null,
      change_public_key: A,
      funding_public_keys: [A],
      recipient_public_key: TO,
      amount: 2000000000,
    }),
  );
  await screen.findByText("Transaction sent");
});

test("channel deposit: the mutating POST fires only from Confirm & deposit", async () => {
  vi.mocked(channelDeposit).mockResolvedValue({ hash: "0xdep" });
  renderWallet();
  await screen.findByTestId("accounts-list");

  await userEvent.click(screen.getByRole("button", { name: "Channel Deposit" }));
  await userEvent.click(screen.getByRole("button", { name: "Deposit from" }));
  await userEvent.click(screen.getByText(/aaaaaa/));

  // notes were fetched for the chosen account
  await waitFor(() => expect(getWalletBalance).toHaveBeenCalledWith(A));
  await userEvent.click((await screen.findAllByRole("checkbox"))[0]);
  await userEvent.click(screen.getByTestId("deposit-next"));

  const channelField = screen.getByTestId("deposit-channel-id-field");
  await userEvent.clear(channelField);
  await userEvent.type(channelField, CHANNEL);
  await userEvent.type(screen.getByTestId("deposit-max-fee-field"), "1");
  await userEvent.click(screen.getByTestId("deposit-next"));

  expect(channelDeposit).not.toHaveBeenCalled(); // guarded by the confirm step
  await userEvent.click(screen.getByTestId("deposit-confirm-submit"));
  expect(channelDeposit).toHaveBeenCalledTimes(1);
  await screen.findByText("Deposit submitted");
});
