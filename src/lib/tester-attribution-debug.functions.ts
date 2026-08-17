import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT =
  "id, email, name, source, created_at, invited_at, installed_at, retained_14d_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing_path, attribution";

export type AttributionRow = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  created_at: string | null;
  invited_at: string | null;
  installed_at: string | null;
  retained_14d_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_path: string | null;
  attribution: Record<string, string | null> | null;
};

/**
 * Admin-only attribution debugger: look up the signup row(s) a visitor linked
 * to, either by email or by the attribution values captured in their browser.
 */
export const lookupTesterAttribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().trim().max(320).optional(),
        utmSource: z.string().trim().max(160).nullish(),
        utmCampaign: z.string().trim().max(160).nullish(),
        landingPath: z.string().trim().max(300).nullish(),
        limit: z.number().int().min(1).max(25).default(10),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let matchedBy: "email" | "attribution" | "recent" = "recent";
    let query = supabaseAdmin
      .from("closed_testing_signups")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    const email = data.email?.toLowerCase();
    if (email) {
      matchedBy = "email";
      query = query.ilike("email", email);
    } else if (data.utmSource || data.utmCampaign || data.landingPath) {
      matchedBy = "attribution";
      if (data.utmSource) query = query.eq("utm_source", data.utmSource);
      if (data.utmCampaign) query = query.eq("utm_campaign", data.utmCampaign);
      if (data.landingPath) query = query.eq("landing_path", data.landingPath);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    return {
      matchedBy,
      rows: ((rows ?? []) as unknown as AttributionRow[]).map((r) => ({
        ...r,
        attribution:
          r.attribution && typeof r.attribution === "object"
            ? (JSON.parse(JSON.stringify(r.attribution)) as Record<string, string | null>)
            : null,
      })),
    };
  });
