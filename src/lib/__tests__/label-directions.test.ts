import { describe, it, expect } from "vitest";
import {
  buildPrefill,
  countFromText,
  dosesPerDayFromText,
  primaryIngredient,
  summarisePrefill,
  scorePrefillConfidence,
} from "@/lib/label-directions";
import {
  normalizeBarcode,
  normalizeDsld,
  normalizeOff,
  type ProductLabel,
} from "@/lib/product-lookup.server";

const baseLabel = (over: Partial<ProductLabel> = {}): ProductLabel => ({
  barcode: "012345678905",
  brand: "Acme",
  name: "Omega-3 Fish Oil 1000 mg",
  servingSize: "1 soft gel",
  servingUnitNoun: "soft gel",
  servingCount: 1,
  servingsPerDay: 1,
  ingredients: [{ name: "Fish Oil", amount: 1000, unit: "mg" }],
  directions: "Take 1 softgel daily with a meal.",
  sourceName: "NIH Dietary Supplement Label Database",
  sourceUrl: null,
  ...over,
});

describe("normalizeBarcode", () => {
  it("keeps valid GTIN lengths and strips separators", () => {
    expect(normalizeBarcode("0 12345-678905")).toBe("012345678905");
    expect(normalizeBarcode("12345678")).toBe("12345678");
  });
  it("rejects junk", () => {
    expect(normalizeBarcode("123")).toBeNull();
    expect(normalizeBarcode("abcdefgh")).toBeNull();
    expect(normalizeBarcode("123456789012345")).toBeNull();
  });
});

describe("normalizeDsld", () => {
  it("maps a DSLD label into our shape", () => {
    const out = normalizeDsld(
      {
        id: 42,
        fullName: "Vitamin D3 5000 IU",
        brandName: "Acme",
        servingSizes: [{ minQuantity: 1, unit: "Softgel(s)", maxDailyServings: 1 }],
        statements: [{ type: "Suggested Use", notes: "Take 1 softgel daily with food." }],
        ingredientRows: [{ name: "Vitamin D3", quantity: [{ quantity: 5000, unit: "IU" }] }],
      },
      "012345678905",
    );
    expect(out?.brand).toBe("Acme");
    expect(out?.servingUnitNoun).toBe("soft gel");
    expect(out?.directions).toBe("Take 1 softgel daily with food.");
    expect(out?.ingredients[0]).toEqual({ name: "Vitamin D3", amount: 5000, unit: "iu" });
    expect(out?.sourceUrl).toContain("/label/42");
  });

  it("returns null without a product name", () => {
    expect(normalizeDsld({ fullName: "  " }, "012345678905")).toBeNull();
  });
});

describe("normalizeOff", () => {
  it("takes the first brand only", () => {
    const out = normalizeOff({ product_name: "Magnesium", brands: "Acme, Other" }, "012345678905");
    expect(out?.brand).toBe("Acme");
    expect(out?.sourceName).toBe("Open Food Facts");
  });
});

describe("directions parsing", () => {
  it("reads doses per day", () => {
    expect(dosesPerDayFromText("Take 1 capsule twice a day")).toBe(2);
    expect(dosesPerDayFromText("Take three times per day")).toBe(3);
    expect(dosesPerDayFromText("Take once daily")).toBe(1);
    expect(dosesPerDayFromText("Use as directed")).toBeNull();
  });

  it("reads capsules per dose in digits and words", () => {
    expect(countFromText("Take 2 softgels daily")).toBe(2);
    expect(countFromText("Take two capsules with water")).toBe(2);
    expect(countFromText("no count here")).toBeNull();
  });
});

describe("primaryIngredient", () => {
  it("prefers the largest real amount and skips nutrition boilerplate", () => {
    const label = baseLabel({
      ingredients: [
        { name: "Calories", amount: 10, unit: "mg" },
        { name: "Fish Oil", amount: 1, unit: "g" },
        { name: "Vitamin E", amount: 400, unit: "mcg" },
      ],
    });
    expect(primaryIngredient(label)?.ingredient.name).toBe("Fish Oil");
  });
});

describe("buildPrefill", () => {
  it("fills dose, unit, food and search term from a simple label", () => {
    const p = buildPrefill(baseLabel());
    expect(p.strengthPerUnit).toBe(1000);
    expect(p.unit).toBe("mg");
    expect(p.countPerDose).toBe(1);
    expect(p.dosesPerDay).toBe(1);
    expect(p.dosePerTake).toBe(1000);
    expect(p.withFood).toBe(true);
    expect(p.searchTerm).toBe("Fish Oil");
  });

  it("divides a per-serving amount across the capsules in that serving", () => {
    const p = buildPrefill(
      baseLabel({
        servingCount: 2,
        directions: "Take 2 softgels daily.",
        ingredients: [{ name: "Fish Oil", amount: 1000, unit: "mg" }],
      }),
    );
    expect(p.strengthPerUnit).toBe(500);
    expect(p.countPerDose).toBe(2);
    expect(p.dosePerTake).toBe(1000);
  });

  it("spreads times when the label says more than once a day", () => {
    const p = buildPrefill(baseLabel({ directions: "Take 1 capsule twice a day." }));
    expect(p.times).toEqual(["08:00", "20:00"]);
  });

  it("uses a bedtime hint for once-daily night dosing", () => {
    const p = buildPrefill(baseLabel({ directions: "Take 1 capsule before bed." }));
    expect(p.times).toEqual(["21:00"]);
  });

  it("survives a label with no usable numbers", () => {
    const p = buildPrefill(
      baseLabel({ ingredients: [], directions: null, servingCount: null, servingsPerDay: null }),
    );
    expect(p.dosePerTake).toBeNull();
    expect(p.times).toBeNull();
    expect(p.searchTerm).toBe("Omega-3 Fish Oil");
  });

  it("rejects an absurd computed dose rather than pre-filling garbage", () => {
    const p = buildPrefill(
      baseLabel({
        ingredients: [{ name: "Weird", amount: 900_000, unit: "mg" }],
        directions: "Take 5 capsules daily.",
        servingCount: 1,
      }),
    );
    expect(p.dosePerTake).toBeNull();
  });
});

describe("summarisePrefill", () => {
  it("reads as plain English", () => {
    const label = baseLabel();
    expect(summarisePrefill(label, buildPrefill(label))).toBe(
      "1000 mg per dose · 1 soft gel at a time · once a day",
    );
  });
});

describe("scorePrefillConfidence", () => {
  it("scores a fully readable NIH label as high confidence", () => {
    const label = baseLabel();
    const c = scorePrefillConfidence(label, buildPrefill(label));
    expect(c.level).toBe("high");
    expect(c.score).toBeGreaterThanOrEqual(75);
    expect(c.checks.map((x) => x.label)).toEqual([
      "Dose amount",
      "How many per dose",
      "Times per day",
      "Time of day",
    ]);
  });

  it("discounts community-sourced data", () => {
    const nih = baseLabel();
    const off = baseLabel({ sourceName: "Open Food Facts" });
    const nihScore = scorePrefillConfidence(nih, buildPrefill(nih)).score;
    const offScore = scorePrefillConfidence(off, buildPrefill(off)).score;
    expect(offScore).toBeLessThan(nihScore);
  });

  it("caps the score and flags low confidence when no dose is readable", () => {
    const label = baseLabel({ ingredients: [], directions: "Take as directed." });
    const c = scorePrefillConfidence(label, buildPrefill(label));
    expect(c.score).toBeLessThanOrEqual(40);
    expect(c.level).toBe("low");
    expect(c.checks.find((x) => x.label === "Dose amount")?.source).toBe("missing");
  });

  it("marks inferred fields separately from label-printed ones", () => {
    const label = baseLabel({ directions: "Take 1 capsule twice a day." });
    const p = buildPrefill(label);
    expect(p.provenance.frequency).toBe("label");
    expect(p.provenance.timing).toBe("inferred");
    const c = scorePrefillConfidence(label, p);
    expect(c.checks.find((x) => x.label === "Time of day")?.detail).toMatch(/Worked out/);
  });

  it("always returns a score between 0 and 100", () => {
    const label = baseLabel({
      ingredients: [],
      directions: null,
      servingCount: null,
      servingsPerDay: null,
    });
    const c = scorePrefillConfidence(label, buildPrefill(label));
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(100);
  });
});
