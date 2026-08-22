import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export type AnalyzeMealResponse =
  | { ok: true; result: import("@/lib/analyze-meal.server").AnalyzeMealResult }
  | { ok: false; error: string; message: string; status: number };

/**
 * Quick-Add Meal photo analysis. Uploads the photo, runs the vision model,
 * grounds each item against the food cache / USDA, and returns rounded totals.
 * Errors come back as a friendly JSON shape instead of throwing at the client.
 */
export const analyzeMealPhotoV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { image_base64: string; meal_type?: string | null; user_text?: string | null }) => {
      const raw = typeof input?.image_base64 === "string" ? input.image_base64.trim() : "";
      const imageDataUrl = raw.startsWith("data:image/") ? raw : `data:image/jpeg;base64,${raw}`;
      if (!raw) throw new Error("Send a photo.");
      if (imageDataUrl.length > 8_000_000) throw new Error("That photo is too large.");
      const mealType = MEAL_TYPES.includes(input?.meal_type as (typeof MEAL_TYPES)[number])
        ? (input.meal_type as string)
        : null;
      const userText =
        String(input?.user_text ?? "")
          .trim()
          .slice(0, 300) || null;
      return { imageDataUrl, mealType, userText };
    },
  )
  .handler(async ({ data, context }): Promise<AnalyzeMealResponse> => {
    const { analyzeMeal, AnalyzeMealError } = await import("@/lib/analyze-meal.server");
    try {
      const result = await analyzeMeal({
        userId: context.userId,
        imageDataUrl: data.imageDataUrl,
        mealType: data.mealType,
        userText: data.userText,
      });
      return { ok: true, result };
    } catch (err) {
      if (err instanceof AnalyzeMealError) {
        return { ok: false, error: err.code, message: err.message, status: err.status };
      }
      console.error("[analyze-meal] unexpected failure", err);
      return {
        ok: false,
        error: "analysis_failed",
        message: "Something went wrong analyzing that photo. Try again.",
        status: 500,
      };
    }
  });
