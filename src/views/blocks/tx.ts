// Transaction parsing — the web replica of TransactionDelegate.qml's JS helpers.
//
// A block transaction is a SignedMantleTx JSON string:
//   { "mantle_tx": { "ops": [ {opcode, payload}, ... ] },
//     "ops_proofs": [ <proof>, ... ] }            // paired with ops by index
//
// Each op is labelled by its opcode name; payload + paired proof render as
// prettified JSON. Unparsable transactions fall back to raw JSON.

export interface TxOp {
  opcode?: number;
  payload?: unknown;
  [k: string]: unknown;
}

export interface ParsedTx {
  /** null when the JSON failed to parse (raw-JSON fallback). */
  ok: boolean;
  id: string;
  ops: TxOp[];
  proofs: unknown[];
}

/** Opcode → human name, matching TransactionDelegate.opName exactly. */
export function opName(code: number | undefined): string {
  switch (code) {
    case 0:
      return "Transfer";
    case 16:
      return "Channel Config";
    case 17:
      return "Channel Inscribe";
    case 18:
      return "Channel Deposit";
    case 19:
      return "Channel Withdraw";
    case 32:
      return "SDP Declare";
    case 33:
      return "SDP Withdraw";
    case 34:
      return "SDP Active";
    case 48:
      return "Leader Claim";
    default:
      return `Op 0x${Number(code).toString(16)}`;
  }
}

export function parseTx(json: string): ParsedTx {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, id: "", ops: [], proofs: [] };
  }
  const p = (parsed ?? {}) as Record<string, unknown>;
  const mantle = (p.mantle_tx as Record<string, unknown>) || {};
  const ops = Array.isArray(mantle.ops) ? (mantle.ops as TxOp[]) : [];
  const proofs = Array.isArray(p.ops_proofs) ? (p.ops_proofs as unknown[]) : [];
  const id = p.id !== undefined && p.id !== null ? String(p.id) : "";
  return { ok: true, id, ops, proofs };
}

/** The variant key of a proof object (its first key), matching proofVariant(). */
export function proofVariant(p: unknown): string {
  if (!p || typeof p !== "object") return "";
  const ks = Object.keys(p as Record<string, unknown>);
  return ks.length ? ks[0] : "";
}

export function prettyValue(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
