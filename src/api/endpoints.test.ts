import { afterEach, describe, expect, test, vi } from "vitest";
import * as ep from "./endpoints";

afterEach(() => vi.restoreAllMocks());

/** Mock fetch to return `body`; return the spy so tests can read url/method/body. */
function mockFetch(body: unknown, status = 200) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(text, { status }));
}
function calledUrl(f: ReturnType<typeof mockFetch>) {
  return f.mock.calls[0][0] as string;
}
function calledInit(f: ReturnType<typeof mockFetch>) {
  return (f.mock.calls[0][1] ?? {}) as RequestInit;
}

// ---------------------------------------------------------------------------
// READ endpoints (GET) — zero-arg, path + parsed shape
// ---------------------------------------------------------------------------

const GET_READS: Array<{ name: string; call: () => Promise<unknown>; path: string; sample: unknown }> = [
  { name: "getVersion", call: () => ep.getVersion(), path: "/api/version",
    sample: { version: "0.3.0", commit: "926cd84", tag: "0.3.0", target: "x86_64-unknown-linux-gnu", profile: "release", rustc: "rustc 1.98.1" } },
  { name: "getChainId", call: () => ep.getChainId(), path: "/api/chain/id", sample: { chain_id: "0.3.0" } },
  { name: "getCryptarchiaInfo", call: () => ep.getCryptarchiaInfo(), path: "/api/cryptarchia/info",
    sample: { cryptarchia_info: { lib: "ac13", lib_slot: 173060, tip: "1393", slot: 176809, height: 5333, state: "Online" }, phase: "Following" } },
  { name: "getTimeInfo", call: () => ep.getTimeInfo(), path: "/api/time/info",
    sample: { slot_duration_ms: 1000, genesis_time_unix_ms: 1790758800000, current_slot: 176848, current_epoch: 4, slots_per_epoch: 36000 } },
  { name: "getNetworkInfo", call: () => ep.getNetworkInfo(), path: "/api/network/info",
    sample: { listen_addresses: ["/ip4/127.0.0.1/udp/3000/quic-v1"], peer_id: "12D3KooWJNS", connected_peers: ["12D3KooWBgZ"] } },
  { name: "getBlendInfo", call: () => ep.getBlendInfo(), path: "/api/blend/info",
    sample: { node_id: "12D3KooWJoK", core_info: null } },
  { name: "getPowStatus", call: () => ep.getPowStatus(), path: "/api/pow/status",
    sample: { is_mining: true, are_rewards_enabled: true, auto_claim: { is_armed: true, tick: { unit: "seconds", value: 10 }, targets: [{ public_key: "5f88", threshold: 18446744073709551615, balance: 19946577045 }] } } },
  { name: "getPowRewardsClaimable", call: () => ep.getPowRewardsClaimable(), path: "/api/pow/rewards/claimable",
    sample: { claimable_tickets: 0, slots_until_expiry: [] } },
  { name: "getLeaderAgedNotes", call: () => ep.getLeaderAgedNotes(), path: "/api/leader/aged-notes",
    sample: { tip: "1393", notes: [{ note_id: "5201", value: 21171132, public_key: "5f88" }], count: 1, total_value: 21171132 } },
  { name: "getLeaderClaimVouchers", call: () => ep.getLeaderClaimVouchers(), path: "/api/leader/claim/vouchers",
    sample: { tip: "1393", vouchers: [], reward_amount: 3819, total_claimable: 0 } },
  { name: "getGasPrices", call: () => ep.getGasPrices(), path: "/api/mantle/gas-prices",
    sample: { tip: "1393", execution_base_gas_price: 1, storage_gas_price: 5 } },
  { name: "getSdpDeclarations", call: () => ep.getSdpDeclarations(), path: "/api/mantle/sdp/declarations",
    sample: { "3af2": { service_type: "BN", provider_id: "da80", service_note_id: "da25", locators: ["/ip4/65.109.51.37/udp/3402/quic-v1"], zk_id: "4114", created: 0, active: 2, withdraw_at: null, nonce: 0 } } },
  { name: "getSdpSnapshot", call: () => ep.getSdpSnapshot(), path: "/api/mantle/sdp/snapshot",
    sample: { "54ad": { service_type: "BN", provider_id: "59c6", service_note_id: "44e0", locators: ["/ip4/65.109.51.37/udp/3400/quic-v1"], zk_id: "6b2b", created: 0, active: 2, withdraw_at: null, nonce: 0 } } },
  { name: "getMantleMetrics", call: () => ep.getMantleMetrics(), path: "/api/mantle/metrics",
    sample: { pending_items: 270, last_item_timestamp: 1790935631660 } },
  { name: "getMempoolView", call: () => ep.getMempoolView(), path: "/api/mempool/view", sample: ["b6d0", "fa9e"] },
  { name: "getBlendPendingTransactions", call: () => ep.getBlendPendingTransactions(), path: "/api/blend/transactions/pending", sample: [] },
  { name: "getHeaders", call: () => ep.getHeaders(), path: "/api/cryptarchia/headers", sample: ["1393", "b436"] },
];

describe("GET reads (zero-arg): path + parsed shape", () => {
  for (const r of GET_READS) {
    test(`${r.name} -> GET ${r.path}`, async () => {
      const f = mockFetch(r.sample);
      const out = await r.call();
      expect(calledUrl(f)).toBe(r.path);
      expect(calledInit(f).method).toBeUndefined();
      expect(out).toEqual(r.sample);
    });
  }
});

// ---------------------------------------------------------------------------
// READ endpoints with path params / query strings
// ---------------------------------------------------------------------------

describe("GET reads with params/queries", () => {
  test("getCryptarchiaInfo appends from/to query", async () => {
    const f = mockFetch({ cryptarchia_info: {}, phase: "Following" });
    await ep.getCryptarchiaInfo({ from: "aa", to: "bb" });
    expect(calledUrl(f)).toBe("/api/cryptarchia/info?from=aa&to=bb");
  });

  test("getGasPrices appends tip query", async () => {
    const f = mockFetch({ tip: "x", execution_base_gas_price: 1, storage_gas_price: 5 });
    await ep.getGasPrices({ tip: "abc" });
    expect(calledUrl(f)).toBe("/api/mantle/gas-prices?tip=abc");
  });

  test("getWalletBalance builds the path and encodes the key", async () => {
    const f = mockFetch({ tip: "7385", balance: 19946577045, notes: { e010: 23852988 }, address: "pk" });
    const out = await ep.getWalletBalance("pk/weird");
    expect(calledUrl(f)).toBe("/api/wallet/pk%2Fweird/balance");
    expect(out).toMatchObject({ balance: 19946577045 });
  });

  test("getWalletBalance adds tip when given", async () => {
    const f = mockFetch({});
    await ep.getWalletBalance("pk", "tiphash");
    expect(calledUrl(f)).toBe("/api/wallet/pk/balance?tip=tiphash");
  });

  test("getBlocks requires slot_from/slot_to", async () => {
    const f = mockFetch([]);
    await ep.getBlocks({ slot_from: 176000, slot_to: 176005 });
    expect(calledUrl(f)).toBe("/api/cryptarchia/blocks?slot_from=176000&slot_to=176005");
  });

  test("getBlocksRange is all-optional", async () => {
    const f = mockFetch([]);
    await ep.getBlocksRange({ slot_from: 1, limit: 10, sort: "desc" });
    expect(calledUrl(f)).toBe("/api/cryptarchia/blocks_range?slot_from=1&sort=desc&limit=10");
    const f2 = mockFetch([]);
    await ep.getBlocksRange();
    expect(calledUrl(f2)).toBe("/api/cryptarchia/blocks_range");
  });

  test("getBlock / getBlockEvents / getTransaction / getChannel build :id paths", async () => {
    const f1 = mockFetch({ header: { id: "738" } });
    const b = await ep.getBlock("738");
    expect(calledUrl(f1)).toBe("/api/cryptarchia/blocks/738");
    expect(b).toMatchObject({ header: { id: "738" } });

    const f2 = mockFetch([]);
    await ep.getBlockEvents("738");
    expect(calledUrl(f2)).toBe("/api/cryptarchia/blocks/738/events");

    const f3 = mockFetch({ tx: 1 });
    await ep.getTransaction("deadbeef");
    expect(calledUrl(f3)).toBe("/api/cryptarchia/transaction/deadbeef");

    const f4 = mockFetch({ channel: 1 });
    await ep.getChannel("00ff");
    expect(calledUrl(f4)).toBe("/api/channel/00ff");
  });

  test("getMantleStatus is a POST read with a tx-hash array body", async () => {
    const f = mockFetch({ abc: "pending" });
    const out = await ep.getMantleStatus(["abc", "def"]);
    expect(calledUrl(f)).toBe("/api/mantle/status");
    const init = calledInit(f);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(["abc", "def"]));
    expect(out).toEqual({ abc: "pending" });
  });

  test("a read propagates ApiError on non-2xx", async () => {
    mockFetch("boom", 500);
    await expect(ep.getVersion()).rejects.toMatchObject({ name: "ApiError", status: 500 });
  });
});

// ---------------------------------------------------------------------------
// MUTATING endpoints (POST / PUT)
// ---------------------------------------------------------------------------

type Mut = { name: string; call: () => Promise<unknown>; method: string; path: string; body?: unknown };

const MUTATIONS: Mut[] = [
  { name: "transferFunds", method: "POST", path: "/api/wallet/transactions/transfer-funds",
    body: { tip: null, change_public_key: "c", funding_public_keys: ["f"], recipient_public_key: "r", amount: 100 },
    call: () => ep.transferFunds({ tip: null, change_public_key: "c", funding_public_keys: ["f"], recipient_public_key: "r", amount: 100 }) },
  { name: "walletFund", method: "POST", path: "/api/wallet/fund",
    body: { tx_builder: { b: 1 }, change_public_key: "c", funding_public_keys: ["f"], max_tx_fee: 10 },
    call: () => ep.walletFund({ tx_builder: { b: 1 }, change_public_key: "c", funding_public_keys: ["f"], max_tx_fee: 10 }) },
  { name: "signEd25519", method: "POST", path: "/api/wallet/sign/ed25519", body: { tx_hash: "h", pk: "p" },
    call: () => ep.signEd25519({ tx_hash: "h", pk: "p" }) },
  { name: "signZk", method: "POST", path: "/api/wallet/sign/zk", body: { tx_hash: "h", pks: ["p1", "p2"] },
    call: () => ep.signZk({ tx_hash: "h", pks: ["p1", "p2"] }) },
  { name: "channelDeposit", method: "POST", path: "/api/channel/deposit",
    body: { tip: null, deposit: { d: 1 }, change_public_key: "c", funding_public_keys: ["f"], max_tx_fee: 5 },
    call: () => ep.channelDeposit({ tip: null, deposit: { d: 1 }, change_public_key: "c", funding_public_keys: ["f"], max_tx_fee: 5 }) },
  { name: "startMining", method: "PUT", path: "/api/pow/mining/start", body: undefined, call: () => ep.startMining() },
  { name: "stopMining", method: "PUT", path: "/api/pow/mining/stop", body: undefined, call: () => ep.stopMining() },
  { name: "startAutoClaim", method: "PUT", path: "/api/pow/auto-claim/start", body: undefined, call: () => ep.startAutoClaim() },
  { name: "stopAutoClaim", method: "PUT", path: "/api/pow/auto-claim/stop", body: undefined, call: () => ep.stopAutoClaim() },
  { name: "powClaim (with body)", method: "POST", path: "/api/pow/claim", body: { claim_address: "addr" },
    call: () => ep.powClaim({ claim_address: "addr" }) },
  { name: "leaderClaim", method: "POST", path: "/api/leader/claim", body: undefined, call: () => ep.leaderClaim() },
  { name: "blendJoin", method: "POST", path: "/api/blend/join", body: { locator: "/ip4/x", service_note_id: "n" },
    call: () => ep.blendJoin({ locator: "/ip4/x", service_note_id: "n" }) },
  { name: "blendDisperse", method: "POST", path: "/api/blend/transactions/disperse", body: { signed: 1 },
    call: () => ep.blendDisperse({ signed: 1 }) },
  { name: "sdpDeclaration", method: "POST", path: "/api/sdp/declaration", body: { decl: 1 },
    call: () => ep.sdpDeclaration({ decl: 1 }) },
  { name: "sdpActivity", method: "POST", path: "/api/sdp/activity", body: { act: 1 },
    call: () => ep.sdpActivity({ act: 1 }) },
  { name: "sdpWithdrawal", method: "POST", path: "/api/sdp/withdrawal", body: "decl-id",
    call: () => ep.sdpWithdrawal("decl-id") },
  { name: "sdpSetDeclarationId (null)", method: "POST", path: "/api/sdp/set-declaration-id", body: null,
    call: () => ep.sdpSetDeclarationId(null) },
  { name: "dialPeer", method: "POST", path: "/api/network/dial_peer", body: { addr: "/ip4/1.2.3.4" },
    call: () => ep.dialPeer({ addr: "/ip4/1.2.3.4" }) },
  { name: "mempoolAddTx", method: "POST", path: "/api/mempool/add/tx", body: { tx: 1 },
    call: () => ep.mempoolAddTx({ tx: 1 }) },
  { name: "setTracingFilter", method: "PUT", path: "/api/admin/tracing/filter", body: { filter: "debug" },
    call: () => ep.setTracingFilter({ filter: "debug" }) },
];

describe("MUTATING endpoints: method + path + serialized body", () => {
  for (const m of MUTATIONS) {
    test(`${m.name} -> ${m.method} ${m.path}`, async () => {
      const f = mockFetch(m.name.startsWith("transferFunds") || m.name.startsWith("channelDeposit") ? { hash: "tx" } : {});
      await m.call();
      expect(calledUrl(f)).toBe(m.path);
      const init = calledInit(f);
      expect(init.method).toBe(m.method);
      if (m.body === undefined) {
        expect(init.body).toBeUndefined();
      } else {
        expect(init.body).toBe(JSON.stringify(m.body));
      }
    });
  }

  test("transferFunds returns the typed { hash }", async () => {
    mockFetch({ hash: "0xdead" }, 201);
    const out = await ep.transferFunds({ tip: null, change_public_key: "c", funding_public_keys: ["f"], recipient_public_key: "r", amount: 1 });
    expect(out).toEqual({ hash: "0xdead" });
  });

  test("powClaim without a body sends no body and parses { tx_hash }", async () => {
    const f = mockFetch({ tx_hash: null });
    const out = await ep.powClaim();
    expect(calledInit(f).body).toBeUndefined();
    expect(out).toEqual({ tx_hash: null });
  });

  test("a mutation propagates ApiError on non-2xx", async () => {
    mockFetch("bad request", 400);
    await expect(ep.startMining()).rejects.toMatchObject({ name: "ApiError", status: 400 });
  });
});
