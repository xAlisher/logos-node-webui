// Token amounts — a TypeScript port of the official UI's `src/qml/Units.js`.
//
// One LOGOS is 10^9 lepta and the node deals only in lepta. A lepta figure runs
// past 2^53 (the faucet note is u64::MAX), where `Number` starts losing digits,
// so every conversion/comparison here is done on DIGIT STRINGS — exact at any
// width. The UI shows LOGOS ("LGO") only; lepta is a wire detail.
//
//   format("1500000000")       → "1.5 LGO"
//   formatPlain("1500000000")  → "1.5"
//   canonical("1500000000")    → "1.5"     (ungrouped, '.' — what copy hands over)
//   toLepta("1.5")             → "1500000000"
//   normalizeInput("1,234.5")  → "1234.5"  (grouped display text → canonical)

export const DECIMALS = 9;
export const SYMBOL = "LGO";

/** Grouping/decimal marks. The web replica is single-locale (en-style). */
const GROUP_SEP = ",";
const DECIMAL_POINT = ".";

function digitsOnly(s: string): boolean {
  return typeof s === "string" && /^[0-9]+$/.test(s);
}

function stripLeadingZeros(v: string): string {
  const trimmed = v.replace(/^0+/, "");
  return trimmed.length > 0 ? trimmed : "0";
}

/** Splits a lepta string into [integer, fraction]; fraction is always DECIMALS long. */
function split(lepta: string): [string, string] {
  const padded =
    lepta.length > DECIMALS ? lepta : "0".repeat(DECIMALS - lepta.length + 1) + lepta;
  return [
    stripLeadingZeros(padded.slice(0, padded.length - DECIMALS)),
    padded.slice(padded.length - DECIMALS),
  ];
}

/** Groups a digit string in threes. Walks the string — these are u64s. */
function groupDigits(s: string): string {
  if (!s) return s;
  let out = "";
  let since = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (since === 3) {
      out = GROUP_SEP + out;
      since = 0;
    }
    out = s.charAt(i) + out;
    since += 1;
  }
  return out;
}

/** Trailing zeros carry no information, but a single lepta never rounds to "0". */
function fraction(frac: string, point: string): string {
  const trimmed = frac.replace(/0+$/, "");
  return trimmed.length > 0 ? point + trimmed : "";
}

/**
 * Coerce a lepta amount that may arrive from the API as a JS `number` (or a
 * string) into a plain digit string. Values past 2^53 were already truncated
 * by `JSON.parse` upstream — there is nothing we can recover here — but normal
 * balances round-trip exactly.
 */
export function leptaString(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (!Number.isFinite(value)) return "";
  return BigInt(Math.trunc(value)).toString();
}

/** LOGOS for display: grouped + suffixed with the symbol. "" for non-numeric input. */
export function format(lepta: number | string): string {
  const plain = formatPlain(lepta);
  return plain.length > 0 ? plain + " " + SYMBOL : "";
}

/** As format(), without the symbol. */
export function formatPlain(lepta: number | string): string {
  const s = leptaString(lepta);
  if (!digitsOnly(s)) return "";
  const parts = split(s);
  return groupDigits(parts[0]) + fraction(parts[1], DECIMAL_POINT);
}

/** LOGOS in canonical form: no grouping, '.' decimal — what copy buttons hand over. */
export function canonical(lepta: number | string): string {
  const s = leptaString(lepta);
  if (!digitsOnly(s)) return "";
  const parts = split(s);
  return parts[0] + fraction(parts[1], ".");
}

/** Exact sum of lepta strings — schoolbook addition, holds at any width. */
export function sumLepta(values: Array<number | string>): string {
  let sum = 0n;
  for (const v of values) {
    const s = leptaString(v);
    if (!digitsOnly(s)) continue;
    sum += BigInt(s);
  }
  return sum.toString();
}

/**
 * Orders two lepta strings: -1, 0, 1, or NaN when either is not a figure.
 * Length first, then lexicographically — exact at any width, no `Number`.
 */
export function compareLepta(a: number | string, b: number | string): number {
  const x = stripLeadingZeros(leptaString(a));
  const y = stripLeadingZeros(leptaString(b));
  if (!digitsOnly(x) || !digitsOnly(y)) return NaN;
  if (x.length !== y.length) return x.length < y.length ? -1 : 1;
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * Canonical LOGOS text ("1.5") -> lepta ("1500000000"). Returns "" for anything
 * it cannot represent EXACTLY, including more decimal places than the chain has.
 * That refusal — never a silent truncation of a transfer amount — is the whole
 * point of this file.
 */
export function toLepta(canonicalText: string): string {
  const t = String(canonicalText || "").trim();
  if (t.length === 0) return "";
  const dot = t.indexOf(".");
  const whole = dot < 0 ? t : t.slice(0, dot);
  let frac = dot < 0 ? "" : t.slice(dot + 1);
  if (whole.length === 0 && frac.length === 0) return "";
  if (!/^[0-9]*$/.test(whole) || !/^[0-9]*$/.test(frac)) return "";
  if (frac.length > DECIMALS) return "";
  frac = frac + "0".repeat(DECIMALS - frac.length);
  return stripLeadingZeros((whole.length > 0 ? whole : "0") + frac);
}

/** Strips grouping and normalises the decimal point so "1,234.5" becomes "1234.5". */
export function normalizeInput(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === DECIMAL_POINT) out += ".";
    // Anything else (grouping separators, spaces, the symbol) is dropped.
  }
  return out;
}

/**
 * What an amount field accepts while typing: digits and at most one decimal
 * separator followed by at most DECIMALS digits. Partial input ("", "1.") passes
 * so the field never fights the user mid-word.
 */
export function inputRegExp(): RegExp {
  return new RegExp("^[0-9]*(?:\\" + DECIMAL_POINT + "[0-9]{0," + DECIMALS + "})?$");
}

/** True when `text` is accepted by the amount-field grammar. */
export function isAmountInput(text: string): boolean {
  return inputRegExp().test(text);
}

// ---- Compact (short-form) LOGOS -------------------------------------------
// For a headline figure that has to fit a tile: "16.6 LGO", "1.23K LGO",
// "18.45B LGO". A port of Units.js `compact()`. Rounds half-up on the digit
// strings (never Number, which loses u64s); trailing zeros are trimmed.

const UNITS: ReadonlyArray<[number, string]> = [
  [12, "T"],
  [9, "B"],
  [6, "M"],
  [3, "K"],
];
const COMPACT_PLACES = 2;

function addDigits(a: string, b: string): string {
  return (BigInt(a || "0") + BigInt(b || "0")).toString();
}

/** Rounds [int, frac] to `places` decimals, half-up. Returns the same pair. */
function roundPair(intDigits: string, frac: string, places: number): [string, string] {
  const keep = frac.slice(0, places);
  const next = frac.charAt(places);
  if (next === "" || next < "5") return [intDigits, keep];
  const bumped = addDigits(intDigits + keep, "1");
  const cut = bumped.length - places;
  return [stripLeadingZeros(bumped.slice(0, cut)), bumped.slice(cut)];
}

function renderUnit(int: string, frac: string, i: number): [string, string, string] {
  const shift = UNITS[i][0];
  const head = int.length > shift ? int.slice(0, int.length - shift) : "0";
  const tail = int.length > shift ? int.slice(int.length - shift) : int;
  const rounded = roundPair(head, tail + frac, COMPACT_PLACES);
  return [rounded[0], rounded[1], UNITS[i][1]];
}

/** Short-form LOGOS without the symbol. "" for non-numeric input. */
export function compactPlain(lepta: number | string): string {
  const s = leptaString(lepta);
  if (!digitsOnly(s)) return "";
  const parts = split(s);
  const int = parts[0];
  const frac = parts[1];

  // Under one LOGOS: keep two SIGNIFICANT digits so a single lepta still reads.
  if (int === "0") {
    const first = frac.search(/[1-9]/);
    if (first < 0) return "0";
    const rounded = roundPair("0", frac, Math.min(first + 2, DECIMALS));
    return rounded[0] + fraction(rounded[1], DECIMAL_POINT);
  }

  let idx = -1;
  for (let i = 0; i < UNITS.length; i++) {
    if (int.length > UNITS[i][0]) {
      idx = i;
      break;
    }
  }

  if (idx < 0) {
    const small = roundPair(int, frac, COMPACT_PLACES);
    return groupDigits(small[0]) + fraction(small[1], DECIMAL_POINT);
  }

  let unit = renderUnit(int, frac, idx);
  // Rounding can push the head past its own unit (999,999 → "1000.00K"): step up.
  if (unit[0].length > 3 && idx > 0) unit = renderUnit(int, frac, idx - 1);
  return groupDigits(unit[0]) + fraction(unit[1], DECIMAL_POINT) + unit[2];
}

/** Short-form LOGOS for a tile that has to fit: grouped + suffixed with the symbol. */
export function compact(lepta: number | string): string {
  const plain = compactPlain(lepta);
  return plain.length > 0 ? plain + " " + SYMBOL : "";
}

/** A channel id / public key is 64 hex chars (32 bytes), optional 0x prefix. */
export const HEX64 = /^(0x)?[0-9a-fA-F]{64}$/;

/** Base58 (Bitcoin alphabet) — no 0, O, I, l. */
export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
