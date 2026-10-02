import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { parseBlock } from "./blocks/blockModel";
import { BlocksView } from "./BlocksView";

// Mock the API module: useBlockModel pulls the seed + SSE stream from here.
vi.mock("../api/endpoints", () => ({
  getBlocksRange: vi.fn(),
  getTimeInfo: vi.fn(),
  streamBlocks: vi.fn(),
  getBlock: vi.fn(),
  getTransaction: vi.fn(),
}));
import { getBlocksRange, getTimeInfo, streamBlocks } from "../api/endpoints";

const RAW_BLOCK = {
  header: {
    id: "blockidAAA",
    parent_block: "parentBBB",
    slot: 176851,
    version: "Bedrock",
    block_root: "blockroot222",
    body_root: "bodyroot111",
    proof_of_leadership: {
      proof: "proofPPP",
      entropy_contribution: "entropyEEE",
      leader_key: "leaderKKK",
      voucher_cm: "voucherVVV",
    },
  },
  signature: "signatureSSS",
  transactions: [
    { id: "tx-hash-1", mantle_tx: { ops: [{ opcode: 0, payload: { foo: 1 } }] }, ops_proofs: [{ Ed25519: "p" }] },
  ],
};

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

describe("BlocksView — table", () => {
  test("renders the four columns with decorative sort triangles on sortable ones", () => {
    render(<BlocksView blocks={[]} status="ready" />);
    for (const h of ["Timestamp", "Block", "Consensus", "TXs"]) {
      expect(screen.getByText(h)).toBeInTheDocument();
    }
    // Timestamp / Block / Consensus are sortable; TXs is not → 3 indicators.
    expect(screen.getAllByTestId("sort-indicator")).toHaveLength(3);
  });

  test("renders a block row (slot, consensus badge, tx count)", () => {
    render(<BlocksView blocks={[parseBlock(RAW_BLOCK)]} status="ready" />);
    const row = screen.getByTestId("block-row");
    expect(within(row).getByText("Slot 176851")).toBeInTheDocument();
    expect(within(row).getByText("Bedrock")).toBeInTheDocument();
    expect(within(row).getByText("1")).toBeInTheDocument(); // tx count
  });
});

describe("BlocksView — empty states", () => {
  test.each([
    ["off", undefined, "Start the node to see blocks arrive."],
    ["loading", undefined, "Waiting for the node to report its state…"],
    ["ready", undefined, "Waiting for the next block…"],
  ] as const)("%s → %s", (status, _f, text) => {
    render(<BlocksView blocks={[]} status={status} />);
    expect(screen.getByTestId("blocks-empty")).toHaveTextContent(text);
  });

  test("filtered-to-a-missing-slot empty state", () => {
    render(<BlocksView blocks={[]} status="ready" filterSlotAbsent={999} />);
    expect(screen.getByTestId("blocks-empty")).toHaveTextContent(
      "Slot 999 isn't in this session's blocks.",
    );
  });
});

describe("BlocksView — row expansion", () => {
  test("tap a row → header hashes; PoL subgroup + tx delegate toggle open", async () => {
    const user = userEvent.setup();
    render(<BlocksView blocks={[parseBlock(RAW_BLOCK)]} status="ready" />);

    const row = screen.getByTestId("block-row");
    // Collapsed: no detail.
    expect(within(row).queryByText("parentBBB")).toBeNull();

    // Expand.
    await user.click(within(row).getByRole("button", { expanded: false }));
    expect(within(row).getByText("parentBBB")).toBeInTheDocument();
    expect(within(row).getByText("blockroot222")).toBeInTheDocument();
    expect(within(row).getByText("signatureSSS")).toBeInTheDocument();

    // PoL subgroup hidden until toggled.
    expect(within(row).queryByTestId("pol-group")).toBeNull();
    await user.click(within(row).getByRole("button", { name: /Proof of leadership/ }));
    const pol = within(row).getByTestId("pol-group");
    expect(within(pol).getByText("leaderKKK")).toBeInTheDocument();

    // Transaction delegate toggles open → opcode name shown.
    const tx = within(row).getByTestId("tx-delegate");
    expect(within(tx).queryByText("Transfer")).toBeNull();
    await user.click(within(tx).getByText("tx-hash-1"));
    expect(within(tx).getByText("Transfer")).toBeInTheDocument();

    // Copy buttons present on the expanded detail (blocks-hash-copies).
    expect(within(row).getAllByRole("button", { name: /copy/i }).length).toBeGreaterThan(0);
  });

  test("unparsed block → 'Unparsed block' label + raw-JSON fallback on expand", async () => {
    const user = userEvent.setup();
    render(<BlocksView blocks={[parseBlock("<<not json>>")]} status="ready" />);
    const row = screen.getByTestId("block-row");
    expect(row).toHaveAttribute("data-unparsed", "true");
    expect(within(row).getByText("Unparsed block")).toBeInTheDocument();
    await user.click(within(row).getByRole("button", { expanded: false }));
    expect(within(row).getByText("Raw payload")).toBeInTheDocument();
  });
});

describe("BlocksView — self-feed", () => {
  test("seeds from blocks_range + subscribes to the SSE stream when running", async () => {
    vi.mocked(getBlocksRange).mockResolvedValue([RAW_BLOCK] as never);
    render(<BlocksView nodeRunning />);
    await waitFor(() => expect(screen.getByText("Slot 176851")).toBeInTheDocument());
    expect(getBlocksRange).toHaveBeenCalledWith({ sort: "desc", limit: 100 });
    expect(streamBlocks).toHaveBeenCalled();
  });

  test("off when the node isn't running (no fetch)", () => {
    render(<BlocksView nodeRunning={false} />);
    expect(screen.getByTestId("blocks-empty")).toHaveTextContent(
      "Start the node to see blocks arrive.",
    );
    expect(getBlocksRange).not.toHaveBeenCalled();
  });
});
