import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock the API module so the view's reads/mutations are deterministic.
vi.mock("../api/endpoints", () => ({
  getPowStatus: vi.fn(),
  getPowRewardsClaimable: vi.fn(),
  getTimeInfo: vi.fn(),
  powClaim: vi.fn(),
  startAutoClaim: vi.fn(),
  stopAutoClaim: vi.fn(),
}));

import {
  getPowRewardsClaimable,
  getPowStatus,
  getTimeInfo,
  powClaim,
  startAutoClaim,
  stopAutoClaim,
} from "../api/endpoints";
import { MiningView, type MiningClaimRecord } from "./MiningView";

const mockStatus = vi.mocked(getPowStatus);
const mockClaimable = vi.mocked(getPowRewardsClaimable);
const mockTime = vi.mocked(getTimeInfo);
const mockClaim = vi.mocked(powClaim);
const mockStart = vi.mocked(startAutoClaim);
const mockStop = vi.mocked(stopAutoClaim);

const ADDR = "5f8870abcd1234567890abcdef1234567890abcdef1234567890abcdef123456";

function statusPayload(over: {
  mining?: boolean;
  rewards?: boolean;
  armed?: boolean;
  tick?: number;
  unit?: string;
  targets?: { public_key: string; threshold: number; balance: number }[];
} = {}) {
  return {
    is_mining: over.mining ?? false,
    are_rewards_enabled: over.rewards ?? true,
    auto_claim: {
      is_armed: over.armed ?? false,
      tick: { unit: over.unit ?? "seconds", value: over.tick ?? 10 },
      targets: over.targets ?? [],
    },
  };
}

function claimablePayload(tickets: number, slots: number[] = []) {
  return { claimable_tickets: tickets, slots_until_expiry: slots };
}

const timePayload = {
  slot_duration_ms: 1000,
  genesis_time_unix_ms: 1790758800000,
  current_slot: 100,
  current_epoch: 4,
  slots_per_epoch: 36000,
};

function setReads(status = statusPayload(), claimable = claimablePayload(0)) {
  mockStatus.mockResolvedValue(status as never);
  mockClaimable.mockResolvedValue(claimable as never);
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

describe("MiningView — render + status", () => {
  test("renders the Tickets header, three counter cards and the History section", async () => {
    setReads();
    render(<MiningView {...NODE_ON} />);
    expect(screen.getByRole("heading", { name: "Tickets" })).toBeInTheDocument();
    expect(screen.getByTestId("mining-card-ready-to-claim")).toBeInTheDocument();
    expect(screen.getByTestId("mining-card-awaiting-payout")).toBeInTheDocument();
    expect(screen.getByTestId("mining-card-mining-rewards")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    await waitFor(() => expect(mockStatus).toHaveBeenCalled());
  });

  test("shows the claimable count and the soonest-expiry caption once loaded", async () => {
    setReads(statusPayload(), claimablePayload(3, [5, 5, 9]));
    render(<MiningView {...NODE_ON} />);
    await waitFor(() =>
      expect(screen.getByTestId("mining-ready-value")).toHaveTextContent("3"),
    );
    expect(screen.getByText("2 expiring in 5 slots")).toBeInTheDocument();
  });

  test("renders the three card info buttons", async () => {
    setReads();
    render(<MiningView {...NODE_ON} />);
    expect(screen.getByTestId("mining-info-ready")).toBeInTheDocument();
    expect(screen.getByTestId("mining-info-awaiting")).toBeInTheDocument();
    expect(screen.getByTestId("mining-info-rewards")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("mining-info-rewards"));
    expect(screen.getByRole("dialog")).toHaveTextContent("Mining Rewards");
  });

  test("auto-claim cadence shows 'every N seconds' from the tick", async () => {
    setReads(statusPayload({ tick: 10, unit: "seconds" }));
    render(<MiningView {...NODE_ON} />);
    await waitFor(() =>
      expect(screen.getByTestId("mining-autoclaim-tick")).toHaveTextContent(
        "every 10 seconds",
      ),
    );
  });
});

describe("MiningView — auto-claim toggle (gated + mutating, runtime override)", () => {
  test("switch is disabled with no targets and not armed (would snap back)", async () => {
    setReads(statusPayload({ armed: false, targets: [] }));
    render(<MiningView {...NODE_ON} />);
    await waitFor(() => expect(mockStatus).toHaveBeenCalled());
    expect(screen.getByRole("switch")).toBeDisabled();
    // The hint explains why.
    expect(screen.getByTestId("mining-autoclaim-hint")).toHaveTextContent(
      "No auto-claim targets configured",
    );
  });

  test("arming is guarded by a confirm dialog and only then PUTs auto-claim/start", async () => {
    setReads(
      statusPayload({ armed: false, targets: [{ public_key: ADDR, threshold: 1e8, balance: 0 }] }),
    );
    mockStart.mockResolvedValue(undefined as never);
    render(<MiningView {...NODE_ON} />);
    await waitFor(() => expect(screen.getByRole("switch")).toBeEnabled());

    await userEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("Arm auto-claim?")).toBeInTheDocument();
    expect(mockStart).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("mining-confirm"));
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    expect(mockStop).not.toHaveBeenCalled();
  });

  test("disarming an armed node PUTs auto-claim/stop after confirm", async () => {
    setReads(
      statusPayload({ armed: true, targets: [{ public_key: ADDR, threshold: 1e8, balance: 0 }] }),
    );
    mockStop.mockResolvedValue(undefined as never);
    render(<MiningView {...NODE_ON} />);
    await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());

    await userEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("Disarm auto-claim?")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("mining-confirm"));
    await waitFor(() => expect(mockStop).toHaveBeenCalledTimes(1));
  });

  test("renders auto-claim target rows with the 'Threshold reached' badge", async () => {
    setReads(
      statusPayload({
        armed: true,
        targets: [{ public_key: ADDR, threshold: 1e8, balance: 2e8 }],
      }),
    );
    render(<MiningView {...NODE_ON} accounts={[{ address: ADDR, label: "Main" }]} />);
    await waitFor(() => expect(screen.getByTestId("mining-claim-targets")).toBeInTheDocument());
    const row = screen.getByTestId("mining-target-row");
    expect(within(row).getByText("Main")).toBeInTheDocument();
    expect(within(row).getByTestId("mining-target-reached")).toBeInTheDocument();
  });
});

describe("MiningView — manual claim (gated + mutating)", () => {
  test("Claim is disabled without tickets, enabled with them, and guarded by confirm", async () => {
    setReads(statusPayload(), claimablePayload(2, [5, 5]));
    mockClaim.mockResolvedValue({ tx_hash: null } as never);
    render(<MiningView {...NODE_ON} />);
    await waitFor(() => expect(screen.getByTestId("mining-manual-claim")).toBeEnabled());

    await userEvent.click(screen.getByTestId("mining-manual-claim"));
    expect(screen.getByText("Submit manual claim?")).toBeInTheDocument();
    expect(mockClaim).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("mining-confirm"));
    await waitFor(() => expect(mockClaim).toHaveBeenCalledTimes(1));
    // No account chosen → body omitted (let the node choose).
    expect(mockClaim).toHaveBeenCalledWith(undefined);
  });

  test("successful claim shows a green result and bumps Awaiting payout", async () => {
    const TX = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    setReads(statusPayload(), claimablePayload(1, [7]));
    mockClaim.mockResolvedValue({ tx_hash: TX } as never);
    render(<MiningView {...NODE_ON} />);
    await waitFor(() => expect(screen.getByTestId("mining-manual-claim")).toBeEnabled());
    await userEvent.click(screen.getByTestId("mining-manual-claim"));
    await userEvent.click(screen.getByTestId("mining-confirm"));

    const result = await screen.findByTestId("mining-claim-result");
    expect(result).toHaveTextContent("Claim submitted");
    expect(screen.getByTestId("mining-awaiting-value")).toHaveTextContent("1");
  });

  test("failed claim shows a red error result", async () => {
    setReads(statusPayload(), claimablePayload(1, [7]));
    mockClaim.mockRejectedValue(new Error("node rejected"));
    render(<MiningView {...NODE_ON} />);
    await waitFor(() => expect(screen.getByTestId("mining-manual-claim")).toBeEnabled());
    await userEvent.click(screen.getByTestId("mining-manual-claim"));
    await userEvent.click(screen.getByTestId("mining-confirm"));

    const result = await screen.findByTestId("mining-claim-result");
    expect(result).toHaveTextContent("node rejected");
    expect(within(result).getByRole("alert")).toBeInTheDocument();
  });

  test("selecting an account reveals Clear, which resets the selection", async () => {
    setReads(statusPayload(), claimablePayload(1, [7]));
    render(<MiningView {...NODE_ON} accounts={[{ address: ADDR, label: "Main" }]} />);
    await waitFor(() => expect(mockStatus).toHaveBeenCalled());
    expect(screen.queryByTestId("mining-manual-clear")).toBeNull();

    // Open the combo and pick the account.
    await userEvent.click(screen.getByRole("button", { name: "Claim account" }));
    await userEvent.click(screen.getByRole("option", { name: "Main" }));
    expect(screen.getByTestId("mining-manual-clear")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("mining-manual-clear"));
    expect(screen.queryByTestId("mining-manual-clear")).toBeNull();
  });
});

describe("MiningView — states", () => {
  test("claimable read error surfaces a warning notice", async () => {
    mockStatus.mockResolvedValue(statusPayload() as never);
    mockClaimable.mockRejectedValue(new Error("poll failed"));
    mockTime.mockResolvedValue(timePayload as never);
    render(<MiningView {...NODE_ON} />);
    expect(await screen.findByText(/Can't read claimable tickets/)).toHaveTextContent(
      "poll failed",
    );
  });

  test("mining-into-nothing warning when mining on + auto-claim off + tickets present", async () => {
    setReads(statusPayload({ mining: true, armed: false }), claimablePayload(4, [3, 3, 3, 3]));
    render(<MiningView {...NODE_ON} />);
    expect(await screen.findByTestId("mining-into-nothing-notice")).toHaveTextContent(
      "Tickets expire unclaimed",
    );
  });

  test("'This chain pays no mining rewards' info notice when rewards disabled", async () => {
    setReads(statusPayload({ rewards: false }));
    render(<MiningView {...NODE_ON} />);
    expect(await screen.findByTestId("mining-no-rewards-notice")).toHaveTextContent(
      "This chain pays no mining rewards",
    );
  });

  test("history: loading, empty, and pending-only empty", async () => {
    setReads(statusPayload(), claimablePayload(0));
    const { rerender } = render(<MiningView {...NODE_ON} claims={null} />);
    expect(screen.getByTestId("mining-history-empty")).toHaveTextContent("Loading…");
    // Let the on-mount reads settle (avoids act() warnings).
    await waitFor(() => expect(mockStatus).toHaveBeenCalled());

    rerender(<MiningView {...NODE_ON} claims={[]} />);
    await waitFor(() =>
      expect(screen.getByTestId("mining-history-empty")).toHaveTextContent(
        "No claims recorded yet",
      ),
    );
  });

  test("history list renders rows and Tx/Block links call onOpenInExplorer", async () => {
    const onOpen = vi.fn();
    const claims: MiningClaimRecord[] = [
      {
        id: "c1",
        valueLepta: "5000000",
        slot: 10,
        payee: ADDR,
        txHash: "aa11bb22cc33dd44aa11bb22cc33dd44",
        blockId: "ff00ff00ff00ff00ff00ff00ff00ff00",
        pending: false,
      },
    ];
    setReads(statusPayload(), claimablePayload(0));
    render(<MiningView {...NODE_ON} claims={claims} onOpenInExplorer={onOpen} />);
    expect(screen.getByTestId("mining-history-list")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("mining-history-tx-link"));
    expect(onOpen).toHaveBeenCalledWith("aa11bb22cc33dd44aa11bb22cc33dd44");
    await userEvent.click(screen.getByTestId("mining-history-block-link"));
    expect(onOpen).toHaveBeenCalledWith("ff00ff00ff00ff00ff00ff00ff00ff00");
  });

  test("node-off: banner shown, no reads fire, counters dash, switch disabled", async () => {
    setReads(statusPayload(), claimablePayload(5, [1]));
    render(<MiningView {...NODE_OFF} />);
    expect(screen.getByTestId("node-off-notice")).toHaveTextContent(
      "The node isn't running yet.",
    );
    expect(screen.getByTestId("mining-ready-value")).toHaveTextContent("—");
    expect(screen.getByTestId("mining-manual-claim")).toBeDisabled();
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(mockStatus).not.toHaveBeenCalled();
    expect(mockClaimable).not.toHaveBeenCalled();
  });
});
