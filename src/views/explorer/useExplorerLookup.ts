import { useCallback, useRef, useState } from "react";

import { ApiError } from "../../api/client";
import { getBlock, getTransaction } from "../../api/endpoints";
import { parseBlock, type BlockRow } from "../blocks/blockModel";
import { parseTx } from "../blocks/tx";

/** Lookup times out after 8s → error, matching ExplorerView's busy timeout. */
const LOOKUP_TIMEOUT_MS = 8000;

export type LookupKind = "" | "block" | "transaction" | "notfound" | "error";

export interface LookupState {
  kind: LookupKind;
  busy: boolean;
  queriedId: string;
  rawJson: string;
  errorText: string;
  /** Normalised block (kind === "block"). */
  block: BlockRow | null;
  /** Block context for a tx resolved from a loaded block (else ""). */
  txSlot: string;
  txBlockId: string;
  /** Set when the id matched an on-screen block → "Showing slot N". */
  filteredSlot: string;
  /** True once a lookup has produced any result/miss (hides the block table). */
  hasResult: boolean;
}

const IDLE: LookupState = {
  kind: "",
  busy: false,
  queriedId: "",
  rawJson: "",
  errorText: "",
  block: null,
  txSlot: "",
  txBlockId: "",
  filteredSlot: "",
  hasResult: false,
};

export interface ExplorerLookup {
  state: LookupState;
  search: (id: string) => Promise<void>;
  clear: () => void;
}

/**
 * useExplorerLookup — the block/transaction lookup orchestration from
 * BlockchainView: match a loaded block/tx first, then `get_block`, then fall
 * back to `get_transaction` (both are hex hashes, auto-detected), else
 * not-found. Network failures surface as an error; an 8s stall → error.
 *
 * `blocks` is the currently-loaded block model, used for the on-screen match
 * ("Showing slot N") and the tx-in-block context resolution.
 */
export function useExplorerLookup(blocks: readonly BlockRow[]): ExplorerLookup {
  const [state, setState] = useState<LookupState>(IDLE);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const clear = useCallback(() => {
    clearTimer();
    seq.current++;
    setState(IDLE);
  }, []);

  const search = useCallback(
    async (rawId: string) => {
      const id = rawId.trim();
      if (id.length === 0) return;

      const mine = ++seq.current;
      clearTimer();
      setState({ ...IDLE, busy: true, queriedId: id, hasResult: true });

      timer.current = setTimeout(() => {
        if (seq.current !== mine) return;
        setState({
          ...IDLE,
          kind: "error",
          queriedId: id,
          errorText: "The lookup timed out. Check the node and try again.",
          hasResult: true,
        });
      }, LOOKUP_TIMEOUT_MS);

      const finish = (next: Partial<LookupState>) => {
        if (seq.current !== mine) return;
        clearTimer();
        setState({ ...IDLE, queriedId: id, hasResult: true, busy: false, ...next });
      };

      // 1. Already on screen? → "Showing slot N" + the block result.
      const onScreen = blocks.find((b) => b.id === id);
      if (onScreen) {
        finish({ kind: "block", block: onScreen, rawJson: onScreen.rawJson, filteredSlot: onScreen.slot });
        return;
      }

      // 2. A transaction inside a loaded block → tx result with block context.
      for (const b of blocks) {
        for (const txJson of b.transactions) {
          if (parseTx(txJson).id === id) {
            finish({ kind: "transaction", rawJson: txJson, txSlot: b.slot, txBlockId: b.id });
            return;
          }
        }
      }

      // 3. get_block, then fall back to get_transaction.
      try {
        const block = await getBlock(id);
        finish({ kind: "block", block: parseBlock(block), rawJson: stringify(block) });
        return;
      } catch (eBlock) {
        if (!(eBlock instanceof ApiError)) {
          finish({ kind: "error", errorText: lookupErrorText(eBlock) });
          return;
        }
      }

      try {
        const tx = await getTransaction(id);
        finish({ kind: "transaction", rawJson: stringify(tx) });
      } catch (eTx) {
        if (eTx instanceof ApiError) {
          finish({ kind: "notfound" });
        } else {
          finish({ kind: "error", errorText: lookupErrorText(eTx) });
        }
      }
    },
    [blocks],
  );

  return { state, search, clear };
}

function stringify(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function lookupErrorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg ? `Lookup failed: ${msg}` : "Lookup failed.";
}
