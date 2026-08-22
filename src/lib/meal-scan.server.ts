/**
 * Server-only helpers for meal photo estimation and food barcode lookup.
 * Never import this from a component — only from a server function handler.
 */
import {
  normalizeEstimate,
  reconcileEstimate,
  type MealEstimate,
  type MealItem,
  type FoodLabelMatch,
} from "@/lib/meal-nutrition";
import { parsePortionGrams } from "@/lib/portion-units";
import type { MatchConfidence, MatchSource } from "@/lib/barcode-confidence";

const MEAL_VISION_MODEL = "google/gemini-2.5-flash";

const MEAL_SYSTEM_PROMPT = `You are a nutrition extractor for a health-tracking app.

Work in this order and stop at the first step that succeeds:

1. NUTRITION LABEL. If a printed Nutrition Facts / nutrition information panel is
   readable anywhere in the photo, transcribe it. Use the printed numbers exactly
   as written — never re-estimate them. Report one item per product, with the
   portion set to the panel's stated serving size (e.g. "1 serving (55 g)"). If the
   panel is per 100 g, say so in the portion. Set "read_from": "nutrition_label".
2. VISUAL ESTIMATE. Otherwise identify each distinct food you can see and estimate
   its portion and macros. Be conservative — do not invent items you cannot see, and
   account for cooking oils, dressings, and sauces that are visibly present.
   Set "read_from": "visual".

Also transcribe the barcode digits if a barcode is legible ("barcode" field), so the
app can verify against the manufacturer's published panel.

Return ONLY a JSON object with this exact shape:
{
  "label": "short meal or product name, e.g. Chicken bowl",
  "items": [
    {
      "name": "plain food name, no brand or adjectives, e.g. chicken breast, cooked",
      "portion": "human readable portion, e.g. 150 g or 1 cup",
      "grams": number,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "grams_low": number,
      "grams_high": number,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "scale_basis": "what you judged the portion sizes against, or empty string",
  "read_from": "nutrition_label" | "visual",
  "barcode": "digits only, or empty string",
  "confidence": "high" | "medium" | "low",
  "note": "one short sentence about what is uncertain, or empty string"
}

Rules:
- Numbers only, no units inside numeric fields, no ranges, no nulls.
- "grams" is your best estimate of the edible weight of that item, in grams.
  Judge it against everyday references: a palm of cooked meat is ~100 g, a
  cupped hand of rice is ~160 g, a fist of pasta is ~200 g, a thumb tip of oil
  is ~15 g, one large egg is 50 g, one slice of bread is 28 g.
- "name" must be a generic food name a nutrition database would list. Use
  "chicken breast, cooked" rather than "juicy grilled chicken".
- Keep calories consistent with the macros (protein 4, carbs 4, fat 9 kcal/g)
  unless a printed label states otherwise; then trust the label.
- "high" confidence only for a clearly transcribed label or a clear photo of simple,
  plainly visible food.
- "low" when the dish is mixed, obscured, or the portion is hard to judge.
- If the image contains no food at all, return an empty items array and note that.

PORTION ACCURACY — this is where estimates usually go wrong, so work through it:
- First fix the scale. Look for something of known size in frame and say which
  reference you used in "scale_basis": a dinner plate is 26-28 cm across, a side
  plate 20 cm, a standard fork 19 cm, a teaspoon bowl 3 cm, a credit card 8.6 cm,
  a US quarter 2.4 cm, a soda can 12.3 cm tall, a chopstick 23 cm, an adult
  thumb 5-6 cm. If the user named a reference object, trust that one above all.
- Then estimate depth, not just area: rice mounded in a bowl is 2-3x the weight
  of the same footprint spread flat; a chicken breast is 2-3 cm thick.
- Convert volume to weight with real densities: cooked rice 0.75 g/ml, cooked
  pasta 0.6, leafy salad 0.06, soup 1.0, oil 0.92, yoghurt 1.03, nuts 0.55.
- Count what is hidden: cooking oil absorbed by fried food (5-15 g per portion),
  dressings, butter on bread, sugar in sauces. Add them as separate items.
- Give "grams_low" and "grams_high" as an honest range around each item, and set
  item-level "confidence" for each food.
- Prefer round, defensible numbers over false precision.`;

/** Everyday objects a user can hold next to the food to fix the scale. */
export const SCALE_REFERENCES = {
  none: null,
  card: "a credit/ID card (85.6 x 54 mm) is in the photo next to the food",
  quarter: "a US quarter coin (24.3 mm across) is in the photo next to the food",
  fork: "a standard dinner fork (19 cm long) is in the photo next to the food",
  spoon: "a standard tablespoon (17 cm long) is in the photo next to the food",
  thumb: "the user's thumb (about 5.5 cm) is in the photo next to the food",
  plate: "the food is on a standard 26 cm dinner plate",
  bowl: "the food is in a standard 15 cm cereal bowl",
} as const;

export type ScaleReference = keyof typeof SCALE_REFERENCES;

export type MealPhotoOptions = {
  /** Known-size object the user included so portions can be scaled properly. */
  reference?: ScaleReference | null;
  /** Anything the user typed to help ("half of this", "no oil used"). */
  hint?: string | null;
};

export async function estimateMealFromImage(
  imageDataUrl: string,
  options: MealPhotoOptions = {},
): Promise<MealEstimate> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MEAL_VISION_MODEL,
      messages: [
        { role: "system", content: MEAL_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Estimate the nutrition for this meal. Return only the JSON object.",
                options.reference && options.reference !== "none"
                  ? `Scale reference: ${SCALE_REFERENCES[options.reference]}. Use it to size every portion.`
                  : "",
                options.hint ? `User note: ${String(options.hint).slice(0, 200)}` : "",
              ]
                .filter(Boolean)
                .join(" "),
            },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) {
    throw new Error("The AI is busy right now — wait a moment and try the photo again.");
  }
  if (res.status === 402) {
    throw new Error("AI credits are exhausted. Add credits to keep using photo scanning.");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Photo estimate failed (${res.status}). ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The AI returned something we couldn't read. Try the photo again.");
  }
  const estimate = normalizeEstimate(parsed);
  const digits = String((parsed as Record<string, unknown>)?.["barcode"] ?? "").replace(/\D/g, "");
  const reconciled = reconcileEstimate({
    ...estimate,
    barcode: digits.length >= 8 ? digits : null,
  });
  // Ground the identification against the food database before anyone sees it.
  const { groundEstimate } = await import("@/lib/food-resolver.server");
  return groundEstimate(reconciled).catch(() => reconciled);
}

/* ---------------- Food barcode → real nutrition panel ---------------- */

type OffNutriments = Record<string, unknown>;

function num(source: OffNutriments, key: string): number {
  const value = Number(source[key]);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export type FoodLabelLookup = {
  found: boolean;
  name: string;
  brand: string | null;
  servingSize: string | null;
  /** Macros for ONE serving (falls back to per-100g when no serving is published). */
  perServing: MealItem | null;
  basis: "serving" | "100g" | null;
  sourceUrl: string;
};

/** Open Food Facts asks every client to identify itself in this exact shape. */
const OFF_USER_AGENT = "DoseRoutine - Web - Version 1.0 - https://doseroutine.com - scan";

/**
 * A hit is only useful if the source actually published a panel. Zero is a
 * legitimate answer (diet soda, sparkling water), so the test is "did we get a
 * parsed panel", not "are the numbers above zero" — parsers reject products
 * with no nutrition data at all.
 */
function hasUsableMacros(lookup: FoodLabelLookup | null): lookup is FoodLabelLookup {
  return Boolean(lookup?.perServing);
}

async function fetchOffProduct(code: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json` +
        `?fields=code,product_name,product_name_en,generic_name,brands,serving_size,nutriments`,
      {
        headers: { Accept: "application/json", "User-Agent": OFF_USER_AGENT },
        signal: AbortSignal.timeout(10_000),
      },
    );
    // 404 means "not in this database" and still returns JSON — it must fall
    // through to the next source instead of ending the whole lookup.
    if (!res.ok && res.status !== 404) return null;
    const json = (await res.json()) as { status?: number; product?: Record<string, unknown> };
    if (!json || json.status !== 1 || !json.product) return null;
    return json.product;
  } catch {
    return null;
  }
}

/**
 * Resolve a scanned or typed barcode to a real nutrition panel.
 *
 * Cascade, stopping at the first source with usable macros:
 *   1. our own cached catalog (instant, offline-friendly)
 *   2. Open Food Facts v2, trying each GTIN padding variant
 *   3. USDA Branded (covers most US products Open Food Facts misses)
 */
export async function lookupFoodBarcode(barcode: string): Promise<FoodLabelLookup> {
  const { gtinVariants, cleanBarcode } = await import("@/lib/gtin");
  const clean = cleanBarcode(barcode);
  const empty: FoodLabelLookup = {
    found: false,
    name: "",
    brand: null,
    servingSize: null,
    perServing: null,
    basis: null,
    sourceUrl: `https://world.openfoodfacts.org/product/${clean}`,
  };
  if (clean.length < 8) return empty;
  const variants = gtinVariants(clean);

  // 1. Cached catalog first — a previous scan already did the network work.
  try {
    const { findFoodByGtin } = await import("@/lib/food-db.server");
    const cached = await findFoodByGtin(clean);
    if (cached) {
      const fromCache = foodRecordToLookup(cached);
      if (hasUsableMacros(fromCache)) return fromCache;
    }
  } catch {
    /* catalog is a nicety, never a blocker */
  }

  // 2. Open Food Facts, one request per distinct padding (usually 1–2).
  for (const code of variants.slice(0, 3)) {
    const product = await fetchOffProduct(code);
    if (!product) continue;
    const parsed = productToLookup(product, code);
    if (hasUsableMacros(parsed)) return parsed;
  }

  // 3. USDA Branded.
  const usda = await usdaBarcodeFallback(clean, empty);
  if (hasUsableMacros(usda)) return usda;
  return empty;
}

type CatalogFood = Awaited<ReturnType<typeof import("@/lib/food-db.server").findFoodByGtin>>;

/** Shared catalog record → label shape (cache hits and USDA hits alike). */
function foodRecordToLookup(food: NonNullable<CatalogFood>): FoodLabelLookup {
  const grams = food.defaultPortionG > 0 ? food.defaultPortionG : 100;
  const f = grams / 100;
  return {
    found: true,
    name: food.name,
    brand: food.brand,
    servingSize: `${Math.round(grams)} g`,
    basis: grams === 100 ? "100g" : "serving",
    sourceUrl: `https://fdc.nal.usda.gov/`,
    perServing: {
      name: food.name,
      portion: `${Math.round(grams)} g`,
      calories: Math.round(food.kcal100 * f),
      protein_g: Math.round(food.protein100 * f * 10) / 10,
      carbs_g: Math.round(food.carbs100 * f * 10) / 10,
      fat_g: Math.round(food.fat100 * f * 10) / 10,
      grams,
      foodId: food.id,
      dataSource: "usda",
      sourceName: food.brand ? `${food.name} (${food.brand})` : food.name,
      sourceBasis: `${Math.round(food.kcal100)} kcal per 100 g · USDA Branded`,
      fiber_g: food.fiber100 == null ? null : Math.round(food.fiber100 * f * 10) / 10,
      sugar_g: food.sugar100 == null ? null : Math.round(food.sugar100 * f * 10) / 10,
      sodium_mg: food.sodium100mg == null ? null : Math.round(food.sodium100mg * f),
      satfat_g: food.satfat100 == null ? null : Math.round(food.satfat100 * f * 10) / 10,
    },
  };
}

/**
 * Open Food Facts misses plenty of US products. USDA's Branded set is the
 * second source: an exact GTIN match, cached into our catalog on the way past.
 */
async function usdaBarcodeFallback(
  barcode: string,
  empty: FoodLabelLookup,
): Promise<FoodLabelLookup> {
  try {
    const { lookupUsdaBarcodeAndCache } = await import("@/lib/food-db.server");
    const food = await lookupUsdaBarcodeAndCache(barcode);
    if (food) return foodRecordToLookup(food);
    // Caching into our catalog can fail (offline, permissions) — that must not
    // lose a perfectly good USDA panel, so fall back to the raw record.
    const { lookupUsdaByBarcode } = await import("@/lib/usda.server");
    const raw = await lookupUsdaByBarcode(barcode);
    if (!raw) return empty;
    const grams = raw.defaultPortionG > 0 ? raw.defaultPortionG : 100;
    const f = grams / 100;
    return {
      found: true,
      name: raw.name,
      brand: raw.brand,
      servingSize: `${Math.round(grams)} g`,
      basis: grams === 100 ? "100g" : "serving",
      sourceUrl: "https://fdc.nal.usda.gov/",
      perServing: {
        name: raw.name,
        portion: `${Math.round(grams)} g`,
        calories: Math.round(raw.kcal100 * f),
        protein_g: Math.round(raw.protein100 * f * 10) / 10,
        carbs_g: Math.round(raw.carbs100 * f * 10) / 10,
        fat_g: Math.round(raw.fat100 * f * 10) / 10,
        grams,
        dataSource: "usda",
        sourceName: raw.brand ? `${raw.name} (${raw.brand})` : raw.name,
        sourceBasis: `${Math.round(raw.kcal100)} kcal per 100 g · USDA Branded`,
      },
    };
  } catch {
    return empty;
  }
}

/** Shared Open Food Facts product → label shape used by lookup and search. */
function productToLookup(product: Record<string, unknown>, code: string): FoodLabelLookup | null {
  const name =
    String(product["product_name"] ?? "").trim() ||
    String(product["product_name_en"] ?? "").trim() ||
    String(product["generic_name"] ?? "").trim();
  if (!name) return null;
  const nutriments = (product["nutriments"] ?? {}) as OffNutriments;
  // Plenty of crowdsourced entries have a name and photo but no panel at all —
  // those must fall through to the next source rather than log zeros.
  const PANEL_KEYS = [
    "energy-kcal_100g",
    "energy-kcal_serving",
    "proteins_100g",
    "carbohydrates_100g",
    "fat_100g",
  ];
  if (!PANEL_KEYS.some((key) => Number.isFinite(Number(nutriments[key])))) return null;
  const servingSize = String(product["serving_size"] ?? "").trim() || null;

  const servingKcal = Number(nutriments["energy-kcal_serving"]);
  const hasServing = Number.isFinite(servingKcal) && servingKcal > 0;
  const suffix = hasServing ? "_serving" : "_100g";
  const calories = num(nutriments, `energy-kcal${suffix}`);
  const portion = hasServing ? (servingSize ?? "1 serving") : "100 g";
  const perServing: MealItem = {
    name,
    portion,
    calories: Math.round(calories),
    protein_g: Math.round(num(nutriments, `proteins${suffix}`) * 10) / 10,
    carbs_g: Math.round(num(nutriments, `carbohydrates${suffix}`) * 10) / 10,
    fat_g: Math.round(num(nutriments, `fat${suffix}`) * 10) / 10,
    grams: hasServing ? parsePortionGrams(portion) : 100,
    dataSource: "barcode",
  };

  return {
    found: true,
    name,
    brand:
      String(
        Array.isArray(product["brands"]) ? (product["brands"][0] ?? "") : (product["brands"] ?? ""),
      )
        .split(",")[0]
        ?.trim() || null,
    servingSize,
    perServing,
    basis: hasServing ? "serving" : "100g",
    sourceUrl: `https://world.openfoodfacts.org/product/${code}`,
  };
}

export type FoodProductMatch = FoodLabelMatch;

/**
 * Quick product search for when a barcode can't be resolved to a manufacturer
 * panel — the user picks the right label instead of falling straight back to OCR.
 */
export async function searchFoodProducts(query: string): Promise<FoodProductMatch[]> {
  const terms = query.trim().slice(0, 80);
  if (terms.length < 2) return [];

  type OffSearch = { hits?: Array<Record<string, unknown>> };
  let json: OffSearch | null = null;
  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(terms)}&page_size=10`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "DoseRoutine/1.0 (https://doseroutine.com)",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Open Food Facts search returned ${res.status}`);
    json = (await res.json()) as OffSearch;
  } catch (error) {
    console.warn("[food-search] Open Food Facts unavailable; using catalog fallback", error);
  }

  const out: FoodProductMatch[] = [];
  for (const product of json?.hits ?? []) {
    const code = String(product["code"] ?? "").replace(/\D/g, "");
    const parsed = productToLookup(product, code);
    // A match is only useful if it carries real numbers to log.
    if (!parsed?.perServing || parsed.perServing.calories <= 0) continue;
    out.push({ ...parsed, barcode: code });
    if (out.length >= 8) break;
  }
  if (out.length < 3) {
    try {
      const { searchFoodCatalog, lookupUsdaAndCache } = await import("@/lib/food-db.server");
      const own = await searchFoodCatalog(terms, 8);
      const usda = own.length >= 3 ? null : await lookupUsdaAndCache(terms).catch(() => null);
      const records = usda && !own.some((food) => food.id === usda.id) ? [...own, usda] : own;
      for (const food of records) {
        if (out.some((match) => match.name.toLowerCase() === food.name.toLowerCase())) continue;
        const grams = food.defaultPortionG > 0 ? food.defaultPortionG : 100;
        const factor = grams / 100;
        out.push({
          found: true,
          barcode: "",
          name: food.name,
          brand: food.brand,
          servingSize: `${Math.round(grams)} g`,
          basis: grams === 100 ? "100g" : "serving",
          sourceUrl: "https://fdc.nal.usda.gov/",
          perServing: {
            name: food.name,
            portion: `${Math.round(grams)} g`,
            calories: Math.round(food.kcal100 * factor),
            protein_g: Math.round(food.protein100 * factor * 10) / 10,
            carbs_g: Math.round(food.carbs100 * factor * 10) / 10,
            fat_g: Math.round(food.fat100 * factor * 10) / 10,
            grams,
            foodId: food.id,
            dataSource: "usda",
          },
        });
        if (out.length >= 8) break;
      }
    } catch (error) {
      console.warn("[food-search] catalog fallback unavailable", error);
    }
  }
  return out;
}

export function estimateFromLabel(lookup: FoodLabelLookup, barcode: string): MealEstimate | null {
  if (!lookup.found || !lookup.perServing) return null;
  return {
    label: (lookup.brand ? `${lookup.brand} ${lookup.name}` : lookup.name).slice(0, 80),
    items: [lookup.perServing],
    confidence: "high",
    note:
      lookup.basis === "100g"
        ? "Published values are per 100 g — adjust the portion to match what you ate."
        : "Published per-serving values from the product label.",
    readFrom: "barcode",
    barcode,
  };
}

/**
 * Barcode-first meal scan.
 *
 * A barcode (detected on the device, typed in, or read out of the photo by the
 * model) resolves to the manufacturer's published panel — exact numbers, no
 * guessing. Only when there is no barcode, or the lookup finds nothing, do we
 * fall back to the photo estimate. The photo pass itself prefers OCR of a
 * printed Nutrition Facts panel over a visual guess.
 */
export async function scanMeal(input: {
  imageDataUrl?: string | null;
  barcode?: string | null;
  /**
   * "both" (default) is barcode-first with photo fallback. "barcode" only
   * consults the published panel; "photo" only reads the photo (OCR, then
   * visual) and never resolves a barcode.
   */
  mode?: "both" | "barcode" | "photo";
  /** Known-size object in the photo, so portions can be scaled properly. */
  reference?: ScaleReference | string | null;
  /** Free-text note from the user ("ate half", "no oil"). */
  hint?: string | null;
}): Promise<MealEstimate> {
  const mode = input.mode ?? "both";
  const hinted = String(input.barcode ?? "").replace(/\D/g, "");

  if (mode !== "photo" && hinted.length >= 8) {
    const lookup = await lookupFoodBarcode(hinted);
    const fromLabel = estimateFromLabel(lookup, hinted);
    if (fromLabel) return fromLabel;
  }

  if (mode === "barcode") {
    throw new Error("We couldn't find that barcode in the published label database.");
  }

  if (!input.imageDataUrl) {
    throw new Error("We couldn't find that barcode. Try a photo, or log it by hand.");
  }

  const reference = (
    input.reference && input.reference in SCALE_REFERENCES ? input.reference : null
  ) as ScaleReference | null;
  const estimate = await estimateMealFromImage(input.imageDataUrl, {
    reference,
    hint: input.hint ?? null,
  });

  // The model may have read a barcode we didn't detect on-device — the published
  // panel always beats an OCR/visual read, so verify against it.
  const seen = String(estimate.barcode ?? "").replace(/\D/g, "");
  if (mode === "both" && seen.length >= 8 && seen !== hinted) {
    try {
      const lookup = await lookupFoodBarcode(seen);
      const fromLabel = estimateFromLabel(lookup, seen);
      if (fromLabel) return fromLabel;
    } catch {
      // Lookup is a bonus — keep the photo estimate when it fails.
    }
  }
  return estimate;
}

/* ---------------- Smart barcode resolution (confidence + alternates) ---------------- */

export type SmartBarcodeCandidate = {
  panel: FoodLabelLookup;
  source: MatchSource;
  /** The GTIN form that actually produced this hit. */
  matched: string;
  confidence: MatchConfidence;
};

export type SmartBarcodeResult = {
  /** Digits as scanned/typed. */
  scanned: string;
  /** Canonical 14-digit key, used for caching. */
  canonical: string;
  found: boolean;
  best: SmartBarcodeCandidate | null;
  /** Other plausible products, best first — shown when the top hit is weak. */
  alternates: SmartBarcodeCandidate[];
  /** Padding variants we queried, for the "we tried" diagnostics line. */
  variantsTried: string[];
  /** A corrected code when the typed digits fail their check digit. */
  suggestion: string | null;
};

/**
 * Resolve a barcode across every source we have, score each hit, and return
 * the best one plus the runners-up.
 *
 * Unlike `lookupFoodBarcode` (first usable hit wins) this keeps going far
 * enough to offer alternatives, because "it found *a* product but the wrong
 * pack size" is the failure users actually hit in a shop.
 */
export async function lookupFoodBarcodeSmart(barcode: string): Promise<SmartBarcodeResult> {
  const { gtinVariants, cleanBarcode, canonicalGtin, suggestGtinFix } = await import("@/lib/gtin");
  const { scoreBarcodeMatch, rankAlternates } = await import("@/lib/barcode-confidence");
  const scanned = cleanBarcode(barcode);
  const variants = gtinVariants(scanned).slice(0, 6);
  const base: SmartBarcodeResult = {
    scanned,
    canonical: canonicalGtin(scanned),
    found: false,
    best: null,
    alternates: [],
    variantsTried: variants,
    suggestion: suggestGtinFix(scanned),
  };
  if (scanned.length < 8) return base;

  const raw: Array<{ panel: FoodLabelLookup; source: MatchSource; matched: string }> = [];

  // 1. Our own catalog — instant, and already normalised.
  try {
    const { findFoodByGtin } = await import("@/lib/food-db.server");
    const cached = await findFoodByGtin(scanned);
    if (cached) {
      const panel = foodRecordToLookup(cached);
      if (hasUsableMacros(panel)) {
        raw.push({
          panel,
          source: cached.source === "usda" ? "usda" : "catalog",
          matched: scanned,
        });
      }
    }
  } catch {
    /* catalog is a nicety, never a blocker */
  }

  // 2. Open Food Facts, one request per distinct padding.
  for (const code of variants.slice(0, 4)) {
    if (raw.length >= 3) break;
    const product = await fetchOffProduct(code);
    if (!product) continue;
    const parsed = productToLookup(product, code);
    if (hasUsableMacros(parsed)) {
      raw.push({ panel: parsed, source: "openfoodfacts", matched: code });
      // Mirror it into our own catalog so the next scan is instant.
      void cacheOffPanel(parsed, code).catch(() => undefined);
    }
  }

  // 3. USDA Branded — the best US coverage, worth the call when we're thin.
  if (raw.length === 0 || raw.every((hit) => hit.source === "openfoodfacts")) {
    const emptyPanel: FoodLabelLookup = {
      found: false,
      name: "",
      brand: null,
      servingSize: null,
      perServing: null,
      basis: null,
      sourceUrl: `https://world.openfoodfacts.org/product/${scanned}`,
    };
    const usda = await usdaBarcodeFallback(scanned, emptyPanel).catch(() => null);
    if (usda && hasUsableMacros(usda)) raw.push({ panel: usda, source: "usda", matched: scanned });
  }

  if (raw.length === 0) return base;

  const ranked = rankAlternates(scanned, raw);
  const best = ranked[0]!;
  const result: SmartBarcodeResult = {
    ...base,
    found: true,
    best: {
      panel: best.panel,
      source: best.source,
      matched: best.matched,
      confidence: best.confidence,
    },
    alternates: ranked.slice(1, 5).map((hit) => ({
      panel: hit.panel,
      source: hit.source,
      matched: hit.matched,
      confidence: hit.confidence,
    })),
  };

  // A weak winner deserves name-based suggestions the user can compare against.
  if (best.confidence.score < 72 && best.panel.name) {
    try {
      const byName = await searchFoodProducts(best.panel.name);
      for (const match of byName.slice(0, 4)) {
        if (sameProduct(match, best.panel)) continue;
        result.alternates.push({
          panel: match,
          source: match.barcode ? "openfoodfacts" : "catalog",
          matched: match.barcode || scanned,
          confidence: scoreBarcodeMatch({
            panel: match,
            source: match.barcode ? "openfoodfacts" : "catalog",
            scanned,
            matched: match.barcode || "",
          }),
        });
      }
    } catch {
      /* alternates are optional */
    }
  }
  result.alternates = result.alternates.slice(0, 6);
  return result;
}

function sameProduct(
  a: { name: string; brand: string | null },
  b: { name: string; brand: string | null },
) {
  return (
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
    (a.brand ?? "").toLowerCase() === (b.brand ?? "").toLowerCase()
  );
}

/** Store an Open Food Facts panel in our catalog so later scans skip the network. */
async function cacheOffPanel(panel: FoodLabelLookup, code: string): Promise<void> {
  const item = panel.perServing;
  if (!item) return;
  const grams = Number(item.grams) || 100;
  if (grams <= 0) return;
  const per100 = (value: number | null | undefined) =>
    Math.round((((Number(value) || 0) * 100) / grams) * 10) / 10;
  const { cacheExternalFood } = await import("@/lib/food-db.server");
  await cacheExternalFood({
    name: panel.name,
    brand: panel.brand,
    source: "off",
    externalId: code,
    gtin: code,
    kcal100: Math.round(per100(item.calories)),
    protein100: per100(item.protein_g),
    carbs100: per100(item.carbs_g),
    fat100: per100(item.fat_g),
    fiber100: item.fiber_g == null ? null : per100(item.fiber_g),
    sugar100: item.sugar_g == null ? null : per100(item.sugar_g),
    sodium100mg: item.sodium_mg == null ? null : per100(item.sodium_mg),
    satfat100: item.satfat_g == null ? null : per100(item.satfat_g),
    defaultPortionG: grams,
  });
}
