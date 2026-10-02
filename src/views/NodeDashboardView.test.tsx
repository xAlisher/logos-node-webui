import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { NodeDashboardView } from "./NodeDashboardView";
import { BackendStatus, BlendRole } from "./nodeStatus";
import type { DashboardModel } from "./nodeMonitor";

// The live monitor polls these; mock the whole endpoints module so the integration
// tests can "feed mocked api responses" and the model-override tests stay offline.
vi.mock("../api/endpoints", () => ({
  getCryptarchiaInfo: vi.fn(),
  getTimeInfo: vi.fn(),
  getNetworkInfo: vi.fn(),
  getBlendInfo: vi.fn(),
  getPowStatus: vi.fn(),
  getPowRewardsClaimable: vi.fn(),
  getLeaderAgedNotes: vi.fn(),
  getLeaderClaimVouchers: vi.fn(),
}));
import * as ep from "../api/endpoints";

/** Render driven by an explicit model (monitor disabled → deterministic). */
function renderModel(model: Partial<DashboardModel>) {
  return render(<NodeDashboardView model={model} />);
}

const heroLabel = () => screen.getByTestId("hero-label");
const heroSub = () => screen.queryByTestId("hero-sub");
const styleColor = (el: Element) => el.getAttribute("style") ?? "";

// A model that reads "Online" — the base other state tests mutate.
const ONLINE: Partial<DashboardModel> = {
  status: BackendStatus.Running,
  connected: true,
  everConnected: true,
  moduleReachable: true,
  synced: true,
  hasBeenOnline: true,
};

// ===========================================================================
// Status hero — all ~13 computed states (driven by the model the monitor feeds)
// ===========================================================================

describe("status hero states", () => {
  test("Not started (never connected)", () => {
    renderModel({});
    expect(heroLabel()).toHaveTextContent("Not started");
    expect(styleColor(heroLabel())).toContain("var(--text-secondary)");
    expect(screen.queryByTestId("hero-dots")).toBeNull();
  });

  test("Disconnected (was connected, link dropped)", () => {
    renderModel({ connected: false, everConnected: true });
    expect(heroLabel()).toHaveTextContent("Disconnected");
    expect(heroSub()).toHaveTextContent("Lost contact with the backend");
    expect(styleColor(heroLabel())).toContain("var(--error)");
  });

  test("Node stopped (module process gone)", () => {
    renderModel({ ...ONLINE, moduleReachable: false, statusMessage: "" });
    expect(heroLabel()).toHaveTextContent("Node stopped");
    expect(heroSub()).toHaveTextContent("The node process stopped unexpectedly");
  });

  test("Error carries the node message", () => {
    renderModel({
      connected: true,
      everConnected: true,
      moduleReachable: true,
      status: BackendStatus.Error,
      statusMessage: "db corrupt",
    });
    expect(heroLabel()).toHaveTextContent("Error");
    expect(heroSub()).toHaveTextContent("db corrupt");
  });

  test("Stopping (dots, no sub until slow)", () => {
    renderModel({ connected: true, everConnected: true, status: BackendStatus.Stopping });
    expect(heroLabel()).toHaveTextContent("Stopping");
    expect(screen.getByTestId("hero-dots")).toBeInTheDocument();
    expect(heroSub()).toBeNull();
  });

  test("Stopping slow while catching up", () => {
    renderModel({
      connected: true,
      everConnected: true,
      status: BackendStatus.Stopping,
      stopSlow: true,
      stopBehindCatchUp: true,
    });
    expect(heroSub()).toHaveTextContent("busy catching up");
  });

  test("Bootstrapping — syncing with the chain (first bootstrap)", () => {
    renderModel({ ...ONLINE, synced: false, hasBeenOnline: false });
    expect(heroLabel()).toHaveTextContent("Bootstrapping");
    expect(heroSub()).toHaveTextContent("Syncing with the chain");
    expect(styleColor(heroLabel())).toContain("var(--warning)");
    expect(screen.getByTestId("hero-dots")).toBeInTheDocument();
  });

  test("Bootstrapping — fell behind (was online)", () => {
    renderModel({ ...ONLINE, synced: false, hasBeenOnline: true });
    expect(heroSub()).toHaveTextContent("Fell behind — catching up");
  });

  test("Bootstrapping — replaying stored blocks (recovering)", () => {
    renderModel({ connected: true, everConnected: true, status: BackendStatus.Starting, nodeRecovering: true });
    expect(heroLabel()).toHaveTextContent("Bootstrapping");
    expect(heroSub()).toHaveTextContent("replaying stored blocks");
  });

  test("Bootstrapping — genesis in the future (red)", () => {
    renderModel({
      ...ONLINE,
      synced: false,
      genesisPending: true,
      genesisUnixMs: Date.UTC(2030, 0, 1),
    });
    expect(heroLabel()).toHaveTextContent("Bootstrapping");
    expect(heroSub()).toHaveTextContent("Genesis is");
    expect(heroSub()).toHaveTextContent("wrong network");
    expect(styleColor(heroLabel())).toContain("var(--error)");
  });

  test("Bootstrapping — stalled 10min (red)", () => {
    renderModel({ ...ONLINE, synced: false, syncStalled: true });
    expect(heroSub()).toHaveTextContent("No block progress for 10 minutes");
    expect(styleColor(heroLabel())).toContain("var(--error)");
  });

  test("Bootstrapping — block stream ended (red)", () => {
    renderModel({ ...ONLINE, synced: false, blockStreamEnded: true });
    expect(heroSub()).toHaveTextContent("Block updates have stopped arriving");
    expect(styleColor(heroLabel())).toContain("var(--error)");
  });

  test("Starting — checking configuration", () => {
    renderModel({ connected: true, everConnected: true, status: BackendStatus.Starting, synced: false });
    expect(heroLabel()).toHaveTextContent("Starting");
    expect(heroSub()).toHaveTextContent("Checking configuration");
  });

  test("Online — following the chain (green)", () => {
    renderModel(ONLINE);
    expect(heroLabel()).toHaveTextContent("Online");
    expect(heroSub()).toHaveTextContent("Following the chain");
    expect(styleColor(heroLabel())).toContain("var(--success)");
    expect(screen.queryByTestId("hero-dots")).toBeNull();
  });

  test("Online — green headline, red note when the stream ended", () => {
    renderModel({ ...ONLINE, blockStreamEnded: true });
    expect(heroLabel()).toHaveTextContent("Online");
    expect(styleColor(heroLabel())).toContain("var(--success)");
    expect(heroSub()).toHaveTextContent("Block updates have stopped arriving");
    expect(heroSub()).toHaveClass("dashboard__hero-sub--error");
  });

  test("Stale poll keeps the last headline and shows the retry countdown", () => {
    renderModel({ ...ONLINE, statusStale: true, statusNextPollSeconds: 5, statusSilentSeconds: 8 });
    expect(heroLabel()).toHaveTextContent("Online"); // headline preserved
    expect(heroSub()).toHaveTextContent("retrying in 5s");
    expect(styleColor(heroLabel())).toContain("var(--text-secondary)"); // greyed
  });

  test("Stale poll — long silence message", () => {
    renderModel({ ...ONLINE, statusStale: true, statusSilentSeconds: 300 });
    expect(heroSub()).toHaveTextContent("No response from the node for 5 minutes");
  });
});

// ===========================================================================
// Hero chrome — uptime, info button, lifecycle lane
// ===========================================================================

describe("hero chrome", () => {
  test("uptime shows only when connected with uptime>0", () => {
    const { rerender } = render(<NodeDashboardView model={{ ...ONLINE, uptimeSeconds: 0 }} />);
    expect(screen.queryByTestId("hero-uptime")).toBeNull();
    rerender(<NodeDashboardView model={{ ...ONLINE, uptimeSeconds: 3661 }} />);
    expect(screen.getByTestId("hero-uptime")).toHaveTextContent("1h 1m");
  });

  test("status info button opens the Status info dialog", async () => {
    renderModel(ONLINE);
    await userEvent.click(screen.getByTestId("status-info-button"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Status")).toBeInTheDocument();
    expect(within(dialog).getByText("WHAT IS IT")).toBeInTheDocument();
  });

  test("lifecycle lane renders the six stages and tracks the current index", () => {
    renderModel({});
    const lane = screen.getByTestId("stage-lane");
    for (const label of ["Started", "Online", "Funded", "Aged", "Proposing", "Earning"])
      expect(within(lane).getByText(label)).toBeInTheDocument();
    expect(lane).toHaveAttribute("data-current", "-1");
  });

  test("lane sits at Online (index 1, busy) while bootstrapping", () => {
    renderModel({ ...ONLINE, synced: false, hasBeenOnline: false });
    expect(screen.getByTestId("stage-lane")).toHaveAttribute("data-current", "1");
  });

  test("lane reaches Funded (index 2) once online", () => {
    renderModel(ONLINE);
    expect(screen.getByTestId("stage-lane")).toHaveAttribute("data-current", "2");
  });
});

// ===========================================================================
// Metric tiles
// ===========================================================================

describe("metric tiles", () => {
  test("the grid declares a 1–4 column responsive reflow", () => {
    renderModel(ONLINE);
    expect(screen.getByTestId("metric-grid")).toHaveAttribute("data-responsive", "1-4");
  });

  test("Stake: formatted total + single-address caption and copy", () => {
    renderModel({ ...ONLINE, stakeTotal: "1500000000", stakeNoteCount: 2, stakeAddresses: ["abcdef1234567890wxyz"] });
    const tile = screen.getByTestId("tile-stake");
    expect(within(tile).getByText("1.5 LGO")).toBeInTheDocument();
    expect(within(tile).getByText(/2 notes/)).toBeInTheDocument();
    expect(within(tile).getByText(/abcdef…wxyz/)).toBeInTheDocument();
    expect(within(tile).getByRole("button", { name: /Copy Stake/ })).toBeInTheDocument();
  });

  test("Stake: reported zero shows '0 LGO' + 'Nothing has aged yet'", () => {
    renderModel({ ...ONLINE, stakeTotal: "0", stakeNoteCount: 0 });
    const tile = screen.getByTestId("tile-stake");
    expect(within(tile).getByText("0 LGO")).toBeInTheDocument();
    expect(within(tile).getByText("Nothing has aged yet")).toBeInTheDocument();
  });

  test("Stake: dash when nothing is reported at all", () => {
    renderModel({ ...ONLINE, stakeTotal: "", stakeNoteCount: 0 });
    expect(within(screen.getByTestId("tile-stake")).getByText("—")).toBeInTheDocument();
  });

  test("Earned: total + voucher-count caption", () => {
    renderModel({ ...ONLINE, earnedTotal: "2000000000", earnedClaimCount: 3 });
    const tile = screen.getByTestId("tile-earned");
    expect(within(tile).getByText("2 LGO")).toBeInTheDocument();
    expect(within(tile).getByText("3 vouchers")).toBeInTheDocument();
  });

  test("Blend: Core tinted with its caption", () => {
    renderModel({ ...ONLINE, blendRole: BlendRole.Core });
    const tile = screen.getByTestId("tile-blend");
    const val = within(tile).getByText("Core");
    expect(val).toBeInTheDocument();
    expect(styleColor(val)).toContain("var(--accent-yellow-soft)");
    expect(within(tile).getByText("Mixing your proposals")).toBeInTheDocument();
  });

  test("Blend: Edge for a plain running node", () => {
    renderModel({ ...ONLINE, blendRole: BlendRole.Edge });
    expect(within(screen.getByTestId("tile-blend")).getByText("Edge")).toBeInTheDocument();
  });

  test("Epoch value", () => {
    renderModel({ ...ONLINE, epoch: "174" });
    expect(within(screen.getByTestId("tile-epoch")).getByText("174")).toBeInTheDocument();
  });

  test("Ready to Claim: voucher count + ≈value caption", () => {
    renderModel({ ...ONLINE, voucherCount: 3, voucherTotalClaimable: "3000000000" });
    const tile = screen.getByTestId("tile-ready-to-claim");
    expect(within(tile).getByText("3")).toBeInTheDocument();
    expect(within(tile).getByText("≈3 LGO before fees")).toBeInTheDocument();
  });

  test("Ready to Claim: dash before the wallet reports", () => {
    renderModel({ ...ONLINE, voucherCount: -1 });
    expect(within(screen.getByTestId("tile-ready-to-claim")).getByText("—")).toBeInTheDocument();
  });

  test("Peers: red zero + connection caption", () => {
    renderModel({ ...ONLINE, peerCount: 0, connectionCount: 0 });
    const tile = screen.getByTestId("tile-peers");
    const val = within(tile).getByText("0");
    expect(styleColor(val)).toContain("var(--error)");
    expect(within(tile).getByText("0 connections")).toBeInTheDocument();
  });

  test("Peer ID: shortened + copy", () => {
    const pid = "12D3KooWABCDEF1234567890EwLz";
    renderModel({ ...ONLINE, peerId: pid });
    const tile = screen.getByTestId("tile-peer-id");
    expect(within(tile).getByText("12D3Ko…EwLz")).toBeInTheDocument();
    expect(within(tile).getByRole("button", { name: /Copy Peer ID/ })).toBeInTheDocument();
  });

  test("Mining Rewards: compact value, dense caption, active dot", () => {
    renderModel({
      ...ONLINE,
      powRewardsLepta: "16600000000",
      powClaimsSubmitted: 2,
      powClaimsPending: 1,
      powActive: true,
    });
    const tile = screen.getByTestId("tile-mining-rewards");
    expect(within(tile).getByText("16.6 LGO")).toBeInTheDocument();
    expect(within(tile).getByText("2 sent · 1 settling")).toBeInTheDocument();
    expect(within(tile).getByLabelText("active")).toBeInTheDocument();
  });

  test("Mining Rewards: a mining error takes the caption and warns the tile", () => {
    renderModel({ ...ONLINE, miningError: "mining stopped: no peers" });
    const tile = screen.getByTestId("tile-mining-rewards");
    expect(within(tile).getByText("mining stopped: no peers")).toBeInTheDocument();
    expect(tile).toHaveClass("stat-tile--warning");
  });

  test("CPU: per-core percent + machine-share caption", () => {
    renderModel({ ...ONLINE, nodeCpuPercent: 50, cpuCount: 8 });
    const tile = screen.getByTestId("tile-cpu");
    expect(within(tile).getByText("50%")).toBeInTheDocument();
    expect(within(tile).getByText("6% of 8 cores")).toBeInTheDocument();
  });

  test("RAM: GB formatting", () => {
    renderModel({ ...ONLINE, nodeMemoryMb: 2048 });
    expect(within(screen.getByTestId("tile-ram")).getByText("2.0GB")).toBeInTheDocument();
  });

  test("Disk: critical free space turns the value red", () => {
    renderModel({ ...ONLINE, nodeDiskUsedMb: 1024, nodeDiskFreeMb: 1000 });
    const tile = screen.getByTestId("tile-disk");
    const val = within(tile).getByText("1.0GB");
    expect(styleColor(val)).toContain("var(--error)");
    expect(within(tile).getByText("1000MB free")).toBeInTheDocument();
  });

  test("Slot / Height: raw value + copy", () => {
    renderModel({ ...ONLINE, slot: "176809", heightValue: "5333" });
    expect(within(screen.getByTestId("tile-slot")).getByText("176809")).toBeInTheDocument();
    expect(within(screen.getByTestId("tile-height")).getByText("5333")).toBeInTheDocument();
    expect(within(screen.getByTestId("tile-slot")).getByRole("button", { name: /Copy Slot/ })).toBeInTheDocument();
  });

  test("LiB: shortened hash + slot caption + both copies", () => {
    renderModel({ ...ONLINE, lib: "ac131240c5309f43895830bda041", libSlot: "173060" });
    const tile = screen.getByTestId("tile-lib");
    expect(within(tile).getByText("ac1312…a041")).toBeInTheDocument();
    expect(within(tile).getByText("slot 173060")).toBeInTheDocument();
    expect(within(tile).getAllByRole("button", { name: /Copy LiB/ }).length).toBe(2);
  });

  test("TiP: shortened hash + copy", () => {
    renderModel({ ...ONLINE, tip: "13937fee036450f9e633 b1daa".replace(/\s/g, "") });
    const tile = screen.getByTestId("tile-tip");
    expect(within(tile).getByText(/13937f…1daa/)).toBeInTheDocument();
  });

  test("poll-derived tiles dim when the status poll is stale", () => {
    renderModel({ ...ONLINE, statusStale: true, statusNextPollSeconds: 3 });
    expect(screen.getByTestId("tile-peers")).toHaveClass("stat-tile--dim");
    expect(screen.getByTestId("tile-slot")).toHaveClass("stat-tile--dim");
    // Vouchers come from elsewhere and are NOT dimmed by this poll.
    expect(screen.getByTestId("tile-ready-to-claim")).not.toHaveClass("stat-tile--dim");
  });

  test("a tile info button opens that topic's dialog", async () => {
    renderModel(ONLINE);
    await userEvent.click(within(screen.getByTestId("tile-stake")).getByRole("button", { name: "Stake info" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Stake")).toBeInTheDocument();
    expect(within(dialog).getByText(/leadership lottery/)).toBeInTheDocument();
  });
});

// ===========================================================================
// Keys-backup banner
// ===========================================================================

describe("keys-backup banner", () => {
  test("shows when the keystore is present and not backed up; dismiss hides it", async () => {
    renderModel({ ...ONLINE, keystorePresent: true, keysBackedUp: false });
    expect(screen.getByTestId("keys-backup-banner")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByTestId("keys-backup-banner")).toBeNull();
  });

  test("hidden once the keys are backed up", () => {
    renderModel({ ...ONLINE, keystorePresent: true, keysBackedUp: true });
    expect(screen.queryByTestId("keys-backup-banner")).toBeNull();
  });
});

// ===========================================================================
// Live monitor — feeding mocked API responses
// ===========================================================================

describe("live monitor (mocked endpoints)", () => {
  beforeEach(() => {
    (ep.getCryptarchiaInfo as Mock).mockResolvedValue({
      cryptarchia_info: { lib: "ac131240deadbeefa041", lib_slot: 173060, tip: "13937feecafef00d1daa", slot: 176809, height: 5333, state: "Online" },
      phase: "Following",
    });
    (ep.getTimeInfo as Mock).mockResolvedValue({ slot_duration_ms: 1000, genesis_time_unix_ms: 1790758800000, current_slot: 176848, current_epoch: 4, slots_per_epoch: 36000 });
    (ep.getNetworkInfo as Mock).mockResolvedValue({ listen_addresses: [], peer_id: "12D3KooWABC1234567890EwLz", connected_peers: ["a", "b", "c"] });
    (ep.getBlendInfo as Mock).mockResolvedValue({ node_id: "12D3KooWJoK", core_info: null });
    (ep.getPowStatus as Mock).mockResolvedValue({ is_mining: true, are_rewards_enabled: true, auto_claim: { is_armed: true, tick: { unit: "seconds", value: 10 }, targets: [] } });
    (ep.getPowRewardsClaimable as Mock).mockResolvedValue({ claimable_tickets: 0, slots_until_expiry: [] });
    (ep.getLeaderAgedNotes as Mock).mockResolvedValue({ tip: "t", notes: [{ note_id: "n", value: 21171132, public_key: "5f88" }], count: 1, total_value: 21171132 });
    (ep.getLeaderClaimVouchers as Mock).mockResolvedValue({ tip: "t", vouchers: [], reward_amount: 3819, total_claimable: 0 });
  });

  afterEach(() => vi.clearAllMocks());

  test("polls the node and renders the Online hero with live tiles", async () => {
    render(<NodeDashboardView />);
    expect(await screen.findByText("Following the chain")).toBeInTheDocument();
    expect(heroLabel()).toHaveTextContent("Online");
    expect(ep.getCryptarchiaInfo).toHaveBeenCalled();
    // Live-derived tiles.
    expect(within(screen.getByTestId("tile-epoch")).getByText("4")).toBeInTheDocument();
    expect(within(screen.getByTestId("tile-peers")).getByText("3")).toBeInTheDocument();
    expect(within(screen.getByTestId("tile-blend")).getByText("Edge")).toBeInTheDocument();
  });

  test("a failing node that never connected reads 'Not started'", async () => {
    (ep.getCryptarchiaInfo as Mock).mockRejectedValue(new Error("ECONNREFUSED"));
    render(<NodeDashboardView />);
    // Let the initial poll settle inside act, then assert the hero.
    await waitFor(() => expect(ep.getCryptarchiaInfo).toHaveBeenCalled());
    expect(heroLabel()).toHaveTextContent("Not started");
  });
});
