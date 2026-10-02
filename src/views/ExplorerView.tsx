import { useCallback, useEffect, useState } from "react";

import { Badge, Button, CopyButton, HashRow, Modal, TextField } from "../ds";
import { NodeOffNotice } from "../shell/NodeOffNotice";
import { registerParity } from "../test/parity";
import type { BlockRow } from "./blocks/blockModel";
import { TransactionDelegate } from "./blocks/TransactionDelegate";
import { useBlockModel } from "./blocks/useBlockModel";
import { BlocksView } from "./BlocksView";
import { useExplorerLookup, type LookupState } from "./explorer/useExplorerLookup";
import type { NodeViewProps } from "./types";
import "./explorer/explorer.css";

// The Explorer tab (official ExplorerView.qml, hosting BlocksView.qml as its resting
// state). Owns parity-checklist.json "view": "Explorer"; the embedded block table owns
// "view": "Blocks Table" (see BlocksView.tsx).
registerParity([
  "explorer-node-off-banner", // node-off banner at the top
  "explorer-search-bar", // search a block id / tx hash (submit)
  "explorer-search-shortcut", // Ctrl+K focuses and selects the field
  "explorer-search-clear", // ✕ resets the result and restores the block table
  "explorer-info-button", // info button opens the info dialog
  "explorer-state-busy", // "Searching…" with 8s timeout → error
  "explorer-state-notfound", // "Nothing found for X"
  "explorer-state-error", // lookup error (red)
  "explorer-state-filtered", // "Showing slot N" when matched an on-screen row
  "explorer-result-block", // block result card
  "explorer-result-transaction", // transaction result card (with/without context)
  "explorer-copy-raw-json", // copy raw block/transaction JSON
  "explorer-result-hash-copies", // per-field copy buttons on every HashRow
]);

const SEARCH_FIELD_ID = "explorer-search-field";

const INFO_TEXT =
  "Paste a block header id or a transaction hash, then press Search. The lookup is " +
  "auto-detected: it tries a block first, then a transaction.";

export interface ExplorerViewProps extends NodeViewProps {
  /**
   * A programmatic "Open in Explorer" request from the shell: the Rewards/Mining
   * history rows jump here and run this search. `nonce` changes on each request so
   * the same id can be re-opened. (shell-programmatic-nav-explorer)
   */
  openRequest?: { term: string; nonce: number };
}

export function ExplorerView({ nodeOffReason, nodeOffSeverity, openRequest }: ExplorerViewProps) {
  const nodeRunning = !nodeOffReason;
  const { blocks, status } = useBlockModel(nodeRunning);
  const { state, search, clear } = useExplorerLookup(blocks);

  const [text, setText] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  // Programmatic search driven by the shell (Open in Explorer). Runs on mount (the
  // tab is freshly mounted when the shell switches to it) and whenever the nonce
  // changes while already on the Explorer tab.
  useEffect(() => {
    const term = openRequest?.term?.trim();
    if (!term) return;
    setText(term);
    void search(term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest?.nonce]);

  // Ctrl+K focuses and selects the search field (explorer-search-shortcut).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        const el = document.getElementById(SEARCH_FIELD_ID) as HTMLInputElement | null;
        el?.focus();
        el?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const doSearch = useCallback(() => {
    if (text.trim().length === 0) return;
    void search(text);
  }, [text, search]);

  const onClear = useCallback(() => {
    setText("");
    clear();
  }, [clear]);

  const canClear = text.length > 0 || state.hasResult;

  return (
    <section className="explorer-view" data-testid="view-explorer">
      <NodeOffNotice reason={nodeOffReason} severity={nodeOffSeverity} />

      {/* ---- Search bar ---- */}
      <div className="explorer-search">
        <div className="explorer-search__titlerow">
          <span className="explorer-search__title">Explorer</span>
          <button
            type="button"
            className="explorer-search__info"
            aria-label="About the explorer"
            onClick={() => setInfoOpen(true)}
          >
            i
          </button>
        </div>
        <div className="explorer-search__row">
          <div className="explorer-search__field">
            <TextField
              id={SEARCH_FIELD_ID}
              value={text}
              placeholder="Block id or transaction hash (hex)"
              aria-label="Block id or transaction hash"
              disabled={!nodeRunning || state.busy}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSearch();
              }}
            />
            {canClear && (
              <button
                type="button"
                className="explorer-search__clear"
                aria-label="Clear search"
                onClick={onClear}
              >
                ✕
              </button>
            )}
          </div>
          <Button
            variant="primary"
            size="compact"
            disabled={!nodeRunning || state.busy || text.trim().length === 0}
            onClick={doSearch}
          >
            {state.busy ? "…" : "Search"}
          </Button>
        </div>
        {!nodeRunning && (
          <p className="explorer-search__hint">
            Start the node to look up blocks and transactions.
          </p>
        )}
      </div>

      {/* ---- Status line ---- */}
      <StatusLine state={state} />

      {/* ---- Result area OR the resting block table ---- */}
      {state.kind === "block" && state.block ? (
        <BlockResultCard id={state.queriedId} block={state.block} rawJson={state.rawJson} />
      ) : state.kind === "transaction" ? (
        <TxResultCard
          id={state.queriedId}
          rawJson={state.rawJson}
          slot={state.txSlot}
          blockId={state.txBlockId}
        />
      ) : !state.hasResult ? (
        <BlocksView blocks={blocks} status={status} nodeRunning={nodeRunning} />
      ) : null}

      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Explorer">
        <p className="explorer-info__text">{INFO_TEXT}</p>
      </Modal>
    </section>
  );
}

function StatusLine({ state }: { state: LookupState }) {
  if (state.busy) {
    return (
      <p className="explorer-status" data-testid="explorer-status-busy">
        Searching…
      </p>
    );
  }
  if (state.filteredSlot) {
    return (
      <p className="explorer-status" data-testid="explorer-status-filtered">
        Showing slot {state.filteredSlot}.
      </p>
    );
  }
  if (state.kind === "notfound") {
    return (
      <p className="explorer-status explorer-status--muted" data-testid="explorer-status-notfound">
        Nothing found for “{state.queriedId}”. Blocks are looked up by header id. Transactions
        resolve from the blocks currently loaded, or from the node&rsquo;s mempool while still
        pending — mined transactions can&rsquo;t be fetched by hash, so open their block instead.
      </p>
    );
  }
  if (state.kind === "error") {
    return (
      <p className="explorer-status explorer-status--error" data-testid="explorer-status-error">
        {state.errorText}
      </p>
    );
  }
  return null;
}

function BlockResultCard({ id, block, rawJson }: { id: string; block: BlockRow; rawJson: string }) {
  return (
    <div className="explorer-result" data-testid="explorer-result-block">
      <div className="explorer-result__head">
        <span className="explorer-result__title">Block</span>
        {block.slot.length > 0 && (
          <span className="explorer-result__sub">slot {block.slot}</span>
        )}
        {block.version.length > 0 && <Badge color="var(--text-secondary)">{block.version}</Badge>}
        <span className="explorer-result__spacer" />
        <CopyButton value={rawJson} title="Copy raw block JSON" />
      </div>
      <div className="explorer-result__divider" />
      <HashRow label="Block id" value={id} />
      <HashRow label="Parent block" value={block.parentBlock} />
      <HashRow label="Block root" value={block.blockRoot} />
      <HashRow label="Signature" value={block.signature} />

      <div className="explorer-result__section">Proof of leadership</div>
      <HashRow label="Leader key" value={block.leaderKey} />
      <HashRow label="Entropy" value={block.entropy} />
      <HashRow label="Proof" value={block.proof} />
      <HashRow label="Voucher cm" value={block.voucherCm} />

      <div className="explorer-result__section">Transactions ({block.transactions.length})</div>
      {block.transactions.length === 0 ? (
        <div className="explorer-result__empty">No transactions in this block.</div>
      ) : (
        block.transactions.map((t, i) => <TransactionDelegate key={i} idx={i} json={t} />)
      )}
    </div>
  );
}

function TxResultCard({
  id,
  rawJson,
  slot,
  blockId,
}: {
  id: string;
  rawJson: string;
  slot: string;
  blockId: string;
}) {
  return (
    <div className="explorer-result" data-testid="explorer-result-transaction">
      <div className="explorer-result__head">
        <span className="explorer-result__title">Transaction</span>
        {slot.length > 0 && <span className="explorer-result__sub">in block · slot {slot}</span>}
        <span className="explorer-result__spacer" />
        <CopyButton value={rawJson} title="Copy raw transaction JSON" />
      </div>
      <div className="explorer-result__divider" />
      <HashRow label="Transaction id" value={id} />
      {blockId.length > 0 && <HashRow label="Block id" value={blockId} />}
      <TransactionDelegate idx={0} json={rawJson} open />
    </div>
  );
}
