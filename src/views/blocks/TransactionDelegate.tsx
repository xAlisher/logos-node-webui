import { useState } from "react";

import { Badge, CopyButton } from "../../ds";
import { JsonBlock } from "./JsonBlock";
import { opName, parseTx, prettyValue, proofVariant, type TxOp } from "./tx";
import "./blocks.css";

export interface TransactionDelegateProps {
  /** The SignedMantleTx JSON string. */
  json: string;
  /** Positional index (for the "Transaction N" fallback label). */
  idx?: number;
  /** Start expanded (the explorer tx result card opens its single tx). */
  open?: boolean;
}

/**
 * TransactionDelegate — a single block transaction, opcode-named ops with
 * payload/proof JSON, expandable. Unparsable txs fall back to raw JSON.
 * Faithful replica of controls/TransactionDelegate.qml.
 */
export function TransactionDelegate({ json, idx = 0, open = false }: TransactionDelegateProps) {
  const [isOpen, setIsOpen] = useState(open);
  const parsed = parseTx(json);
  const label = parsed.id !== "" ? parsed.id : `Transaction ${idx + 1}`;

  return (
    <div className="tx-delegate" data-testid="tx-delegate">
      <div className="tx-delegate__header">
        <button
          type="button"
          className="tx-delegate__toggle"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
        >
          <span className="tx-delegate__caret" aria-hidden="true">
            {isOpen ? "▾" : "▸"}
          </span>
          <span
            className={["tx-delegate__label", parsed.id !== "" && "tx-delegate__label--mono"]
              .filter(Boolean)
              .join(" ")}
          >
            {label}
          </span>
        </button>
        {/* Copy the tx id when available, otherwise the full tx JSON. */}
        <CopyButton value={parsed.id !== "" ? parsed.id : json} title="Copy transaction" />
      </div>

      {isOpen && (
        <div className="tx-delegate__body">
          {!parsed.ok ? (
            <JsonBlock json={json} />
          ) : (
            parsed.ops.map((op, i) => (
              <OpView key={i} op={op} proof={parsed.proofs.length > i ? parsed.proofs[i] : null} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function OpView({ op, proof }: { op: TxOp; proof: unknown }) {
  const hasProof = proof !== null && proof !== undefined;
  return (
    <div className="op-view" data-testid="op-view">
      <div className="op-view__header">
        <Badge color="var(--text-secondary)">op {op && op.opcode !== undefined ? op.opcode : "?"}</Badge>
        <span className="op-view__name">{opName(op ? op.opcode : undefined)}</span>
        <CopyButton value={prettyValue(op ? op.payload : null)} title="Copy payload" />
      </div>
      <JsonBlock json={prettyValue(op ? op.payload : null)} />
      {hasProof && (
        <>
          <div className="op-view__proof-header">
            <span className="op-view__proof-label">Proof · {proofVariant(proof) || "unknown"}</span>
            <CopyButton value={prettyValue(proof)} title="Copy proof" />
          </div>
          <JsonBlock json={prettyValue(proof)} />
        </>
      )}
    </div>
  );
}
