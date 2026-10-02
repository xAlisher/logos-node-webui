# Logos Node UI — Feature & Action Inventory (Parity Contract)

Source of truth: the official `logos-blockchain/logos-blockchain-ui` repo at
`/extra/tmp/logos-blockchain-ui-official` (master). This inventory maps the Qt/QML
desktop app so a web replica can reach feature parity — "no feature or action left
behind." Every view below is read from `src/qml/BlockchainView.qml` (shell),
`src/qml/views/*.qml`, `src/qml/controls/*.qml`, and `src/qml/dialogs/*.qml`.

Node concepts referenced come from the C++ `blockchain_ui` module (the backend
replica) and its models (`accounts`, `blocks`, `claims`, `miningClaims`).

**Terminology.** DS = the Logos design system components (prefix `Logos*`:
`LogosButton`, `LogosStatCard`, `LogosNotice`, `LogosSwitch`, `LogosComboBox`,
`LogosTextField`, `LogosTextArea`, `LogosCheckbox`, `LogosRadioButton`,
`LogosTabBar`/`LogosTabButton`, `LogosFrame`, `LogosDialog`, `LogosWarningDialog`,
`LogosStageLane`/`LogosStage`, `LogosInfoButton`, `LogosCopyButton`, `LogosToast`,
`LogosToolTip`, `LogosBadge`, `LogosSpinner`, `LogosListView`, `LogosScrollView`,
`LogosSearchBar`, `LogosLink`, `LogosSelectableText`, `LogosIcon`, `LogosIconButton`,
`LogosItemDelegate`).

---

## 0. App Shell (`BlockchainView.qml`)

**Route / entry:** the root. Everything is a child of the shell.

**Purpose:** connect to the `blockchain_ui` backend replica, route between
first-run setup and the running-node UI, own global dialogs/toasts, own the
status monitor and the periodic voucher refresh, and perform graceful shutdown.

**Layout / regions:**
- A centered "Connecting…" column (spinner + text) shown while `!ready`.
- A `StackLayout` with two pages: page 0 = `OnboardingFlow`, page 1 = the node
  operation page (header + tab bar + section stack + chain-id footer).
- Overlay-parented global dialogs/toasts.

**Global state model (drives which page shows):**
- `ready` — backend replica is Valid and acquired. While false: the Connecting
  state (spinner + "Connecting to blockchain backend...").
- `everReady` — distinguishes a never-connected launch from a dropped connection.
- `hasConfig` — the app has a user config to run from.
- `needsSetup` — ready but no config → setup opens itself (re-armed: if config
  disappears, setup returns).
- `setupOpen` (backend `setupInProgress`) — setup wizard is open; derives
  `currentPage` (0 = setup, 1 = node).
- `nodeRunning` — backend status === Running.
- `moduleReachable` — the node module subprocess is alive.
- `nodeOffReason` / `nodeOffSeverity` — single computed "why the node can't answer
  right now" string + severity, passed down to every node-dependent view (so each
  view shows one banner instead of inferring from a boolean).

**Backend lifecycle states (`BlockchainBackend` enum):** NotStarted, Starting,
Running, Stopping, Stopped, Error. Config states: ConfigUnknown, ConfigStale,
ConfigUnreadable, ConfigUpgraded.

**Interactive actions / behaviors:**
- Graceful shutdown: closing the window while the node is busy
  (Running/Starting/Stopping) vetoes the close, calls `stopBlockchain()`, then
  closes once stopped.
- Clipboard copy helper (`copyText`) — all copy buttons route through a hidden
  `TextEdit` in the GUI process (backend process can't touch the clipboard).
- Periodic claimable-vouchers refresh (coalesced 2s timer, gated on
  running + online) feeding the Rewards/Dashboard "Ready to Claim".
- `claimablePollActive` binding — tells the backend to poll claimable counts only
  while the Mining tab is open.

**Global dialogs / toasts:**
- `ConfigUpgradeDialog` (see §17) — armed whenever config is stale/unreadable or
  an upgrade just happened.
- `keystoreBackupToast` — success toast "Keystore saved" + path.
- `stopFailedToast` — "Couldn't stop the node" (and "Couldn't update the config").

---

## 0a. Node Operation Page — Header (`BlockchainView.qml`, `opPage`)

**Route:** page 1 top bar. Persistent across all six tabs.

**Layout:** `[Logos λ icon] "Blockchain Node" ……… [Fund] [Start/Stop Node]`.

**DS components:** `LogosIcon`, `LogosText`, `LogosButton` (x2), `LogosToolTip`.

**Interactive actions:**
- **Fund / Stop Mining button** (`fundMiningButton`) — toggles PoW mining
  (`powStartMining`/`powStopMining`). Label flips Fund ↔ Stop Mining on
  `miningActive`. Enabled only when node running AND (already mining OR synced).
  Tooltip on hover: "Mining runs until you stop it". Failure sets `miningError`
  shown on the Dashboard's Mining Rewards card.
- **Start Node / Stop Node button** (`nodeRunButton`, Primary):
  - Label: "Start Node" / "Stop Node" / "Stopping…" / "Stopping… Ns" (live
    seconds counter while stopping).
  - `canStart`: NotStarted/Stopped, or Error when module unreachable.
  - `canStop`: Running/Starting/Error while module reachable (Starting included
    so a long IBD can be aborted).
  - Disabled while Stopping.
  - On Start with a stale/unreadable config → opens the ConfigUpgradeDialog
    instead of starting.

**States:** enabled/disabled per canStart/canStop; stopping (disabled + counter).

---

## 0b. Node Operation Page — Tab Bar + Footer

**Tab bar** (`sectionTabs`, `LogosTabBar`): six tabs, index-for-index with the
section stack — **0 Node, 1 Rewards, 2 Explorer, 3 Wallet, 4 Mining, 5 Settings.**
No tab is gated/disabled; each view states in-place why it can't answer. Tabs are
also driven programmatically ("Open in Explorer" jumps to tab 2 and runs a search).

**Footer** (`chainFooter`): "Chain ID: <id>" (elided) + a `LogosCopyButton`.
Visible only when a chain id is reported.

---

## 1. Node Dashboard (`NodeDashboardView.qml`) — Tab "Node" (section 0)

**Purpose:** at-a-glance node health — a status hero with a lifecycle lane, over a
responsive grid of metric tiles.

**Layout / regions (vertical, scrollable):**
1. "Back up your keys" notice (conditional, closable).
2. Status hero (`LogosFrame`): large headline + animated dots + right-aligned
   uptime & sub-line + Status info button; a `LogosStageLane` across the bottom.
3. Responsive `GridLayout` (1–4 cols) of `LogosStatCard` tiles.

**Data displayed (and source concept):**
- Hero: derived node lifecycle state (from `status`, `connected`, `moduleReachable`,
  `nodeRecovering`, `synced`, `genesisPending`, `syncStalled`, `blockStreamEnded`,
  `statusStale`).
- Lifecycle lane stages: Started, Online, Funded, Aged, Proposing, Earning
  (node half live from status; wallet half holds at high-water mark).
- Tiles: **Stake** (`stakeTotal`/`stakeNoteCount`/`stakeAddresses`),
  **Earned** (`earnedTotal`/`earnedClaimCount`/`claimsCountingSince`),
  **Blend** (`blendRole` → Core/Edge/Not active/—),
  **Epoch** (`timeInfoJson.current_epoch`),
  **Ready to Claim** (claimable vouchers count + ≈total before fees),
  **Peers** (`peerCount`, red at 0; `connectionCount` caption),
  **Peer ID** (`peerId`, shortened + copy),
  **Mining Rewards** (`powRewardsLepta` + a dense caption of
  claimed/settling/waiting + a green "active" dot when `powActive`),
  **CPU** (`nodeCpuPercent`/`cpuCount`, per-core + machine-share caption),
  **RAM** (`nodeMemoryMb`), **Disk** (`nodeDiskUsedMb`/free, amber<5GB red<2GB),
  **Slot**, **Height**, **LiB** (+lib_slot), **TiP** — all from
  `get_cryptarchia_info`.

**Interactive actions:**
- Keys-backup notice: **dismiss (✕)** → `keysNoticeDismissed` (per-view only).
- Status **info button** → Status info dialog (InfoSections).
- Per-tile **info buttons** (each tile has one) → topic info dialog.
- Per-tile **copy buttons**: Stake (single address), Peer ID, Slot, Height,
  LiB (hash + lib_slot), TiP.
- Tiles flash on change (Epoch/Mining Rewards/CPU/RAM/Disk/Slot/Height) — visual.

**States:**
- Hero states: **Not started**, **Disconnected** (lost contact), **Node stopped**
  (module gone), **Error**, **Stopping** (+ "slow"/"catching up" sub after 4s),
  **Bootstrapping** (replaying / fell behind / syncing), **Bootstrapping — genesis
  in future** (red), **Bootstrapping — stalled / stream ended** (red), **Starting**
  ("Checking configuration"), **Online** ("Following the chain"), **Online — block
  stream ended** (green headline, red note), **stale poll** (grey + "retrying in
  Ns" / "no response for …").
- Poll-derived tiles **dim** (opacity 0.45) when status is stale.
- Tiles show "—" when a figure isn't reported.
- Grid reflows 1–4 columns by width.

---

## 2. Rewards / Leader Rewards (`LeaderRewardsView.qml`) — Tab "Rewards" (section 1)

**Purpose:** leader (block-proposal) reward vouchers — view, claim, and claim history.

**Layout:** node-off banner; header (title "Vouchers" + subtitle + **Claim** button);
two stat cards (Ready to claim, Submitted); claim-result notice; history header
(filter + count); history list / empty text; voucher-detail dialog.

**Data (source):** `vouchersJson` (`wallet_get_claimable_vouchers`:
tip, reward_amount, total_claimable, vouchers[{commitment,nullifier}]);
`submittedCount`, `pendingCount`; remoted `claimsModel`; `timeInfoJson`.

**Interactive actions:**
- **Claim** button (header, Primary) → `claimLeaderRewardsRequested()`.
- "Ready to claim" stat card is **clickable** (when it has vouchers) → opens the
  **Voucher detail dialog** (§20).
- Two **info buttons** (Ready to claim, Submitted).
- **"Show only pending"** checkbox → `historyPendingOnlyChanged` (sets backend
  claim-history filter).
- Claim-result notice is **closable** + has a **copy** action.
- History rows (`ClaimDelegate`): **Tx** and **Block** links → "Open in Explorer"
  (jumps to Explorer tab and searches the id).

**States:** Ready-to-claim value "—" until wallet reports; claim success (green
"Claim submitted") / failure (red) notice; history "Loading…" (model null) /
"No claims recorded yet" / "Nothing pending…" (filter on); per-row "Finalizing" /
"Finalizes in ~N …" badge until confirmed.

---

## 3. Explorer (`ExplorerView.qml` + `BlocksView.qml`) — Tab "Explorer" (section 2)

**Purpose:** look up a block or transaction by id/hash, and browse the blocks this
node has seen this session. Explorer is ungated (block table works without the
node; lookup needs a running node).

**Layout:** node-off banner; search row (search bar + Explorer info button);
status line (searching/not-found/error/"showing slot N"); result area (block OR
transaction card) OR the block table (resting state).

**Data (source):** lookups orchestrated in the shell —
`findTransactionInBlocks` → `getBlock` → `getTransaction` (auto-detect). Block
table from the remoted `blockModel` (latest 100, newest first).

**Interactive actions:**
- **Search bar** (`LogosSearchBar`) — type + submit a block id / tx hash.
  Keyboard shortcut **Ctrl+K** focuses & selects the field. Clearing the field
  (✕) resets the result and restores the table.
- **Explorer info button** → info dialog.
- **Copy raw block/transaction JSON** button on result cards (tooltip).
- Every hash field in a result is a `HashRow` with a **copy** button.
- Block table rows (`BlockDelegate`): **tap to expand/collapse** a row; a nested
  **Proof-of-leadership** group toggles open; each `TransactionDelegate` toggles
  open and exposes copy buttons; unparsed blocks show a raw-JSON fallback + copy.
- Table header cells show (decorative, non-interactive) sort triangles.

**States:** busy ("Searching…", with an 8s timeout → error); not found; error;
"Showing slot N" when the lookup filtered to an on-screen row; block result;
transaction result (with/without block context). Table empty states: "Start the
node to see blocks arrive." / "Waiting for the node to report its state…" /
"Waiting for the next block…" / "Slot N isn't in this session's blocks."

---

## 4. Wallet (`WalletView.qml`) — Tab "Wallet" (section 3)

**Purpose:** container for three wallet panels behind a left-hand section nav.

**Layout:** `SectionNav` (left, 160–200px) + a `LogosFrame` holding a `StackLayout`
of the three panels.

**Interactive actions:** **SectionNav** — three entries (Accounts, Transfer,
Channel Deposit), one selected at a time; click switches the stack. (No entry is
node-gated; each panel shows its own node-off banner.)

### 4a. Accounts (`AccountsView.qml`)
- **Purpose:** known wallet addresses, their role/label, and balance.
- **Data:** remoted `accountsModel` (`AccountDelegate` → `AccountSummary`).
- **Actions:** **Refresh** button (`refreshAccounts`; tooltip; disabled when node
  off); per-row **copy** address button.
- **States:** node-off banner; "No accounts in this wallet yet." (empty, node on).

### 4b. Transfer (`TransferView.qml`)
- **Purpose:** send funds between keys.
- **Data:** `accountRows` (label/address/balance).
- **Actions:** **From** combo (`LogosComboBox`, rich account summary delegate);
  **To** text field (64-hex recipient); **Amount (LGO)** text field (locale-aware
  numeric validator); **Send** button.
- **Validation/state:** "Available: X" shown; "More than this account holds."
  (over-balance, red); Send disabled unless node running + from set + to set +
  amount parsed + not over balance. Result notice: "Transaction sent" (green, hash
  + copy) / "Transfer failed" (red). Node-off banner.

### 4c. Channel Deposit (`ChannelDepositView.qml`) — 4-step wizard
- **Purpose:** `channel_deposit_with_notes` — deposit wallet notes (UTXOs) into a channel.
- **Layout:** node-off banner; "Step N of 4" + info button; a `StackLayout` of 4
  steps; footer nav (Back / Next / Confirm & deposit / New deposit).
- **Step 0 Select notes:** "Deposit from" account picker → loads notes
  (`wallet_get_notes`); `NoteSelector` (checkbox list of UTXOs with values,
  running "N selected / Total").
- **Step 1 Fields:** Channel ID hex field (64-hex validator) + optional **"LEZ
  testnet"** preset checkbox (prefills a shipped channel id, makes field
  read-only); "Change goes to" account picker; "Accounts funding the gas fee" —
  a picker + **Add** button building a removable list (each row has a trash
  **remove** icon-button w/ tooltip); **Max tx fee** field (numeric validator);
  **Metadata (base58, optional)** field (base58-alphabet validation); **Optional
  tip hex** field + **"Use query tip"** button.
- **Step 2 Confirm:** read-only review of the exact payload (summary rows).
- **Step 3 Result:** spinner "Submitting deposit…" → "Deposit submitted" (green,
  hash + copy) / "Deposit failed" (red); **New deposit** resets the wizard.
- **Actions:** Back; Next (gated by per-step `canAdvance`); Confirm & deposit
  (needs node running); New deposit; note checkboxes; add/remove funding key;
  LEZ preset toggle; use-query-tip; copies.
- **States:** notes loading / empty ("holds no notes") / "choose an account" /
  parse error; field validation errors (channel id / base58); submit
  pending/success/error; footer buttons visible per step.

---

## 5. Mining (`MiningView.qml`) — Tab "Mining" (section 4)

**Purpose:** PoW mining & claiming — the only place an operator sees whether
claiming actually works (tickets, awaiting payout, settled rewards, auto-claim
targets, manual claim, history).

**Layout:** node-off banner; header ("Tickets" + subtitle + Mining info button);
three counter stat cards; warning/info notices; Auto-claim section (switch + hint +
target rows); Manual claim section (account combo + Clear + Claim + result text);
History (filter + list / empty).

**Data (source):** `claimableTickets`/`soonestExpirySlots`/`soonestExpiryCount`/
`claimableLoaded`/`claimableError`; `submittedCount`/`pendingCount`;
`powRewardsLepta`; PoW runtime flags (`powStatusKnown`, `powRewardsEnabled`,
`autoClaimArmed`, `autoClaimSelfDisarmed`, `autoClaimTick`/`Unit`, `miningActive`,
`chainOnline`); `claimTargets` rows; remoted `miningClaimsModel`; `timeInfoJson`;
`accounts`.

**Interactive actions:**
- Three counter cards (Ready to claim, Awaiting payout, Mining Rewards) each with
  an **info button**.
- **Auto-claim switch** (`autoClaimToggled`) — enable gated on node running +
  online/known + (already armed OR unknown OR has targets).
- Auto-claim target rows (read-only display; "Threshold reached" badge; balance /
  threshold or "· no cap").
- Manual claim: **account combo** ("Let the node choose" default); **Clear**
  button; **Claim** button (enabled when running + not busy + has tickets).
- **"Show only pending"** checkbox → `historyPendingOnlyChanged`.
- History rows (`ClaimDelegate`): **Tx/Block → Open in Explorer** links.

**States:** counter "—" until `claimableLoaded`; claimable-error warning; "Nothing
is claiming these tickets" warning (mining-into-nothing); "This chain pays no
mining rewards" info; auto-claim hint lines (online-only / no pow_status / no
targets / self-disarmed / "nothing to claim until mining"); claim busy
("Claiming…"); claim result text (green/red); history loading / empty / pending-only
empty.

---

## 6. Settings (`NodeSettingsView.qml`) — Tab "Settings" (section 5)

**Purpose:** config file management, key backup, and database-reset guidance.
Wrapped in a scroll view (the destructive card is last and must not be cut off).

**Layout:** three `LogosFrame` cards — **Node (config)**, **Back up your keys**,
**Reset the database** (red border).

**Interactive actions:**
- **Node config card:** User Config field + **Browse** (file dialog) + copy;
  "Generated by this app." note; Deployment Config field + **Browse** + copy;
  "Config changed. Start the node to use it." notice; **Update config** button
  (only when config stale) → `updateConfigRequested`; **Start a new node** button
  → opens setup for a second node. Fields/buttons disabled while the node is up
  (`canChange`).
- **Back up your keys card:** "Done" badge when backed up; keystore path HashRow
  (or "No keystore found yet…"); **Download keystore.yaml** button (save dialog)
  → `backupKeystoreRequested`; failure notice (closable + copy). Success is a
  shell toast.
- **Reset the database card:** instructions + database-path HashRow (or "No
  database found yet…"). Guidance only — no button.

**States:** canChange (node stopped) vs disabled (running); config-stale →
Update button visible; config-changed notice; backup success/fail; keystore/db
path present vs absent.

---

## 7. Onboarding Welcome (`OnboardingWelcome.qml`)

**Route:** first screen of `OnboardingFlow` when no step is active (`step ===
"welcome"`). Shown on first run and whenever setup reopens.

**Layout:** full-bleed backdrop image + tint; centered column: "Blockchain Node"
title, **Quick start** (Primary), **Advanced** / "Set up your node" button; a busy
overlay (spinner + messages); a bottom error notice.

**Interactive actions:**
- **Quick start** (visible only when bootstrap peers are configured;
  `quickStartAvailable`) → generates config silently from shipped peers and starts
  the node (ends the flow).
- **Advanced** / "Set up your node" → enters the stepper at step 0.
- **Exit** (via flow footer; only when a usable config already exists).

**States:** busy overlay ("Setting up your node…" / custom message, "Writing your
config, creating your keys, and starting the node."); error notice "Could not
generate a config" (+ copy); Quick start hidden when no peers.

---

## 8. Onboarding Stepper Chrome (`OnboardingView.qml`)

**Purpose:** the advanced setup wizard shell — title/subtitle, a progress rail, a
step stack, and a footer. The step set is dynamic:
- Configure current node, generate: **Setup → Network → Keys → Fund**.
- Configure current node, existing file: **Setup** only.
- New node: **Network → Keys → Fund** (setup already answered).

**Layout:** header ("Set up your node" + "Advanced setup — …"); progress **rail**
(one segment+label per step, current highlighted); scroll view holding the step
`StackLayout`; footer.

**Footer actions:** **Exit** (if canExit); **Back** (if canGoBack); an **advance
hint** (why the primary is disabled); the **primary advance button** (label
varies: Continue / Start node / Generate config / See your keys / Start node /
Working…). Advance is gated per step (`canAdvance`) and triggers the step's submit.

**States:** per-step enable/disable of the advance button with contextual hint
text; busy (button shows a working label); rail reflects current step.

---

## 9. Onboarding — Setup Step (`OnboardingSetupStep.qml`)

**Purpose:** where the config comes from.

**Actions:** two **OnboardingChoiceCards** (radio-style): "Generate a new node"
(Recommended) vs "Use an existing config". When existing: **User config** field +
**Browse**; **Deployment** field (optional) + **Browse**; a keys-stay-put note.

**States:** existing-path fields hidden until "existing" is picked; "Setup failed"
error notice (+ copy); advance gated until a mode (and, for existing, a user
config path) is chosen.

---

## 10. Onboarding — Network Step (`OnboardingNetworkStep.qml`)

**Purpose:** which chain and who to dial.

**Actions:** "Default (public testnet)" vs "Custom deployment file" choice cards;
custom **Deployment** path field + **Browse** (when custom); **Bootstrap peers**
multiline text area (one multiaddr per line, prefilled from shipped peers) +
a Bootstrap-peers **info button**.

**States:** **locked** notice ("These settings are already written" — config can't
be regenerated; shows where the file is / its path) which makes fields read-only;
validation — needs a deployment file (custom) and ≥1 peer; "Could not generate a
config" error notice (+ copy).

---

## 11. Onboarding — Keys Step (`OnboardingKeysStep.qml`)

**Purpose:** the keystore back-up gate — the one step that refuses to be skipped.

**Actions:** a list of keys (label + address + per-row copy); **Download
keystore.yaml** button (save dialog) → backup; **"I've backed up my keys somewhere
safe"** acknowledge checkbox.

**States:** first-run warning "One copy, on this machine" (N keys) vs "Keys saved"
success (already backed up — checkbox hidden); keys-not-listed fallback text;
"Backup failed" error (+ copy); advance gated on the checkbox (or already backed up).

---

## 12. Onboarding — Fund Step (`OnboardingMiningStep.qml` + `PowConfigView` + `PowAutoClaimTargets`)

**Purpose:** mining config — how a fresh node self-funds (set once before first
start, since the node reads the whole pow section only at PoW-service start).

**Actions:**
- **Auto-claim switch** (Recommended badge) — on by default; prefills from any
  existing targets; off shows an explanatory note.
- **PowAutoClaimTargets** (visible when auto-claim on): account combo + "No cap"
  switch + Target-balance threshold field + **Add** button; a list of added
  targets each with a **Remove** button; a targets **info button**.
- **PowConfigView** (embedded mining settings): **Auto** threads switch +
  **Search threads** field; **Tickets in flight per block** field; **Claim attempt
  period (seconds)** field; each with an **info button**.

**States:** validation — integer ≥1 for each mining field (error line); auto-claim
needs ≥1 target when on (advance hint "Add an account for auto-claim to pay, or
switch it off"); "Could not save the mining settings" error (+ copy). Submit
writes the whole pow section via `powConfigure`, then starts the node.

---

## 13. Supporting controls (reused primitives)

- **NodeOffNotice** — the single node-can't-answer banner, declared at the top of
  every node-dependent view; hidden when the node answers.
- **OnboardingChoiceCard** — selectable card (title/badge/description + radio tick);
  whole card is clickable.
- **AccountSummary / AccountDelegate** — account row (name/role, address, balance,
  copy).
- **HashRow** — labelled monospace value + copy; **LinkRow** — same but the value
  is a clickable link (used for Tx/Block → Explorer).
- **ClaimDelegate** — one settled claim (value, date, finality badge, slot, payee,
  Tx/Block links).
- **BlockDelegate** — expandable block row (summary + header hashes + PoL subgroup
  + transactions + unparsed fallback).
- **TransactionDelegate** — expandable tx (opcode-named ops, payload/proof JSON,
  copies). Opcode names: Transfer, Channel Config/Inscribe/Deposit/Withdraw,
  SDP Declare/Withdraw/Active, Leader Claim.
- **NoteSelector** — UTXO checkbox list with running selected count/total.
- **JsonBlock** — prettified JSON display. **TableHeaderCell** — header label +
  (decorative) sort triangles.
- **NodeStatusMonitor** — non-visual poller: owns the status/time polling,
  exponential backoff, sync debounce, stale/stalled/stream-ended/genesis-pending
  detection. Drives every hero/stale state above.

---

## 14. Global Dialogs

### 17. Config Upgrade Dialog (`dialogs/ConfigUpgradeDialog.qml`)
One `LogosWarningDialog` with three faces chosen by `configState`:
- **ConfigStale + keystore** → "Your config is out of date" + **Update config** +
  **Not now**.
- **ConfigStale, no keystore** → "This config can't be updated" + **Start fresh**
  (new wallet) + **Not now**.
- **ConfigUnreadable** → "This config can't be read" (refusal reason) + **Not now**.
- **ConfigUpgraded** → "Config updated" — lists dropped settings (copyable list),
  previous-config backup path, merge-report path; **Start node**.
Busy state: spinner + "Updating…", all actions disabled. Error notice "Couldn't
update the config". Modal, no auto-close; re-armed on each stop/error.

### 19. Info Dialog (`views/InfoSections.qml`)
Opened by every `LogosInfoButton`. Four sections: WHAT IS IT / HOW IT'S CALCULATED
/ STATES (label→meaning rows) / DOCS (a copyable `LogosLink`). Content keyed by
topic in `infoContent.js` — 29 topics: status, blend, peers, mining, readyToClaim,
autoClaim, nodeConfig, miningOverview, claimableTickets, awaitingPayout,
miningRewards, submitted, peerId, stake, earned, epoch, slot, height, lib, tip,
cpu, ram, disk, explorer, bootstrapPeers, powSearchThreads, powTicketsPerBlock,
powClaimPeriod, powAutoClaimTargets.

### 20. Voucher Detail Dialog (`LeaderRewardsView.qml`)
Opened from the Rewards "Ready to claim" card. Lists each voucher (index, ≈value,
commitment `cm`, nullifier `nf` hash rows) as of a tip (copyable); a **Claim**
button (Primary). Modal, close on Escape / press-outside.

---

## Counts

- **Views / screens:** 20 distinct (shell + connecting state; node header; tab
  bar+footer; Dashboard; Rewards; Explorer; Blocks table; Wallet nav; Accounts;
  Transfer; Channel Deposit; Mining; Settings; Onboarding Welcome; Onboarding
  stepper; Setup/Network/Keys/Fund steps; Config Upgrade dialog; Info dialog;
  Voucher dialog). Counting the four onboarding steps individually → 23 screens.
- **Info-dialog topics:** 29.
- See `parity-checklist.json` for the exhaustive machine-readable list
  (features + actions + states).

## Ambiguities / notes

- **Stale comment in the shell.** `BlockchainView.qml` has an inline comment
  "0 Dashboard · 1 Explorer · 2 Rewards · 3 Mining · 4 Wallet · 5 Settings" that
  does **not** match the actual wired order. The real order (tab bar and section
  stack, index-for-index) is **0 Node(Dashboard), 1 Rewards, 2 Explorer, 3 Wallet,
  4 Mining, 5 Settings** — this is what the replica must follow.
- **Sort triangles** in the blocks table header (`TableHeaderCell`) are rendered
  but have no click handler / no sort wiring — decorative only. A replica need not
  implement sorting for parity, but should reproduce the indicators.
- **Keystore backup success** is reported by a shell-level toast, not inside
  Settings/Keys; the views only show the failure.
- **Auto-claim at runtime** is a runtime override (not written to config): a node
  restart undoes it. The wizard's Fund step, by contrast, writes the pow section.
- The `blend` role tile and `blendRole` are present in the official master (the
  fork's "Blend protos" are additive and are NOT the source of truth here).
