import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Identify a pill from a photo (data URL, downscaled on the client). */
export const identifyPillPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string }) => {
    const url = typeof input?.imageDataUrl === "string" ? input.imageDataUrl : "";
    if (!url.startsWith("data:image/")) throw new Error("Send an image.");
    // ~6 MB of base64 — the client downscales well below this.
    if (url.length > 6_000_000) throw new Error("That photo is too large. Try a smaller one.");
    return { imageDataUrl: url };
  })
  .handler(async ({ data }) => {
    const { identifyPillFromImage } = await import("@/lib/pill-identifier.server");
    return identifyPillFromImage(data.imageDataUrl);
  });
