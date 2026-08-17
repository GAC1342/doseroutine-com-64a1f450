import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InstallFunnelWindow = "7d" | "30d";

export type InstallFunnelStage = {
  key: string;
  label: string;
  hint: string;
  /** Unique human sessions (or real rows, for the final stage). */
  count: number;
  /** Conversion from the previous stage, 0-1. Null for the first stage. */
  fromPrevious: number | null;
  /** Conversion from the very top of the funnel, 0-1. */
  fromTop: number | null;
};

export type InstallFunnelSummary = {
  window: InstallFunnelWindow;
  from: string;
  stages: InstallFunnelStage[];
  /** Sessions dropped as bots/automation before any stage was counted. */
  excludedBotSessions: number;
  excludedBotHits: number;
  /** Sessions dropped purely because they crawled far too fast to be human. */
  excludedAutomationSessions: number;
  accountsCreated: number;
  /** Signups that came from a session that also saw the install page. */
  installToAccountRate: number;
  landingToAccountRate: number;
};

/** A session sweeping this many pages is automation (our own CI included). */
const BOT_PAGES_PER_SESSION = 15;
const BOT_BURST_PAGES = 8;
const BOT_BURST_WINDOW_MS = 60_000;

type Row = {
  session_id: string | null;
  event_name: string | null;
  path: string | null;
  properties: unknown;
  created_at: string | null;
};

/**
 * Admin-only install -> closed-testing signup funnel.
 *
 * Counts unique human sessions at each step (install page, install intent,
 * confirmed install, closed-testing landing page, signup started) and ends on
 * the ground-truth number: rows actually written to closed_testing_signups in
 * the same window. Bot user-agents AND high-rate automation sessions (our own
 * Lighthouse/attribution CI jobs) are excluded so the rates mean something.
 */
export const getInstallFunnel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const w = (input as { window?: string } | undefined)?.window;
    return { window: (w === "30d" ? "30d" : "7d") as InstallFunnelWindow };
  })
  .handler(async ({ context, data }): Promise<InstallFunnelSummary> => {
    const { supabase } = context;
    const { data: adminRow } = await supabase.rpc("is_admin");
    if (!adminRow) throw new Error("Forbidden");

    const days = data.window === "30d" ? 30 : 7;
    const from = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data: rows, error } = await supabase
      .from("analytics_events")
      .select("session_id, event_name, path, properties, created_at")
      .gte("created_at", from)
      .limit(20_000);
    if (error) throw new Error(error.message);

    const events = ((rows ?? []) as Row[]).map((r) => {
      const props = (r.properties ?? {}) as Record<string, unknown>;
      return {
        sessionId: r.session_id ?? "",
        event: r.event_name ?? "",
        path: r.path ?? "/",
        ts: r.created_at ? Date.parse(r.created_at) : 0,
        outcome: typeof props.outcome === "string" ? props.outcome : "",
        uaFlagged: props.is_bot === true || props.is_bot_inferred === true,
      };
    });

    // Behavioural pass: catches headless crawlers and our own CI jobs, which
    // present a normal user-agent but hit every audited route in seconds.
    const perSession = new Map<string, number[]>();
    for (const e of events) {
      if (!e.sessionId) continue;
      const list = perSession.get(e.sessionId);
      if (list) list.push(e.ts);
      else perSession.set(e.sessionId, [e.ts]);
    }
    const automationSessions = new Set<string>();
    for (const [sessionId, stamps] of perSession) {
      if (stamps.length >= BOT_PAGES_PER_SESSION) {
        automationSessions.add(sessionId);
        continue;
      }
      if (stamps.length >= BOT_BURST_PAGES) {
        const sorted = stamps.slice().sort((a, b) => a - b);
        const span = sorted[sorted.length - 1] - sorted[0];
        if (span >= 0 && span <= BOT_BURST_WINDOW_MS) automationSessions.add(sessionId);
      }
    }

    const excludedSessions = new Set<string>();
    let excludedBotHits = 0;
    for (const e of events) {
      if (e.uaFlagged || automationSessions.has(e.sessionId)) {
        excludedBotHits += 1;
        if (e.sessionId) excludedSessions.add(e.sessionId);
      }
    }

    const human = events.filter(
      (e) => !e.uaFlagged && !automationSessions.has(e.sessionId) && e.sessionId,
    );

    const sessionsWhere = (pred: (e: (typeof human)[number]) => boolean) => {
      const set = new Set<string>();
      for (const e of human) if (pred(e)) set.add(e.sessionId);
      return set;
    };

    const installViews = sessionsWhere(
      (e) => e.path.startsWith("/install") || e.event === "install_page_view",
    );
    const installIntent = sessionsWhere(
      (e) => e.event === "app_install_modal_install_click" || e.event === "install_cta_click",
    );
    const installed = sessionsWhere(
      (e) =>
        e.event === "pwa_installed" ||
        (e.event === "app_install_modal_prompt_outcome" && e.outcome === "accepted"),
    );
    const landing = sessionsWhere(
      (e) => e.event === "closed_testing_page_view" || e.path.startsWith("/closed-testing"),
    );
    const signupStarts = sessionsWhere((e) => e.event === "closed_testing_signup_start");

    // Ground truth for the last stage: rows actually written, not events.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count: accountsCount } = await supabaseAdmin
      .from("closed_testing_signups")
      .select("id", { count: "exact", head: true })
      .gte("created_at", from);
    const accountsCreated = accountsCount ?? 0;

    const raw: { key: string; label: string; hint: string; count: number }[] = [
      {
        key: "install_views",
        label: "Install page visits",
        hint: "Real people who opened /install (CI and crawlers removed).",
        count: installViews.size,
      },
      {
        key: "install_intent",
        label: "Tapped install",
        hint: "Started the add-to-home-screen / install prompt.",
        count: installIntent.size,
      },
      {
        key: "installed",
        label: "Confirmed installs",
        hint: "Browser reported the app was actually installed.",
        count: installed.size,
      },
      {
        key: "landing_views",
        label: "Closed-testing landing clicks",
        hint: "Reached the /closed-testing recruitment page.",
        count: landing.size,
      },
      {
        key: "signup_starts",
        label: "Signup form started",
        hint: "Submitted the tester form at least once.",
        count: signupStarts.size,
      },
      {
        key: "accounts",
        label: "Tester accounts created",
        hint: "Rows actually saved to the closed-testing list in this window.",
        count: accountsCreated,
      },
    ];

    const top = raw[0].count;
    const stages: InstallFunnelStage[] = raw.map((s, i) => {
      const prev = i === 0 ? null : raw[i - 1].count;
      return {
        ...s,
        fromPrevious: prev == null ? null : prev > 0 ? s.count / prev : 0,
        fromTop: i === 0 ? null : top > 0 ? s.count / top : 0,
      };
    });

    return {
      window: data.window,
      from,
      stages,
      excludedBotSessions: excludedSessions.size,
      excludedBotHits,
      excludedAutomationSessions: automationSessions.size,
      accountsCreated,
      installToAccountRate: installViews.size > 0 ? accountsCreated / installViews.size : 0,
      landingToAccountRate: landing.size > 0 ? accountsCreated / landing.size : 0,
    };
  });
