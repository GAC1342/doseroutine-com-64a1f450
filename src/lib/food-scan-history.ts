/**
 * Food scan history.
 *
 * Every barcode a user scans for food is kept so they can look back and
 * re-add the same product in one tap — repeat groceries are the norm, and
 * re-scanning the same yoghurt every morning is exactly the kind of friction
 * that makes people stop logging.
 *
 * The row lives in `scan_history` (shared with supplement label scans, marked
 * by `source_name` starting with "food:"), and the nutrition panel itself
 * comes back out of the offline cache so a re-add works with no network.
 */
import { supabase } from "@/integrations/supabase/client";
import { canonicalGtin, cleanBarcode } from "@/lib/gtin";
import { getCachedPanel, type CachedPanel } from "@/lib/nutrition-cache";

export type FoodScanRecord = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  source: string;
  confidenceScore: number | null;
  confidenceLevel: string | null;
  scannedAt: string;
  /** Calories per saved serving, for the list subtitle. */
  calories: number | null;
};

const FOOD_PREFIX = "food:";

/** Record a food barcode scan. Best-effort — never blocks logging a meal. */
export async function recordFoodScan(input: {
  barcode: string;
  name: string;
  brand?: string | null;
  source: string;
  confidenceScore?: number | null;
  confidenceLevel?: string | null;
  calories?: number | null;
}): Promise<void> {
  try {
    const barcode = cleanBarcode(input.barcode);
    if (!barcode) return;
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return;
    await supabase.from("scan_history").insert({
      user_id: userId,
      barcode,
      product_name: input.name.slice(0, 200),
      brand: input.brand ? input.brand.slice(0, 120) : null,
      source_name: `${FOOD_PREFIX}${input.source}`.slice(0, 120),
      confidence_score:
        typeof input.confidenceScore === "number" ? Math.round(input.confidenceScore) : null,
      confidence_level: input.confidenceLevel ?? null,
      summary:
        typeof input.calories === "number" && input.calories > 0
          ? `${Math.round(input.calories)} kcal per serving`
          : null,
      applied: true,
    });
  } catch {
    /* history is a convenience, never a blocker */
  }
}

/** Most recent distinct food barcodes this user scanned. */
export async function listFoodScans(limit = 20): Promise<FoodScanRecord[]> {
  try {
    const { data, error } = await supabase
      .from("scan_history")
      .select(
        "id, barcode, product_name, brand, source_name, confidence_score, confidence_level, summary, created_at",
      )
      .like("source_name", `${FOOD_PREFIX}%`)
      .not("barcode", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit * 4);
    if (error || !data) return [];

    const seen = new Set<string>();
    const out: FoodScanRecord[] = [];
    for (const row of data) {
      const key = canonicalGtin(row.barcode ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const kcal = /(\d+)\s*kcal/.exec(row.summary ?? "");
      out.push({
        id: row.id,
        barcode: row.barcode ?? "",
        name: row.product_name ?? "Scanned product",
        brand: row.brand,
        source: (row.source_name ?? "").slice(FOOD_PREFIX.length) || "barcode",
        confidenceScore: row.confidence_score,
        confidenceLevel: row.confidence_level,
        scannedAt: row.created_at,
        calories: kcal ? Number(kcal[1]) : null,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Panel for a past scan, straight from the offline cache when we have it. */
export async function panelForPastScan(barcode: string): Promise<CachedPanel | null> {
  const entry = await getCachedPanel(barcode);
  return entry?.panel ?? null;
}

export async function forgetFoodScan(id: string): Promise<void> {
  try {
    await supabase.from("scan_history").delete().eq("id", id);
  } catch {
    /* ignore */
  }
}
