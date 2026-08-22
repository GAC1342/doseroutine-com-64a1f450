/**
 * Full-coverage unicode fraction regression checks.
 *
 * The parser supports every vulgar fraction glyph a phone keyboard, recipe
 * site, or nutrition label can produce — not just the common halves and
 * quarters. Each glyph must normalize to the same decimal, produce the same
 * grams, and rescale macros identically to its decimal spelling.
 */
import { describe, expect, it } from "vitest";
import { normalizeUnicodeFractions, parsePortionGrams, parseQuantity } from "../portion-units";

const CUP = 240;
const LB = 453.592;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Every glyph the parser understands, with its expected 4-decimal value. */
const GLYPHS: [string, number][] = [
  ["½", 0.5],
  ["⅓", 0.3333],
  ["⅔", 0.6667],
  ["¼", 0.25],
  ["¾", 0.75],
  ["⅕", 0.2],
  ["⅖", 0.4],
  ["⅗", 0.6],
  ["⅘", 0.8],
  ["⅙", 0.1667],
  ["⅚", 0.8333],
  ["⅐", 0.1429],
  ["⅛", 0.125],
  ["⅜", 0.375],
  ["⅝", 0.625],
  ["⅞", 0.875],
  ["⅑", 0.1111],
  ["⅒", 0.1],
];

describe("normalizeUnicodeFractions covers every glyph", () => {
  for (const [glyph, value] of GLYPHS) {
    it(`"${glyph}" -> ${value}`, () => {
      expect(normalizeUnicodeFractions(`${glyph} cup`)).toBe(`${value} cup`);
    });
  }

  it("normalizes ↉ (zero thirds) to 0", () => {
    expect(normalizeUnicodeFractions("↉ cup")).toBe("0 cup");
  });
});

describe("mixed whole + glyph forms", () => {
  for (const [glyph, value] of GLYPHS) {
    it(`"2${glyph}" adds the whole number`, () => {
      const expected = Math.round((2 + value) * 10000) / 10000;
      expect(parseQuantity(`2${glyph}`)).toBeCloseTo(expected, 4);
      expect(parseQuantity(`2 ${glyph}`)).toBeCloseTo(expected, 4);
    });
  }

  it("handles mixed imperial weights", () => {
    expect(parsePortionGrams("1 ⅛ lb")).toBe(round1(1.125 * LB));
    expect(parsePortionGrams("1 ⅕ lb")).toBe(round1(1.2 * LB));
  });
});

describe("grams match the decimal spelling", () => {
  for (const [glyph, value] of GLYPHS) {
    it(`"${glyph} cup" equals "${value} cup"`, () => {
      const fromGlyph = parsePortionGrams(`${glyph} cup`);
      const fromDecimal = parsePortionGrams(`${value} cup`);
      expect(fromGlyph).not.toBeNull();
      expect(fromGlyph).toBe(fromDecimal);
      expect(fromGlyph).toBe(round1(value * CUP));
    });

    it(`"${glyph} lb" equals "${value} lb"`, () => {
      expect(parsePortionGrams(`${glyph} lb`)).toBe(parsePortionGrams(`${value} lb`));
    });
  }
});

describe("alternate input shapes", () => {
  it("fraction slash parses like the glyph", () => {
    expect(parsePortionGrams("1⁄5 cup")).toBe(parsePortionGrams("⅕ cup"));
    expect(parsePortionGrams("1⁄8 cup")).toBe(parsePortionGrams("⅛ cup"));
  });

  it("no space before the unit still parses", () => {
    for (const [glyph, value] of GLYPHS) {
      expect(parsePortionGrams(`${glyph}cup`)).toBe(round1(value * CUP));
    }
  });

  it("extra whitespace is normalized", () => {
    expect(parsePortionGrams("  ⅔   cup ")).toBe(parsePortionGrams("⅔ cup"));
  });

  it("tsp and tbsp accept the rarer glyphs", () => {
    expect(parsePortionGrams("⅕ tsp")).toBe(parsePortionGrams("0.2 tsp"));
    expect(parsePortionGrams("⅐ tbsp")).toBe(parsePortionGrams("0.1429 tbsp"));
  });
});

describe("macro rescaling stays consistent", () => {
  const macrosPer100 = { kcal: 250, protein: 12, carbs: 30, fat: 8 };
  const scale = (portion: string) => {
    const grams = parsePortionGrams(portion);
    if (grams == null) return null;
    const f = grams / 100;
    return {
      kcal: Math.round(macrosPer100.kcal * f),
      protein: Math.round(macrosPer100.protein * f * 10) / 10,
      carbs: Math.round(macrosPer100.carbs * f * 10) / 10,
      fat: Math.round(macrosPer100.fat * f * 10) / 10,
    };
  };

  for (const [glyph, value] of GLYPHS) {
    it(`"${glyph} cup" rescales like "${value} cup"`, () => {
      expect(scale(`${glyph} cup`)).toEqual(scale(`${value} cup`));
    });
  }
});
