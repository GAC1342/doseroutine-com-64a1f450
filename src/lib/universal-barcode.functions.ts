import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LookupResult, UniversalProduct } from "@/lib/universal-product";

export type UniversalLookupResponse =
  | { ok: true; result: LookupResult }
  | { ok: false; error: string };

export type LabelReadResponse =
  | { ok: true; product: UniversalProduct }
  | { ok: false; error: string };

/** Scan → normalized product, routed across food, supplement and drug sources. */
export const lookupUniversalCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      code: string;
      lot?: string | null;
      expiry?: string | null;
      serial?: string | null;
      scanSource?: string | null;
      symbology?: string | null;
    }) => {
      const code = String(input?.code ?? "")
        .trim()
        .slice(0, 64);
      if (!code) throw new Error("A barcode is required.");
      return {
        code,
        lot: input?.lot ? String(input.lot).slice(0, 32) : null,
        expiry: input?.expiry ? String(input.expiry).slice(0, 32) : null,
        serial: input?.serial ? String(input.serial).slice(0, 32) : null,
        scanSource: input?.scanSource ? String(input.scanSource).slice(0, 32) : null,
        symbology: input?.symbology ? String(input.symbology).slice(0, 32) : null,
      };
    },
  )
  .handler(async ({ data, context }): Promise<UniversalLookupResponse> => {
    const { lookupUniversalBarcode } = await import("@/lib/universal-lookup.server");
    try {
      const result = await lookupUniversalBarcode({
        raw: data.code,
        gs1:
          data.lot || data.expiry || data.serial
            ? { lot: data.lot, expiry: data.expiry, serial: data.serial }
            : null,
        userId: context.userId,
        scanSource: data.scanSource,
        symbology: data.symbology,
      });
      return { ok: true, result };
    } catch (err) {
      console.error("[barcode] lookup failed", err);
      return { ok: false, error: "Lookup failed. Check your connection and try again." };
    }
  });

/** Label-photo fallback for products no database knows. */
export const readLabelPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string; code?: string | null; hint?: string | null }) => {
    const imageDataUrl = String(input?.imageDataUrl ?? "");
    if (!imageDataUrl.startsWith("data:image/")) throw new Error("A label photo is required.");
    if (imageDataUrl.length > 12_000_000) throw new Error("That photo is too large.");
    return {
      imageDataUrl,
      code: input?.code ? String(input.code).slice(0, 64) : null,
      hint: input?.hint ? String(input.hint).slice(0, 300) : null,
    };
  })
  .handler(async ({ data }): Promise<LabelReadResponse> => {
    const { readProductLabel, LabelReadError } = await import("@/lib/label-ocr.server");
    try {
      const product = await readProductLabel(data);
      return { ok: true, product };
    } catch (err) {
      if (err instanceof LabelReadError) return { ok: false, error: err.message };
      console.error("[label-ocr] failed", err);
      return { ok: false, error: "We couldn't read that label. Try again." };
    }
  });

/** Report a wrong field so the next scan of this product is right. */
export const reportBarcodeCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { code: string; field: string; oldValue?: string | null; newValue: string }) => {
      const code = String(input?.code ?? "")
        .trim()
        .slice(0, 64);
      const field = String(input?.field ?? "")
        .trim()
        .slice(0, 40);
      const newValue = String(input?.newValue ?? "")
        .trim()
        .slice(0, 200);
      if (!code || !field || !newValue)
        throw new Error("A correction needs a code, field and value.");
      return {
        code,
        field,
        oldValue: input?.oldValue ? String(input.oldValue).slice(0, 200) : null,
        newValue,
      };
    },
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { error } = await context.supabase.from("barcode_corrections").insert({
      code: data.code,
      field: data.field,
      old_value: data.oldValue,
      new_value: data.newValue,
      user_id: context.userId,
    });
    if (error) {
      console.error("[barcode] correction insert failed", error);
      return { ok: false };
    }
    return { ok: true };
  });
