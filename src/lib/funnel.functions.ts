import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FunnelWindow = "7d" | "30d";

export type FunnelSummary = {
  window: FunnelWindow;
  from: string;
  authViews: number;
  signups: number;
  activations: number;
  signupRate: number; // signups / authViews
  activationRate: number; // activations / signups
};

function notBotFilter() {
  // Exclude confirmed bots and server-inferred bots. is_bot_inferred is set
  // to false by default, so this safely filters old rows too.
  return "and(properties->>'is_bot' != 'true', properties->>'is_bot_inferred' != 'true')";
}

/**
 * Admin-only signup funnel summary. Uniques are counted by session_id (auth
 * view stage — user may not have an account yet) and by user_id afterwards.
 * Bot traffic is filtered out so the numbers reflect real humans.
 */
export const getFunnelSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const w = (input as { window?: string } | undefined)?.window;
    return { window: (w === "30d" ? "30d" : "7d") as FunnelWindow };
  })
  .handler(async ({ context, data }): Promise<FunnelSummary> => {
    const { supabase, userId } = context;
    const { data: adminRow } = await supabase.rpc("is_admin");
    if (!adminRow) throw new Error("Forbidden");
    void userId;

    const days = data.window === "30d" ? 30 : 7;
    const from = new Date(Date.now() - days * 86_400_000).toISOString();

    async function distinct(event: string, key: "session_id" | "user_id"): Promise<number> {
      const { data: rows, error } = await supabase
        .from("analytics_events")
        .select(key)
        .eq("event_name", event)
        .gte("created_at", from)
        .filter("properties", "not.cs", { is_bot: true })
        .filter("properties", "not.cs", { is_bot_inferred: true })
        .limit(10_000);
      if (error) return 0;
      const set = new Set<string>();
      for (const r of rows ?? []) {
        const v = (r as Record<string, unknown>)[key];
        if (typeof v === "string" && v) set.add(v);
      }
      return set.size;
    }

    const [authViews, signups, activations] = await Promise.all([
      distinct("funnel_auth_view", "session_id"),
      distinct("funnel_signup_completed", "user_id"),
      distinct("funnel_first_activation", "user_id"),
    ]);

    return {
      window: data.window,
      from,
      authViews,
      signups,
      activations,
      signupRate: authViews > 0 ? signups / authViews : 0,
      activationRate: signups > 0 ? activations / signups : 0,
    };
  });
