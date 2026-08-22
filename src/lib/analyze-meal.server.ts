/**
 * "analyze-meal" pipeline (server-only).
 *
 * photo -> Storage (meal-photos/{user_id}/{uuid}.jpg)
 *       -> vision LLM (identify + size only, strict JSON)
 *       -> nutrition lookup: foods cache -> USDA -> LLM per-100g fallback
 *       -> totals computed in code (grams x per_100g / 100), rounded
 *
 * Never import this from a component — only from a server function handler.
 */
import {
  MEAL_VISION_SYSTEM_PROMPT,
  MEAL_VISION_JSON_SCHEMA,
  type MealVisionResult,
  type MealVisionItem,
} from "@/lib/meal-vision-prompt";

const VISION_MODEL = "google/gemini-2.5-flash";
const TIMEOUT_MS = 20_000;

export class AnalyzeMealError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AnalyzeMealError";
  }
}

export type AnalyzedItem = {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  confidence: number;
  nutrition_source: "cache" | "usda" | "llm";
};

export type AnalyzeMealResult = {
  meal_name: string;
  photo_url: string | null;
  storage_path: string | null;
  confidence: number;
  health_score: number | null;
  notes: string;
  items: AnalyzedItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
};

type Per100g = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

const round = (n: number) => Math.round(Number.isFinite(n) ? n : 0);
const clamp01 = (n: unknown) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
};
const nonNeg = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/** Normalized cache key: lowercase, collapsed whitespace, no punctuation noise. */
export function normalizeFoodKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s%-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) throw new AnalyzeMealError("bad_image", "That photo could not be read.", 400);
  const contentType = match[1]!;
  const binary = atob(match[2]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

/** Uploads the photo to the user's own folder and returns a signed URL. */
async function uploadMealPhoto(
  userId: string,
  dataUrl: string,
): Promise<{ path: string; url: string | null }> {
  const { bytes, contentType } = decodeDataUrl(dataUrl);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabaseAdmin.storage
    .from("meal-photos")
    .upload(path, bytes, { contentType, upsert: false });
  if (error) {
    console.error("[analyze-meal] photo upload failed", error.message);
    throw new AnalyzeMealError("upload_failed", "We couldn't save that photo. Try again.", 502);
  }
  // The bucket is private — hand back a short-lived signed URL, not a public one.
  const { data } = await supabaseAdmin.storage.from("meal-photos").createSignedUrl(path, 60 * 60);
  return { path, url: data?.signedUrl ?? null };
}

/** Calls the vision model with the strict Quick-Add schema. */
async function callVision(
  imageDataUrl: string | null,
  context: string,
): Promise<MealVisionResult & { items: MealVisionItem[] }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AnalyzeMealError("not_configured", "AI is not configured.", 500);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: MEAL_VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: imageDataUrl
              ? [
                  { type: "text", text: context },
                  { type: "image_url", image_url: { url: imageDataUrl } },
                ]
              : [{ type: "text", text: context }],
          },
        ],
        response_format: { type: "json_schema", json_schema: MEAL_VISION_JSON_SCHEMA },
      }),
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new AnalyzeMealError("timeout", "That took too long. Try the photo again.", 504);
    }
    console.error("[analyze-meal] vision request failed", err);
    throw new AnalyzeMealError("vision_failed", "Photo analysis failed. Try again.", 502);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) {
    throw new AnalyzeMealError("rate_limited", "The AI is busy — try again in a moment.", 429);
  }
  if (res.status === 402) {
    throw new AnalyzeMealError("no_credits", "AI credits are exhausted for this workspace.", 402);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[analyze-meal] vision error", res.status, body.slice(0, 300));
    throw new AnalyzeMealError("vision_failed", "Photo analysis failed. Try again.", 502);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: MealVisionResult;
  try {
    parsed = JSON.parse(raw) as MealVisionResult;
  } catch {
    throw new AnalyzeMealError("bad_response", "We couldn't read that result. Try again.", 502);
  }
  return { ...parsed, items: Array.isArray(parsed.items) ? parsed.items : [] };
}

type CacheHit = { per100g: Per100g; source: "cache" | "usda" | "llm" };

/** foods cache -> USDA -> LLM values, in that order. Never throws. */
async function resolveNutrition(key: string, name: string, fallback: Per100g): Promise<CacheHit> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  try {
    const { data } = await supabaseAdmin
      .from("foods")
      .select("kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g")
      .eq("cache_key", key)
      .limit(1)
      .maybeSingle();
    if (data && Number(data.kcal_100g) >= 0) {
      return {
        source: "cache",
        per100g: {
          calories: nonNeg(data.kcal_100g),
          protein_g: nonNeg(data.protein_100g),
          carbs_g: nonNeg(data.carbs_100g),
          fat_g: nonNeg(data.fat_100g),
          fiber_g: nonNeg(data.fiber_100g),
        },
      };
    }
  } catch (err) {
    console.error("[analyze-meal] cache read failed", err);
  }

  let per100g = fallback;
  let source: "usda" | "llm" = "llm";
  try {
    const { searchUsdaFoods, usdaConfigured } = await import("@/lib/usda.server");
    if (usdaConfigured()) {
      const [top] = await searchUsdaFoods(name, 1);
      if (top && top.kcal100 > 0) {
        source = "usda";
        per100g = {
          calories: top.kcal100,
          protein_g: top.protein100,
          carbs_g: top.carbs100,
          fat_g: top.fat100,
          fiber_g: nonNeg(top.fiber100),
        };
      }
    }
  } catch (err) {
    console.error("[analyze-meal] usda lookup failed", err);
  }

  try {
    await supabaseAdmin.from("foods").upsert(
      {
        name,
        name_norm: key,
        cache_key: key,
        source,
        kcal_100g: per100g.calories,
        protein_100g: per100g.protein_g,
        carbs_100g: per100g.carbs_g,
        fat_100g: per100g.fat_g,
        fiber_100g: per100g.fiber_g,
      },
      { onConflict: "cache_key" },
    );
  } catch (err) {
    console.error("[analyze-meal] cache write failed", err);
  }

  return { per100g, source };
}

export type AnalyzeMealInput = {
  userId: string;
  imageDataUrl: string;
  mealType?: string | null;
  userText?: string | null;
  /** e.g. "user usually eats ~180 g portions of rice" */
  priorCorrections?: string | null;
};

export async function analyzeMeal(input: AnalyzeMealInput): Promise<AnalyzeMealResult> {
  const contextLine = [
    "Analyze this meal photo and return only the JSON object.",
    input.mealType ? `Context: meal_type=${input.mealType}.` : "",
    input.userText ? `User said: "${String(input.userText).slice(0, 300)}".` : "",
    input.priorCorrections ? `Previous corrections: ${input.priorCorrections}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const [photo, vision] = await Promise.all([
    uploadMealPhoto(input.userId, input.imageDataUrl),
    callVision(input.imageDataUrl, contextLine),
  ]);

  return groundVision(vision, photo.url, photo.path);
}

/**
 * Text-only mode: the user typed what they ate ("2 eggs, 2 toast with butter").
 * Same model, same grounding and math — there is simply no photo to upload.
 */
export async function analyzeMealText(input: {
  text: string;
  mealType?: string | null;
}): Promise<AnalyzeMealResult> {
  const contextLine = [
    "The user described a meal in words (no photo). Estimate the items and portions, and return only the JSON object.",
    input.mealType ? `Context: meal_type=${input.mealType}.` : "",
    `User said: "${String(input.text).slice(0, 500)}".`,
  ]
    .filter(Boolean)
    .join(" ");

  const vision = await callVision(null, contextLine);
  return groundVision(vision, null, null);
}

/** Shared step: model items -> database per-100g values -> code-computed totals. */
async function groundVision(
  vision: MealVisionResult & { items: MealVisionItem[] },
  photoUrl: string | null,
  storagePath: string | null,
): Promise<AnalyzeMealResult> {
  if (vision.is_food === false || vision.items.length === 0) {
    throw new AnalyzeMealError("not_food", "That doesn't look like food.", 422);
  }

  const items: AnalyzedItem[] = [];
  for (const raw of vision.items.slice(0, 20)) {
    const name = String(raw?.name ?? "").trim();
    const grams = nonNeg(raw?.grams);
    if (!name || grams <= 0) continue;
    const key = normalizeFoodKey(name);
    const fallback: Per100g = {
      calories: nonNeg(raw?.per_100g?.calories),
      protein_g: nonNeg(raw?.per_100g?.protein_g),
      carbs_g: nonNeg(raw?.per_100g?.carbs_g),
      fat_g: nonNeg(raw?.per_100g?.fat_g),
      fiber_g: nonNeg(raw?.per_100g?.fiber_g),
    };
    // Database per-100g values win; the model's grams always stay.
    const { per100g, source } = await resolveNutrition(key, name, fallback);
    const factor = grams / 100;
    items.push({
      name,
      grams: round(grams),
      calories: round(per100g.calories * factor),
      protein_g: round(per100g.protein_g * factor),
      carbs_g: round(per100g.carbs_g * factor),
      fat_g: round(per100g.fat_g * factor),
      fiber_g: round(per100g.fiber_g * factor),
      confidence: clamp01(raw?.confidence),
      nutrition_source: source,
    });
  }

  if (items.length === 0) {
    throw new AnalyzeMealError("not_food", "We couldn't identify any food there.", 422);
  }

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
      fiber_g: acc.fiber_g + item.fiber_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );

  const health = Number(vision.health_score);

  return {
    meal_name: String(vision.meal_name ?? "").trim() || "Meal",
    photo_url: photoUrl,
    storage_path: storagePath,
    confidence: clamp01(vision.confidence),
    health_score: Number.isFinite(health) ? Math.min(10, Math.max(1, Math.round(health))) : null,
    notes: String(vision.notes ?? "").trim(),
    items,
    totals: {
      calories: round(totals.calories),
      protein_g: round(totals.protein_g),
      carbs_g: round(totals.carbs_g),
      fat_g: round(totals.fat_g),
      fiber_g: round(totals.fiber_g),
    },
  };
}

/**
 * Open Food Facts barcode lookup, cached in `foods` by GTIN so the second scan
 * of the same product is instant and works offline-ish.
 */
export type BarcodeFoodResult = {
  name: string;
  brand: string | null;
  grams: number;
  per100g: Per100g;
  source: "cache" | "openfoodfacts";
};

function parseServingGrams(serving: unknown): number | null {
  const text = String(serving ?? "").toLowerCase();
  const m = /([\d.]+)\s*(g|ml)\b/.exec(text);
  if (!m) return null;
  const value = Number(m[1]);
  return Number.isFinite(value) && value > 0 && value <= 2000 ? Math.round(value) : null;
}

export async function lookupBarcodeFood(barcodeRaw: string): Promise<BarcodeFoodResult | null> {
  const barcode = String(barcodeRaw).replace(/\D/g, "");
  if (barcode.length < 6 || barcode.length > 14) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { gtinVariants } = await import("@/lib/gtin");
  const variants = gtinVariants(barcode);

  try {
    const { data } = await supabaseAdmin
      .from("foods")
      .select(
        "name, brand, kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, default_portion_g",
      )
      .in("gtin", variants.length > 0 ? variants : [barcode])
      .limit(1);
    const hit = data?.[0];
    if (hit && Number(hit.kcal_100g) > 0) {
      return {
        name: hit.name,
        brand: hit.brand ?? null,
        grams: nonNeg(hit.default_portion_g) || 100,
        per100g: {
          calories: nonNeg(hit.kcal_100g),
          protein_g: nonNeg(hit.protein_100g),
          carbs_g: nonNeg(hit.carbs_100g),
          fat_g: nonNeg(hit.fat_100g),
          fiber_g: nonNeg(hit.fiber_100g),
        },
        source: "cache",
      };
    }
  } catch (err) {
    console.error("[barcode] cache read failed", err);
  }

  let product: Record<string, unknown> | null = null;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      { headers: { "User-Agent": "DoseRoutine/1.0 (support@doseroutine.com)" } },
    );
    if (res.ok) {
      const json = (await res.json()) as { status?: number; product?: Record<string, unknown> };
      if (json.status === 1 && json.product) product = json.product;
    }
  } catch (err) {
    console.error("[barcode] openfoodfacts lookup failed", err);
  }
  if (!product) return null;

  const nutriments = (product["nutriments"] ?? {}) as Record<string, unknown>;
  const per100g: Per100g = {
    calories: nonNeg(nutriments["energy-kcal_100g"]),
    protein_g: nonNeg(nutriments["proteins_100g"]),
    carbs_g: nonNeg(nutriments["carbohydrates_100g"]),
    fat_g: nonNeg(nutriments["fat_100g"]),
    fiber_g: nonNeg(nutriments["fiber_100g"]),
  };
  if (per100g.calories <= 0 && per100g.protein_g <= 0 && per100g.carbs_g <= 0) return null;

  const name =
    String(product["product_name"] ?? "").trim() ||
    String(product["generic_name"] ?? "").trim() ||
    `Product ${barcode}`;
  const brand =
    String(product["brands"] ?? "")
      .split(",")[0]
      ?.trim() || null;
  const grams = parseServingGrams(product["serving_size"]) ?? 100;

  try {
    await supabaseAdmin.from("foods").upsert(
      {
        name: name.slice(0, 120),
        name_norm: normalizeFoodKey(`${brand ?? ""} ${name}`),
        cache_key: `barcode:${barcode}`,
        gtin: barcode,
        brand,
        source: "openfoodfacts",
        default_portion_g: grams,
        kcal_100g: per100g.calories,
        protein_100g: per100g.protein_g,
        carbs_100g: per100g.carbs_g,
        fat_100g: per100g.fat_g,
        fiber_100g: per100g.fiber_g,
      },
      { onConflict: "cache_key" },
    );
  } catch (err) {
    console.error("[barcode] cache write failed", err);
  }

  return { name, brand, grams, per100g, source: "openfoodfacts" };
}
