/**
 * Regression cover for portion cue mapping: the "how big is that?" hint must
 * match the food that was actually matched (chicken -> deck of cards / palm,
 * broccoli -> fist / cupped hand), and must stay silent when no cue is close.
 */
import { describe, expect, it } from "vitest";
import { cueClassFor, parsePortionGrams, visualHintFor } from "@/lib/portion-units";

describe("cueClassFor", () => {
  const cases: [string, string][] = [
    ["Grilled chicken breast", "protein"],
    ["Salmon fillet", "protein"],
    ["Scrambled eggs", "protein"],
    ["Steamed broccoli", "vegetable"],
    ["Mixed green salad", "vegetable"],
    ["Brown rice", "grain"],
    ["Whole wheat pasta", "grain"],
    ["Banana", "fruit"],
    ["Almonds", "nuts"],
    ["Olive oil", "fat"],
    ["Ranch dressing", "sauce"],
    ["Cheddar cheese", "cheese"],
    ["Leftovers", "any"],
  ];
  it.each(cases)("classifies %s as %s", (name, cls) => {
    expect(cueClassFor(name)).toBe(cls);
  });

  it("falls back to any for empty names", () => {
    expect(cueClassFor("")).toBe("any");
    expect(cueClassFor(null)).toBe("any");
  });
});

describe("visualHintFor", () => {
  it("uses meat cues for chicken", () => {
    expect(visualHintFor(85, "Grilled chicken breast")).toMatch(/deck of cards/i);
    expect(visualHintFor(110, "Grilled chicken breast")).toMatch(/palm/i);
  });

  it("uses produce cues for broccoli, never a meat cue", () => {
    const hint = visualHintFor(180, "Steamed broccoli");
    expect(hint).toMatch(/clenched fist|cupped hand/i);
    expect(hint).not.toMatch(/deck of cards|palm/i);
  });

  it("uses grain cues for rice", () => {
    expect(visualHintFor(160, "Brown rice")).toMatch(/cupped hand/i);
  });

  it("uses small cues for oils and nuts", () => {
    expect(visualHintFor(15, "Olive oil")).toMatch(/thumb tip/i);
    expect(visualHintFor(30, "Almonds")).toMatch(/small handful/i);
  });

  it("stays quiet when nothing is close and for bad input", () => {
    expect(visualHintFor(400, "Grilled chicken breast")).toBeNull();
    expect(visualHintFor(0, "Grilled chicken breast")).toBeNull();
    expect(visualHintFor(Number.NaN, "Brown rice")).toBeNull();
  });

  it("still returns a generic cue when the food is unknown", () => {
    expect(visualHintFor(85, "Leftovers")).toBeTruthy();
    expect(visualHintFor(85)).toBeTruthy();
  });
});

describe("free-typed portions feed the cue", () => {
  it("parses typed grams and maps them to the food's cue", () => {
    const grams = parsePortionGrams("200 g");
    expect(grams).toBe(200);
    expect(visualHintFor(grams!, "Steamed broccoli")).toMatch(/clenched fist/i);
  });

  it("parses ounces for meat and maps to deck of cards", () => {
    const grams = parsePortionGrams("3 oz");
    expect(grams).toBeCloseTo(85, 0);
    expect(visualHintFor(grams!, "Chicken thigh")).toMatch(/deck of cards/i);
  });
});
