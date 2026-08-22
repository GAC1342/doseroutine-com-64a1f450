/**
 * System prompt + JSON schema for reading a product's facts panel from a
 * photo. This is the fallback that makes any product scannable: when no
 * database knows the barcode, the user flips the box over and we read the
 * Nutrition Facts, Supplement Facts or Drug Facts panel ourselves.
 */

export const LABEL_VISION_SYSTEM_PROMPT = `You are reading a product label photo. Identify the panel type: Nutrition Facts, Supplement Facts, or Drug Facts.
Return ONLY JSON in the normalized product schema. For Supplement Facts, list every ingredient row with amount, unit (mg, mcg, IU, g, CFU) and %DV; include proprietary blends as one row with the total amount and the sub-ingredients in a 'blend' array. For Drug Facts, extract active ingredients with strength, purpose, dosage form, and the directions text. Read serving size and servings per container. If any number is unreadable set it to null and add the field name to 'unreadable'. Never guess amounts.`;

export const LABEL_VISION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category", "name", "ingredients", "unreadable"],
  properties: {
    category: { type: "string", enum: ["food", "supplement", "medication", "other"] },
    name: { type: "string" },
    brand: { type: ["string", "null"] },
    confidence: { type: ["number", "null"] },
    serving: {
      type: "object",
      additionalProperties: false,
      properties: {
        size: { type: ["string", "null"] },
        grams: { type: ["number", "null"] },
        servings_per_container: { type: ["number", "null"] },
      },
    },
    nutrition_per_serving: {
      type: "object",
      additionalProperties: false,
      properties: {
        calories: { type: ["number", "null"] },
        protein_g: { type: ["number", "null"] },
        carbs_g: { type: ["number", "null"] },
        fat_g: { type: ["number", "null"] },
        fiber_g: { type: ["number", "null"] },
      },
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string" },
          amount: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          percent_dv: { type: ["number", "null"] },
          form: { type: ["string", "null"] },
          blend: { type: "array", items: { type: "string" } },
        },
      },
    },
    medication: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        generic_name: { type: ["string", "null"] },
        brand_name: { type: ["string", "null"] },
        dosage_form: { type: ["string", "null"] },
        route: { type: ["string", "null"] },
        rx_or_otc: { type: ["string", "null"] },
        directions: { type: ["string", "null"] },
        active_ingredients: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name"],
            properties: { name: { type: "string" }, strength: { type: ["string", "null"] } },
          },
        },
      },
    },
    unreadable: { type: "array", items: { type: "string" } },
  },
} as const;

export type LabelVisionResult = {
  category?: string;
  name?: string;
  brand?: string | null;
  confidence?: number | null;
  serving?: {
    size?: string | null;
    grams?: number | null;
    servings_per_container?: number | null;
  } | null;
  nutrition_per_serving?: {
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
  } | null;
  ingredients?: {
    name?: string;
    amount?: number | null;
    unit?: string | null;
    percent_dv?: number | null;
    form?: string | null;
    blend?: string[];
  }[];
  medication?: {
    generic_name?: string | null;
    brand_name?: string | null;
    dosage_form?: string | null;
    route?: string | null;
    rx_or_otc?: string | null;
    directions?: string | null;
    active_ingredients?: { name?: string; strength?: string | null }[];
  } | null;
  unreadable?: string[];
};
