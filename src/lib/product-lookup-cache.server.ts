/**
 * Cached barcode lookups.
 *
 * Product labels don't change, so the first person to scan a bottle pays the
 * external round-trip and everyone after that gets an instant answer. Writes
 * go through the service-role client, and so do reads: the cache table grants
 * no direct access to app users at all.
 */
import { lookupBarcode, normalizeBarcode, type ProductLabel } from "@/lib/product-lookup.server";
import {
  buildPrefill,
  scorePrefillConfidence,
  summarisePrefill,
  type LabelPrefill,
  type PrefillConfidence,
} from "@/lib/label-directions";

export type ProductLookupResult =
  | { found: false; barcode: string | null }
  | {
      found: true;
      barcode: string;
      label: ProductLabel;
      prefill: LabelPrefill;
      summary: string;
      confidence: PrefillConfidence;
    };

export async function resolveProductLabel(raw: string): Promise<ProductLookupResult> {
  const barcode = normalizeBarcode(raw);
  if (!barcode) return { found: false, barcode: null };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  try {
    const { data } = await supabaseAdmin
      .from("product_labels")
      .select("payload")
      .eq("barcode", barcode)
      .maybeSingle();
    const cached = data?.payload as ProductLabel | null | undefined;
    if (cached && cached.name) return decorate(barcode, cached);
  } catch {
    // Cache miss or table unavailable — fall through to a live lookup.
  }

  const label = await lookupBarcode(barcode);
  if (!label) return { found: false, barcode };

  try {
    await supabaseAdmin
      .from("product_labels")
      .upsert(
        { barcode, source: label.sourceName, payload: JSON.parse(JSON.stringify(label)) as never },
        { onConflict: "barcode" },
      );
  } catch {
    // Caching is best-effort; the user still gets their result.
  }

  return decorate(barcode, label);
}

function decorate(barcode: string, label: ProductLabel): ProductLookupResult {
  const prefill = buildPrefill(label);
  return {
    found: true,
    barcode,
    label,
    prefill,
    summary: summarisePrefill(label, prefill),
    confidence: scorePrefillConfidence(label, prefill),
  };
}
