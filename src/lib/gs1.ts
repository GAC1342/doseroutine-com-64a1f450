/**
 * GS1 Application Identifier parsing.
 *
 * Rx unit packages and many supplement cartons carry a 2D DataMatrix rather
 * than a linear barcode. The payload is a concatenation of Application
 * Identifiers: (01) GTIN-14, (17) expiry YYMMDD, (10) lot, (21) serial.
 * Fixed-length AIs run straight into the next one; variable-length AIs end at
 * a group separator (ASCII 29) or at the end of the string.
 *
 * Pure and client-safe: the scanner sheet parses before it calls the server.
 */

export type Gs1Data = {
  gtin: string | null;
  /** ISO date (YYYY-MM-DD) when (17) was present. */
  expiry: string | null;
  lot: string | null;
  serial: string | null;
};

export const EMPTY_GS1: Gs1Data = { gtin: null, expiry: null, lot: null, serial: null };

/** Fixed-length AIs we care about, mapped to their data length. */
const FIXED: Record<string, number> = { "01": 14, "17": 6, "11": 6, "15": 6 };
/** Variable-length AIs, capped at the GS1 maximum. */
const VARIABLE: Record<string, number> = { "10": 20, "21": 20 };

const GS = "\u001d";

/** True when a scanned payload looks like a GS1 element string. */
export function looksLikeGs1(raw: string): boolean {
  const text = String(raw ?? "").trim();
  if (!text) return false;
  if (text.startsWith("]d2") || text.startsWith("]C1") || text.includes(GS)) return true;
  return /^\(?01\)?\d{14}/.test(text);
}

/**
 * Expand a YYMMDD expiry to an ISO date. GS1 uses "00" for "last day of the
 * month" and a 50-year sliding window for the century.
 */
export function gs1ExpiryToIso(yymmdd: string): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  const dd = Number(yymmdd.slice(4, 6));
  if (mm < 1 || mm > 12) return null;
  const nowYy = new Date().getUTCFullYear() % 100;
  // Anything more than 50 years ahead is read as the previous century.
  const century = yy - nowYy > 50 ? 1900 : 2000;
  const year = century + yy;
  const day = dd === 0 ? new Date(Date.UTC(year, mm, 0)).getUTCDate() : dd;
  if (day < 1 || day > 31) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(mm)}-${pad(day)}`;
}

/**
 * Parse a DataMatrix / GS1-128 payload. Returns nulls rather than throwing so
 * a malformed read still lets the caller fall back to the raw digits.
 */
export function parseGs1(raw: string): Gs1Data {
  let text = String(raw ?? "").trim();
  if (!text) return { ...EMPTY_GS1 };
  // Symbology identifiers emitted by some scanners.
  text = text.replace(/^\](?:d2|C1|Q3|e0)/, "");
  // Human-readable form with bracketed AIs: "(01)00312345678906(17)270331".
  if (text.includes("(")) text = text.replace(/\((\d{2,4})\)/g, (_m, ai) => `${GS}${ai}`);

  const out: Gs1Data = { ...EMPTY_GS1 };
  let i = 0;
  let guard = 0;
  while (i < text.length && guard < 32) {
    guard += 1;
    if (text[i] === GS) {
      i += 1;
      continue;
    }
    const ai = text.slice(i, i + 2);
    if (!/^\d{2}$/.test(ai)) break;
    i += 2;

    const fixedLen = FIXED[ai];
    if (fixedLen != null) {
      const value = text.slice(i, i + fixedLen);
      i += fixedLen;
      if (ai === "01" && /^\d{14}$/.test(value)) out.gtin = value;
      if (ai === "17") out.expiry = gs1ExpiryToIso(value);
      continue;
    }

    const maxLen = VARIABLE[ai];
    if (maxLen == null) break; // Unknown AI: we can't know its length, so stop.
    const rest = text.slice(i, i + maxLen);
    const sep = rest.indexOf(GS);
    const value = sep >= 0 ? rest.slice(0, sep) : rest;
    i += value.length;
    if (ai === "10") out.lot = value || null;
    if (ai === "21") out.serial = value || null;
  }
  return out;
}
