/**
 * Regression coverage for GTIN-14 normalization.
 *
 * Barcodes arrive from USDA, Open Food Facts, scanners and hand typing, so the
 * same product shows up as UPC-E, UPC-A, EAN-13, GTIN-14, with separators, with
 * whitespace, or with any number of leading zeros. These tests pin three
 * things at once:
 *
 *   1. the normalized value (padding / stripping rules),
 *   2. whether a structured `gtin.normalized` event was logged, and
 *   3. the downstream matching behavior in classifyDuplicate — a barcode is
 *      only trusted when it has >= 8 significant digits.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { clearGtinLog, getGtinLog, normalizeGtin14 } from "../gtin-log";
import { classifyDuplicate, explainDuplicate } from "../food-dedupe";

beforeEach(() => clearGtinLog());

const food = (name: string, gtin: string | null | undefined) => ({
  name,
  gtin,
  kcal100: 100,
  protein100: 10,
  carbs100: 10,
  fat100: 2,
});

/** Two clearly different names so only the barcode can produce an "exact". */
const matchByBarcode = (a: string | null | undefined, b: string | null | undefined) =>
  classifyDuplicate(food("Alpha Snack Bar", a), food("Zeta Protein Cookie", b));

describe("GTIN-14 normalization: lengths", () => {
  const cases: Array<[label: string, input: string, expected: string]> = [
    ["UPC-E (8)", "01234565", "00000001234565"],
    ["UPC-A (12)", "012345678905", "00012345678905"],
    ["EAN-13 (13)", "0012345678905", "00012345678905"],
    ["GTIN-14 (14)", "00012345678905", "00012345678905"],
    ["already 14, no leading zeros", "12345678901234", "12345678901234"],
    ["over-length (16) is kept as-is", "1234567890123456", "1234567890123456"],
    ["single digit", "7", "00000000000007"],
    ["short run", "12345", "00000000012345"],
  ];

  for (const [label, input, expected] of cases) {
    it(`${label} -> ${expected}`, () => {
      const result = normalizeGtin14(input, "regression");
      expect(result.value).toBe(expected);
      expect(result.value).toHaveLength(Math.max(14, input.replace(/^0+/, "").length));
      // Logging happens exactly when the string actually changed.
      expect(result.changed).toBe(input !== expected);
      expect(getGtinLog()).toHaveLength(input !== expected ? 1 : 0);
    });
  }

  it("all lengths of the same product collapse to one canonical value", () => {
    const forms = ["012345678905", "0012345678905", "00012345678905", "12345678905"];
    const normalized = new Set(forms.map((f) => normalizeGtin14(f, "regression").value));
    expect(normalized.size).toBe(1);
    expect([...normalized][0]).toBe("00012345678905");
  });
});

describe("GTIN-14 normalization: non-digit characters", () => {
  const cases: Array<[label: string, input: string, expected: string]> = [
    ["hyphens", "0-12345-678905", "00012345678905"],
    ["spaces", "0 12345 678905", "00012345678905"],
    ["tabs and newlines", "\t012345678905\n", "00012345678905"],
    ["prefixed label", "UPC: 012345678905", "00012345678905"],
    ["parentheses (GS1 AI)", "(01)00012345678905", "10001234567890" + "5"],
    ["unicode digits are not digits", "０１２３４５", ""],
    ["letters only", "no-barcode", ""],
    ["punctuation only", "--", ""],
    ["empty string", "", ""],
  ];

  for (const [label, input, expected] of cases) {
    it(`${label}: ${JSON.stringify(input)} -> ${JSON.stringify(expected)}`, () => {
      expect(normalizeGtin14(input, "regression").value).toBe(expected);
    });
  }

  it("logs stripping and padding together with an accurate reason", () => {
    const result = normalizeGtin14("0-12345-678905", "regression");
    expect(result.event).toMatchObject({
      reason: "stripped-non-digits+padded",
      digits: "012345678905",
      normalized: "00012345678905",
      paddedZeros: 3,
    });
  });

  it("logs an empty reason when nothing usable survives", () => {
    expect(normalizeGtin14("n/a", "regression").event?.reason).toBe("empty");
    expect(normalizeGtin14("--", "regression").event?.reason).toBe("empty");
  });

  it("never logs for null, undefined or empty input", () => {
    normalizeGtin14(null, "regression");
    normalizeGtin14(undefined, "regression");
    normalizeGtin14("", "regression");
    expect(getGtinLog()).toHaveLength(0);
  });
});

describe("GTIN-14 normalization: leading zeros", () => {
  it("collapses any number of leading zeros to the same canonical form", () => {
    const values = ["12345678905", "012345678905", "000000012345678905"].map(
      (v) => normalizeGtin14(v, "regression").value,
    );
    expect(new Set(values).size).toBe(1);
  });

  it("all-zero input normalizes to empty rather than a fake barcode", () => {
    for (const zeros of ["0", "00000000", "00000000000000"]) {
      clearGtinLog();
      const result = normalizeGtin14(zeros, "regression");
      expect(result.value).toBe("");
      expect(result.event?.reason).toBe("empty");
    }
  });

  it("reports how many zeros were added", () => {
    expect(normalizeGtin14("12345678905", "regression").event?.paddedZeros).toBe(3);
    expect(normalizeGtin14("7", "regression").event?.paddedZeros).toBe(13);
  });

  it("records the source label so mismatches can be traced", () => {
    normalizeGtin14("12345678905", "usda.import");
    normalizeGtin14("0 1234", "scanner");
    expect(getGtinLog().map((e) => e.source)).toEqual(["usda.import", "scanner"]);
  });
});

describe("matching behavior stays correct after normalization", () => {
  it("matches UPC-A against its zero-stripped twin", () => {
    expect(matchByBarcode("012345678905", "12345678905").verdict).toBe("exact");
  });

  it("matches across separator noise", () => {
    expect(matchByBarcode("0-12345-678905", " 00012345678905 ").verdict).toBe("exact");
  });

  it("matches EAN-13 against GTIN-14 for the same product", () => {
    expect(matchByBarcode("0012345678905", "00012345678905").verdict).toBe("exact");
  });

  it("does not match two different barcodes", () => {
    expect(matchByBarcode("012345678905", "012345678906").verdict).not.toBe("exact");
  });

  it("refuses to trust barcodes with fewer than 8 significant digits", () => {
    // Identical, but too short to be a real GTIN — must not force a merge.
    expect(matchByBarcode("0001234", "1234").verdict).not.toBe("exact");
  });

  it("treats unusable barcodes as absent instead of matching two empties", () => {
    expect(matchByBarcode("n/a", "unknown").verdict).not.toBe("exact");
    expect(matchByBarcode(null, undefined).verdict).not.toBe("exact");
  });

  it("logs both sides with their dedupe source labels when values change", () => {
    matchByBarcode("012345678905", "12345678905");
    const sources = getGtinLog().map((e) => e.source);
    expect(sources).toContain("food-dedupe.incoming");
    expect(sources).toContain("food-dedupe.existing");
  });

  it("logs nothing when both barcodes are already canonical", () => {
    matchByBarcode("00012345678905", "00012345678905");
    expect(getGtinLog()).toHaveLength(0);
  });

  it("surfaces the normalized values in the barcode signal detail", () => {
    const explained = explainDuplicate(
      food("Alpha Snack Bar", "0-12345-678905"),
      food("Zeta Protein Cookie", "12345678905"),
    );
    const signal = explained.signals.find((s) => s.key === "barcode");
    expect(signal?.detail).toContain("00012345678905");
    expect(signal?.passed).toBe(true);
  });
});
