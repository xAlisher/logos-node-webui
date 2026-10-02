import { useState } from "react";

import { Badge, CopyButton, HashRow } from "../../ds";
import type { BlockRow as BlockRowData } from "./blockModel";
import { JsonBlock } from "./JsonBlock";
import { TransactionDelegate } from "./TransactionDelegate";
import "./blocks.css";

export interface BlockRowProps {
  block: BlockRowData;
}

/**
 * BlockDelegate — one blocks-table row, expandable in place.
 *   Collapsed: timestamp · slot · consensus version · tx count
 *   Expanded:  header hashes, a collapsible proof-of-leadership sub-group,
 *              the transactions list — or, for an unparsed payload, a raw-JSON
 *              fallback labelled "Unparsed block".
 * Faithful replica of controls/BlockDelegate.qml.
 */
export function BlockRow({ block }: BlockRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const unparsed = !block.parsed;

  return (
    <div className="block-row" data-testid="block-row" data-unparsed={unparsed}>
      <button
        type="button"
        className="block-row__summary"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="block-row__cell block-row__cell--timestamp">{block.timestamp || "—"}</span>
        <span
          className={["block-row__cell", "block-row__cell--block", unparsed && "block-row__cell--warn"]
            .filter(Boolean)
            .join(" ")}
        >
          {unparsed ? "Unparsed block" : `Slot ${block.slot || "?"}`}
        </span>
        <span className="block-row__cell block-row__cell--consensus">
          {!unparsed && block.version.length > 0 && (
            <Badge color="var(--text)">{block.version}</Badge>
          )}
        </span>
        <span className="block-row__cell block-row__cell--txs">
          {unparsed ? "" : String(block.txCount)}
        </span>
        <span
          className={["block-row__chevron", expanded && "block-row__chevron--open"]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="block-row__detail">
          {unparsed ? (
            <>
              <div className="block-row__rawhead">
                <span className="block-row__section">Raw payload</span>
                <CopyButton value={block.rawJson} title="Copy raw block JSON" />
              </div>
              <JsonBlock json={block.rawJson || "(no payload)"} />
            </>
          ) : (
            <>
              <HashRow label="Parent block" value={block.parentBlock} />
              <HashRow label="Block root" value={block.blockRoot} />
              <HashRow label="Signature" value={block.signature} />

              <div className="block-row__section-toggle">
                <button
                  type="button"
                  className="block-row__pol-toggle"
                  aria-expanded={proofOpen}
                  onClick={() => setProofOpen((v) => !v)}
                >
                  {proofOpen ? "▾ " : "▸ "}Proof of leadership
                </button>
              </div>
              {proofOpen && (
                <div className="block-row__pol" data-testid="pol-group">
                  <HashRow label="Leader key" value={block.leaderKey} />
                  <HashRow label="Entropy" value={block.entropy} />
                  <HashRow label="Proof" value={block.proof} />
                  <HashRow label="Voucher cm" value={block.voucherCm} />
                </div>
              )}

              <div className="block-row__section">Transactions ({block.txCount})</div>
              {block.transactions.length === 0 ? (
                <div className="block-row__empty-tx">No transactions in this block.</div>
              ) : (
                block.transactions.map((t, i) => (
                  <TransactionDelegate key={i} idx={i} json={t} />
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
