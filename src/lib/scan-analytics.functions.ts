import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ScanStats, ScanMissRow } from "@/lib/scan-analytics";

/** Admin-only: rollup of scan volume, time-to-result and per-API hit rates. */
export const getScanStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ days: z.number().int().min(1).max(180).default(14) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { data: stats, error } = await context.supabase.rpc("barcode_scan_stats", {
      _days: data.days,
    });
    if (error) throw error;
    return (stats ?? null) as unknown as ScanStats | null;
  });

/** Admin-only: barcodes that failed to resolve, most frequent first. */
export const getScanMisses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        days: z.number().int().min(1).max(180).default(30),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { data: rows, error } = await context.supabase.rpc("barcode_miss_report", {
      _days: data.days,
      _limit: data.limit,
    });
    if (error) throw error;
    return (rows ?? []) as unknown as ScanMissRow[];
  });
