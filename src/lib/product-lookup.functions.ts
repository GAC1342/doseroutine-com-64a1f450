import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveProductLabel } from "@/lib/product-lookup-cache.server";

/**
 * Look up a scanned barcode and return the manufacturer's label plus the
 * values our dose form can pre-fill. Authenticated so the endpoint can't be
 * used as an open proxy. Never throws — a miss returns `{ found: false }`.
 */
export const lookupProductByBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ barcode: z.string().min(4).max(64) }).parse(data))
  .handler(async ({ data }) => resolveProductLabel(data.barcode));
