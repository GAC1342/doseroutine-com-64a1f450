import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: per-post Search Console metrics for the blog. */
export const getBlogSearchPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        days: z.number().int().min(7).max(90).default(28),
        longTailOnly: z.boolean().default(true),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");
    const { loadBlogSearchPerformance } = await import("@/lib/blog-search-performance.server");
    return loadBlogSearchPerformance({ days: data.days, longTailOnly: data.longTailOnly });
  });
