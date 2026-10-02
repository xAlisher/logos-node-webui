import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock the API module so the view's reads/mutation are deterministic. Factory form
// so no real transport is pulled in; types are erased at runtime.
vi.mock("../api/endpoints", () => ({
  getLeaderClaimVouchers: vi.fn(),
  getLeaderAgedNotes: vi.fn(),
  getTimeInfo: vi.fn(),
  leaderClaim: vi.fn(),
}));

import {
  getLeaderAgedNotes,
  getLeaderClaimVouchers,
  getTimeInfo,
  leaderClaim,
} from "../api/endpoints";
import { LeaderRewardsView } from "./LeaderRewardsView";

const mockVouchers = vi.mocked(getLeaderClaimVouchers);
const mockAged = vi.mocked(getLeaderAgedNotes);
const mockTime = vi.mocked(getTimeInfo);
const mockClaim = vi.mocked(leaderClaim);

const TIP = "13937fee036450f9e6336b14b4387457cb4e31f962ae913f5840f9f5ec3b1daa";

function vouchersPayload(n: number) {
  return {
    tip: TIP,
    reward_amount: 3819,
    total_claimable: 3819 * n,
    vouchers: Array.from({ length: n }, (_, i) => ({
      commitment: `commit${i}`.padEnd(40, "0"),
      nullifier: `null${i}`.padEnd(40, "0"),
    })),
  };
}

function agedPayload(count: number, total: number) {
  return {
    tip: TIP,
    notes: Array.from({ length: count }, (_, i) => ({
      note_id: `note${i}`,
      value: total / Math.max(count, 1),
      public_key: "5f8870",
    })),
    count,
    total_value: total,
  };
}

const timePayload = {
  slot_duration_ms: 1000,
  genesis_time_unix_ms: 1790758800000,
  current_slot: 176848,
  current_epoch: 4,
  slots_per_epoch: 36000,
};

function setReads(voucherCount: number, agedCount = 12, agedTotal = 21171132) {
  mockVouchers.mockResolvedValue(vouchersPayload(voucherCount) as never);
  mockAged.mockResolvedValue(agedPayload(agedCount, agedTotal) as never);
  mockTime.mockResolvedValue(timePayload as never);
}

const NODE_ON = { nodeOffReason: "", nodeOffSeverity: "info" as const };
const NODE_OFF = {
  nodeOffReason: "The node isn't running yet.",
  nodeOffSeverity: "info" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LeaderRewardsView — render", () => {
  test("renders the Vouchers header + subtitle and the Claim button", async () => {
    setReads(0);
    render(<LeaderRewardsView {...NODE_ON} />);
    expect(screen.getByRole("heading", { name: "Vouchers" })).toBeInTheDocument();
    expect(screen.getByText("One claim redeems one voucher.")).toBeInTheDocument();
    expect(screen.getByTestId("rewards-claim-button")).toBeInTheDocument();
    await waitFor(() => expect(mockVouchers).toHaveBeenCalled());
  });

  test("renders both stat cards and the history section", async () => {
    setReads(2);
    render(<LeaderRewardsView {...NODE_ON} />);
    expect(screen.getByTestId("rewards-card-ready")).toBeInTheDocument();
    expect(screen.getByTestId("rewards-card-submitted")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Claim history" })).toBeInTheDocument();
    await waitFor(() => expect(mockVouchers).toHaveBeenCalled());
  });
});

describe("LeaderRewardsView — data", () => {
  test("shows the claimable count, total before fees, and aged-note stake", async () => {
    setReads(3, 7, 500000);
    render(<LeaderRewardsView {...NODE_ON} />);
    await waitFor(() =>
      expect(screen.getByTestId("rewards-ready-value")).toHaveTextContent("3"),
    );
    // ≈ total before fees (3819 * 3 = 11,457)
    expect(screen.getByText(/11,457 before fees/)).toBeInTheDocument();
    // Stake: total_value + count + epoch
    expect(screen.getByTestId("rewards-stake")).toHaveTextContent("500,000");
    expect(screen.getByTestId("rewards-stake")).toHaveTextContent("7 aged notes");
    expect(screen.getByTestId("rewards-stake")).toHaveTextContent("epoch 4");
  });

  test("Claim button is enabled once vouchers exist, disabled when none", async () => {
    setReads(0);
    const { rerender } = render(<LeaderRewardsView {...NODE_ON} />);
    await waitFor(() => expect(mockVouchers).toHaveBeenCalled());
    expect(screen.getByTestId("rewards-claim-button")).toBeDisabled();

    setReads(2);
    rerender(<LeaderRewardsView {...NODE_ON} key="2" />);
    await waitFor(() =>
      expect(screen.getByTestId("rewards-claim-button")).toBeEnabled(),
    );
  });

  test("clicking the Ready-to-claim card opens the voucher detail dialog", async () => {
    setReads(2);
    render(<LeaderRewardsView {...NODE_ON} />);
    await waitFor(() =>
      expect(screen.getByTestId("rewards-ready-value")).toHaveTextContent("2"),
    );
    await userEvent.click(screen.getByTestId("rewards-card-ready"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Claimable vouchers")).toBeInTheDocument();
    expect(within(dialog).getByText("Voucher #1")).toBeInTheDocument();
    expect(within(dialog).getByText("Voucher #2")).toBeInTheDocument();
  });

  test("info buttons open the info dialog for each card", async () => {
    setReads(1);
    render(<LeaderRewardsView {...NODE_ON} />);
    await userEvent.click(screen.getByTestId("rewards-info-ready"));
    expect(screen.getByRole("dialog")).toHaveTextContent("Ready to claim");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await userEvent.click(screen.getByTestId("rewards-info-submitted"));
    expect(screen.getByRole("dialog")).toHaveTextContent("Submitted claims");
  });
});

describe("LeaderRewardsView — claim action (guarded + mutating)", () => {
  test("Claim is guarded by a confirm dialog and does NOT fire the mutation until confirmed", async () => {
    setReads(2);
    mockClaim.mockResolvedValue({ tx_hash: null } as never);
    render(<LeaderRewardsView {...NODE_ON} />);
    await waitFor(() =>
      expect(screen.getByTestId("rewards-claim-button")).toBeEnabled(),
    );

    await userEvent.click(screen.getByTestId("rewards-claim-button"));
    // Confirm dialog shown, mutation NOT yet called.
    expect(screen.getByText("Submit reward claim?")).toBeInTheDocument();
    expect(mockClaim).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("rewards-claim-confirm"));
    await waitFor(() => expect(mockClaim).toHaveBeenCalledTimes(1));
  });

  test("successful claim shows a green result notice, records history, and bumps Submitted", async () => {
    const TX = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    setReads(2);
    mockClaim.mockResolvedValue([TX] as never);
    render(<LeaderRewardsView {...NODE_ON} />);
    await waitFor(() =>
      expect(screen.getByTestId("rewards-claim-button")).toBeEnabled(),
    );

    await userEvent.click(screen.getByTestId("rewards-claim-button"));
    await userEvent.click(screen.getByTestId("rewards-claim-confirm"));

    const notice = await screen.findByTestId("rewards-claim-notice");
    expect(notice).toHaveTextContent("Claim submitted for 2 vouchers.");
    // Submitted stat card reflects the pending voucher count.
    expect(screen.getByTestId("rewards-submitted-value")).toHaveTextContent("2");
    // History row recorded with a Tx link + Block link.
    expect(screen.getByTestId("rewards-history-list")).toBeInTheDocument();
    expect(screen.getByTestId("rewards-history-row")).toHaveTextContent("Claimed 2 vouchers");
  });

  test("failed claim shows a red error notice", async () => {
    setReads(1);
    mockClaim.mockRejectedValue(new Error("node rejected"));
    render(<LeaderRewardsView {...NODE_ON} />);
    await waitFor(() =>
      expect(screen.getByTestId("rewards-claim-button")).toBeEnabled(),
    );
    await userEvent.click(screen.getByTestId("rewards-claim-button"));
    await userEvent.click(screen.getByTestId("rewards-claim-confirm"));

    const notice = await screen.findByTestId("rewards-claim-notice");
    expect(notice).toHaveTextContent("node rejected");
    expect(within(notice).getByRole("alert")).toBeInTheDocument();
  });

  test("Tx/Block history links call onOpenInExplorer with the id", async () => {
    const TX = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    const onOpen = vi.fn();
    setReads(1);
    mockClaim.mockResolvedValue([TX] as never);
    render(<LeaderRewardsView {...NODE_ON} onOpenInExplorer={onOpen} />);
    await waitFor(() =>
      expect(screen.getByTestId("rewards-claim-button")).toBeEnabled(),
    );
    await userEvent.click(screen.getByTestId("rewards-claim-button"));
    await userEvent.click(screen.getByTestId("rewards-claim-confirm"));
    await screen.findByTestId("rewards-history-row");

    await userEvent.click(screen.getByText(new RegExp(`Tx `)));
    expect(onOpen).toHaveBeenCalledWith(TX);

    await userEvent.click(screen.getByTestId("rewards-history-block-link"));
    expect(onOpen).toHaveBeenCalledWith(TIP);
  });

  test("'Show only pending' filter hides landed/empty appropriately", async () => {
    setReads(0);
    render(<LeaderRewardsView {...NODE_ON} />);
    await waitFor(() => expect(mockVouchers).toHaveBeenCalled());
    // No claims yet.
    expect(screen.getByTestId("rewards-history-empty")).toHaveTextContent(
      "No claims recorded yet.",
    );
    // Toggle filter on — still a (pending-scoped) empty state, no crash.
    expect(screen.getByText("Show only pending")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toBeChecked();
  });
});

describe("LeaderRewardsView — states", () => {
  test("node-off: renders the banner, no fetch, dashes in the cards", async () => {
    setReads(5);
    render(<LeaderRewardsView {...NODE_OFF} />);
    expect(screen.getByTestId("node-off-notice")).toHaveTextContent(
      "The node isn't running yet.",
    );
    expect(screen.getByTestId("rewards-claim-button")).toBeDisabled();
    expect(screen.getByTestId("rewards-ready-value")).toHaveTextContent("—");
    // Node off → no reads fired.
    expect(mockVouchers).not.toHaveBeenCalled();
  });

  test("error: a failed read surfaces an error toast", async () => {
    mockVouchers.mockRejectedValue(new Error("boom"));
    mockAged.mockRejectedValue(new Error("boom"));
    mockTime.mockRejectedValue(new Error("boom"));
    render(<LeaderRewardsView {...NODE_ON} />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  test("empty: zero vouchers shows the '—'/count and an enabled-less claim", async () => {
    setReads(0);
    render(<LeaderRewardsView {...NODE_ON} />);
    await waitFor(() =>
      expect(screen.getByTestId("rewards-ready-value")).toHaveTextContent("0"),
    );
    expect(screen.getByTestId("rewards-claim-button")).toBeDisabled();
  });
});
