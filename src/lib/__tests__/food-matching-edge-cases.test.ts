/**
 * Edge cases in food matching that messy USDA data exposes:
 *  - the same food in a different *form* (raw vs cooked, juice vs whole fruit)
 *  - names that differ only by casing / punctuation / accents
 *  - synonyms that are simply missing from our alias list
 *
 * Pure functions only — no network, no database.
 */
import { describe, it, expect } from "vitest";
import {
  classifyDuplicate,
  bestDuplicate,
  findDuplicatePairs,
  normalizeTokens,
  tokenOverlap,
  conflictingQualifiers,
  macrosClose,
  type DedupeFood,
} from "@/lib/food-dedupe";
import { normalizeFoodName } from "@/lib/food-db.server";

function food(name: string, over: Partial<DedupeFood> = {}): DedupeFood {
  return {
    name,
    kcal100: 165,
    protein100: 31,
    carbs100: 0,
    fat100: 3.6,
    ...over,
  };
}

describe("normalizeFoodName — casing and punctuation", () => {
  it("collapses casing and whitespace to one key", () => {
    const expected = "chicken breast";
    for (const raw of [
      "Chicken Breast",
      "CHICKEN  BREAST",
      "  chicken\tbreast  ",
      "chicken\nbreast",
      "Chicken   BREAST ",
    ]) {
      expect(normalizeFoodName(raw)).toBe(expected);
    }
  });

  it("strips symbols USDA ships in branded names", () => {
    expect(normalizeFoodName("Cheerios®")).toBe("cheerios");
    expect(normalizeFoodName("Pop-Tarts™ Frosted")).toBe("pop-tarts frosted");
    expect(normalizeFoodName("Chicken — grilled")).toBe("chicken grilled");
    expect(normalizeFoodName("Yogurt 🍦")).toBe("yogurt");
    expect(normalizeFoodName("Beans (canned)")).toBe("beans canned");
    expect(normalizeFoodName("Cereal, UPC: 0001234")).toBe("cereal, upc 0001234");
  });

  it("drops accents rather than keeping mismatched keys", () => {
    // Accented characters are not in the keep-list, so they normalize away.
    expect(normalizeFoodName("Jalapeño")).toBe("jalape o");
    expect(normalizeFoodName("Crème fraîche")).toBe("cr me fra che");
    // Same input, different casing, still the same key.
    expect(normalizeFoodName("JALAPEÑO")).toBe(normalizeFoodName("jalapeño"));
  });

  it("keeps characters that carry meaning", () => {
    expect(normalizeFoodName("2% Milk")).toBe("2% milk");
    expect(normalizeFoodName("Rice, 1/2 cup")).toBe("rice, 1/2 cup");
    expect(normalizeFoodName("Sugar-Free Syrup")).toBe("sugar-free syrup");
  });

  it("caps length and handles empty input", () => {
    expect(normalizeFoodName("a".repeat(400))).toHaveLength(120);
    expect(normalizeFoodName("")).toBe("");
    expect(normalizeFoodName("   ")).toBe("");
    expect(normalizeFoodName(undefined as unknown as string)).toBe("");
    expect(normalizeFoodName(null as unknown as string)).toBe("");
    expect(normalizeFoodName("!!!")).toBe("");
  });
});

describe("preparation / dosage-form differences never merge", () => {
  const formPairs: [string, string][] = [
    ["Chicken breast, raw", "Chicken breast, cooked"],
    ["Chicken breast", "Chicken breast, roasted"],
    ["Chicken breast", "Chicken breast, grilled"],
    ["Chicken breast", "Chicken breast, fried"],
    ["Chicken breast", "Chicken breast, boiled"],
    ["Milk", "Milk, whole"],
    ["Milk, whole", "Milk, skim"],
    ["Milk, whole", "Milk, lowfat"],
    ["Butter, salted", "Butter, unsalted"],
    ["Almond milk, sweetened", "Almond milk, unsweetened"],
    ["Orange", "Orange juice"],
    ["Peanuts", "Peanut butter powder"],
    ["Peanut butter powder", "Peanut oil"],
    ["Wheat", "Wheat flour"],
    ["Apricots", "Apricots, dried"],
    ["Peas", "Peas, frozen"],
    ["Corn", "Corn, canned"],
    ["Salmon", "Salmon, smoked"],
  ];

  it.each(formPairs)("%s vs %s → none", (a, b) => {
    expect(conflictingQualifiers(a, b)).toBe(true);
    // Identical macros — only the form word differs.
    expect(classifyDuplicate(food(a), food(b)).verdict).toBe("none");
  });

  it("a form conflict beats a very high token overlap", () => {
    const a = food("Chicken breast skinless boneless");
    const b = food("Chicken breast skinless boneless cooked");
    expect(tokenOverlap(a.name, b.name)).toBeGreaterThanOrEqual(0.8);
    const match = classifyDuplicate(a, b);
    expect(match.verdict).toBe("none");
    expect(match.reason).toMatch(/preparation|variant/i);
  });

  it("but the same barcode still wins as exact", () => {
    const a = food("Chicken breast, raw", { gtin: "0012345678905" });
    const b = food("Chicken breast, cooked", { gtin: "12345678905" });
    const match = classifyDuplicate(a, b);
    expect(match.verdict).toBe("exact");
    expect(match.reason).toMatch(/barcode/i);
  });

  it("short or malformed barcodes do not force an exact match", () => {
    const a = food("Mystery bar", { gtin: "1234" });
    const b = food("Other bar", { gtin: "1234" });
    expect(classifyDuplicate(a, b).verdict).not.toBe("exact");
  });
});

describe("casing and punctuation insensitivity in dedupe", () => {
  it("ALL-CAPS USDA branded rows match mixed-case catalog rows", () => {
    const usda = food("GREEK YOGURT, PLAIN", {
      kcal100: 59,
      protein100: 10,
      carbs100: 3.6,
      fat100: 0.4,
    });
    const own = food("Greek yogurt, plain", {
      kcal100: 59,
      protein100: 10,
      carbs100: 3.6,
      fat100: 0.4,
    });
    const match = classifyDuplicate(usda, own);
    expect(match.verdict).toBe("exact");
    expect(match.reason).toMatch(/identical name/i);
  });

  it("alias matching ignores casing and punctuation", () => {
    const incoming = food("COTTAGE CHEESE");
    const existing = food("Curd cheese", { aliases: ["Cottage Cheese!"] });
    const match = classifyDuplicate(incoming, existing);
    expect(match.verdict).toBe("strong");
    expect(match.reason).toMatch(/alias/i);
  });

  it("brand comparison ignores casing and trailing space", () => {
    const incoming = food("Chobani nonfat plain cup", {
      brand: "Chobani",
      kcal100: 59,
      protein100: 10,
      carbs100: 3.6,
      fat100: 0.4,
    });
    const existing = food("Chobani plain nonfat yogurt", {
      brand: "CHOBANI ",
      kcal100: 90,
      protein100: 10,
      carbs100: 3.6,
      fat100: 0.4,
    });
    const match = classifyDuplicate(incoming, existing);
    expect(match.verdict).toBe("probable");
    expect(match.reason).toMatch(/brand/i);
  });

  it("token normalization drops packaging noise and one-letter fragments", () => {
    expect(normalizeTokens("Beans, canned, NFS (UPC: 001)")).toEqual(["beans", "canned", "001"]);
    expect(normalizeTokens("A B chicken")).toEqual(["chicken"]);
  });
});

describe("missing synonyms fail safely rather than falsely merging", () => {
  const synonymPairs: [string, string][] = [
    ["Chickpeas", "Garbanzo beans"],
    ["Cilantro", "Coriander leaf"],
    ["Courgette", "Zucchini"],
    ["Aubergine", "Eggplant"],
    ["Shrimp", "Prawns"],
    ["Soda, cola", "Pop, cola"],
  ];

  it.each(synonymPairs)("%s vs %s is not auto-merged today", (a, b) => {
    const match = classifyDuplicate(food(a), food(b));
    expect(match.verdict).not.toBe("exact");
    expect(match.verdict).not.toBe("strong");
  });

  it("spelling variants that share no token also stay separate", () => {
    expect(classifyDuplicate(food("Yoghurt"), food("Yogurt")).verdict).toBe("none");
    expect(classifyDuplicate(food("Doughnut"), food("Donut")).verdict).toBe("none");
  });

  it("spelling variants that share tokens still fall under the overlap floor", () => {
    const a = food("Greek yoghurt plain", {
      kcal100: 59,
      protein100: 10,
      carbs100: 3.6,
      fat100: 0.4,
    });
    const b = food("Greek yogurt plain", {
      kcal100: 59,
      protein100: 10,
      carbs100: 3.6,
      fat100: 0.4,
    });
    // 2 of 4 distinct tokens shared = 0.5 overlap, under the 0.6 review floor.
    expect(tokenOverlap(a.name, b.name)).toBeCloseTo(0.5, 5);
    expect(classifyDuplicate(a, b).verdict).toBe("none");
  });

  it("registering the missing synonym as an alias flips it to a strong match", () => {
    const incoming = food("Garbanzo beans");
    const before = classifyDuplicate(incoming, food("Chickpeas"));
    expect(before.verdict).toBe("none");

    const after = classifyDuplicate(incoming, food("Chickpeas", { aliases: ["garbanzo beans"] }));
    expect(after.verdict).toBe("strong");
    expect(after.reason).toMatch(/alias/i);
  });
});

describe("USDA-shaped rows and ranking", () => {
  it("ignores NFS / UPC noise when comparing names", () => {
    const usda = food("CHEDDAR CHEESE, NFS (UPC: 0001234)", {
      kcal100: 403,
      protein100: 23,
      carbs100: 3.1,
      fat100: 33,
    });
    const own = food("Cheddar cheese", { kcal100: 403, protein100: 23, carbs100: 3.1, fat100: 33 });
    expect(tokenOverlap(usda.name, own.name)).toBeGreaterThanOrEqual(0.6);
    expect(classifyDuplicate(usda, own).verdict).not.toBe("none");
  });

  it("a long program suffix dilutes overlap below the floor (known limitation)", () => {
    const usda = food("Cheddar cheese, Includes foods for USDA's Food Distribution Program", {
      kcal100: 403,
      protein100: 23,
      carbs100: 3.1,
      fat100: 33,
    });
    const own = food("Cheddar cheese", { kcal100: 403, protein100: 23, carbs100: 3.1, fat100: 33 });
    // Documents today's behavior: extra descriptive tokens push overlap under
    // 0.6, so the pair is never auto-merged. Safe, but a future stop-token
    // addition should flip this deliberately.
    expect(tokenOverlap(usda.name, own.name)).toBeLessThan(0.6);
    expect(classifyDuplicate(usda, own).verdict).toBe("none");
  });

  it("bestDuplicate prefers the non-conflicting candidate", () => {
    const incoming = food("Chicken breast");
    const candidates = [
      food("Chicken breast, cooked", { id: "cooked" }),
      food("Chicken breast", { id: "same" }),
      food("Turkey breast", { id: "turkey" }),
    ];
    const best = bestDuplicate(incoming, candidates);
    expect(best?.candidate.id).toBe("same");
    expect(best?.match.verdict).toBe("exact");
  });

  it("bestDuplicate skips the row it was given", () => {
    const incoming = food("Chicken breast", { id: "self" });
    expect(bestDuplicate(incoming, [food("Chicken breast", { id: "self" })])).toBeNull();
  });

  it("findDuplicatePairs ranks exact above probable and drops form conflicts", () => {
    const rows = [
      food("Greek yogurt plain", {
        id: "a",
        kcal100: 59,
        protein100: 10,
        carbs100: 3.6,
        fat100: 0.4,
      }),
      food("GREEK YOGURT PLAIN", {
        id: "b",
        kcal100: 59,
        protein100: 10,
        carbs100: 3.6,
        fat100: 0.4,
      }),
      food("Greek yogurt plain, unsweetened", {
        id: "c",
        kcal100: 59,
        protein100: 10,
        carbs100: 3.6,
        fat100: 0.4,
      }),
    ];
    const pairs = findDuplicatePairs(rows);
    expect(pairs[0]?.match.verdict).toBe("exact");
    const ids = pairs.map((p) => [p.a.id, p.b.id].sort().join("+"));
    expect(ids).toContain("a+b");
    expect(ids).not.toContain("a+c");
    expect(ids).not.toContain("b+c");
  });

  it("macro tolerance: rounding noise is close, a big kcal gap is not", () => {
    const a = food("Broccoli", { kcal100: 34, protein100: 2.8, carbs100: 6.6, fat100: 0.4 });
    const b = food("Broccoli", { kcal100: 34, protein100: 2.8, carbs100: 6.6, fat100: 0.6 });
    expect(macrosClose(a, b)).toBe(true);

    const c = food("Broccoli", { kcal100: 55, protein100: 2.8, carbs100: 6.6, fat100: 0.4 });
    expect(macrosClose(a, c)).toBe(false);
  });

  it("empty names never produce a verdict", () => {
    expect(classifyDuplicate(food(""), food("Chicken breast")).verdict).toBe("none");
    expect(classifyDuplicate(food("Chicken breast"), food("   ")).verdict).toBe("none");
  });
});
