import { describe, expect, it } from "vitest";
import {
  cleanBarcode,
  describeBarcodeInput,
  expandUpcE,
  gtinVariants,
  isValidGtin,
  sameGtin,
} from "@/lib/gtin";

describe("gtin helpers", () => {
  it("strips separators from typed codes", () => {
    expect(cleanBarcode(" 038000-183737 ")).toBe("038000183737");
  });

  it("validates real GTIN check digits", () => {
    expect(isValidGtin("038000183737")).toBe(true); // Pringles UPC-A
    expect(isValidGtin("0038000183737")).toBe(true); // same code as EAN-13
    expect(isValidGtin("038000183738")).toBe(false);
    expect(isValidGtin("12345")).toBe(false);
  });

  it("expands UPC-E to UPC-A", () => {
    expect(expandUpcE("01234565")).toBe("012345000065");
    expect(expandUpcE("01200345")).toBe("012000000035");
    expect(expandUpcE("1234567890")).toBeNull();
  });

  it("offers the padded forms databases actually store", () => {
    const variants = gtinVariants("038000183737");
    // USDA stores the 14-digit form; a bare 12-digit query returns nothing.
    expect(variants).toContain("00038000183737");
    expect(variants).toContain("0038000183737");
    expect(variants).toContain("038000183737");
    expect(variants.every((v) => v.length >= 8 && v.length <= 14)).toBe(true);
  });

  it("treats padded codes as the same product", () => {
    expect(sameGtin("038000183737", "00038000183737")).toBe(true);
    expect(sameGtin("038000183737", "038000183738")).toBe(false);
  });

  it("separates typo classes so the UI can explain them", () => {
    expect(describeBarcodeInput("")).toBe("empty");
    expect(describeBarcodeInput("123")).toBe("too-short");
    expect(describeBarcodeInput("038000183738")).toBe("check-digit");
    expect(describeBarcodeInput("038000183737")).toBeNull();
  });
});
