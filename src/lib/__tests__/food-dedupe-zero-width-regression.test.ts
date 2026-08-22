/**
 * Regression test: invisible characters must never split a word.
 *
 * Copy/paste from spreadsheets, PDFs and some label scanners sprinkles
 * zero-width spaces, joiners, soft hyphens, the byte-order mark and
 * directional marks into food names. If those survive normalization, a name
 * like "chi\u200bcken" tokenizes as "chi" + "cken" and an obvious duplicate is
 * missed. If they were instead treated as letters, unrelated names could look
 * closer than they are.
 *
 * `foldName` deletes invisible formatting characters outright and turns real
 * control characters into whitespace. Broad property coverage lives in
 * food-dedupe-fuzz.test.ts; this file pins the specific spellings so the bug
 * cannot come back silently.
 */
import { describe, expect, it } from "vitest";
import {
  classifyDuplicate,
  foldName,
  normalizeTokens,
  tokenOverlap,
  type DedupeFood,
} from "@/lib/food-dedupe";

const CLEAN = "chicken breast";

/** Invisible characters that must vanish without leaving a boundary behind. */
const INVISIBLE: Array<[string, string]> = [
  ["zero-width space", "\u200b"],
  ["zero-width non-joiner", "\u200c"],
  ["zero-width joiner", "\u200d"],
  ["left-to-right mark", "\u200e"],
  ["right-to-left mark", "\u200f"],
  ["soft hyphen", "\u00ad"],
  ["word joiner", "\u2060"],
  ["byte-order mark", "\ufeff"],
  ["Mongolian vowel separator", "\u180e"],
  ["left-to-right embedding", "\u202a"],
  ["pop directional formatting", "\u202c"],
];

function food(name: string, extra: Partial<DedupeFood> = {}): DedupeFood {
  return { name, kcal100: 165, protein100: 31, carbs100: 0, fat100: 3.6, ...extra };
}

describe("regression: zero-width characters inside a word", () => {
  it.each(INVISIBLE)("%s in the middle of a word folds away", (_label, char) => {
    const dirty = `chi${char}cken breast`;
    expect(dirty).not.toBe(CLEAN); // the fixture really is different
    expect(foldName(dirty)).toBe(CLEAN);
    expect(normalizeTokens(dirty)).toEqual(["chicken", "breast"]);
    expect(tokenOverlap(dirty, CLEAN)).toBe(1);
  });

  it.each(INVISIBLE)("%s around and between words folds away", (_label, char) => {
    const dirty = `${char}chicken${char} ${char}breast${char}`;
    expect(normalizeTokens(dirty)).toEqual(["chicken", "breast"]);
  });

  it("a run of several different invisible characters still collapses", () => {
    const dirty = "\ufeffchi\u200b\u200d\u00adcken\u2060 bre\u200cast\u200e";
    expect(foldName(dirty)).toBe(CLEAN);
    expect(normalizeTokens(dirty)).toEqual(["chicken", "breast"]);
  });

  it("real control characters separate words instead of joining them", () => {
    // A tab/newline-class control is a genuine boundary, unlike a ZWSP.
    expect(normalizeTokens("chicken\u0001breast")).toEqual(["chicken", "breast"]);
  });

  it("does not merge unrelated names just because invisibles were stripped", () => {
    expect(tokenOverlap("chi\u200bcken breast", "salmon fillet")).toBe(0);
    expect(classifyDuplicate(food("chi\u200bcken breast"), food("salmon fillet")).verdict).toBe(
      "none",
    );
  });
});

describe("regression: invisible characters combined with NFC/NFD accents", () => {
  const NFC = "cr\u00e8me fra\u00eeche"; // composed
  const NFD = "cre\u0300me frai\u0302che"; // decomposed

  it("a zero-width space next to a composed accent still folds to ASCII", () => {
    expect(foldName(`cr\u200b\u00e8me fra\u00eeche`)).toBe("creme fraiche");
  });

  it("a zero-width space between a letter and its combining mark folds cleanly", () => {
    // Worst case: the invisible char sits *inside* the decomposed pair.
    expect(foldName("cre\u200b\u0300me frai\u0302che")).toBe("creme fraiche");
    expect(normalizeTokens("cre\u200b\u0300me frai\u0302che")).toEqual(["creme", "fraiche"]);
  });

  it("NFC, NFD and invisible-laced spellings all match each other", () => {
    const dirtyNfc = `\ufeffcr\u00e8me\u200b fra\u00eeche`;
    const dirtyNfd = `cre\u0300\u00adme frai\u0302\u200dche`;
    expect(foldName(dirtyNfc)).toBe(foldName(NFC));
    expect(foldName(dirtyNfd)).toBe(foldName(NFD));
    expect(tokenOverlap(dirtyNfc, dirtyNfd)).toBe(1);
  });

  it("catalog rows differing only by invisibles are flagged as duplicates", () => {
    const { verdict } = classifyDuplicate(
      food("chi\u200bcken bre\u00adast, raw"),
      food("chicken breast, raw"),
    );
    expect(verdict).not.toBe("none");
  });

  it("invisible characters cannot hide a qualifier conflict", () => {
    // "raw" vs "cooked" must still block a merge even with noisy spellings.
    expect(
      classifyDuplicate(food("chi\u200bcken breast, raw"), food("chicken\ufeff breast, cooked"))
        .verdict,
    ).toBe("none");
  });
});
