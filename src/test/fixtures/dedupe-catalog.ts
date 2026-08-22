/**
 * Deterministic USDA-shaped catalog generator for dedupe tests.
 *
 * Produces realistic-looking food rows (brand + descriptor + qualifier names,
 * plausible macros, some GTINs, some aliases) without any randomness, so a
 * performance run measures the same work on every machine.
 */
import type { DedupeFood } from "@/lib/food-dedupe";

const BASES = [
  { name: "Chicken breast", kcal: 120, protein: 22.5, carbs: 0, fat: 2.6 },
  { name: "Brown rice", kcal: 123, protein: 2.74, carbs: 25.6, fat: 0.97 },
  { name: "Cheddar cheese", kcal: 403, protein: 22.9, carbs: 3.1, fat: 33.1 },
  { name: "Broccoli", kcal: 34, protein: 2.82, carbs: 6.64, fat: 0.37 },
  { name: "Greek yogurt, plain", kcal: 59, protein: 10.2, carbs: 3.6, fat: 0.4 },
  { name: "Almonds", kcal: 579, protein: 21.2, carbs: 21.6, fat: 49.9 },
  { name: "Salmon, atlantic", kcal: 208, protein: 20.4, carbs: 0, fat: 13.4 },
  { name: "Sweet potato", kcal: 86, protein: 1.6, carbs: 20.1, fat: 0.05 },
  { name: "Whole wheat bread", kcal: 247, protein: 13, carbs: 41, fat: 3.4 },
  { name: "Olive oil", kcal: 884, protein: 0, carbs: 0, fat: 100 },
  { name: "Black beans", kcal: 132, protein: 8.9, carbs: 23.7, fat: 0.54 },
  { name: "Whey protein powder", kcal: 375, protein: 75, carbs: 10, fat: 5 },
];

const QUALIFIERS = ["raw", "cooked", "roasted", "grilled", "canned", "frozen", "dried"];
const BRANDS = [
  null,
  "Kirkland Signature",
  "Great Value",
  "Trader Joe's",
  "Nature's Own",
  "Store Brand",
];

/** A pseudo-random but fully deterministic integer stream. */
function step(seed: number, mod: number): number {
  // xorshift-ish mix, kept in 32-bit space
  let x = seed + 0x9e3779b9;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return Math.abs(x) % mod;
}

/** Build `count` deterministic catalog rows shaped like imported USDA foods. */
export function makeDedupeCatalog(count: number): DedupeFood[] {
  const foods: DedupeFood[] = [];
  for (let i = 0; i < count; i += 1) {
    const base = BASES[i % BASES.length]!;
    const qualifier = QUALIFIERS[step(i, QUALIFIERS.length)]!;
    const brand = BRANDS[step(i * 7, BRANDS.length)]!;
    // Small deterministic macro jitter so most pairs differ but neighbours
    // occasionally land inside the tolerance window.
    const jitter = (step(i * 13, 9) - 4) / 100;
    const scale = 1 + jitter;
    foods.push({
      id: `food-${i}`,
      name: `${base.name}, ${qualifier}${brand ? ` (${brand})` : ""} lot ${i % 97}`,
      brand,
      gtin: i % 11 === 0 ? String(70000000000 + i) : null,
      kcal100: Math.round(base.kcal * scale * 10) / 10,
      protein100: Math.round(base.protein * scale * 10) / 10,
      carbs100: Math.round(base.carbs * scale * 10) / 10,
      fat100: Math.round(base.fat * scale * 10) / 10,
      aliases: i % 5 === 0 ? [`${base.name} alt ${i % 13}`] : undefined,
    });
  }
  return foods;
}

/** An incoming food that is a near-duplicate of catalog entry `index`. */
export function makeIncomingNearDuplicate(catalog: DedupeFood[], index: number): DedupeFood {
  const target = catalog[index % catalog.length]!;
  return {
    ...target,
    id: undefined,
    name: `${target.name} `.replace(",", " ,"),
    kcal100: target.kcal100 + 1,
  };
}
