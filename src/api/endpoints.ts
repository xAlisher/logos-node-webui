// One typed function per Logos node 0.3.0 HTTP endpoint.
//
// Layout: READ endpoints (GET) first, then the read-over-POST, then the SSE
// stream helpers, then MUTATING endpoints (POST/PUT) — the last group is
// gated behind explicit, user-confirmed UI actions and typed with its request
// bodies. See docs/spec/api-map.md for the contract and real payloads.

import { api, API_BASE, buildQuery } from "./client";
import type {
  Block,
  BlockEvent,
  BlockRangeQuery,
  BlocksStreamQuery,
  BlendInfo,
  BlendPendingTransactions,
  ChainId,
  ChannelDepositRequestBody,
  ChannelInfo,
  CryptarchiaInfoQuery,
  CryptarchiaInfoResponse,
  DeclarationId,
  DeclarationMessage,
  ActivityMetadata,
  DialPeerRequestBody,
  GasPrices,
  GasPricesQuery,
  Headers,
  JoinBlendRequestBody,
  LeaderAgedNotes,
  LeaderClaimVouchers,
  LibUpdate,
  MantleMetrics,
  MantleStatusResponse,
  MempoolView,
  NetworkInfo,
  PoWClaimRequestBody,
  PoWClaimResponse,
  PowRewardsClaimable,
  PowStatus,
  SdpDeclarations,
  SdpSnapshot,
  SignedOps,
  SignEd25519RequestBody,
  SignResponse,
  SignZkRequestBody,
  TimeInfo,
  Transaction,
  TxHash,
  TxHashResponse,
  VersionInfo,
  WalletBalance,
  WalletFundRequestBody,
  WalletFundResponse,
  WalletTransferFundsRequestBody,
  ZkPublicKey,
} from "./types";

// Re-export types so screens can `import { ..., type PowStatus } from "../api/endpoints"`.
export * from "./types";

// ===========================================================================
// READ endpoints (GET) — safe, idempotent
// ===========================================================================

/** 1. `GET /version` */
export const getVersion = () => api.get<VersionInfo>("/version");

/** 2. `GET /chain/id` */
export const getChainId = () => api.get<ChainId>("/chain/id");

/** 3. `GET /cryptarchia/info` — primary health/sync signal. */
export const getCryptarchiaInfo = (query?: CryptarchiaInfoQuery) =>
  api.get<CryptarchiaInfoResponse>(
    "/cryptarchia/info" + buildQuery({ from: query?.from, to: query?.to }),
  );

/** 4. `GET /time/info` */
export const getTimeInfo = () => api.get<TimeInfo>("/time/info");

/** 5. `GET /network/info` */
export const getNetworkInfo = () => api.get<NetworkInfo>("/network/info");

/** 6. `GET /blend/info` */
export const getBlendInfo = () => api.get<BlendInfo>("/blend/info");

/** 7. `GET /pow/status` */
export const getPowStatus = () => api.get<PowStatus>("/pow/status");

/** 8. `GET /pow/rewards/claimable` */
export const getPowRewardsClaimable = () => api.get<PowRewardsClaimable>("/pow/rewards/claimable");

/** 9. `GET /leader/aged-notes` */
export const getLeaderAgedNotes = () => api.get<LeaderAgedNotes>("/leader/aged-notes");

/** 10. `GET /leader/claim/vouchers` (text/plain JSON body). */
export const getLeaderClaimVouchers = () => api.get<LeaderClaimVouchers>("/leader/claim/vouchers");

/** 11. `GET /mantle/gas-prices` */
export const getGasPrices = (query?: GasPricesQuery) =>
  api.get<GasPrices>("/mantle/gas-prices" + buildQuery({ tip: query?.tip }));

/** 12. `GET /wallet/:public_key/balance` */
export const getWalletBalance = (publicKey: ZkPublicKey, tip?: string) =>
  api.get<WalletBalance>(`/wallet/${encodeURIComponent(publicKey)}/balance` + buildQuery({ tip }));

/** 13. `GET /mantle/sdp/declarations` */
export const getSdpDeclarations = () => api.get<SdpDeclarations>("/mantle/sdp/declarations");

/** 14. `GET /mantle/sdp/snapshot` */
export const getSdpSnapshot = () => api.get<SdpSnapshot>("/mantle/sdp/snapshot");

/** 15. `GET /mantle/metrics` */
export const getMantleMetrics = () => api.get<MantleMetrics>("/mantle/metrics");

/** 16. `GET /mempool/view` */
export const getMempoolView = () => api.get<MempoolView>("/mempool/view");

/** 17. `GET /blend/transactions/pending` */
export const getBlendPendingTransactions = () =>
  api.get<BlendPendingTransactions>("/blend/transactions/pending");

/** 18. `GET /cryptarchia/headers` */
export const getHeaders = () => api.get<Headers>("/cryptarchia/headers");

/** 19. `GET /cryptarchia/blocks` — immutable blocks by slot range (both params required). */
export const getBlocks = (query: BlockRangeQuery) =>
  api.get<Block[]>("/cryptarchia/blocks" + buildQuery({ slot_from: query.slot_from, slot_to: query.slot_to }));

/** 20. `GET /cryptarchia/blocks/:id` */
export const getBlock = (id: string) => api.get<Block>(`/cryptarchia/blocks/${encodeURIComponent(id)}`);

/** 21. `GET /cryptarchia/blocks/:id/events` */
export const getBlockEvents = (id: string) =>
  api.get<BlockEvent[]>(`/cryptarchia/blocks/${encodeURIComponent(id)}/events`);

/** 22. `GET /cryptarchia/transaction/:id` */
export const getTransaction = (id: string) =>
  api.get<Transaction>(`/cryptarchia/transaction/${encodeURIComponent(id)}`);

/** 23. `GET /cryptarchia/blocks_range` — streaming/range block fetch. */
export const getBlocksRange = (query?: BlocksStreamQuery) =>
  api.get<Block[]>(
    "/cryptarchia/blocks_range" +
      buildQuery({
        slot_from: query?.slot_from,
        slot_to: query?.slot_to,
        sort: query?.sort,
        limit: query?.limit,
      }),
  );

/** 26. `GET /channel/:id` — LEZ channel info. */
export const getChannel = (id: string) => api.get<ChannelInfo>(`/channel/${encodeURIComponent(id)}`);

/**
 * Read served over POST (flagged non-mutating in the spec):
 * `POST /mantle/status` — body is an array of tx-hash hex; returns per-tx mempool
 * status. Used to track submitted-tx confirmation. Does NOT mutate the node.
 */
export const getMantleStatus = (txHashes: TxHash[]) =>
  api.post<MantleStatusResponse>("/mantle/status", txHashes);

// ===========================================================================
// SSE stream helpers (24, 25) — EventSource over the /api prefix
// ===========================================================================

/** Options for an SSE subscription. */
export interface SseHandlers<T> {
  onMessage: (data: T) => void;
  /** Raw parse failures are surfaced here if provided, else ignored. */
  onError?: (err: unknown) => void;
}

function openStream<T>(path: string, handlers: SseHandlers<T>): EventSource {
  const es = new EventSource(API_BASE + path);
  es.onmessage = (ev: MessageEvent) => {
    try {
      handlers.onMessage(JSON.parse(ev.data) as T);
    } catch (err) {
      handlers.onError?.(err);
    }
  };
  es.onerror = (ev) => handlers.onError?.(ev);
  return es;
}

/**
 * 24. `GET /cryptarchia/events/blocks/stream` — SSE feed of new blocks.
 * Returns the EventSource; call `.close()` to unsubscribe.
 */
export const streamBlocks = (handlers: SseHandlers<Block>): EventSource =>
  openStream<Block>("/cryptarchia/events/blocks/stream", handlers);

/**
 * 25. `GET /cryptarchia/lib-stream` — SSE feed of LIB (last-irreversible-block) updates.
 * Returns the EventSource; call `.close()` to unsubscribe.
 */
export const streamLib = (handlers: SseHandlers<LibUpdate>): EventSource =>
  openStream<LibUpdate>("/cryptarchia/lib-stream", handlers);

// ===========================================================================
// MUTATING endpoints (POST / PUT) — DO NOT call without explicit user action.
// Every one of these changes node state or submits a transaction. Gate behind
// a confirm step in the UI. Request bodies are typed from the Rust body types.
// ===========================================================================

// --- Wallet / transfer ---------------------------------------------------

/** MUTATING. `POST /wallet/transactions/transfer-funds` — send funds (TransferView). */
export const transferFunds = (body: WalletTransferFundsRequestBody) =>
  api.post<TxHashResponse>("/wallet/transactions/transfer-funds", body);

/** MUTATING. `POST /wallet/fund` — assemble/fund a transaction (zone SDK path, unsigned). */
export const walletFund = (body: WalletFundRequestBody) =>
  api.post<WalletFundResponse>("/wallet/fund", body);

/** MUTATING. `POST /wallet/sign/ed25519` — sign a tx hash with an ed25519 key. */
export const signEd25519 = (body: SignEd25519RequestBody) =>
  api.post<SignResponse>("/wallet/sign/ed25519", body);

/** MUTATING. `POST /wallet/sign/zk` — sign a tx hash with zk keys. */
export const signZk = (body: SignZkRequestBody) => api.post<SignResponse>("/wallet/sign/zk", body);

// --- Channels -------------------------------------------------------------

/** MUTATING. `POST /channel/deposit` — deposit into a channel (ChannelDepositView). */
export const channelDeposit = (body: ChannelDepositRequestBody) =>
  api.post<TxHashResponse>("/channel/deposit", body);

// --- PoW mining / claiming (MiningView, PowConfigView) --------------------

/** MUTATING. `PUT /pow/mining/start` — start mining (no body). */
export const startMining = () => api.put<void>("/pow/mining/start");

/** MUTATING. `PUT /pow/mining/stop` — stop mining (no body). */
export const stopMining = () => api.put<void>("/pow/mining/stop");

/** MUTATING. `PUT /pow/auto-claim/start` — arm auto-claim (no body). */
export const startAutoClaim = () => api.put<void>("/pow/auto-claim/start");

/** MUTATING. `PUT /pow/auto-claim/stop` — disarm auto-claim (no body). */
export const stopAutoClaim = () => api.put<void>("/pow/auto-claim/stop");

/** MUTATING. `POST /pow/claim` — claim PoW rewards. Whole body optional. */
export const powClaim = (body?: PoWClaimRequestBody) =>
  api.post<PoWClaimResponse>("/pow/claim", body);

// --- Leadership -----------------------------------------------------------

/** MUTATING. `POST /leader/claim` — submit reward-claim txs for aged vouchers (no body). */
export const leaderClaim = () => api.post<unknown>("/leader/claim");

// --- Blend ----------------------------------------------------------------

/** MUTATING. `POST /blend/join` — join a Blend core. */
export const blendJoin = (body: JoinBlendRequestBody) => api.post<unknown>("/blend/join", body);

/** MUTATING. `POST /blend/transactions/disperse` — disperse a signed tx over the blend network. */
export const blendDisperse = (body: SignedOps) =>
  api.post<unknown>("/blend/transactions/disperse", body);

// --- SDP (service declaration protocol) — stake lifecycle -----------------

/** MUTATING. `POST /sdp/declaration` — submit a declaration. */
export const sdpDeclaration = (body: DeclarationMessage) => api.post<unknown>("/sdp/declaration", body);

/** MUTATING. `POST /sdp/activity` — submit activity metadata. */
export const sdpActivity = (body: ActivityMetadata) => api.post<unknown>("/sdp/activity", body);

/** MUTATING. `POST /sdp/withdrawal` — withdraw a declaration. */
export const sdpWithdrawal = (body: DeclarationId) => api.post<unknown>("/sdp/withdrawal", body);

/** MUTATING. `POST /sdp/set-declaration-id` — set/clear the active declaration id (null clears). */
export const sdpSetDeclarationId = (body: DeclarationId | null) =>
  api.post<unknown>("/sdp/set-declaration-id", body);

// --- Network / mempool / admin --------------------------------------------

/** MUTATING. `POST /network/dial_peer` — dial a peer by multiaddr (NodeSettingsView). */
export const dialPeer = (body: DialPeerRequestBody) => api.post<unknown>("/network/dial_peer", body);

/** MUTATING. `POST /mempool/add/tx` — submit a raw signed tx. */
export const mempoolAddTx = (body: SignedOps) => api.post<unknown>("/mempool/add/tx", body);

/** MUTATING. `PUT /admin/tracing/filter` — live-reload the tracing filter (admin, not a user screen). */
export const setTracingFilter = (body: unknown) => api.put<unknown>("/admin/tracing/filter", body);
