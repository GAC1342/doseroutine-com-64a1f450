import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Estimate a meal's macros from a photo (data URL, downscaled on the client). */
export const analyzeMealPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string }) => {
    const url = typeof input?.imageDataUrl === "string" ? input.imageDataUrl : "";
    if (!url.startsWith("data:image/")) throw new Error("Send an image.");
    // ~6 MB of base64 — the client downscales well below this.
    if (url.length > 6_000_000) throw new Error("That photo is too large. Try a smaller one.");
    return { imageDataUrl: url };
  })
  .handler(async ({ data }) => {
    const { estimateMealFromImage } = await import("@/lib/meal-scan.server");
    return estimateMealFromImage(data.imageDataUrl);
  });

/** Look a packaged food barcode up for its real published nutrition panel. */
export const lookupFoodLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { barcode: string }) => ({
    barcode: String(input?.barcode ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    const { lookupFoodBarcode } = await import("@/lib/meal-scan.server");
    return lookupFoodBarcode(data.barcode);
  });

/**
 * Quick product search used when a barcode can't be resolved to a published
 * panel, so the correct label can be picked before falling back to photo OCR.
 */
export const searchFoodLabels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({
    query: String(input?.query ?? "")
      .trim()
      .slice(0, 80),
  }))
  .handler(async ({ data }) => {
    const { searchFoodProducts } = await import("@/lib/meal-scan.server");
    return searchFoodProducts(data.query);
  });

/**
 * Barcode-first scan: pass a detected/typed barcode, a photo, or both.
 * The published nutrition panel wins when a barcode resolves; otherwise the
 * photo is parsed (label OCR first, visual estimate second).
 */
export const scanMealInput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      imageDataUrl?: string | null;
      barcode?: string | null;
      mode?: "both" | "barcode" | "photo";
      reference?: string | null;
      hint?: string | null;
    }) => {
      const url = typeof input?.imageDataUrl === "string" ? input.imageDataUrl : "";
      if (url && !url.startsWith("data:image/")) throw new Error("Send an image.");
      if (url.length > 6_000_000) throw new Error("That photo is too large. Try a smaller one.");
      const barcode = String(input?.barcode ?? "")
        .replace(/\D/g, "")
        .slice(0, 20);
      const mode =
        input?.mode === "barcode" || input?.mode === "photo" ? input.mode : ("both" as const);
      if (mode === "barcode" && barcode.length < 8) throw new Error("Send a barcode.");
      if (mode === "photo" && !url) throw new Error("Send a photo.");
      if (!url && barcode.length < 8) throw new Error("Send a photo or a barcode.");
      const references = ["none", "card", "quarter", "fork", "spoon", "thumb", "plate", "bowl"];
      const reference = references.includes(String(input?.reference))
        ? (String(input?.reference) as "none")
        : null;
      const hint =
        String(input?.hint ?? "")
          .trim()
          .slice(0, 200) || null;
      return { imageDataUrl: url || null, barcode: barcode || null, mode, reference, hint };
    },
  )
  .handler(async ({ data }) => {
    const { scanMeal } = await import("@/lib/meal-scan.server");
    return scanMeal(data);
  });

/**
 * Barcode lookup with a confidence score and ranked alternates, so the UI can
 * say how sure we are and offer the runner-up when the top hit looks wrong.
 */
export const lookupFoodBarcodeDetailed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { barcode: string }) => ({
    barcode: String(input?.barcode ?? "")
      .trim()
      .slice(0, 32),
  }))
  .handler(async ({ data }) => {
    const { lookupFoodBarcodeSmart } = await import("@/lib/meal-scan.server");
    return lookupFoodBarcodeSmart(data.barcode);
  });
