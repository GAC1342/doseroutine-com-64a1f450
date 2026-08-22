/**
 * GTIN / barcode helpers shared by the scanner UI and every server-side
 * product lookup. Barcodes are identifiers, not numbers: they stay strings,
 * leading zeros matter, and the same physical product can be published as
 * UPC-E (8), UPC-A (12), EAN-13 or GTIN-14 depending on the database.
 */

/**
 * Digits only, trimmed. Handles pasted spaces, dashes, non-breaking spaces,
 * unicode digits, and stray letters ("0 12345 67890 5" → "012345678905").
 */
export function cleanBarcode(input: string): string {
  return String(input ?? "")
    .normalize("NFKC")
    .replace(/\D/g, "");
}

/** GS1 mod-10 check digit for a code *without* its check digit. */
export function gtinCheckDigit(bodyDigits: string): number {
  const nums = [...cleanBarcode(bodyDigits)].map(Number).reverse();
  const sum = nums.reduce((total, digit, i) => total + digit * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

/** Append the correct check digit to a body of digits. */
export function withCheckDigit(bodyDigits: string): string {
  const body = cleanBarcode(bodyDigits);
  return `${body}${gtinCheckDigit(body)}`;
}

/** Standard GS1 mod-10 check digit test. Returns true for 8/12/13/14 digits. */
export function isValidGtin(code: string): boolean {
  const digits = cleanBarcode(code);
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return false;
  const check = Number(digits.slice(-1));
  return gtinCheckDigit(digits.slice(0, -1)) === check;
}

/**
 * Expand a UPC-E (8 digit, zero-suppressed) code to its UPC-A (12 digit) form.
 * Returns null when the code isn't a UPC-E we can expand.
 */
export function expandUpcE(code: string): string | null {
  const d = cleanBarcode(code);
  if (d.length !== 8) return null;
  const numberSystem = d[0]!;
  if (numberSystem !== "0" && numberSystem !== "1") return null;
  const body = d.slice(1, 7);
  const check = d[7]!;
  const [a, b, c, e, f, g] = [...body];
  let middle: string;
  switch (g) {
    case "0":
    case "1":
    case "2":
      middle = `${a}${b}${g}0000${c}${e}${f}`;
      break;
    case "3":
      middle = `${a}${b}${c}00000${e}${f}`;
      break;
    case "4":
      middle = `${a}${b}${c}${e}00000${f}`;
      break;
    default:
      middle = `${a}${b}${c}${e}${f}0000${g}`;
      break;
  }
  return `${numberSystem}${middle}${check}`;
}

/**
 * Compress a UPC-A (12 digit) back to its UPC-E (8 digit) form when the code
 * is zero-suppressible. Some catalogs — small brands especially — only store
 * the short printed form, so it is worth querying.
 */
export function compressToUpcE(code: string): string | null {
  const d = cleanBarcode(code);
  if (d.length !== 12) return null;
  const ns = d[0]!;
  if (ns !== "0" && ns !== "1") return null;
  const check = d[11]!;
  // x[1..10] are the manufacturer/product digits, matching GS1's notation.
  const x = (i: number) => d[i]!;
  const zeros = (from: number, to: number) => {
    for (let i = from; i <= to; i += 1) if (x(i) !== "0") return false;
    return true;
  };

  let body: string | null = null;
  if (zeros(4, 7) && "012".includes(x(3))) {
    body = `${x(1)}${x(2)}${x(8)}${x(9)}${x(10)}${x(3)}`;
  } else if (zeros(4, 8)) {
    body = `${x(1)}${x(2)}${x(3)}${x(9)}${x(10)}3`;
  } else if (zeros(5, 9)) {
    body = `${x(1)}${x(2)}${x(3)}${x(4)}${x(10)}4`;
  } else if (zeros(6, 9) && "56789".includes(x(10))) {
    body = `${x(1)}${x(2)}${x(3)}${x(4)}${x(5)}${x(10)}`;
  }
  if (!body || body.length !== 6) return null;
  const candidate = `${ns}${body}${check}`;
  // Round-trip guard: only return a form that expands back to the same UPC-A.
  return expandUpcE(candidate) === d ? candidate : null;
}

function pad(code: string, length: number): string {
  return code.length >= length ? code : code.padStart(length, "0");
}

/** Canonical 14-digit key used for caching and de-duplication. */
export function canonicalGtin(input: string): string {
  const digits = cleanBarcode(input);
  if (!digits) return "";
  const expanded = digits.length === 8 ? (expandUpcE(digits) ?? digits) : digits;
  const stripped = expanded.replace(/^0+/, "") || "0";
  return pad(stripped, 14);
}

/**
 * The inner GTIN-13 of a GTIN-14 logistics code. A case code (indicator digit
 * 1–8) wraps a consumer unit that databases actually list, so strip the
 * indicator and recompute the check digit.
 */
export function innerGtinOfCase(input: string): string | null {
  const d = cleanBarcode(input);
  if (d.length !== 14) return null;
  const indicator = d[0]!;
  if (indicator === "0" || indicator === "9") return null;
  return withCheckDigit(d.slice(1, 13));
}

/**
 * Every form of the same GTIN worth querying, most-specific first. Databases
 * are inconsistent: Open Food Facts normalises internally, USDA stores the
 * literal 14-digit string, our own catalog stores whatever we cached, and
 * small brands sometimes only publish the short UPC-E.
 */
export function gtinVariants(input: string): string[] {
  const digits = cleanBarcode(input);
  if (!digits) return [];
  const out = new Set<string>();
  const seeds = new Set<string>([digits]);

  const expanded = expandUpcE(digits);
  if (expanded) seeds.add(expanded);

  const stripped = digits.replace(/^0+/, "");
  if (stripped.length >= 8) seeds.add(stripped);

  const inner = innerGtinOfCase(digits);
  if (inner) seeds.add(inner);

  // EAN-13 with a leading zero is a UPC-A: both forms are published.
  if (digits.length === 13 && digits.startsWith("0")) seeds.add(digits.slice(1));

  for (const seed of [...seeds]) {
    if (seed.length === 12) {
      const short = compressToUpcE(seed);
      if (short) seeds.add(short);
    }
  }

  for (const seed of seeds) {
    out.add(seed);
    if (seed.length <= 14) out.add(pad(seed, 14));
    if (seed.length <= 13) out.add(pad(seed, 13));
    if (seed.length <= 12) out.add(pad(seed, 12));
  }
  return [...out].filter((code) => code.length >= 8 && code.length <= 14);
}

/** True when two codes are the same GTIN ignoring leading-zero padding. */
export function sameGtin(a: string, b: string): boolean {
  const x = cleanBarcode(a).replace(/^0+/, "");
  const y = cleanBarcode(b).replace(/^0+/, "");
  return x.length > 0 && x === y;
}

export type BarcodeInputProblem = "empty" | "too-short" | "check-digit" | null;

/**
 * Distinguish the reasons a typed code can't be looked up, so the UI can say
 * something useful instead of "not found".
 */
export function describeBarcodeInput(input: string): BarcodeInputProblem {
  const digits = cleanBarcode(input);
  if (!digits) return "empty";
  if (digits.length < 8) return "too-short";
  if (!isValidGtin(digits) && !isValidGtin(pad(digits, 13)) && !isValidGtin(pad(digits, 14))) {
    return "check-digit";
  }
  return null;
}

/**
 * A likely fix for a mistyped code: the same digits with a corrected check
 * digit. Shown as "did you mean…" rather than applied silently.
 */
export function suggestGtinFix(input: string): string | null {
  const digits = cleanBarcode(input);
  if (digits.length !== 8 && (digits.length < 12 || digits.length > 14)) return null;
  if (isValidGtin(digits)) return null;
  const fixed = withCheckDigit(digits.slice(0, -1));
  return fixed === digits ? null : fixed;
}
