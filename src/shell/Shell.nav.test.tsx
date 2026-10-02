import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { BackendStatus } from "./shellState";

// Mock the node endpoints so the Rewards → claim → Block-link → Explorer flow runs
// without network or EventSource (the Explorer's SSE subscribe).
vi.mock("../api/endpoints", () => {
  const TIP = "a".repeat(64);
  return {
    getLeaderClaimVouchers: vi.fn().mockResolvedValue({
      tip: TIP,
      reward_amount: 100,
      total_claimable: 100,
      vouchers: [{ commitment: "c".repeat(64), nullifier: "d".repeat(64) }],
    }),
    getLeaderAgedNotes: vi.fn().mockResolvedValue({ tip: TIP, notes: [], count: 1, total_value: 100 }),
    getTimeInfo: vi.fn().mockResolvedValue({
      slot_duration_ms: 1000,
      genesis_time_unix_ms: 0,
      current_slot: 1,
      current_epoch: 1,
      slots_per_epoch: 36000,
    }),
    leaderClaim: vi.fn().mockResolvedValue([]),
    getBlocksRange: vi.fn().mockResolvedValue([]),
    streamBlocks: vi.fn().mockReturnValue({ close: vi.fn() }),
    getBlock: vi.fn().mockRejectedValue(new Error("not found")),
    getTransaction: vi.fn().mockRejectedValue(new Error("not found")),
    startMining: vi.fn().mockResolvedValue(undefined),
    stopMining: vi.fn().mockResolvedValue(undefined),
  };
});

// Imported after the mock is registered.
import { Shell } from "./Shell";

const TIP = "a".repeat(64);

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("Shell — programmatic Open-in-Explorer (shell-programmatic-nav-explorer)", () => {
  test("a Block link in Rewards history jumps to the Explorer tab and runs that search", async () => {
    const user = userEvent.setup();
    render(<Shell initialTab="rewards" model={{ ready: true, hasConfig: true, status: BackendStatus.Running, synced: true }} />);

    // Wait for the Rewards view to load its single voucher.
    await waitFor(() => expect(screen.getByTestId("rewards-ready-value")).toHaveTextContent("1"));

    // Claim → confirm → a history row with a Block link (tip) appears.
    await user.click(screen.getByTestId("rewards-card-ready"));
    await user.click(screen.getByTestId("dialog-voucher-claim"));
    await user.click(screen.getByTestId("rewards-claim-confirm"));

    const blockLink = await screen.findByTestId("rewards-history-block-link");
    await user.click(blockLink);

    // The shell routed to the Explorer tab and ran the search programmatically:
    // the Explorer's search field is prefilled with the tip.
    await waitFor(() =>
      expect(screen.getByTestId("shell-stack-layout")).toHaveAttribute("data-active-tab", "explorer"),
    );
    const explorer = screen.getByTestId("view-explorer");
    const field = within(explorer).getByLabelText("Block id or transaction hash") as HTMLInputElement;
    await waitFor(() => expect(field.value).toBe(TIP));
  });
});
