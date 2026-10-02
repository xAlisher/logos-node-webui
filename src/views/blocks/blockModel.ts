// Block normaliser — the web replica of BlockModel::appendRaw + ExplorerView.parseBlock
// from the official QML. The node returns a full block object (or, over the explorer
// lookup, a few tolerant nesting shapes); this flattens it into the flat row the table
// delegates and the explorer result card read, mirroring the QML roles 1:1.
//
//   BlockDelegate roles: timestamp · slot · version(Consensus) · txCount · parsed ·
//     parentBlock · blockRoot · signature · {leaderKey,entropy,proof,voucherCm} ·
//     transactions[] · rawJson · epoch
//
// Tolerant like the QML: a block that can't be parsed keeps parsed=false and surfaces
// its raw JSON (the "Unparsed block" fallback), rather than throwing.

import type { TimeInfo } from "../../api/types";

/** One flattened block row — the union of every role a delegate / result card reads. */
export interface BlockRow {
  /** Header id (the block's own hash). */
  id: string;
  /** Slot number as a string ("" when unknown), matching the QML role. */
  slot: string;
  /** Consensus / header version label (e.g. "Bedrock"); "" hides the badge. */
  version: string;
  /** Pre-formatted timestamp for the Timestamp column ("" when not derivable). */
  timestamp: string;
  /** Epoch this block belongs to (-1 when unknown). */
  epoch: number;
  /** Transaction count. */
  txCount: number;
  parentBlock: string;
  blockRoot: string;
  signature: string;
  proof: string;
  entropy: string;
  leaderKey: string;
  voucherCm: string;
  /** Each transaction stringified (what TransactionDelegate parses). */
  transactions: string[];
  /** False only when the payload could not be parsed into a header. */
  parsed: boolean;
  /** Prettified raw JSON (the Unparsed fallback + copy-raw-JSON source). */
  rawJson: string;
}

function str(v: unknown): string {
  return v === undefined || v === null ? "" : String(v);
}

/** Prettify a JSON string; returns the input unchanged when it isn't JSON. */
export function pretty(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

/**
 * Timestamp for a slot, derived from `/time/info` the way the node does:
 * `genesis_time_unix_ms + slot * slot_duration_ms`. Formatted as a stable
 * `YYYY-MM-DD HH:MM:SS` UTC string (locale-independent, so tests don't flake).
 * Returns "" when the slot or time basis is unknown.
 */
export function formatTimestamp(slot: string, time?: TimeInfo | null): string {
  if (!time || slot === "") return "";
  const n = Number(slot);
  if (!Number.isFinite(n)) return "";
  const ms = time.genesis_time_unix_ms + n * time.slot_duration_ms;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const p = (x: number, w = 2) => String(x).padStart(w, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  );
}

/** Unwrap the tolerant block envelopes the module emits, matching ExplorerView.parseBlock. */
function unwrap(raw: unknown): Record<string, unknown> | null {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;

  if (o.block !== undefined) {
    if (typeof o.block === "string") {
      try {
        return JSON.parse(o.block) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    if (o.block && typeof o.block === "object") return o.block as Record<string, unknown>;
    return null;
  }
  if (o.header !== undefined) return o;
  return null;
}

/**
 * Normalise a raw block (object or JSON string) into a flat {@link BlockRow}.
 * Never throws: an unparsable payload yields parsed=false with the raw JSON kept.
 */
export function parseBlock(raw: unknown, time?: TimeInfo | null): BlockRow {
  const rawJson = typeof raw === "string" ? raw : safeStringify(raw);
  const b = unwrap(raw);

  if (!b) {
    return emptyRow(rawJson);
  }

  const header = (b.header as Record<string, unknown>) || {};
  const pol = (header.proof_of_leadership as Record<string, unknown>) || {};
  const txArr = Array.isArray(b.transactions) ? (b.transactions as unknown[]) : [];
  const transactions = txArr.map((t) =>
    typeof t === "string" ? t : safeStringify(t),
  );

  const slot = str(header.slot);
  const epoch = slotToEpoch(slot, time);

  return {
    id: str(header.id),
    slot,
    version: str(header.version),
    timestamp: formatTimestamp(slot, time),
    epoch,
    txCount: transactions.length,
    parentBlock: str(header.parent_block),
    blockRoot: str(header.block_root ?? header.body_root),
    signature: str(b.signature),
    proof: str(pol.proof),
    entropy: str(pol.entropy_contribution),
    leaderKey: str(pol.leader_key),
    voucherCm: str(pol.voucher_cm),
    transactions,
    parsed: true,
    rawJson: pretty(rawJson),
  };
}

function slotToEpoch(slot: string, time?: TimeInfo | null): number {
  if (!time || slot === "" || !time.slots_per_epoch) return -1;
  const n = Number(slot);
  if (!Number.isFinite(n)) return -1;
  return Math.floor(n / time.slots_per_epoch);
}

function emptyRow(rawJson: string): BlockRow {
  return {
    id: "",
    slot: "",
    version: "",
    timestamp: "",
    epoch: -1,
    txCount: 0,
    parentBlock: "",
    blockRoot: "",
    signature: "",
    proof: "",
    entropy: "",
    leaderKey: "",
    voucherCm: "",
    transactions: [],
    parsed: false,
    rawJson: pretty(rawJson),
  };
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
