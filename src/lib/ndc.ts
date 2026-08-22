/**
 * National Drug Code helpers.
 *
 * US drug packages carry a UPC-A whose number system digit is 3: the ten
 * digits that follow (positions 2–11) are the NDC-10. openFDA indexes drugs by
 * NDC-11 in the 5-4-2 layout, which is produced by padding one segment of the
 * NDC-10 with a leading zero. Because the segment split isn't encoded in the
 * barcode we try all three standard paddings.
 *
 * Pure and client-safe.
 */

const digitsOnly = (input: string) => String(input ?? "").replace(/\D/g, "");

/**
 * The NDC-10 embedded in a drug UPC/GTIN, or null when this isn't a drug code.
 * Accepts UPC-A (12), EAN-13 and GTIN-14 forms — leading zeros are stripped
 * before the "starts with 3" test.
 */
export function ndcFromBarcode(input: string): string | null {
  const digits = digitsOnly(input);
  if (digits.length < 12 || digits.length > 14) return null;
  // Drop GTIN padding so a UPC-A remains a UPC-A regardless of how it arrived.
  const upc = digits.slice(-12);
  if (upc.length !== 12 || upc[0] !== "3") return null;
  const ndc10 = upc.slice(1, 11);
  return /^\d{10}$/.test(ndc10) ? ndc10 : null;
}

/**
 * The three 11-digit forms of an NDC-10 (4-4-2, 5-3-2, 5-4-1 padded to
 * 5-4-2), de-duplicated and hyphenated the way openFDA stores them.
 */
export function ndc11Candidates(ndc10: string): string[] {
  const d = digitsOnly(ndc10);
  if (d.length !== 10) return [];
  const forms = [
    // 4-4-2 → pad the labeler segment
    `0${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8, 10)}`,
    // 5-3-2 → pad the product segment
    `${d.slice(0, 5)}-0${d.slice(5, 8)}-${d.slice(8, 10)}`,
    // 5-4-1 → pad the package segment
    `${d.slice(0, 5)}-${d.slice(5, 9)}-0${d.slice(9, 10)}`,
  ];
  return [...new Set(forms)];
}

/** The product-level NDC (labeler-product) for each 11-digit candidate. */
export function productNdcCandidates(ndc10: string): string[] {
  const out = ndc11Candidates(ndc10).map((code) => code.split("-").slice(0, 2).join("-"));
  return [...new Set(out)];
}

/** Format an NDC-10 for display in the classic 5-4-1 hyphenated shape. */
export function formatNdc(ndc10: string): string {
  const d = digitsOnly(ndc10);
  if (d.length !== 10) return d;
  return `${d.slice(0, 5)}-${d.slice(5, 9)}-${d.slice(9)}`;
}

/** A Canadian Drug Identification Number is exactly 8 digits. */
export function normalizeDin(input: string): string | null {
  const d = digitsOnly(input);
  return d.length === 8 ? d : null;
}
