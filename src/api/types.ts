// TypeScript shapes for every Logos node 0.3.0 HTTP endpoint.
//
// Response interfaces are derived from the REAL payload examples captured in
// docs/spec/api-map.md (node 0.3.0, commit 926cd84). Request-body interfaces
// are derived from the Rust body types referenced there
// (`nodes/api-common/src/bodies/*`, `services/api/src/http/pow.rs`).
//
// Notes on fidelity:
// - Hex ids/keys/hashes are plain `string`.
// - u64 values (balances, thresholds, slots) are typed `number`: that is what
//   `JSON.parse` yields. Some (e.g. the u64::MAX auto-claim threshold) exceed
//   Number.MAX_SAFE_INTEGER and are therefore lossy — handle as opaque where
//   exactness matters.
// - Where the api-map documents a Rust body/response type whose field layout
//   was not captured (opaque signed envelopes, builder blobs), the shape is an
//   honest `unknown`/alias rather than an invented interface. These are flagged
//   inline.

// ---------------------------------------------------------------------------
// Opaque / placeholder aliases (Rust types whose field layout is not captured)
// ---------------------------------------------------------------------------

/** Opaque signed-operations envelope (Rust `SignedOps`). Shape not captured. */
export type SignedOps = unknown;
/** A single deposit op inside a channel deposit (Rust `DepositOp`). */
export type DepositOp = unknown;
/** Transaction builder blob for the zone-SDK fund path (Rust `TxBuilder`). */
export type TxBuilder = unknown;
/** SDP declaration message (Rust `DeclarationMessage`). Shape not captured. */
export type DeclarationMessage = unknown;
/** SDP activity metadata (Rust `ActivityMetadata`). Shape not captured. */
export type ActivityMetadata = unknown;
/** A libp2p multiaddr locator (Rust `Locator`), e.g. "/ip4/.../udp/3402/quic-v1". */
export type Locator = string;
/** SDP declaration id (hex). */
export type DeclarationId = string;
/** Gas cost / fee amount (u64). */
export type GasCost = number;
/** A zk wallet public key (hex). */
export type ZkPublicKey = string;
/** A cryptarchia header id (32-byte hex). */
export type HeaderId = string;
/** A transaction hash (hex). */
export type TxHash = string;

// ---------------------------------------------------------------------------
// READ responses (GET)
// ---------------------------------------------------------------------------

/** `GET /version` */
export interface VersionInfo {
  version: string;
  commit: string;
  tag: string;
  target: string;
  profile: string;
  rustc: string;
}

/** `GET /chain/id` */
export interface ChainId {
  chain_id: string;
}

/** `GET /cryptarchia/info` — inner block. */
export interface CryptarchiaInfo {
  lib: HeaderId;
  lib_slot: number;
  tip: HeaderId;
  slot: number;
  height: number;
  /** e.g. "Online". */
  state: string;
}

/** `GET /cryptarchia/info` */
export interface CryptarchiaInfoResponse {
  cryptarchia_info: CryptarchiaInfo;
  /** e.g. "Following". */
  phase: string;
}

/** Optional query for `GET /cryptarchia/info` (`CryptarchiaInfoQuery`). */
export interface CryptarchiaInfoQuery {
  from?: HeaderId;
  to?: HeaderId;
}

/** `GET /time/info` */
export interface TimeInfo {
  slot_duration_ms: number;
  genesis_time_unix_ms: number;
  current_slot: number;
  current_epoch: number;
  slots_per_epoch: number;
}

/** `GET /network/info` */
export interface NetworkInfo {
  listen_addresses: string[];
  peer_id: string;
  connected_peers: string[];
}

/** `GET /blend/info`. `core_info` is `null` when not connected to a Blend core. */
export interface BlendInfo {
  node_id: string;
  core_info: Record<string, unknown> | null;
}

/** Auto-claim tick ({ unit: "seconds", value: 10 }). */
export interface AutoClaimTick {
  unit: string;
  value: number;
}

/** One auto-claim target row in `GET /pow/status`. */
export interface AutoClaimTarget {
  public_key: ZkPublicKey;
  /** u64; the sample is u64::MAX (lossy as a JS number). */
  threshold: number;
  balance: number;
}

/** Auto-claim block of `GET /pow/status`. */
export interface AutoClaim {
  is_armed: boolean;
  tick: AutoClaimTick;
  targets: AutoClaimTarget[];
}

/** `GET /pow/status` */
export interface PowStatus {
  is_mining: boolean;
  are_rewards_enabled: boolean;
  auto_claim: AutoClaim;
}

/** `GET /pow/rewards/claimable` */
export interface PowRewardsClaimable {
  claimable_tickets: number;
  /** One slot count per claimable ticket. */
  slots_until_expiry: number[];
}

/** One aged note row in `GET /leader/aged-notes`. */
export interface AgedNote {
  note_id: string;
  value: number;
  public_key: ZkPublicKey;
}

/** `GET /leader/aged-notes` */
export interface LeaderAgedNotes {
  tip: HeaderId;
  notes: AgedNote[];
  count: number;
  total_value: number;
}

/** One claimable voucher in `GET /leader/claim/vouchers`. */
export interface Voucher {
  commitment: string;
  nullifier: string;
}

/** `GET /leader/claim/vouchers` (served as text/plain; parse as JSON). */
export interface LeaderClaimVouchers {
  tip: HeaderId;
  vouchers: Voucher[];
  /** Payout per voucher at `tip`. */
  reward_amount: number;
  /** reward_amount * vouchers.length. */
  total_claimable: number;
}

/** `GET /mantle/gas-prices` */
export interface GasPrices {
  tip: HeaderId;
  execution_base_gas_price: number;
  storage_gas_price: number;
}

/** Optional query for `GET /mantle/gas-prices` (`GasPricesQuery`). */
export interface GasPricesQuery {
  tip?: HeaderId;
}

/** Optional `?tip=` query (`TipQuery`). */
export interface TipQuery {
  tip?: HeaderId;
}

/** `GET /wallet/:public_key/balance` */
export interface WalletBalance {
  tip: HeaderId;
  balance: number;
  /** Map of noteId -> value (UTXOs). */
  notes: Record<string, number>;
  address: ZkPublicKey;
}

/** One entry in `GET /mantle/sdp/declarations` and `.../snapshot`. */
export interface SdpDeclaration {
  /** e.g. "BN". */
  service_type: string;
  provider_id: string;
  service_note_id: string;
  locators: Locator[];
  zk_id: string;
  created: number;
  active: number;
  withdraw_at: number | null;
  nonce: number;
}

/** `GET /mantle/sdp/declarations` — keyed by declaration id. */
export type SdpDeclarations = Record<DeclarationId, SdpDeclaration>;

/** `GET /mantle/sdp/snapshot` — keyed by declaration id (same shape). */
export type SdpSnapshot = Record<DeclarationId, SdpDeclaration>;

/** `GET /mantle/metrics` */
export interface MantleMetrics {
  pending_items: number;
  last_item_timestamp: number;
}

/** `GET /mempool/view` — pending tx hashes. */
export type MempoolView = TxHash[];

/** `GET /blend/transactions/pending` — pending blend txs (shape not captured). */
export type BlendPendingTransactions = unknown[];

/** `GET /cryptarchia/headers` — recent header ids (newest first). */
export type Headers = HeaderId[];

/** Proof-of-leadership block inside a block header. */
export interface ProofOfLeadership {
  proof: string;
  entropy_contribution: string;
  leader_key: string;
  voucher_cm: string;
}

/** Block header (`GET /cryptarchia/blocks/:id`). */
export interface BlockHeader {
  id: HeaderId;
  parent_block: HeaderId;
  slot: number;
  body_root: string;
  proof_of_leadership: ProofOfLeadership;
}

/** A full block object. Body/tx fields beyond the header are not captured. */
export interface Block {
  header: BlockHeader;
  [k: string]: unknown;
}

/** Required query for `GET /cryptarchia/blocks` (`BlockRangeQuery`). */
export interface BlockRangeQuery {
  slot_from: number;
  slot_to: number;
}

/** Query for `GET /cryptarchia/blocks_range` (`BlocksStreamQuery`). */
export interface BlocksStreamQuery {
  slot_from?: number;
  slot_to?: number;
  sort?: string;
  limit?: number;
}

/** Block event (`GET /cryptarchia/blocks/:id/events`; shape not captured). */
export type BlockEvent = unknown;

/** A transaction object (`GET /cryptarchia/transaction/:id`; shape not captured). */
export type Transaction = unknown;

/** LEZ channel info (`GET /channel/:id`; shape not captured). */
export type ChannelInfo = unknown;

/** Per-tx mempool status (`POST /mantle/status`; shape not captured). */
export type MantleStatusResponse = unknown;

/** LIB update pushed on `GET /cryptarchia/lib-stream`. */
export interface LibUpdate {
  lib?: HeaderId;
  lib_slot?: number;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// MUTATING request bodies + responses (POST / PUT)
// ---------------------------------------------------------------------------

/** `POST /wallet/transactions/transfer-funds` (`WalletTransferFundsRequestBody`). */
export interface WalletTransferFundsRequestBody {
  tip: HeaderId | null;
  change_public_key: ZkPublicKey;
  funding_public_keys: ZkPublicKey[];
  recipient_public_key: ZkPublicKey;
  amount: number;
}

/** `{ hash }` response for transfer-funds / channel deposit. */
export interface TxHashResponse {
  hash: TxHash;
}

/** `POST /wallet/fund` (`WalletFundRequestBody`). */
export interface WalletFundRequestBody {
  tip?: HeaderId | null;
  tx_builder: TxBuilder;
  change_public_key: ZkPublicKey;
  funding_public_keys: ZkPublicKey[];
  max_tx_fee: GasCost;
  /** Defaults to 12 on the node. */
  priority_fee_percent?: number;
}

/** `POST /wallet/fund` response (all ops unsigned). */
export interface WalletFundResponse {
  tip: HeaderId;
  funded_tx: unknown;
  transfer_proof?: unknown;
}

/** `POST /wallet/sign/ed25519` body. */
export interface SignEd25519RequestBody {
  tx_hash: TxHash;
  pk: string;
}

/** `POST /wallet/sign/zk` body. */
export interface SignZkRequestBody {
  tx_hash: TxHash;
  pks: string[];
}

/** `{ sig }` response for the sign endpoints. */
export interface SignResponse {
  sig: string;
}

/** `POST /channel/deposit` (`ChannelDepositRequestBody`). */
export interface ChannelDepositRequestBody {
  tip: HeaderId | null;
  deposit: DepositOp;
  change_public_key: ZkPublicKey;
  funding_public_keys: ZkPublicKey[];
  max_tx_fee: GasCost;
}

/** `POST /pow/claim` body — the whole body is optional (`Option<PoWClaimRequestBody>`). */
export interface PoWClaimRequestBody {
  claim_address: ZkPublicKey | null;
}

/** `POST /pow/claim` response. */
export interface PoWClaimResponse {
  tx_hash: TxHash | null;
}

/** `POST /blend/join` (`JoinBlendRequestBody`). */
export interface JoinBlendRequestBody {
  locator: Locator;
  service_note_id: string;
}

/** `POST /network/dial_peer` (`DialPeerRequestBody`). */
export interface DialPeerRequestBody {
  /** Peer multiaddr. Field name not captured from Rust — verify against node. */
  address: string;
}
