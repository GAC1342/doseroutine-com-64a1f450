import { describe, expect, it } from "vitest";
import {
  bestDuplicate,
  classifyDuplicate,
  findDuplicatePairs,
  macrosClose,
  normalizeTokens,
  tokenOverlap,
  type DedupeFood,
} from "@/lib/food-dedupe";

const food = (over: Partial<DedupeFood> & { name: string }): DedupeFood => ({
  kcal100: 100,
  protein100: 10,
  carbs100: 10,
  fat100: 2,
  ...over,
});

describe("normalizeTokens", () => {
  it("drops punctuation and filler words", () => {
    expect(normalizeTokens("Chicken, breast, raw (NFS)")).toEqual(["chicken", "breast"]);
  });
});

describe("tokenOverlap", () => {
  it("scores identical names at 1", () => {
    expect(tokenOverlap("brown rice", "Brown Rice")).toBe(1);
  });
  it("scores unrelated names near 0", () => {
    expect(tokenOverlap("brown rice", "greek yogurt")).toBe(0);
  });
});

describe("macrosClose", () => {
  it("accepts small differences", () => {
    expect(
      macrosClose(
        food({ name: "a", kcal100: 165, protein100: 31, carbs100: 0, fat100: 3.6 }),
        food({ name: "b", kcal100: 170, protein100: 30, carbs100: 0, fat100: 4 }),
      ),
    ).toBe(true);
  });
  it("rejects large calorie gaps", () => {
    expect(
      macrosClose(
        food({ name: "a", kcal100: 60, protein100: 3, carbs100: 5, fat100: 3 }),
        food({ name: "b", kcal100: 350, protein100: 3, carbs100: 5, fat100: 30 }),
      ),
    ).toBe(false);
  });
});

describe("classifyDuplicate", () => {
  it("flags identical normalized names as exact", () => {
    const match = classifyDuplicate(food({ name: "Brown Rice" }), food({ name: "brown rice" }));
    expect(match.verdict).toBe("exact");
  });

  it("flags a shared barcode as exact", () => {
    const match = classifyDuplicate(
      food({ name: "Protein bar chocolate", gtin: "0123456789012" }),
      food({ name: "Choc protein bar", gtin: "0123456789012", kcal100: 380 }),
    );
    expect(match.verdict).toBe("exact");
    expect(match.reason).toBe("Same barcode");
  });

  it("flags an alias hit as strong", () => {
    const match = classifyDuplicate(
      food({ name: "Chickpeas" }),
      food({ name: "Garbanzo beans", aliases: ["chickpeas"], kcal100: 364, carbs100: 61 }),
    );
    expect(match.verdict).toBe("strong");
  });

  it("flags near-identical name plus macros as strong", () => {
    const match = classifyDuplicate(
      food({ name: "Greek yogurt plain", kcal100: 59, protein100: 10, carbs100: 3.6, fat100: 0.4 }),
      food({
        name: "Yogurt, greek, plain",
        kcal100: 60,
        protein100: 10.2,
        carbs100: 3.5,
        fat100: 0.5,
      }),
    );
    expect(match.verdict).toBe("strong");
  });

  it("flags same brand with similar name as probable", () => {
    const match = classifyDuplicate(
      food({ name: "Oat crunch granola cereal", brand: "Acme", kcal100: 420 }),
      food({ name: "Granola oat crunch", brand: "acme", kcal100: 480 }),
    );
    expect(match.verdict).toBe("probable");
  });

  it("does not merge raw and cooked chicken", () => {
    const match = classifyDuplicate(
      food({ name: "Chicken breast, raw", kcal100: 120, protein100: 23, fat100: 2.6 }),
      food({ name: "Chicken breast, cooked", kcal100: 165, protein100: 31, fat100: 3.6 }),
    );
    expect(match.verdict).toBe("none");
  });

  it("does not merge whole and skim milk", () => {
    const match = classifyDuplicate(
      food({ name: "Milk, whole", kcal100: 61, protein100: 3.2, carbs100: 4.8, fat100: 3.3 }),
      food({ name: "Milk, skim", kcal100: 34, protein100: 3.4, carbs100: 5, fat100: 0.2 }),
    );
    expect(match.verdict).toBe("none");
  });

  it("does not merge unrelated foods", () => {
    const match = classifyDuplicate(food({ name: "Broccoli" }), food({ name: "Salmon fillet" }));
    expect(match.verdict).toBe("none");
  });
});

describe("bestDuplicate", () => {
  it("prefers the strongest match", () => {
    const best = bestDuplicate(food({ name: "Brown rice" }), [
      food({ id: "1", name: "Brown rice pilaf mix", brand: null }),
      food({ id: "2", name: "brown rice" }),
    ]);
    expect(best?.candidate.id).toBe("2");
    expect(best?.match.verdict).toBe("exact");
  });

  it("ignores the row itself", () => {
    expect(bestDuplicate(food({ id: "1", name: "Oats" }), [food({ id: "1", name: "Oats" })])).toBe(
      null,
    );
  });
});

describe("findDuplicatePairs", () => {
  it("returns duplicate clusters sorted by strength", () => {
    const pairs = findDuplicatePairs([
      food({ id: "1", name: "Brown rice" }),
      food({ id: "2", name: "brown rice" }),
      food({ id: "3", name: "Salmon" }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.match.verdict).toBe("exact");
  });
});
