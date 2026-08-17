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
      "name": "food name",
      "portion": "human readable portion, e.g. 150 g or 1 cup",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number
    }
  ],
  "read_from": "nutrition_label" | "visual",
  "barcode": "digits only, or empty string",
  "confidence": "high" | "medium" | "low",
  "note": "one short sentence about what is uncertain, or empty string"
}

Rules:
- Numbers only, no units inside numeric fields, no ranges, no nulls.
- Keep calories consistent with the macros (protein 4, carbs 4, fat 9 kcal/g)
  unless a printed label states otherwise; then trust the label.
- "high" confidence only for a clearly transcribed label or a clear photo of simple,
  plainly visible food.
- "low" when the dish is mixed, obscured, or the portion is hard to judge.
- If the image contains no food at all, return an empty items array and note that.`;

export async function estimateMealFromImage(imageDataUrl: string): Promise<MealEstimate> {
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
              text: "Estimate the nutrition for this meal. Return only the JSON object.",
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
  return reconcileEstimate({ ...estimate, barcode: digits.length >= 8 ? digits : null });
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

export async function lookupFoodBarcode(barcode: string): Promise<FoodLabelLookup> {
  const clean = barcode.replace(/\D/g, "");
  const sourceUrl = `https://world.openfoodfacts.org/product/${clean}`;
  const empty: FoodLabelLookup = {
    found: false,
    name: "",
    brand: null,
    servingSize: null,
    perServing: null,
    basis: null,
    sourceUrl,
  };
  if (clean.length < 8) return empty;

  type OffResponse = { status?: number; product?: Record<string, unknown> };
  let json: OffResponse | null = null;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json` +
        `?fields=product_name,brands,serving_size,nutriments`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return empty;
    json = (await res.json()) as OffResponse;
  } catch {
    return empty;
  }
  if (!json || json.status !== 1 || !json.product) return empty;


  return productToLookup(json.product, clean) ?? empty;
}

/** Shared Open Food Facts product → label shape used by lookup and search. */
function productToLookup(
  product: Record<string, unknown>,
  code: string,
): FoodLabelLookup | null {
  const name = String(product["product_name"] ?? "").trim();
  if (!name) return null;
  const nutriments = (product["nutriments"] ?? {}) as OffNutriments;
  const servingSize = String(product["serving_size"] ?? "").trim() || null;

  const hasServing = Number.isFinite(Number(nutriments["energy-kcal_serving"]));
  const suffix = hasServing ? "_serving" : "_100g";
  const calories = num(nutriments, `energy-kcal${suffix}`);
  const perServing: MealItem = {
    name,
    portion: hasServing ? (servingSize ?? "1 serving") : "100 g",
    calories: Math.round(calories),
    protein_g: Math.round(num(nutriments, `proteins${suffix}`) * 10) / 10,
    carbs_g: Math.round(num(nutriments, `carbohydrates${suffix}`) * 10) / 10,
    fat_g: Math.round(num(nutriments, `fat${suffix}`) * 10) / 10,
  };

  return {
    found: true,
    name,
    brand: String(product["brands"] ?? "").split(",")[0]?.trim() || null,
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

  type OffSearch = { products?: Array<Record<string, unknown>> };
  let json: OffSearch | null = null;
  try {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1` +
      `&page_size=10&fields=code,product_name,brands,serving_size,nutriments` +
      `&search_terms=${encodeURIComponent(terms)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    json = (await res.json()) as OffSearch;
  } catch {
    return [];
  }

  const out: FoodProductMatch[] = [];
  for (const product of json?.products ?? []) {
    const code = String(product["code"] ?? "").replace(/\D/g, "");
    const parsed = productToLookup(product, code);
    // A match is only useful if it carries real numbers to log.
    if (!parsed?.perServing || parsed.perServing.calories <= 0) continue;
    out.push({ ...parsed, barcode: code });
    if (out.length >= 8) break;
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

  const estimate = await estimateMealFromImage(input.imageDataUrl);

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

