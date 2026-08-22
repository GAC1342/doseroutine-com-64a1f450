/**
 * Regression + fuzz coverage for the Turkish dotted/dotless I.
 *
 * Turkish has four I letters: I/ı (dotless) and İ/i (dotted). Two things break
 * naive normalization:
 *
 *  - "İ" (U+0130) decomposes under NFD to "I" + COMBINING DOT ABOVE. If the
 *    combining mark were replaced by a space, "İzmir" would shred into "zmir";
 *    if the string were lowercased *before* decomposing, JavaScript would emit
 *    "i" + U+0307 and leave a stray mark behind.
 *  - "ı" (U+0131) is its own letter, so plain lowercasing leaves "kırmızı" and
 *    "kirmizi" as different strings and an obvious duplicate is missed.
 *
 * `foldName` decomposes first, strips combining marks, then folds dotless ı to
 * i. These tests pin that behavior and prove word boundaries never move.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  classifyDuplicate,
  foldName,
  normalizeTokens,
  tokenOverlap,
  type DedupeFood,
} from "@/lib/food-dedupe";

const DOTTED_CAP = "\u0130"; // İ
const DOTLESS_LOW = "\u0131"; // ı
const DOTTED_NFD = "I\u0307"; // I + combining dot above

function food(name: string, extra: Partial<DedupeFood> = {}): DedupeFood {
  return { name, kcal100: 120, protein100: 4, carbs100: 18, fat100: 3, ...extra };
}

describe("regression: Turkish dotted/dotless I", () => {
  it("the composed and decomposed İ really are different strings", () => {
    expect(DOTTED_CAP).not.toBe(DOTTED_NFD);
    expect(DOTTED_CAP.normalize("NFD")).toBe(DOTTED_NFD);
  });

  it("folds dotted capital İ to plain i in both NFC and NFD", () => {
    expect(foldName(`${DOTTED_CAP}zmir`)).toBe("izmir");
    expect(foldName(`${DOTTED_NFD}zmir`)).toBe("izmir");
    expect(foldName("izmir")).toBe("izmir");
  });

  it("never leaves a stray combining dot behind", () => {
    expect(foldName(`${DOTTED_CAP}rmik`)).not.toContain("\u0307");
    expect(foldName(`${DOTTED_CAP}rmik`.toLowerCase())).toBe("irmik");
  });

  it("folds dotless ı to i so both spellings match", () => {
    expect(foldName(`k${DOTLESS_LOW}rm${DOTLESS_LOW}z${DOTLESS_LOW}`)).toBe("kirmizi");
    expect(foldName("KIRMIZI")).toBe("kirmizi");
    expect(foldName("kirmizi")).toBe("kirmizi");
  });

  it("keeps an İ/ı word as a single token", () => {
    for (const spelling of [`${DOTTED_CAP}zmir`, `${DOTTED_NFD}zmir`, "izmir", "IZMIR"]) {
      expect(normalizeTokens(spelling)).toEqual(["izmir"]);
    }
  });

  it("preserves word boundaries in a multi-word Turkish name", () => {
    const dotted = `${DOTTED_CAP}zmir k${DOTLESS_LOW}rm${DOTLESS_LOW}z${DOTLESS_LOW} biber`;
    const plain = "izmir kirmizi biber";
    expect(normalizeTokens(dotted)).toEqual(["izmir", "kirmizi", "biber"]);
    expect(normalizeTokens(dotted.normalize("NFD"))).toEqual(normalizeTokens(plain));
  });

  it("folds the other Turkish diacritics (ğ ş ç ö ü) without splitting words", () => {
    expect(foldName("yo\u011furt")).toBe("yogurt"); // yoğurt
    expect(normalizeTokens("\u015eeker\u00e7ubu\u011fu")).toEqual(["sekercubugu"]);
    expect(normalizeTokens("s\u00fct\u00f6z\u00fc")).toEqual(["sutozu"]);
  });

  it("treats dotted/dotless catalog rows as the same product", () => {
    const { verdict } = classifyDuplicate(
      food(`${DOTTED_CAP}zmir k${DOTLESS_LOW}rm${DOTLESS_LOW}z${DOTLESS_LOW} biber`),
      food("izmir kirmizi biber"),
    );
    expect(verdict).not.toBe("none");
  });

  it("still separates genuinely different Turkish products", () => {
    expect(
      tokenOverlap(`k${DOTLESS_LOW}rm${DOTLESS_LOW}z${DOTLESS_LOW} biber`, "beyaz peynir"),
    ).toBe(0);
    expect(classifyDuplicate(food(`${DOTTED_CAP}zmir biber`), food("beyaz peynir")).verdict).toBe(
      "none",
    );
  });

  it("does not let an İ spelling hide a preparation conflict", () => {
    expect(
      classifyDuplicate(food(`${DOTTED_CAP}zmir biber, raw`), food("izmir biber, cooked")).verdict,
    ).toBe("none");
  });
});

/* ------------------------------------------------------------------ fuzz -- */

const TURKISH_LETTERS = [
  "a",
  "b",
  "c",
  "\u00e7", // ç
  "d",
  "e",
  "g",
  "\u011f", // ğ
  "i",
  DOTLESS_LOW, // ı
  "k",
  "l",
  "m",
  "n",
  "o",
  "\u00f6", // ö
  "p",
  "r",
  "s",
  "\u015f", // ş
  "t",
  "u",
  "\u00fc", // ü
  "y",
  "z",
];

const turkishWord = fc
  .array(fc.constantFrom(...TURKISH_LETTERS), { minLength: 3, maxLength: 9 })
  .map((letters) => letters.join(""));

const turkishName = fc
  .array(turkishWord, { minLength: 1, maxLength: 3 })
  .map((words) => words.join(" "));

/** Uppercase the Turkish way: i -> İ and ı -> I. */
function turkishUpper(value: string): string {
  return value.replace(/i/g, DOTTED_CAP).replace(new RegExp(DOTLESS_LOW, "g"), "I").toUpperCase();
}

describe("fuzz: Turkish I folding is boundary-safe", () => {
  it("NFC and NFD spellings always fold identically", () => {
    fc.assert(
      fc.property(turkishName, (name) => {
        expect(foldName(name.normalize("NFC"))).toBe(foldName(name.normalize("NFD")));
      }),
      { numRuns: 300 },
    );
  });

  it("Turkish-style uppercasing never changes the folded value", () => {
    fc.assert(
      fc.property(turkishName, (name) => {
        expect(foldName(turkishUpper(name))).toBe(foldName(name));
        expect(tokenOverlap(name, turkishUpper(name))).toBe(1);
      }),
      { numRuns: 300 },
    );
  });

  it("folding never changes the number of words", () => {
    fc.assert(
      fc.property(turkishName, (name) => {
        const words = name.split(" ").length;
        expect(normalizeTokens(name).length).toBe(words);
        expect(normalizeTokens(name.normalize("NFD")).length).toBe(words);
        expect(normalizeTokens(turkishUpper(name)).length).toBe(words);
      }),
      { numRuns: 300 },
    );
  });

  it("every folded token is plain ASCII of the same length", () => {
    fc.assert(
      fc.property(turkishWord, (word) => {
        const [token] = normalizeTokens(word);
        expect(token).toBeDefined();
        expect(token!).toMatch(/^[a-z]+$/);
        expect(token!.length).toBe(word.length);
      }),
      { numRuns: 300 },
    );
  });

  it("dotless and dotted spellings of one name always fully match", () => {
    fc.assert(
      fc.property(turkishName, (name) => {
        const dotless = name.replace(/i/g, DOTLESS_LOW);
        const dotted = name.replace(new RegExp(DOTLESS_LOW, "g"), "i");
        expect(tokenOverlap(dotless, dotted)).toBe(1);
        expect(foldName(dotless)).toBe(foldName(dotted));
      }),
      { numRuns: 300 },
    );
  });
});
