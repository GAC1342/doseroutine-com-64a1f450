/**
 * Label-photo fallback: read a Nutrition / Supplement / Drug Facts panel
 * straight off a photo when no database knows the barcode.
 *
 * Server-only.
 */

import {
  LABEL_VISION_JSON_SCHEMA,
  LABEL_VISION_SYSTEM_PROMPT,
  type LabelVisionResult,
} from "@/lib/label-vision-prompt";
import {
  EMPTY_NUTRITION,
  type ProductCategory,
  type ProductIngredient,
  type UniversalProduct,
} from "@/lib/universal-product";

const VISION_MODEL = "google/gemini-2.5-flash";
const TIMEOUT_MS = 45000;

export class LabelReadError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = "LabelReadError";
  }
}

const num = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
};
const str = (value: unknown): string | null => {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : null;
};

function toCategory(value: unknown): ProductCategory {
  return value === "food" || value === "supplement" || value === "medication" ? value : "other";
}

/** Ask the vision model to transcribe the panel and normalize what comes back. */
export async function readProductLabel(input: {
  imageDataUrl: string;
  code?: string | null;
  hint?: string | null;
}): Promise<UniversalProduct> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new LabelReadError("not_configured", "AI is not configured.", 500);
  if (!input.imageDataUrl?.startsWith("data:image/")) {
    throw new LabelReadError("bad_image", "That photo didn't upload correctly.", 400);
  }

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
          { role: "system", content: LABEL_VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: input.hint?.trim()
                  ? `Barcode: ${input.code ?? "unknown"}. User note: ${input.hint.trim()}`
                  : `Barcode: ${input.code ?? "unknown"}.`,
              },
              { type: "image_url", image_url: { url: input.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: LABEL_VISION_JSON_SCHEMA },
      }),
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new LabelReadError("timeout", "That took too long. Try the photo again.", 504);
    }
    console.error("[label-ocr] request failed", err);
    throw new LabelReadError("vision_failed", "We couldn't read that label. Try again.", 502);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) {
    throw new LabelReadError("rate_limited", "The AI is busy — try again in a moment.", 429);
  }
  if (res.status === 402) {
    throw new LabelReadError("no_credits", "AI credits are exhausted for this workspace.", 402);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[label-ocr] vision error", res.status, body.slice(0, 300));
    throw new LabelReadError("vision_failed", "We couldn't read that label. Try again.", 502);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  let parsed: LabelVisionResult;
  try {
    parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as LabelVisionResult;
  } catch {
    throw new LabelReadError("bad_response", "We couldn't read that label. Try again.", 502);
  }

  const code = str(input.code) ?? "";
  const ingredients: ProductIngredient[] = (parsed.ingredients ?? [])
    .map((row) => {
      const name = str(row?.name);
      if (!name) return null;
      const ing: ProductIngredient = {
        name,
        amount: num(row?.amount),
        unit: str(row?.unit),
        percent_dv: num(row?.percent_dv),
        form: str(row?.form),
      };
      if (Array.isArray(row?.blend) && row.blend.length > 0) {
        ing.blend = row.blend.map(String);
      }
      return ing;
    })
    .filter((i): i is ProductIngredient => i != null);

  const med = parsed.medication ?? null;
  const category = toCategory(parsed.category);

  const product: UniversalProduct = {
    code,
    code_type: code ? "scanned" : "photo",
    category,
    name: str(parsed.name) ?? "Unnamed product",
    brand: str(parsed.brand),
    image_url: null,
    source: "label_ocr",
    // Read off a photo: trustworthy enough to log, flagged as user-verifiable.
    confidence: num(parsed.confidence) ?? 0.7,
    serving: {
      size: str(parsed.serving?.size),
      grams: num(parsed.serving?.grams),
      servings_per_container: num(parsed.serving?.servings_per_container),
    },
    nutrition_per_serving: {
      ...EMPTY_NUTRITION,
      calories: num(parsed.nutrition_per_serving?.calories),
      protein_g: num(parsed.nutrition_per_serving?.protein_g),
      carbs_g: num(parsed.nutrition_per_serving?.carbs_g),
      fat_g: num(parsed.nutrition_per_serving?.fat_g),
      fiber_g: num(parsed.nutrition_per_serving?.fiber_g),
    },
    ingredients,
    medication:
      category === "medication" || med
        ? {
            ndc: null,
            generic_name: str(med?.generic_name),
            brand_name: str(med?.brand_name),
            active_ingredients: (med?.active_ingredients ?? [])
              .map((a) => ({ name: str(a?.name) ?? "", strength: str(a?.strength) }))
              .filter((a) => a.name.length > 0),
            dosage_form: str(med?.dosage_form),
            route: str(med?.route),
            rx_or_otc: str(med?.rx_or_otc),
            labeler: null,
            directions: str(med?.directions),
          }
        : null,
    gs1: null,
    unreadable: Array.isArray(parsed.unreadable) ? parsed.unreadable.map(String) : [],
  };

  // Cache it under the barcode so the next person who scans this product gets
  // the panel we just read instead of another "unknown".
  if (code) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("barcode_cache").upsert(
        {
          code,
          category: product.category,
          source: product.source,
          payload: product as unknown as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "code" },
      );
    } catch (err) {
      console.error("[label-ocr] cache write failed", err);
    }
  }

  return product;
}
