import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only view of closed-testing signups. The table is service_role-only,
 * so reads go through the admin client after verifying the caller is an admin.
 */
export const listTesterSignups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(500).default(200) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      data: rows,
      error,
      count,
    } = await supabaseAdmin
      .from("closed_testing_signups")
      .select(
        "id, email, name, platform_preference, source, created_at, invited_at, converted_at, notes, utm_source, utm_medium, utm_campaign, installed_at, retained_14d_at, welcome_email_at, install_reminder_at, feedback_prompt_at, wrapup_email_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) throw error;
    return { rows: rows ?? [], total: count ?? rows?.length ?? 0 };
  });

/** Admin-only: mark a signup as invited to the Play Console tester list. */
export const markTesterInvited = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), invited: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("closed_testing_signups")
      .update({ invited_at: data.invited ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

/**
 * Admin-only: send (or resend) the "the test is set to begin" email with the
 * Play Store opt-in link. Marks the signup as invited on first success and
 * uses a unique idempotency key per send so resends actually go out.
 */
export const sendTesterInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("closed_testing_signups")
      .select("id, email, name")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false as const, error: "not_found" as const };

    const optInUrl =
      process.env.PLAY_OPT_IN_URL ||
      "https://play.google.com/apps/internaltest/4701529032453556254";

    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const result = await sendTemplateEmail("tester-test-begins", row.email, {
        idempotencyKey: `tester-invite-${row.id}-${Date.now()}`,
        templateData: { name: row.name, optInUrl },
      });

      if (!result?.sent) {
        return { ok: false as const, error: "suppressed" as const };
      }
    } catch (err) {
      console.error("sendTesterInviteEmail failed:", err);
      return { ok: false as const, error: "send_failed" as const };
    }

    await supabaseAdmin
      .from("closed_testing_signups")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", row.id);

    return { ok: true as const, email: row.email };
  });

/**
 * Admin-only: signup → invite → install → 14-day retention funnel grouped by
 * UTM source/medium/campaign, plus page-view counts per source pulled from
 * analytics_events so a conversion rate can be shown.
 */
export const getTesterFunnelBySource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin.rpc("closed_testing_funnel_by_source");
    if (error) throw error;

    const { data: views } = await supabaseAdmin
      .from("analytics_events")
      .select("properties")
      .eq("event_name", "closed_testing_page_view")
      .limit(5000);

    const viewsBySource = new Map<string, number>();
    for (const v of views ?? []) {
      const props = (v.properties ?? {}) as Record<string, unknown>;
      if (props.is_bot === true) continue;
      const src =
        typeof props.utm_source === "string" && props.utm_source ? props.utm_source : "direct";
      viewsBySource.set(src, (viewsBySource.get(src) ?? 0) + 1);
    }

    return {
      rows: (rows ?? []).map((r) => ({
        ...r,
        views: viewsBySource.get(r.source) ?? null,
      })),
    };
  });

/** Admin-only: record an install or 14-day-retention milestone for a tester. */
export const setTesterMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        milestone: z.enum(["installed", "retained_14d"]),
        value: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const stamp = data.value ? new Date().toISOString() : null;
    const patch =
      data.milestone === "installed" ? { installed_at: stamp } : { retained_14d_at: stamp };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("closed_testing_signups")
      .update(patch)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
