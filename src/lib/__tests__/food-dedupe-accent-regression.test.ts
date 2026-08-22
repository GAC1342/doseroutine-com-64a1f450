/**
 * Regression test: decomposed (NFD) accents used to shred food names.
 *
 * The old normalizer lowercased and then replaced every non-[a-z0-9] character
 * with a space. In NFC, "crème" contains the single code point "è", which was
 * dropped and produced the token "cr" + "me". In NFD the same word is "e" plus
 * a combining grave accent (U+0300), which was ALSO replaced by a space — so
 * the two spellings of one word produced different tokens and the catalog
 * failed to recognize an obvious duplicate.
 *
 * `foldName` now decomposes to NFD and strips the combining marks first, so
 * "crème" (either form) folds to "creme". These cases are intentionally
 * narrow and hard-coded — the broad property coverage lives in
 * food-dedupe-fuzz.test.ts; this file exists so the specific bug can never
 * come back silently.
 */
import { describe, expect, it } from "vitest";
import { classifyDuplicate, foldName, normalizeTokens, type DedupeFood } from "@/lib/food-dedupe";

const NFC_CREME = "cr\u00e8me fra\u00eeche"; // crème fraîche, composed
const NFD_CREME = "cre\u0300me frai\u0302che"; // same word, decomposed
const ASCII_CREME = "creme fraiche";

function food(name: string, extra: Partial<DedupeFood> = {}): DedupeFood {
  return { name, kcal100: 340, protein100: 2.2, carbs100: 3.4, fat100: 36, ...extra };
}

describe("regression: decomposed accents must not shred tokens", () => {
  it("the NFC and NFD spellings really are different strings", () => {
    // Guards the fixtures themselves: if these ever became equal, the test
    // below would pass for the wrong reason.
    expect(NFC_CREME).not.toBe(NFD_CREME);
    expect(NFC_CREME.normalize("NFD")).toBe(NFD_CREME.normalize("NFD"));
  });

  it('folds "crème" to "creme" instead of splitting it into cr + me', () => {
    expect(foldName(NFC_CREME)).toBe(ASCII_CREME);
    expect(foldName(NFD_CREME)).toBe(ASCII_CREME);
  });

  it("tokenizes all three spellings identically", () => {
    const expected = ["creme", "fraiche"];
    expect(normalizeTokens(NFC_CREME)).toEqual(expected);
    expect(normalizeTokens(NFD_CREME)).toEqual(expected);
    expect(normalizeTokens(ASCII_CREME)).toEqual(expected);
  });

  it("never emits the broken cr/me fragments", () => {
    for (const spelling of [NFC_CREME, NFD_CREME]) {
      const tokens = normalizeTokens(spelling);
      expect(tokens).not.toContain("cr");
      expect(tokens).not.toContain("me");
    }
  });

  it("matches crème fraîche across NFC, NFD and ASCII catalog rows", () => {
    expect(classifyDuplicate(food(NFC_CREME), food(NFD_CREME)).verdict).toBe("exact");
    expect(classifyDuplicate(food(NFC_CREME), food(ASCII_CREME)).verdict).toBe("exact");
    expect(classifyDuplicate(food(NFD_CREME), food(ASCII_CREME)).verdict).toBe("exact");
  });

  it("still blocks a merge when the accented pair disagrees on preparation", () => {
    const a = food(`${NFC_CREME} whole`);
    const b = food(`${NFD_CREME} light`);
    expect(classifyDuplicate(a, b).verdict).toBe("none");
  });

  it("handles other decomposed catalog names the same way", () => {
    const pairs: [string, string][] = [
      ["jalape\u00f1o", "jalapen\u0303o"],
      ["a\u00e7a\u00ed", "ac\u0327ai\u0301"],
      ["gruy\u00e8re", "gruye\u0300re"],
      ["pur\u00e9e", "pure\u0301e"],
    ];
    for (const [nfc, nfd] of pairs) {
      expect(foldName(nfd)).toBe(foldName(nfc));
      expect(normalizeTokens(nfd)).toEqual(normalizeTokens(nfc));
      expect(normalizeTokens(nfc).length).toBe(1);
    }
  });
});
