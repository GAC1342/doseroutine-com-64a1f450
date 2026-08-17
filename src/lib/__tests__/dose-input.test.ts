import { describe, expect, it } from "vitest";
import {
  DOSE_MAX_DECIMALS,
  DOSE_MAX_VALUE,
  formatDose,
  parseDoseInput,
  sanitizeDecimalInput,
} from "@/lib/dose-input";

describe("sanitizeDecimalInput", () => {
  it("keeps a plain integer exactly", () => {
    expect(sanitizeDecimalInput("900")).toBe("900");
  });

  it("strips letters, symbols and spaces", () => {
    expect(sanitizeDecimalInput(" 9a0 0mg ")).toBe("900");
  });

  it("normalises a comma decimal separator", () => {
    expect(sanitizeDecimalInput("2,5")).toBe("2.5");
  });

  it("keeps only the first decimal separator", () => {
    expect(sanitizeDecimalInput("1.2.3")).toBe("1.23");
  });

  it("preserves a trailing dot while typing", () => {
    expect(sanitizeDecimalInput("900.")).toBe("900.");
  });

  it("clamps decimals", () => {
    expect(sanitizeDecimalInput("1.1234567890")).toBe(
      `1.${"1234567890".slice(0, DOSE_MAX_DECIMALS)}`,
    );
  });

  it("drops leading zeros but keeps 0 and 0.x", () => {
    expect(sanitizeDecimalInput("007")).toBe("7");
    expect(sanitizeDecimalInput("0")).toBe("0");
    expect(sanitizeDecimalInput("0.5")).toBe("0.5");
  });

  it("rejects negative signs and exponents", () => {
    expect(sanitizeDecimalInput("-900")).toBe("900");
    expect(sanitizeDecimalInput("9e3")).toBe("93");
  });

  it("returns empty for empty input", () => {
    expect(sanitizeDecimalInput("")).toBe("");
  });
});

describe("parseDoseInput", () => {
  it("saves a typed integer exactly", () => {
    expect(parseDoseInput("900")).toEqual({ ok: true, value: 900 });
  });

  it("saves decimals exactly with no float dust", () => {
    expect(parseDoseInput("2.5")).toEqual({ ok: true, value: 2.5 });
    expect(parseDoseInput("0.1")).toEqual({ ok: true, value: 0.1 });
  });

  it("trims whitespace and accepts comma decimals", () => {
    expect(parseDoseInput("  900  ")).toEqual({ ok: true, value: 900 });
    expect(parseDoseInput("2,5")).toEqual({ ok: true, value: 2.5 });
  });

  it("accepts a number input", () => {
    expect(parseDoseInput(900)).toEqual({ ok: true, value: 900 });
  });

  it("rejects blank input", () => {
    expect(parseDoseInput("")).toMatchObject({ ok: false });
    expect(parseDoseInput(null)).toMatchObject({ ok: false });
  });

  it("rejects non-numeric text instead of coercing to NaN", () => {
    expect(parseDoseInput("abc")).toMatchObject({ ok: false });
    expect(parseDoseInput("9e3")).toMatchObject({ ok: false });
    expect(parseDoseInput(".")).toMatchObject({ ok: false });
  });

  it("rejects zero and negatives", () => {
    expect(parseDoseInput("0")).toMatchObject({ ok: false });
    expect(parseDoseInput("-5")).toMatchObject({ ok: false });
  });

  it("rejects absurdly large values", () => {
    expect(parseDoseInput(String(DOSE_MAX_VALUE + 1))).toMatchObject({ ok: false });
    expect(parseDoseInput(String(DOSE_MAX_VALUE))).toMatchObject({ ok: true });
  });

  it("rejects too many decimal places", () => {
    expect(parseDoseInput("1.1234567")).toMatchObject({ ok: false });
  });

  it("round-trips typed values without off-by-one drift", () => {
    for (const raw of ["899", "900", "901", "1800", "12.5", "0.25"]) {
      const res = parseDoseInput(raw);
      expect(res.ok).toBe(true);
      expect(res.ok && formatDose(res.value)).toBe(raw);
    }
  });
});

describe("formatDose", () => {
  it("strips trailing zeros", () => {
    expect(formatDose(900.0)).toBe("900");
    expect(formatDose(2.5)).toBe("2.5");
  });
});
