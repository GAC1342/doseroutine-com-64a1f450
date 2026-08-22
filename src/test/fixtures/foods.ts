/**
 * Shared food + portion fixtures for meal tests.
 *
 * Every food is stored per 100 g and scaled by the builders, so any gram amount
 * a test asks for is exact and identical across test files. Add a food here
 * once and every regression test can cover it without re-typing macros.
 *
 * Test-only module: nothing under src/ imports it.
 */
import type { FoodDataSource, MealItem } from "@/lib/meal-nutrition";
import type { PortionCueClass } from "@/lib/portion-units";

export type FoodFixture = {
  /** Stable id used as MealItem.foodId and as the portions query key. */
  id: string;
  /** Label shown in the item row. */
  name: string;
  /** Catalog entry the numbers were matched to. */
  sourceName: string;
  dataSource: FoodDataSource;
  /** Per 100 g. */
  per100: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    satfat_g?: number;
  };
  /** Household chips this food offers in the portion picker. */
  portions: { label: string; grams: number }[];
  /** Cue class the portion helpers must classify this food as. */
  cueClass: PortionCueClass;
  /** A realistic serving weight, used when a test doesn't name grams. */
  defaultGrams: number;
  /** Cue text expected at defaultGrams, when a cue is close enough to show. */
  cuePattern: RegExp | null;
};

export const FOOD_FIXTURES = {
  chicken: {
    id: "food-chicken",
    name: "Grilled chicken breast",
    sourceName: "Chicken breast, grilled, skinless",
    dataSource: "database",
    per100: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 4, sodium_mg: 74, satfat_g: 1.1 },
    portions: [
      { label: "1 small breast (85 g)", grams: 85 },
      { label: "1 breast (170 g)", grams: 170 },
    ],
    cueClass: "protein",
    defaultGrams: 85,
    cuePattern: /deck of cards|palm/i,
  },
  salmon: {
    id: "food-salmon",
    name: "Salmon fillet",
    sourceName: "Salmon, Atlantic, cooked",
    dataSource: "usda",
    per100: { calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, satfat_g: 3.1 },
    portions: [{ label: "1 fillet (113 g)", grams: 113 }],
    cueClass: "protein",
    defaultGrams: 113,
    cuePattern: /palm|deck of cards/i,
  },
  egg: {
    id: "food-egg",
    name: "Scrambled eggs",
    sourceName: "Egg, whole, scrambled",
    dataSource: "database",
    per100: { calories: 149, protein_g: 10, carbs_g: 1.6, fat_g: 11, satfat_g: 3.3 },
    portions: [{ label: "2 eggs (100 g)", grams: 100 }],
    cueClass: "protein",
    defaultGrams: 100,
    cuePattern: /palm|deck of cards/i,
  },
  broccoli: {
    id: "food-broccoli",
    name: "Steamed broccoli",
    sourceName: "Broccoli, cooked, boiled, drained",
    dataSource: "usda",
    per100: { calories: 35, protein_g: 2.4, carbs_g: 7, fat_g: 0.4, fiber_g: 3.3, sugar_g: 1.4 },
    portions: [
      { label: "1 cup chopped (91 g)", grams: 91 },
      { label: "1 bowl (180 g)", grams: 180 },
    ],
    cueClass: "vegetable",
    defaultGrams: 180,
    cuePattern: /clenched fist|cupped hand/i,
  },
  salad: {
    id: "food-salad",
    name: "Mixed green salad",
    sourceName: "Salad greens, mixed, raw",
    dataSource: "ai",
    per100: { calories: 20, protein_g: 1.5, carbs_g: 3.5, fat_g: 0.2, fiber_g: 1.8 },
    portions: [{ label: "1 bowl (85 g)", grams: 85 }],
    cueClass: "vegetable",
    defaultGrams: 85,
    cuePattern: /clenched fist|cupped hand|tennis ball/i,
  },
  rice: {
    id: "food-rice",
    name: "Brown rice",
    sourceName: "Rice, brown, long-grain, cooked",
    dataSource: "database",
    per100: { calories: 123, protein_g: 2.7, carbs_g: 26, fat_g: 1, fiber_g: 1.6 },
    portions: [
      { label: "1/2 cup (98 g)", grams: 98 },
      { label: "1 cup (195 g)", grams: 195 },
    ],
    cueClass: "grain",
    defaultGrams: 160,
    cuePattern: /cupped hand|tennis ball|clenched fist/i,
  },
  pasta: {
    id: "food-pasta",
    name: "Whole wheat pasta",
    sourceName: "Pasta, whole-wheat, cooked",
    dataSource: "database",
    per100: { calories: 124, protein_g: 5.3, carbs_g: 27, fat_g: 0.5, fiber_g: 3.2 },
    portions: [{ label: "1 cup (140 g)", grams: 140 }],
    cueClass: "grain",
    defaultGrams: 140,
    cuePattern: /cupped hand|tennis ball|clenched fist/i,
  },
  banana: {
    id: "food-banana",
    name: "Banana",
    sourceName: "Banana, raw",
    dataSource: "database",
    per100: { calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, fiber_g: 2.6, sugar_g: 12 },
    portions: [{ label: "1 medium (118 g)", grams: 118 }],
    cueClass: "fruit",
    defaultGrams: 118,
    cuePattern: /baseball|tennis ball|cupped hand/i,
  },
  almonds: {
    id: "food-almonds",
    name: "Almonds",
    sourceName: "Nuts, almonds, raw",
    dataSource: "database",
    per100: { calories: 579, protein_g: 21, carbs_g: 22, fat_g: 50, fiber_g: 12.5, satfat_g: 3.8 },
    portions: [{ label: "1 small handful (28 g)", grams: 28 }],
    cueClass: "nuts",
    defaultGrams: 30,
    cuePattern: /small handful/i,
  },
  oliveOil: {
    id: "food-olive-oil",
    name: "Olive oil",
    sourceName: "Oil, olive, extra virgin",
    dataSource: "database",
    per100: { calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100, satfat_g: 13.8 },
    portions: [{ label: "1 tbsp (14 g)", grams: 14 }],
    cueClass: "fat",
    defaultGrams: 15,
    cuePattern: /thumb tip/i,
  },
  ranch: {
    id: "food-ranch",
    name: "Ranch dressing",
    sourceName: "Salad dressing, ranch",
    dataSource: "barcode",
    per100: { calories: 430, protein_g: 1.3, carbs_g: 6.7, fat_g: 45, sodium_mg: 1040 },
    portions: [{ label: "2 tbsp (30 g)", grams: 30 }],
    cueClass: "sauce",
    defaultGrams: 30,
    cuePattern: /golf ball|thumb/i,
  },
  cheddar: {
    id: "food-cheddar",
    name: "Cheddar cheese",
    sourceName: "Cheese, cheddar",
    dataSource: "barcode",
    per100: { calories: 403, protein_g: 25, carbs_g: 1.3, fat_g: 33, sodium_mg: 621, satfat_g: 21 },
    portions: [{ label: "1 slice (28 g)", grams: 28 }],
    cueClass: "cheese",
    defaultGrams: 30,
    cuePattern: /thumb/i,
  },
  yogurt: {
    id: "food-yogurt",
    name: "Greek yogurt",
    sourceName: "Yogurt, Greek, plain, nonfat",
    dataSource: "database",
    // Kept at the values meal-scale-math has always used: 100 kcal / 170 g.
    per100: {
      calories: 58.8235,
      protein_g: 10,
      carbs_g: 3.5294,
      fat_g: 0,
      sugar_g: 3.2,
      sodium_mg: 36,
    },
    portions: [{ label: "1 container (170 g)", grams: 170 }],
    cueClass: "any",
    defaultGrams: 170,
    cuePattern: null,
  },
  granola: {
    id: "food-granola",
    name: "Granola",
    sourceName: "Granola, plain",
    dataSource: "database",
    per100: {
      calories: 466.6667,
      protein_g: 10,
      carbs_g: 66.6667,
      fat_g: 16.6667,
      fiber_g: 7,
      sugar_g: 20,
    },
    portions: [{ label: "1/4 cup (30 g)", grams: 30 }],
    cueClass: "nuts",
    defaultGrams: 30,
    cuePattern: /small handful|thumb/i,
  },
  // --- Protein ---
  groundBeef: {
    id: "food-ground-beef",
    name: "Ground beef 90/10, cooked",
    sourceName: "Beef, ground, 90% lean, pan-browned",
    dataSource: "usda",
    per100: { calories: 217, protein_g: 26, carbs_g: 0, fat_g: 12, sodium_mg: 78, satfat_g: 4.8 },
    portions: [
      { label: "4 oz", grams: 113 },
      { label: "1 lb", grams: 454 },
      { label: "1 lb 4 oz", grams: 567 },
    ],
    cueClass: "protein",
    defaultGrams: 113,
    cuePattern: /palm|deck of cards/i,
  },
  tuna: {
    id: "food-tuna",
    name: "Canned tuna in water",
    sourceName: "Fish, tuna, light, canned in water, drained",
    dataSource: "barcode",
    per100: { calories: 116, protein_g: 26, carbs_g: 0, fat_g: 0.8, sodium_mg: 247 },
    portions: [
      { label: "1 can drained (142 g)", grams: 142 },
      { label: "½ can (71 g)", grams: 71 },
    ],
    cueClass: "protein",
    defaultGrams: 142,
    cuePattern: null,
  },
  tofu: {
    id: "food-tofu",
    name: "Firm tofu",
    sourceName: "Tofu, firm, prepared with calcium sulfate",
    dataSource: "database",
    per100: { calories: 144, protein_g: 17, carbs_g: 2.8, fat_g: 8.7, fiber_g: 2.3, satfat_g: 1.3 },
    portions: [
      { label: "1/2 block (126 g)", grams: 126 },
      { label: "3/4 cup cubed (126 g)", grams: 126 },
    ],
    cueClass: "protein",
    defaultGrams: 126,
    cuePattern: /palm|deck of cards/i,
  },
  shrimp: {
    id: "food-shrimp",
    name: "Cooked shrimp",
    sourceName: "Crustaceans, shrimp, cooked, moist heat",
    dataSource: "usda",
    per100: { calories: 99, protein_g: 24, carbs_g: 0.2, fat_g: 0.3, sodium_mg: 111 },
    portions: [
      { label: "4 oz", grams: 113 },
      { label: "6 large (43 g)", grams: 43 },
    ],
    cueClass: "protein",
    defaultGrams: 113,
    cuePattern: /palm|deck of cards/i,
  },
  chickenThigh: {
    id: "food-chicken-thigh",
    name: "Rotisserie chicken thigh",
    sourceName: "Chicken, thigh, roasted, skin eaten",
    dataSource: "ai",
    per100: { calories: 232, protein_g: 24, carbs_g: 0, fat_g: 15, sodium_mg: 320, satfat_g: 4.2 },
    portions: [{ label: "1 thigh (95 g)", grams: 95 }],
    cueClass: "protein",
    defaultGrams: 95,
    cuePattern: /palm|deck of cards/i,
  },

  // --- Grains and starches ---
  bakedPotato: {
    id: "food-baked-potato",
    name: "Baked potato with skin",
    sourceName: "Potatoes, baked, flesh and skin",
    dataSource: "usda",
    per100: { calories: 93, protein_g: 2.5, carbs_g: 21, fat_g: 0.1, fiber_g: 2.2, sugar_g: 1.2 },
    portions: [
      { label: "1 medium (173 g)", grams: 173 },
      { label: "1 large (299 g)", grams: 299 },
    ],
    cueClass: "grain",
    defaultGrams: 173,
    cuePattern: /clenched fist|tennis ball|cupped hand/i,
  },
  quinoa: {
    id: "food-quinoa",
    name: "Cooked quinoa",
    sourceName: "Quinoa, cooked",
    dataSource: "database",
    per100: { calories: 120, protein_g: 4.4, carbs_g: 21, fat_g: 1.9, fiber_g: 2.8 },
    portions: [
      { label: "½ cup (93 g)", grams: 93 },
      { label: "1 cup (185 g)", grams: 185 },
    ],
    cueClass: "grain",
    defaultGrams: 185,
    cuePattern: /clenched fist|cupped hand|tennis ball/i,
  },
  blackBeans: {
    id: "food-black-beans",
    name: "Black beans, canned",
    sourceName: "Beans, black, mature seeds, canned, drained",
    dataSource: "barcode",
    per100: { calories: 91, protein_g: 6, carbs_g: 16, fat_g: 0.3, fiber_g: 6.4, sodium_mg: 240 },
    portions: [
      { label: "1/3 cup (80 g)", grams: 80 },
      { label: "1 cup (240 g)", grams: 240 },
    ],
    cueClass: "grain",
    defaultGrams: 130,
    cuePattern: /cupped hand|tennis ball|clenched fist/i,
  },
  bread: {
    id: "food-bread",
    name: "Whole grain bread",
    sourceName: "Bread, whole-wheat, commercially prepared",
    dataSource: "barcode",
    per100: { calories: 254, protein_g: 13, carbs_g: 43, fat_g: 3.5, fiber_g: 6, sodium_mg: 450 },
    portions: [
      { label: "1 slice (43 g)", grams: 43 },
      { label: "2 slices (86 g)", grams: 86 },
    ],
    cueClass: "grain",
    defaultGrams: 43,
    cuePattern: null,
  },
  oatmeal: {
    id: "food-oatmeal",
    name: "Cooked oatmeal",
    sourceName: "Oats, regular, cooked with water",
    dataSource: "database",
    per100: { calories: 71, protein_g: 2.5, carbs_g: 12, fat_g: 1.5, fiber_g: 1.7 },
    portions: [
      { label: "1 cup (234 g)", grams: 234 },
      { label: "1 big bowl (400 g)", grams: 400 },
    ],
    cueClass: "grain",
    defaultGrams: 234,
    cuePattern: null,
  },

  // --- Vegetables and fruit ---
  spinach: {
    id: "food-spinach",
    name: "Raw spinach",
    sourceName: "Spinach, raw",
    dataSource: "usda",
    per100: { calories: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, fiber_g: 2.2, sodium_mg: 79 },
    portions: [
      { label: "1 cup (30 g)", grams: 30 },
      { label: "3 cups (90 g)", grams: 90 },
    ],
    cueClass: "vegetable",
    defaultGrams: 90,
    cuePattern: /clenched fist|cupped hand|tennis ball/i,
  },
  babyCarrots: {
    id: "food-baby-carrots",
    name: "Baby carrot sticks",
    sourceName: "Carrots, baby, raw",
    dataSource: "database",
    per100: { calories: 35, protein_g: 0.6, carbs_g: 8.2, fat_g: 0.1, fiber_g: 2.9, sugar_g: 4.8 },
    portions: [{ label: "10 carrots (85 g)", grams: 85 }],
    cueClass: "vegetable",
    defaultGrams: 85,
    cuePattern: /clenched fist|cupped hand|tennis ball/i,
  },
  apple: {
    id: "food-apple",
    name: "Apple with skin",
    sourceName: "Apples, raw, with skin",
    dataSource: "database",
    per100: { calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2, fiber_g: 2.4, sugar_g: 10.4 },
    portions: [
      { label: "1 medium (182 g)", grams: 182 },
      { label: "½ apple (91 g)", grams: 91 },
    ],
    cueClass: "fruit",
    defaultGrams: 182,
    cuePattern: /baseball|tennis ball|cupped hand/i,
  },
  blueberries: {
    id: "food-blueberries",
    name: "Blueberries",
    sourceName: "Blueberries, raw",
    dataSource: "usda",
    per100: { calories: 57, protein_g: 0.7, carbs_g: 14.5, fat_g: 0.3, fiber_g: 2.4, sugar_g: 10 },
    portions: [
      { label: "¼ cup (37 g)", grams: 37 },
      { label: "1 cup (148 g)", grams: 148 },
    ],
    // "blueberries" does not hit the fruit word list, so it stays unclassified.
    cueClass: "any",
    defaultGrams: 148,
    cuePattern: null,
  },
  avocado: {
    id: "food-avocado",
    name: "Avocado",
    sourceName: "Avocados, raw, all commercial varieties",
    dataSource: "database",
    per100: { calories: 160, protein_g: 2, carbs_g: 8.5, fat_g: 14.7, fiber_g: 6.7, satfat_g: 2.1 },
    portions: [
      { label: "1/2 avocado (68 g)", grams: 68 },
      { label: "1 whole (136 g)", grams: 136 },
    ],
    cueClass: "any",
    defaultGrams: 68,
    cuePattern: null,
  },

  // --- Nuts, fats, sauces, dairy ---
  peanutButter: {
    id: "food-peanut-butter",
    name: "Peanut butter",
    sourceName: "Peanut butter, smooth",
    dataSource: "barcode",
    per100: {
      calories: 588,
      protein_g: 25,
      carbs_g: 20,
      fat_g: 50,
      fiber_g: 6,
      sugar_g: 9,
      sodium_mg: 430,
      satfat_g: 10,
    },
    portions: [
      { label: "1 tbsp (16 g)", grams: 16 },
      { label: "2 tbsp (32 g)", grams: 32 },
    ],
    // "butter" wins over "peanut" in the classifier, so this is a fat.
    cueClass: "fat",
    defaultGrams: 32,
    cuePattern: null,
  },
  walnuts: {
    id: "food-walnuts",
    name: "Walnuts",
    sourceName: "Nuts, walnuts, English",
    dataSource: "database",
    per100: { calories: 654, protein_g: 15, carbs_g: 14, fat_g: 65, fiber_g: 6.7, satfat_g: 6.1 },
    portions: [{ label: "¼ cup (30 g)", grams: 30 }],
    cueClass: "nuts",
    defaultGrams: 30,
    cuePattern: /small handful|thumb/i,
  },
  butter: {
    id: "food-butter",
    name: "Butter",
    sourceName: "Butter, salted",
    dataSource: "database",
    per100: {
      calories: 717,
      protein_g: 0.9,
      carbs_g: 0.1,
      fat_g: 81,
      sodium_mg: 643,
      satfat_g: 51,
    },
    portions: [
      { label: "1 tsp (5 g)", grams: 5 },
      { label: "1 tbsp (14 g)", grams: 14 },
    ],
    cueClass: "fat",
    defaultGrams: 5,
    // 5 g is far below every cue weight, so no cue should show.
    cuePattern: null,
  },
  hummus: {
    id: "food-hummus",
    name: "Hummus",
    sourceName: "Hummus, commercial",
    dataSource: "barcode",
    per100: { calories: 166, protein_g: 7.9, carbs_g: 14, fat_g: 9.6, fiber_g: 6, sodium_mg: 379 },
    portions: [{ label: "2 tbsp (30 g)", grams: 30 }],
    cueClass: "sauce",
    defaultGrams: 30,
    cuePattern: /golf ball|thumb/i,
  },
  marinara: {
    id: "food-marinara",
    name: "Marinara sauce",
    sourceName: "Sauce, pasta, marinara, ready-to-serve",
    dataSource: "barcode",
    per100: {
      calories: 56,
      protein_g: 1.6,
      carbs_g: 8.6,
      fat_g: 1.7,
      fiber_g: 1.8,
      sodium_mg: 430,
    },
    portions: [{ label: "1/2 cup (125 g)", grams: 125 }],
    cueClass: "sauce",
    defaultGrams: 60,
    cuePattern: /golf ball/i,
  },
  cottageCheese: {
    id: "food-cottage-cheese",
    name: "Cottage cheese, low fat",
    sourceName: "Cheese, cottage, lowfat, 2% milkfat",
    dataSource: "database",
    per100: { calories: 84, protein_g: 11, carbs_g: 4.3, fat_g: 2.3, sugar_g: 4.1, sodium_mg: 321 },
    portions: [
      { label: "1/2 cup (113 g)", grams: 113 },
      { label: "1 cup (226 g)", grams: 226 },
    ],
    cueClass: "cheese",
    defaultGrams: 113,
    cuePattern: null,
  },

  // --- Packaged ---
  proteinBar: {
    id: "food-protein-bar",
    name: "Protein bar",
    sourceName: "Bar, protein, chocolate chip",
    dataSource: "barcode",
    per100: {
      calories: 350,
      protein_g: 33,
      carbs_g: 38,
      fat_g: 12,
      fiber_g: 15,
      sugar_g: 2,
      sodium_mg: 350,
      satfat_g: 5,
    },
    portions: [{ label: "1 bar (60 g)", grams: 60 }],
    cueClass: "any",
    defaultGrams: 60,
    cuePattern: null,
  },
  almondMilk: {
    id: "food-almond-milk",
    name: "Sweetened almond milk",
    sourceName: "Beverage, almond milk, sweetened, vanilla",
    dataSource: "barcode",
    per100: { calories: 37, protein_g: 0.4, carbs_g: 6.3, fat_g: 1.1, sugar_g: 5.8, sodium_mg: 63 },
    portions: [
      { label: "250 ml", grams: 250 },
      { label: "1 cup (240 g)", grams: 240 },
    ],
    cueClass: "nuts",
    defaultGrams: 240,
    cuePattern: null,
  },
  wheyShake: {
    id: "food-whey-shake",
    name: "Whey shake, prepared",
    sourceName: "Beverage, whey protein powder mixed with water",
    dataSource: "ai",
    per100: { calories: 41, protein_g: 8, carbs_g: 1.2, fat_g: 0.5, sodium_mg: 30 },
    portions: [{ label: "1 shaker (300 g)", grams: 300 }],
    cueClass: "any",
    defaultGrams: 300,
    cuePattern: null,
  },
  tortillaChips: {
    id: "food-tortilla-chips",
    name: "Tortilla chips",
    sourceName: "Snacks, tortilla chips, plain, salted",
    dataSource: "barcode",
    per100: {
      calories: 489,
      protein_g: 7.1,
      carbs_g: 64,
      fat_g: 23,
      fiber_g: 5,
      sodium_mg: 560,
      satfat_g: 3,
    },
    portions: [
      { label: "10 chips (28 g)", grams: 28 },
      { label: "1 oz", grams: 28 },
    ],
    cueClass: "any",
    defaultGrams: 28,
    cuePattern: null,
  },
} as const satisfies Record<string, FoodFixture>;

export type FoodKey = keyof typeof FOOD_FIXTURES;

export const FOOD_KEYS = Object.keys(FOOD_FIXTURES) as FoodKey[];

/** Raw catalog entry for a food. */
export function foodFixture(key: FoodKey): FoodFixture {
  return FOOD_FIXTURES[key];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export type MakeItemOptions = Partial<MealItem> & { grams?: number };

/**
 * A MealItem for a fixture food, with macros scaled to `grams`
 * (defaults to the food's realistic serving weight).
 */
export function makeMealItem(key: FoodKey, options: MakeItemOptions = {}): MealItem {
  const food = foodFixture(key);
  const { grams: gramsOption, ...overrides } = options;
  const grams = gramsOption ?? food.defaultGrams;
  const f = grams / 100;
  const p = food.per100;
  const micro = (value: number | undefined) => (value == null ? undefined : round1(value * f));

  const item: MealItem = {
    name: food.name,
    portion: `${round1(grams)} g`,
    grams: round1(grams),
    calories: Math.round(p.calories * f),
    protein_g: round1(p.protein_g * f),
    carbs_g: round1(p.carbs_g * f),
    fat_g: round1(p.fat_g * f),
    foodId: food.id,
    dataSource: food.dataSource,
    sourceName: food.sourceName,
    sourceBasis: `${Math.round(p.calories)} kcal per 100 g`,
    ...(p.fiber_g == null ? {} : { fiber_g: micro(p.fiber_g) }),
    ...(p.sugar_g == null ? {} : { sugar_g: micro(p.sugar_g) }),
    ...(p.satfat_g == null ? {} : { satfat_g: micro(p.satfat_g) }),
    ...(p.sodium_mg == null ? {} : { sodium_mg: Math.round(p.sodium_mg * f) }),
  };

  return { ...item, ...overrides };
}

/** Several fixture items at once. */
export function makeMeal(
  keys: FoodKey[],
  optionsByKey: Partial<Record<FoodKey, MakeItemOptions>> = {},
): MealItem[] {
  return keys.map((key) => makeMealItem(key, optionsByKey[key] ?? {}));
}

/** A meal of `count` items, cycling the catalog — for perf and bulk tests. */
export function makeLargeMeal(count: number): MealItem[] {
  return Array.from({ length: count }, (_, i) => {
    const key = FOOD_KEYS[i % FOOD_KEYS.length]!;
    return makeMealItem(key, { grams: 80 + (i % 7) * 15 });
  });
}

/** Minimal MealDraft shape, structurally compatible with the review sheet. */
export type MealDraftFixture = {
  id?: string;
  label: string;
  items: MealItem[];
  confidence: "low" | "medium" | "high" | null;
  note: string;
  source: "photo" | "barcode" | "label" | "text" | "manual";
  barcode?: string | null;
  photoDataUrl?: string | null;
};

/** A review-sheet draft around fixture items. */
export function makeMealDraft(
  overrides: Partial<MealDraftFixture> & { items?: MealItem[] } = {},
): MealDraftFixture {
  return {
    label: "Chicken and broccoli",
    items: makeMeal(["chicken", "broccoli"], {
      chicken: { grams: 100 },
      broccoli: { grams: 100 },
    }),
    confidence: "medium",
    note: "",
    source: "photo",
    ...overrides,
  };
}

/** Household chips for a food id, for the portions useQuery mock. */
export function portionsFor(foodId: string | null | undefined): { label: string; grams: number }[] {
  const food = FOOD_KEYS.map(foodFixture).find((f) => f.id === foodId);
  return food ? food.portions.map((p) => ({ ...p })) : [];
}

/** foodId -> chips map, for tests that want to assert on the whole set. */
export function portionChipMocks(
  keys: FoodKey[] = FOOD_KEYS,
): Record<string, { label: string; grams: number }[]> {
  const out: Record<string, { label: string; grams: number }[]> = {};
  for (const key of keys) {
    const food = foodFixture(key);
    out[food.id] = food.portions.map((p) => ({ ...p }));
  }
  return out;
}

/** The cue class and expected label pattern for a fixture food. */
export function expectedCue(key: FoodKey): {
  cueClass: PortionCueClass;
  grams: number;
  pattern: RegExp | null;
} {
  const food = foodFixture(key);
  return { cueClass: food.cueClass, grams: food.defaultGrams, pattern: food.cuePattern };
}

/**
 * Named real-world plates, so several tests can assert on the same combination
 * instead of re-listing items. Keys are stable; grams are realistic servings.
 */
export const COMBO_MEALS = {
  /** Protein-first plate the GLP-1 coaching copy is written around. */
  proteinFirstPlate: {
    label: "Protein-first plate",
    parts: { chicken: 170, broccoli: 180, quinoa: 185, oliveOil: 14 },
  },
  /** Mixed meal where the cue for each item must differ. */
  mixedCueMeal: {
    label: "Steak bowl",
    parts: { groundBeef: 113, blackBeans: 130, avocado: 68, marinara: 60 },
  },
  /** Packaged-only meal: every item comes from a barcode scan. */
  packagedSnack: {
    label: "Packaged snack",
    parts: { proteinBar: 60, almondMilk: 240, tortillaChips: 28 },
  },
  /** Breakfast with fractional and unicode chips. */
  breakfastBowl: {
    label: "Breakfast bowl",
    parts: { oatmeal: 234, blueberries: 148, peanutButter: 32, yogurt: 170 },
  },
  /** Tiny amounts, to check cue suppression and rounding. */
  condimentsOnly: {
    label: "Condiments",
    parts: { butter: 5, ranch: 30, hummus: 30 },
  },
} as const satisfies Record<string, { label: string; parts: Partial<Record<FoodKey, number>> }>;

export type ComboKey = keyof typeof COMBO_MEALS;

export const COMBO_KEYS = Object.keys(COMBO_MEALS) as ComboKey[];

/** Build the items for a named combo meal. */
export function makeComboMeal(key: ComboKey): MealItem[] {
  const combo = COMBO_MEALS[key];
  return Object.entries(combo.parts).map(([foodKey, grams]) =>
    makeMealItem(foodKey as FoodKey, { grams: grams as number }),
  );
}

/** A review-sheet draft around a named combo meal. */
export function makeComboDraft(key: ComboKey): MealDraftFixture {
  return makeMealDraft({ label: COMBO_MEALS[key].label, items: makeComboMeal(key) });
}

/** Every household chip in the catalog, flattened — for parser round-trips. */
export function allPortionChips(): { food: FoodKey; label: string; grams: number }[] {
  return FOOD_KEYS.flatMap((food) =>
    foodFixture(food).portions.map((p) => ({ food, label: p.label, grams: p.grams })),
  );
}
