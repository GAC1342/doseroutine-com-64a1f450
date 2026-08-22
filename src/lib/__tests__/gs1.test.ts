import { describe, expect, it } from "vitest";
import { gs1ExpiryToIso, looksLikeGs1, parseGs1 } from "@/lib/gs1";
import { ndc11Candidates, ndcFromBarcode, productNdcCandidates } from "@/lib/ndc";

describe("parseGs1", () => {
  it("reads GTIN, expiry and lot from a concatenated element string", () => {
    const parsed = parseGs1("010031234567890617270331\u001d10ABC123");
    expect(parsed.gtin).toBe("00312345678906");
    expect(parsed.expiry).toBe("2027-03-31");
    expect(parsed.lot).toBe("ABC123");
  });

  it("accepts the human-readable bracketed form", () => {
    const parsed = parseGs1("(01)00312345678906(17)261200(10)LOT9(21)SN5");
    expect(parsed.gtin).toBe("00312345678906");
    // Day "00" means the last day of that month.
    expect(parsed.expiry).toBe("2026-12-31");
    expect(parsed.lot).toBe("LOT9");
    expect(parsed.serial).toBe("SN5");
  });

  it("strips the symbology identifier some scanners prepend", () => {
    expect(parseGs1("]d201003123456789061017LOT").gtin).toBe("00312345678906");
  });

  it("returns nulls for a plain linear barcode", () => {
    expect(parseGs1("038000183737").gtin).toBeNull();
    expect(looksLikeGs1("038000183737")).toBe(false);
  });

  it("rejects an impossible month", () => {
    expect(gs1ExpiryToIso("271301")).toBeNull();
  });
});

describe("NDC derivation", () => {
  it("pulls the NDC-10 out of a drug UPC", () => {
    expect(ndcFromBarcode("300450449092")).toBe("0045044909");
  });

  it("ignores non-drug UPCs", () => {
    expect(ndcFromBarcode("038000183737")).toBeNull();
  });

  it("offers all three 11-digit paddings", () => {
    const codes = ndc11Candidates("0045044909");
    expect(codes).toContain("00045-0449-09");
    expect(codes).toContain("00450-0449-09");
    expect(codes).toContain("00450-4490-09");
    expect(codes.length).toBe(3);
  });

  it("derives product-level NDCs", () => {
    expect(productNdcCandidates("0045044909")[0]).toBe("00045-0449");
  });
});
