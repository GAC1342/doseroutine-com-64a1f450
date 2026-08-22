/**
 * Regression + fuzz coverage for Greek accents (tonos, dialytika) and final
 * sigma.
 *
 * Greek names arrive from label scans and EU product feeds in three shapes:
 * composed (NFC, "ά" = U+03AC), decomposed (NFD, "α" + U+0301) and the
 * unaccented spelling used by many databases ("α"). All three must fold to the
 * same value, and — critically — accent stripping must never split a word:
 * "γιαούρτι" has to stay one token, not "για" + "ρτι".
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

const NFC_YOGURT = "\u0393\u03b9\u03b1\u03bf\u03cd\u03c1\u03c4\u03b9"; // Γιαούρτι
const NFD_YOGURT = "\u0393\u03b9\u03b1\u03bf\u03c5\u0301\u03c1\u03c4\u03b9"; // decomposed
const PLAIN_YOGURT = "\u03b3\u03b9\u03b1\u03bf\u03c5\u03c1\u03c4\u03b9"; // γιαουρτι

const NFC_STRAINED = "\u03c3\u03c4\u03c1\u03b1\u03b3\u03b3\u03b9\u03c3\u03c4\u03cc"; // στραγγιστό
const NFD_STRAINED = "\u03c3\u03c4\u03c1\u03b1\u03b3\u03b3\u03b9\u03c3\u03c4\u03bf\u0301";

function food(name: string, extra: Partial<DedupeFood> = {}): DedupeFood {
  return { name, kcal100: 59, protein100: 10, carbs100: 3.6, fat100: 0.4, ...extra };
}

describe("regression: Greek tonos must not corrupt word boundaries", () => {
  it("the NFC and NFD fixtures really are different strings", () => {
    expect(NFC_YOGURT).not.toBe(NFD_YOGURT);
    expect(NFC_YOGURT.normalize("NFD")).toBe(NFD_YOGURT.normalize("NFD"));
  });

  it("folds composed, decomposed and unaccented spellings to one value", () => {
    expect(foldName(NFC_YOGURT)).toBe(PLAIN_YOGURT);
    expect(foldName(NFD_YOGURT)).toBe(PLAIN_YOGURT);
    expect(foldName(PLAIN_YOGURT)).toBe(PLAIN_YOGURT);
  });

  it("keeps an accented Greek word as a single token", () => {
    for (const spelling of [NFC_YOGURT, NFD_YOGURT, PLAIN_YOGURT]) {
      expect(normalizeTokens(spelling)).toEqual([PLAIN_YOGURT]);
    }
  });

  it("preserves real word boundaries between accented words", () => {
    expect(normalizeTokens(`${NFC_YOGURT} ${NFC_STRAINED} 10%`)).toEqual([
      PLAIN_YOGURT,
      foldName(NFC_STRAINED),
      "10",
    ]);
    expect(normalizeTokens(`${NFD_YOGURT} ${NFD_STRAINED} 10%`)).toEqual(
      normalizeTokens(`${NFC_YOGURT} ${NFC_STRAINED} 10%`),
    );
  });

  it("folds final sigma to sigma so positional spelling never splits a match", () => {
    expect(foldName("\u03a3\u03c4\u03c1\u03b1\u03b3\u03b3\u03b9\u03c3\u03c4\u03cc\u03c2")).toBe(
      foldName("\u03c3\u03c4\u03c1\u03b1\u03b3\u03b3\u03b9\u03c3\u03c4\u03bf\u0301\u03c3"),
    );
  });

  it("drops standalone tonos / dialytika marks instead of splitting words", () => {
    // U+0384 GREEK TONOS is not a combining mark, so NFD leaves it in place.
    expect(normalizeTokens("\u03b3\u03b9\u03b1\u0384\u03bf\u03c5\u03c1\u03c4\u03b9")).toEqual([
      PLAIN_YOGURT,
    ]);
  });

  it("treats accented and unaccented catalog rows as the same product", () => {
    const { verdict } = classifyDuplicate(
      food(`${NFC_YOGURT} ${NFC_STRAINED}`),
      food(`${PLAIN_YOGURT} ${foldName(NFC_STRAINED)}`),
    );
    expect(verdict).not.toBe("none");
  });

  it("still separates genuinely different Greek products", () => {
    // "τυρί" (cheese) shares no tokens with "γιαούρτι" (yogurt).
    expect(tokenOverlap(NFC_YOGURT, "\u03c4\u03c5\u03c1\u03af \u03c6\u03ad\u03c4\u03b1")).toBe(0);
  });
});

/* ------------------------------------------------------------------ fuzz -- */

const GREEK_BASE = "\u03b1\u03b5\u03b7\u03b9\u03bf\u03c5\u03c9".split(""); // α ε η ι ο υ ω
const ACCENTED: Record<string, string> = {
  "\u03b1": "\u03ac",
  "\u03b5": "\u03ad",
  "\u03b7": "\u03ae",
  "\u03b9": "\u03af",
  "\u03bf": "\u03cc",
  "\u03c5": "\u03cd",
  "\u03c9": "\u03ce",
};
const CONSONANTS = "\u03b2\u03b3\u03b4\u03ba\u03bb\u03bc\u03bd\u03c0\u03c1\u03c3\u03c4".split("");

/** A random Greek word of 3-8 letters, with vowels optionally accented. */
const greekWord = fc
  .array(
    fc.oneof(
      fc.constantFrom(...CONSONANTS),
      fc.constantFrom(...GREEK_BASE).map((v) => v),
    ),
    { minLength: 3, maxLength: 8 },
  )
  .chain((letters) =>
    fc
      .array(fc.boolean(), { minLength: letters.length, maxLength: letters.length })
      .map((accents) =>
        letters
          .map((letter, i) => (accents[i] && ACCENTED[letter] ? ACCENTED[letter] : letter))
          .join(""),
      ),
  );

const greekName = fc
  .array(greekWord, { minLength: 1, maxLength: 3 })
  .map((words) => words.join(" "));

describe("fuzz: Greek normalization is boundary-safe", () => {
  it("NFC and NFD spellings always fold identically", () => {
    fc.assert(
      fc.property(greekName, (name) => {
        expect(foldName(name.normalize("NFC"))).toBe(foldName(name.normalize("NFD")));
      }),
      { numRuns: 300 },
    );
  });

  it("accent stripping never changes the number of words", () => {
    fc.assert(
      fc.property(greekName, (name) => {
        const words = name.split(" ").filter((w) => w.length > 1).length;
        expect(normalizeTokens(name).length).toBe(words);
        expect(normalizeTokens(name.normalize("NFD")).length).toBe(words);
      }),
      { numRuns: 300 },
    );
  });

  it("tokens keep their letter count after folding", () => {
    fc.assert(
      fc.property(greekWord, (word) => {
        const [token] = normalizeTokens(word);
        expect(token).toBeDefined();
        expect(token!.length).toBe(word.normalize("NFC").length);
      }),
      { numRuns: 300 },
    );
  });

  it("a name always fully matches its own decomposed and unaccented forms", () => {
    fc.assert(
      fc.property(greekName, (name) => {
        expect(tokenOverlap(name, name.normalize("NFD"))).toBe(1);
        const stripped = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        expect(tokenOverlap(name, stripped)).toBe(1);
      }),
      { numRuns: 300 },
    );
  });

  it("uppercase and final-sigma variants never break a match", () => {
    fc.assert(
      fc.property(greekName, (name) => {
        const upper = name.toUpperCase();
        const finalSigma = name.replace(/\u03c3\b/g, "\u03c2");
        expect(tokenOverlap(name, upper)).toBe(1);
        expect(tokenOverlap(name, finalSigma)).toBe(1);
      }),
      { numRuns: 300 },
    );
  });
});
