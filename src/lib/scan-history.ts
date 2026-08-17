/**
 * Scan history.
 *
 * Every time a barcode scan is used to fill in (or update) a product's
 * directions we keep a dated receipt: which label database answered, how
 * confident we were, and what the label actually said. That lets the user
 * look back at any item in their stack and see where its numbers came from.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ScanHistoryRow = Database["public"]["Tables"]["scan_history"]["Row"];

export type ScanHistoryInput = {
  barcode?: string | null;
  productName?: string | null;
  brand?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  confidenceScore?: number | null;
  confidenceLevel?: string | null;
  summary?: string | null;
  directions?: string | null;
  userCompoundId?: string | null;
};

function trim(value: string | null | undefined, max: number): string | null {
  const s = (value ?? "").trim();
  return s ? s.slice(0, max) : null;
}

/**
 * Record a scan. Best-effort: history is a nice-to-have, so a failure here
 * must never block the user from applying the directions.
 */
export async function recordScan(input: ScanHistoryInput): Promise<string | null> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("scan_history")
      .insert({
        user_id: userId,
        user_compound_id: input.userCompoundId ?? null,
        barcode: trim(input.barcode, 64),
        product_name: trim(input.productName, 200),
        brand: trim(input.brand, 120),
        source_name: trim(input.sourceName, 120),
        source_url: trim(input.sourceUrl, 500),
        confidence_score:
          typeof input.confidenceScore === "number" && Number.isFinite(input.confidenceScore)
            ? Math.round(input.confidenceScore)
            : null,
        confidence_level: trim(input.confidenceLevel, 20),
        summary: trim(input.summary, 500),
        directions: trim(input.directions, 1000),
        applied: true,
      })
      .select("id")
      .single();

    if (error) return null;
    return data?.id ?? null;
  } catch {
    return null;
  }
}

/** Attach a previously recorded scan to the stack item it ended up creating. */
export async function linkScanToCompound(scanId: string, userCompoundId: string): Promise<void> {
  try {
    await supabase
      .from("scan_history")
      .update({ user_compound_id: userCompoundId })
      .eq("id", scanId);
  } catch {
    // Linking is best-effort — the entry still exists in the overall history.
  }
}

/** Newest-first scan history for one stack item. */
export async function fetchScanHistory(userCompoundId: string): Promise<ScanHistoryRow[]> {
  const { data } = await supabase
    .from("scan_history")
    .select("*")
    .eq("user_compound_id", userCompoundId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as ScanHistoryRow[] | null) ?? [];
}
