import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: full Search Console query list + daily trend for one post. */
export const getBlogPostSearchDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z
          .string()
          .min(1)
          .max(160)
          .regex(/^[a-z0-9-]+$/, "invalid slug"),
        days: z.number().int().min(7).max(90).default(28),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");
    const { loadBlogPostSearchDetail } = await import("@/lib/blog-post-search-detail.server");
    return loadBlogPostSearchDetail({ slug: data.slug, days: data.days });
  });

/** Admin-only: daily impressions / clicks / position for one query on one post. */
export const getBlogQueryTrend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z
          .string()
          .min(1)
          .max(160)
          .regex(/^[a-z0-9-]+$/, "invalid slug"),
        query: z.string().min(1).max(300),
        days: z.number().int().min(7).max(90).default(28),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");
    const { loadBlogQueryTrend } = await import("@/lib/blog-post-search-detail.server");
    return loadBlogQueryTrend({ slug: data.slug, query: data.query, days: data.days });
  });
