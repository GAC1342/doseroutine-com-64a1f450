/**
 * System prompt + strict JSON schema for the Quick-Add Meal photo scanner.
 *
 * The vision model IDENTIFIES and SIZES food only. Real nutrition numbers come
 * from the `foods` cache / USDA / Open Food Facts lookup; the model's per-100g
 * values are the fallback when no database match is found.
 */

export const MEAL_VISION_SYSTEM_PROMPT = `You are a nutrition analysis engine. You receive a photo of food and optional user context.
Return ONLY valid JSON matching the schema. No prose, no markdown.

Rules:
- Identify every distinct food item visible. Group identical items (e.g. "3 chicken wings").
- Estimate the cooked weight in grams of each item. Use visual references to calibrate scale: standard dinner plate = 26-27 cm, side plate = 20 cm, fork = 19 cm, adult hand/palm ~ 100 g of meat, fist ~ 1 cup ~ 150 g cooked rice/pasta, thumb ~ 1 tbsp fat, a deck of cards ~ 85 g meat.
- Account for cooking method: fried/oily/sauced foods add fat; assume restaurant portions are 20-30% larger and contain ~1 tbsp added oil/butter per savory item unless clearly plain.
- If the photo is a packaged product or nutrition label, read the label values directly and set source="label".
- If the image is not food, return {"is_food": false}.
- Provide per-100g macros for each item from your nutrition knowledge (USDA-style values).
- confidence is 0-1 for the whole meal: lower it for mixed dishes, hidden ingredients, bad lighting, or no scale reference.
- Give a short meal name (<= 5 words) and a health_score 1-10 based on protein density, fiber, processing, added sugar.`;

/** Strict JSON schema the model must return (structured-output compatible). */
export const MEAL_VISION_JSON_SCHEMA = {
  name: "meal_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["is_food", "meal_name", "confidence", "health_score", "notes", "items"],
    properties: {
      is_food: { type: "boolean" },
      meal_name: { type: ["string", "null"] },
      confidence: { type: ["number", "null"] },
      health_score: { type: ["integer", "null"] },
      notes: { type: ["string", "null"] },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "grams", "per_100g", "confidence", "source"],
          properties: {
            name: { type: "string" },
            grams: { type: "number" },
            per_100g: {
              type: "object",
              additionalProperties: false,
              required: ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"],
              properties: {
                calories: { type: "number" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" },
                fiber_g: { type: ["number", "null"] },
              },
            },
            confidence: { type: "number" },
            source: { type: "string", enum: ["vision", "label"] },
          },
        },
      },
    },
  },
} as const;

export type MealVisionItem = {
  name: string;
  grams: number;
  per_100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number | null;
  };
  confidence: number;
  source: "vision" | "label";
};

export type MealVisionResult = {
  is_food: boolean;
  meal_name: string | null;
  confidence: number | null;
  health_score: number | null;
  notes: string | null;
  items: MealVisionItem[];
};
