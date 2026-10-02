# Logos Node 0.3.0 — HTTP API map for the web UI replica

**Purpose:** map every HTTP endpoint the node UI consumes, with real response
examples captured from a live node, so a web replica can wire each screen to
real data.

- **Node version probed:** `0.3.0` (commit `926cd84`, chain id `0.3.0`)
- **Live source:** sneg node tunnelled to `http://127.0.0.1:8808` (state `Online`, phase `Following`)
- **Captured:** 2026-10-02. All GET examples below are REAL responses (trimmed). No endpoint was mutated.
- **Schema source:** `nodes/api-common/src/paths.rs` (paths), `nodes/node/binary/src/api/routes.rs` (method+handler table), `nodes/api-common/src/bodies/*` + `services/api/src/http/pow.rs` (body types), `nodes/node/binary/src/api/handlers.rs` (handlers/queries).
- **UI source:** `logos-blockchain-ui-official/src/qml` (QML views) + `src/BlockchainBackend.{h,cpp}` (C++/Logos backend that owns the HTTP calls).

## Endpoint count

- **47 endpoints total** = **26 read (GET)** + **21 mutating (POST/PUT)**.
- Note: one "read" is served over POST (`/mantle/status`) as a documented
  "GET requiring a request body" workaround — it does not mutate. It is listed
  under reads but flagged.

---

## How the UI talks to the node (architecture note)

The UI repo does **not** contain literal endpoint strings. The QML views
(`src/qml/views/*.qml`) call named backend methods on a Logos module replica
(`logos.module("blockchain_ui")`, a C++ `BlockchainBackend`), and that backend
(via the Logos SDK) issues the HTTP requests. So "which view consumes an
endpoint" is mapped below by the backend call name referenced in the QML plus
the view's documented payload comments (e.g. `// get_cryptarchia_info payload`,
`// wallet_get_claimable_vouchers`, `channel_deposit_with_notes`). Backend
call name → endpoint correspondence is 1:1 by name
(`get_cryptarchia_info` → `/cryptarchia/info`, `pow_status` → `/pow/status`, etc.).

### View → endpoint quick index

| View (`src/qml/views/`) | Endpoints consumed |
|---|---|
| `NodeDashboardView` / `NodeStatusMonitor` / `BlockchainView` | `/cryptarchia/info`, `/time/info`, `/network/info`, `/pow/status`, `/leader/claim/vouchers`, `/leader/aged-notes`, `/version`, `/chain/id` |
| `InfoSections` / `infoContent.js` | `/blend/info`, `/leader/aged-notes`, `/network/info`, `/time/info` |
| `AccountsView` / `WalletView` | `/wallet/:public_key/balance` (per account) |
| `TransferView` | `/wallet/:public_key/balance` (read) + **POST `/wallet/transactions/transfer-funds`** (write) |
| `MiningView` | `/pow/status`, `/pow/rewards/claimable`, `/time/info` + **PUT `/pow/mining/*`**, **PUT `/pow/auto-claim/*`**, **POST `/pow/claim`** |
| `PowConfigView` / `PowAutoClaimTargets` | `/pow/status` (auto-claim targets) + mining-config writes (mining/auto-claim PUTs) |
| `LeaderRewardsView` | `/leader/claim/vouchers`, `/time/info` + **POST `/leader/claim`** |
| `BlocksView` | block stream / `/cryptarchia/blocks*` (BlockModel) |
| `ExplorerView` | `/cryptarchia/blocks/:id` (`get_block`), `/cryptarchia/transaction/:id` (`get_transaction`) |
| `ChannelDepositView` / `NoteSelector` | `wallet_get_notes` (balance notes) + **POST `/channel/deposit`** |
| `NodeSettingsView` | `/version`, `/chain/id`, `/network/info` + **POST `/network/dial_peer`** |
| Blend / SDP stake (`refreshStake`/`refreshBlendRole`) | `/mantle/sdp/declarations`, `/mantle/sdp/snapshot`, `/blend/info` + SDP/blend writes |
| `Onboarding*` | drives mining/network setup; reads `/cryptarchia/info`, `/network/info`; triggers mining PUTs |

---

## READ endpoints (GET) — with real responses

### 1. `GET /version` — `NodeSettingsView`, dashboard
```json
{"version":"0.3.0","commit":"926cd84","tag":"0.3.0","target":"x86_64-unknown-linux-gnu","profile":"release","rustc":"rustc 1.98.1 (48a229cea 2026-09-01)"}
```

### 2. `GET /chain/id` — `NodeSettingsView`, dashboard
```json
{"chain_id":"0.3.0"}
```

### 3. `GET /cryptarchia/info` — `NodeDashboardView`, `NodeStatusMonitor` (polled)
Optional query: `?from=<headerId>&to=<headerId>` (`CryptarchiaInfoQuery`, both optional).
```json
{"cryptarchia_info":{"lib":"ac131240c5309f43895830b31f14ac36f45be7a6d099fb5570e9c7f390bda041","lib_slot":173060,"tip":"13937fee036450f9e6336b14b4387457cb4e31f962ae913f5840f9f5ec3b1daa","slot":176809,"height":5333,"state":"Online"},"phase":"Following"}
```
`state` ∈ {Online, ...}; `phase` ∈ {Following, ...}. This is the primary "is my node healthy / synced" signal.

### 4. `GET /time/info` — dashboard, `MiningView`, `LeaderRewardsView` (epoch display)
```json
{"slot_duration_ms":1000,"genesis_time_unix_ms":1790758800000,"current_slot":176848,"current_epoch":4,"slots_per_epoch":36000}
```

### 5. `GET /network/info` — `NodeDashboardView`, `NodeSettingsView`, `InfoSections`
```json
{"listen_addresses":["/ip4/127.0.0.1/udp/3000/quic-v1","/ip4/100.108.127.3/udp/3000/quic-v1", "..."],
 "peer_id":"12D3KooWJNSobaCTESNRTQB2Kwtfj78vKBf8mh1k6MNgMG3PD3CW",
 "connected_peers":["12D3KooWBgZjLU1v6KJQP4BqVjkoEEHmssCjzgSirvCTc4KYS3oV","... (~30 peers)"]}
```
UI shows peer count = `connected_peers.length` and the local `peer_id`.

### 6. `GET /blend/info` — Blend role panel, `InfoSections`
```json
{"node_id":"12D3KooWJoKdgKTQ4bFBPbFTVcwr6f7XoLy6XCDdtDJQNMcGUYKG","core_info":null}
```
`core_info` is `null` when this node is not connected to a Blend core.

### 7. `GET /pow/status` — `MiningView`, `PowConfigView`, `PowAutoClaimTargets`, dashboard (polled)
```json
{"is_mining":true,"are_rewards_enabled":true,
 "auto_claim":{"is_armed":true,"tick":{"unit":"seconds","value":10},
   "targets":[{"public_key":"5f88705981e04bf80471f22a534f10fdad05e76d6577cf8930b89aed6221661a","threshold":18446744073709551615,"balance":19946577045}]}}
```
Drives mining on/off badge, rewards-enabled badge, and the auto-claim targets table (public key, threshold, live balance).

### 8. `GET /pow/rewards/claimable` — `MiningView` (tickets ready / expiry)
```json
{"claimable_tickets":0,"slots_until_expiry":[]}
```
`slots_until_expiry` is a list of slot counts, one per claimable ticket.

### 9. `GET /leader/aged-notes` — dashboard (`wallet_get_leader_aged_notes`), `InfoSections` (eligibility)
```json
{"tip":"13937fee036450f9e6336b14b4387457cb4e31f962ae913f5840f9f5ec3b1daa",
 "notes":[{"note_id":"5201bc0c...8015","value":21171132,"public_key":"5f8870...661a"}, "... (many)"],
 "count":<usize>,"total_value":<u64>}
```
`count` + `total_value` answer "am I eligible to lead, and with how much stake" without walking `notes`.

### 10. `GET /leader/claim/vouchers` — `LeaderRewardsView`, dashboard (`wallet_get_claimable_vouchers`)
```json
{"tip":"13937fee036450f9e6336b14b4387457cb4e31f962ae913f5840f9f5ec3b1daa","vouchers":[],"reward_amount":3819,"total_claimable":0}
```
Each voucher = `{commitment, nullifier}`. `reward_amount` = payout per voucher at `tip`; `total_claimable` = `reward_amount * vouchers.len()`.
(Note: served with `content-type: text/plain` despite JSON body — parse as JSON regardless.)

### 11. `GET /mantle/gas-prices` — fee estimation (transfer / channel deposit)
Optional query `?tip=<headerId>` (`GasPricesQuery`).
```json
{"tip":"13937fee036450f9e6336b14b4387457cb4e31f962ae913f5840f9f5ec3b1daa","execution_base_gas_price":1,"storage_gas_price":5}
```

### 12. `GET /wallet/:public_key/balance` — `AccountsView`, `WalletView`, `TransferView`, `ChannelDepositView`
Path param: wallet Zk public key (hex). Optional query `?tip=<headerId>` (`TipQuery`).
```json
{"tip":"738567ba...b7d4","balance":19946577045,
 "notes":{"e0103d8f...9904":23852988,"9c6c62eb...1f02":21171132,"...":"..."},
 "address":"<zkPublicKey>"}
```
`balance` = sum; `notes` = map of `noteId -> value` (UTXOs), used by `NoteSelector` for funding selection.

### 13. `GET /mantle/sdp/declarations` — SDP/stake provider directory
Map keyed by declaration id:
```json
{"3af23e18...e3af":{"service_type":"BN","provider_id":"da8060ee...f6b0","service_note_id":"da256d2a...0e1e","locators":["/ip4/65.109.51.37/udp/3402/quic-v1"],"zk_id":"41140...4c19","created":0,"active":2,"withdraw_at":null,"nonce":0}, "...":"..."}
```

### 14. `GET /mantle/sdp/snapshot` — SDP active-set snapshot (same shape as declarations)
```json
{"54ad3b88...238a":{"service_type":"BN","provider_id":"59c6628...b473","service_note_id":"44e03d8e...d826","locators":["/ip4/65.109.51.37/udp/3400/quic-v1"],"zk_id":"6b2bcd30...660a","created":0,"active":2,"withdraw_at":null,"nonce":0}, "...":"..."}
```

### 15. `GET /mantle/metrics` — mempool/throughput metrics
```json
{"pending_items":270,"last_item_timestamp":1790935631660}
```

### 16. `GET /mempool/view` — list of pending tx hashes
```json
["b6d0ddef...195d","fa9e20ba...92f9","... (array of tx-hash hex strings)"]
```

### 17. `GET /blend/transactions/pending` — pending blend transactions
```json
[]
```

### 18. `GET /cryptarchia/headers` — recent header ids (newest first)
```json
["13937fee...1daa","b4368 67f...40d4","... (array of header-id hex)"]
```

### 19. `GET /cryptarchia/blocks` — immutable blocks by slot range — `BlocksView`
**Required** query (`BlockRangeQuery`): `?slot_from=<usize>&slot_to=<usize>`.
Without them → `400 "missing field slot_from"`. Example `?slot_from=176000&slot_to=176005` → `[]` (no immutable blocks in that window here). Returns an array of full block objects.

### 20. `GET /cryptarchia/blocks/:id` — `ExplorerView` (`get_block`)
Path param: header id (32-byte hex; non-hex → `400`).
```json
{"header":{"id":"738567ba...b7d4","parent_block":"13937fee...1daa","slot":176851,"body_root":"611282ae...de95","proof_of_leadership":{"proof":"879bc3f7...0793","entropy_contribution":"97db9cc6...ef15","leader_key":"f9cdec9c...ea73","voucher_cm":"12588695...522c"}}, "...":"body/txs..."}
```

### 21. `GET /cryptarchia/blocks/:id/events` — block events — `ExplorerView` / claims catch-up
Path param: header id. Returns array (empty when block has no events):
```json
[]
```

### 22. `GET /cryptarchia/transaction/:id` — `ExplorerView` (`get_transaction`, lookup fallback)
Path param: tx hash. Returns the transaction object.

### 23. `GET /cryptarchia/blocks_range` — streaming/range block fetch (query `BlocksStreamQuery`: `slot_from?`, `slot_to?`, sort, limit). Feeds `BlockModel` / `BlocksView`.

### 24. `GET /cryptarchia/events/blocks/stream` — **SSE** stream of new blocks (`blocks_stream`). Live block feed for `BlocksView` / dashboard height. (Server-sent events; not plain JSON.)

### 25. `GET /cryptarchia/lib-stream` — **SSE** stream of LIB (last-irreversible-block) updates. Sync-progress / finality indicator.

### 26. `GET /channel/:id` — LEZ channel info — `ChannelDepositView` context
Path param: 32-byte channel id (hex). (`channel/0` → `400 "expected 32 bytes, got 0"`.)

> **Reads served over POST (flagged):**
> `POST /mantle/status` — request body `["<txHash>", ...]` (array of tx-hash hex),
> returns per-tx mempool status. Documented "GET requiring a request body"
> workaround; **non-mutating**. Used for tracking submitted-tx confirmation.

---

## MUTATING endpoints (POST / PUT) — DO NOT call against the live node

All request-body shapes are from the Rust body types. **None were exercised.**
A web replica must gate these behind explicit user action + confirm.

### Wallet / transfer

**`POST /wallet/transactions/transfer-funds`** — `TransferView` (send funds)
Body `WalletTransferFundsRequestBody`:
```jsonc
{ "tip": "<headerId|null>", "change_public_key": "<zkPk>", "funding_public_keys": ["<zkPk>", "..."],
  "recipient_public_key": "<zkPk>", "amount": <u64> }
```
→ `201` `{ "hash": "<txHash>" }`

**`POST /wallet/fund`** — fund/assemble a transaction (zone SDK path)
Body `WalletFundRequestBody`: `{ tip?, tx_builder, change_public_key, funding_public_keys[], max_tx_fee, priority_fee_percent=12 }`
→ `{ tip, funded_tx, transfer_proof? }` (all ops unsigned).

**`POST /wallet/sign/ed25519`** — Body `{ tx_hash, pk }` → `{ sig }`
**`POST /wallet/sign/zk`** — Body `{ tx_hash, pks }` → `{ sig }`

### Channels

**`POST /channel/deposit`** — `ChannelDepositView` (`channel_deposit_with_notes`)
Body `ChannelDepositRequestBody`:
```jsonc
{ "tip": "<headerId|null>", "deposit": <DepositOp>, "change_public_key": "<zkPk>",
  "funding_public_keys": ["<zkPk>", "..."], "max_tx_fee": <GasCost> }
```
→ `{ "hash": "<txHash>" }`

### PoW mining / claiming — `MiningView`, `PowConfigView`

- **`PUT /pow/mining/start`** — no body. Start mining.
- **`PUT /pow/mining/stop`** — no body. Stop mining.
- **`PUT /pow/auto-claim/start`** — no body. Arm auto-claim.
- **`PUT /pow/auto-claim/stop`** — no body. Disarm auto-claim.
- **`POST /pow/claim`** — body `Option<PoWClaimRequestBody>` = `{ "claim_address": "<zkPk|null>" }` (whole body optional). → `{ "tx_hash": "<txHash>|null" }`.

### Leadership

**`POST /leader/claim`** — `LeaderRewardsView`. **No request body** (state-only handler). Submits reward-claim txs for aged vouchers.

### Blend

- **`POST /blend/join`** — body `JoinBlendRequestBody` = `{ "locator": <Locator>, "service_note_id": "<NoteId>" }`.
- **`POST /blend/transactions/disperse`** — body `SignedOps` (signed tx) — disperse a tx over the blend network.

### SDP (service declaration protocol) — stake lifecycle

- **`POST /sdp/declaration`** — body `DeclarationMessage`.
- **`POST /sdp/activity`** — body `ActivityMetadata`.
- **`POST /sdp/withdrawal`** — body `DeclarationId`.
- **`POST /sdp/set-declaration-id`** — body `Option<DeclarationId>`.

### Network / mempool / admin

- **`POST /network/dial_peer`** — `NodeSettingsView`. Body `DialPeerRequestBody` (peer multiaddr).
- **`POST /mempool/add/tx`** — body `SignedOps` (signed tx) — submit a raw tx.
- **`PUT /admin/tracing/filter`** — admin: live-reload the tracing filter. Not a user screen.

---

## CORS & auth — proxy situation

**CORS is fully open.** The node sets permissive CORS on every response — a
browser-based web UI can call it directly cross-origin.

Observed on `GET /cryptarchia/info`:
```
access-control-allow-origin: *
vary: origin, access-control-request-method, access-control-request-headers
```
Observed on preflight `OPTIONS /wallet/transactions/transfer-funds`
(`Origin: http://localhost:5173`, `Access-Control-Request-Method: POST`):
```
HTTP/1.1 200 OK
access-control-allow-origin: *
access-control-allow-methods: *
access-control-allow-headers: content-type,user-agent
allow: POST
```

**Auth: none.** No `Authorization` / token / cookie is required or checked;
unknown paths return a plain `404`. The API is unauthenticated and assumes a
trusted local/LAN binding.

**Proxy guidance for the replica:**
- CORS does **not** force a proxy — the browser can hit the node origin
  directly (`*` allow-origin, preflight passes, `content-type` is an allowed
  request header).
- A **dev proxy is still recommended** for ergonomics/reachability, not CORS:
  the live node here is reached over a localhost/Tailscale tunnel
  (`127.0.0.1:8808`), and a Vite/dev proxy (e.g. `/api/* -> http://127.0.0.1:8808`)
  avoids hard-coding the node origin and mixed-content (http vs https) issues
  when the UI is served over https.
- **Two SSE endpoints** (`/cryptarchia/events/blocks/stream`,
  `/cryptarchia/lib-stream`) need an `EventSource`/streaming-capable proxy pass-through
  (disable buffering).
- Because there is **no auth and writes are unguarded**, a prod deployment must
  not expose the node API to the open internet — keep it behind the tunnel/LAN
  or an authenticating reverse proxy, and never surface the mutating endpoints
  without an explicit user-confirmed action.
