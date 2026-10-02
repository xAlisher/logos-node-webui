import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError } from "../api/client";
import { ExplorerView } from "./ExplorerView";

vi.mock("../api/endpoints", () => ({
  getBlock: vi.fn(),
  getTransaction: vi.fn(),
  getBlocksRange: vi.fn(),
  getTimeInfo: vi.fn(),
  streamBlocks: vi.fn(),
}));
import { getBlock, getBlocksRange, getTimeInfo, getTransaction, streamBlocks } from "../api/endpoints";

const RUNNING = { nodeOffReason: "", nodeOffSeverity: "info" as const };
const OFF = {
  nodeOffReason: "The node isn't running yet.",
  nodeOffSeverity: "info" as const,
};

const BLOCK = {
  header: {
    id: "blk-1",
    parent_block: "parent-xyz",
    slot: 176851,
    version: "Bedrock",
    block_root: "root-abc",
    proof_of_leadership: {
      proof: "p",
      entropy_contribution: "e",
      leader_key: "lk",
      voucher_cm: "vc",
    },
  },
  signature: "sig-123",
  transactions: [],
};

const TX = { id: "tx-9", mantle_tx: { ops: [{ opcode: 48, payload: {} }] }, ops_proofs: [] };

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
  vi.mocked(getTimeInfo).mockResolvedValue({
    slot_duration_ms: 1000,
    genesis_time_unix_ms: 1790758800000,
    current_slot: 176900,
    current_epoch: 4,
    slots_per_epoch: 36000,
  });
  vi.mocked(getBlocksRange).mockResolvedValue([]);
  vi.mocked(streamBlocks).mockReturnValue({ close: vi.fn() } as unknown as EventSource);
});
afterEach(() => vi.restoreAllMocks());

async function searchFor(id: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Block id or transaction hash"), id);
  await user.click(screen.getByRole("button", { name: "Search" }));
  return user;
}

describe("ExplorerView — layout + node-off", () => {
  test("node off → banner, hint, disabled field, resting block table", () => {
    render(<ExplorerView {...OFF} />);
    expect(screen.getByTestId("node-off-notice")).toHaveTextContent("isn't running");
    expect(screen.getByText("Start the node to look up blocks and transactions.")).toBeInTheDocument();
    expect(screen.getByLabelText("Block id or transaction hash")).toBeDisabled();
    // Resting state: the embedded block table is shown.
    expect(screen.getByTestId("blocks-table")).toBeInTheDocument();
    expect(screen.getByTestId("blocks-empty")).toHaveTextContent("Start the node");
  });

  test("info button opens the info dialog", async () => {
    const user = userEvent.setup();
    render(<ExplorerView {...RUNNING} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "About the explorer" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/auto-detected/)).toBeInTheDocument();
  });

  test("Ctrl+K focuses and selects the search field", async () => {
    const user = userEvent.setup();
    render(<ExplorerView {...RUNNING} />);
    const field = screen.getByLabelText("Block id or transaction hash");
    expect(field).not.toHaveFocus();
    await user.keyboard("{Control>}k{/Control}");
    expect(field).toHaveFocus();
  });
});

describe("ExplorerView — lookup results", () => {
  test("block result card (get_block hit) with raw-JSON copy + hash copies", async () => {
    vi.mocked(getBlock).mockResolvedValue(BLOCK as never);
    render(<ExplorerView {...RUNNING} />);
    await searchFor("blk-1");

    const card = await screen.findByTestId("explorer-result-block");
    expect(within(card).getByText("Block")).toBeInTheDocument();
    expect(within(card).getByText("slot 176851")).toBeInTheDocument();
    expect(within(card).getByText("parent-xyz")).toBeInTheDocument(); // a HashRow value
    expect(within(card).getByText("lk")).toBeInTheDocument(); // PoL leader key
    // raw-JSON copy button present.
    expect(within(card).getByRole("button", { name: /raw block json/i })).toBeInTheDocument();
    // The resting block table is hidden once a result shows.
    expect(screen.queryByTestId("blocks-table")).toBeNull();
    expect(getTransaction).not.toHaveBeenCalled();
  });

  test("transaction result card (get_block miss → get_transaction hit)", async () => {
    vi.mocked(getBlock).mockRejectedValue(new ApiError(404, "no block"));
    vi.mocked(getTransaction).mockResolvedValue(TX as never);
    render(<ExplorerView {...RUNNING} />);
    await searchFor("tx-9");

    const card = await screen.findByTestId("explorer-result-transaction");
    expect(within(card).getByText("Transaction")).toBeInTheDocument();
    expect(within(card).getByText("Leader Claim")).toBeInTheDocument(); // opcode 48 name
    expect(within(card).getByRole("button", { name: /raw transaction json/i })).toBeInTheDocument();
  });

  test("not-found when both lookups miss", async () => {
    vi.mocked(getBlock).mockRejectedValue(new ApiError(404, "no"));
    vi.mocked(getTransaction).mockRejectedValue(new ApiError(404, "no"));
    render(<ExplorerView {...RUNNING} />);
    await searchFor("missing");
    const note = await screen.findByTestId("explorer-status-notfound");
    expect(note).toHaveTextContent("Nothing found for");
  });

  test("error state on a network failure (red)", async () => {
    vi.mocked(getBlock).mockRejectedValue(new TypeError("network down"));
    render(<ExplorerView {...RUNNING} />);
    await searchFor("boom");
    const err = await screen.findByTestId("explorer-status-error");
    expect(err).toHaveTextContent(/Lookup failed/);
    expect(err).toHaveClass("explorer-status--error");
  });

  test("busy 'Searching…' while the lookup is in flight", async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(getBlock).mockReturnValue(new Promise((r) => (resolve = r)) as never);
    render(<ExplorerView {...RUNNING} />);
    await searchFor("blk-1");
    expect(await screen.findByTestId("explorer-status-busy")).toHaveTextContent("Searching…");
    // Resolve so the lingering 8s timeout is cleared.
    resolve(BLOCK);
    await screen.findByTestId("explorer-result-block");
  });

  test("filtered 'Showing slot N' when the id is already on screen", async () => {
    vi.mocked(getBlocksRange).mockResolvedValue([BLOCK] as never);
    render(<ExplorerView {...RUNNING} />);
    // Wait for the seed to land in the table.
    await screen.findByText("Slot 176851");
    await searchFor("blk-1");
    expect(await screen.findByTestId("explorer-status-filtered")).toHaveTextContent(
      "Showing slot 176851.",
    );
    expect(screen.getByTestId("explorer-result-block")).toBeInTheDocument();
    // Served from the loaded model, not a fresh fetch.
    expect(getBlock).not.toHaveBeenCalled();
  });

  test("clear ✕ resets the result and restores the block table", async () => {
    vi.mocked(getBlock).mockResolvedValue(BLOCK as never);
    render(<ExplorerView {...RUNNING} />);
    const user = await searchFor("blk-1");
    await screen.findByTestId("explorer-result-block");

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.queryByTestId("explorer-result-block")).toBeNull();
    expect(screen.getByTestId("blocks-table")).toBeInTheDocument();
  });
});
