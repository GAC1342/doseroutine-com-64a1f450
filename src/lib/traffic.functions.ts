import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { botFamilyFromUa, findBehavioralBotSessions } from "@/lib/bot-sessions";
import { isSpamReferrer } from "@/lib/referrer-spam";

export type FunnelWindow = "7d" | "30d";

export type TrafficSummary = {
  window: FunnelWindow;
  from: string;
  /** Unfiltered totals, matching what the raw analytics dashboard reports. */
  rawVisitors: number;
  rawPageviews: number;
  humanVisitors: number;
  humanPageviews: number;
  pagesPerHuman: number;
  topPages: { path: string; views: number }[];
  topSources: { source: string; visitors: number }[];
  botHits: number;
  botVisitors: number;
  aiCrawlerHits: number;
  /** Sessions caught by behaviour (crawl rate) rather than user-agent. */
  behavioralBotVisitors: number;
  behavioralBotHits: number;
  topBotAgent: string | null;
  botBreakdown: { family: string; hits: number }[];
  botTopPages: { path: string; views: number }[];
};

/**
 * Admin-only traffic summary. Separates human visitors from crawlers/bots and
 * surfaces top pages, sources, and bot families.
 */
export const getTrafficSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const w = (input as { window?: string } | undefined)?.window;
    return { window: (w === "30d" ? "30d" : "7d") as FunnelWindow };
  })
  .handler(async ({ context, data }): Promise<TrafficSummary> => {
    const { supabase, userId } = context;
    const { data: adminRow } = await supabase.rpc("is_admin");
    if (!adminRow) throw new Error("Forbidden");
    void userId;

    const days = data.window === "30d" ? 30 : 7;
    const from = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data: rows, error } = await supabase
      .from("analytics_events")
      .select("session_id, path, properties, created_at")
      .gte("created_at", from)
      .limit(10_000);

    if (error) throw new Error(error.message);

    const rawEvents = (rows ?? []).map((r) => {
      const props = (r.properties ?? {}) as Record<string, unknown>;
      const referrer = typeof props.referrer === "string" ? props.referrer : "";
      // Referral spam presents a normal UA and reads one page, so neither the
      // UA nor the behavioural pass catches it. Flag it on the referrer host.
      const spamReferral = isSpamReferrer(referrer);
      return {
        sessionId: r.session_id ?? "",
        path: r.path ?? "/",
        ts: r.created_at ? Date.parse(r.created_at) : 0,
        uaFlagged:
          props.is_bot === true || props.is_bot_inferred === true || spamReferral,
        isAI: props.is_ai_crawler === true,
        ua: typeof props.ua === "string" ? props.ua : "",
        source:
          typeof props.utm_source === "string" && props.utm_source
            ? props.utm_source
            : referrer
              ? "referral"
              : "direct",
      };
    });


    // Behavioural pass: user-agent checks miss headless crawlers that present a
    // normal desktop UA and no referrer. Those sessions give themselves away by
    // sweeping far more pages, far faster, than a person reads.
    const perSession = new Map<string, number[]>();
    for (const e of rawEvents) {
      if (!e.sessionId) continue;
      const list = perSession.get(e.sessionId);
      if (list) list.push(e.ts);
      else perSession.set(e.sessionId, [e.ts]);
    }
    const behavioralSessions = findBehavioralBotSessions(rawEvents);

    const events = rawEvents.map((e) => {
      const behavioral = !e.uaFlagged && behavioralSessions.has(e.sessionId);
      return { ...e, behavioral, isBot: e.uaFlagged || behavioral };
    });

    const rawVisitors = perSession.size;
    const rawPageviews = events.length;

    const humanEvents = events.filter((e) => !e.isBot);
    const humanSessions = new Set(humanEvents.map((e) => e.sessionId).filter(Boolean));
    const humanVisitors = humanSessions.size;
    const humanPageviews = humanEvents.length;
    const pagesPerHuman = humanVisitors > 0 ? humanPageviews / humanVisitors : 0;

    const pageCounts = new Map<string, number>();
    for (const e of humanEvents) {
      pageCounts.set(e.path, (pageCounts.get(e.path) ?? 0) + 1);
    }
    const topPages = Array.from(pageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }));

    const sourceCounts = new Map<string, number>();
    for (const e of humanEvents) {
      const key = e.source;
      sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    }
    const topSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, visitors]) => ({ source, visitors }));

    const botEvents = events.filter((e) => e.isBot);
    const botHits = botEvents.length;
    const botVisitors = new Set(botEvents.map((e) => e.sessionId).filter(Boolean)).size;
    const aiCrawlerHits = botEvents.filter((e) => e.isAI).length;
    const behavioralEvents = botEvents.filter((e) => e.behavioral);
    const behavioralBotHits = behavioralEvents.length;
    const behavioralBotVisitors = behavioralSessions.size;

    const botPageCounts = new Map<string, number>();
    for (const e of botEvents) {
      botPageCounts.set(e.path, (botPageCounts.get(e.path) ?? 0) + 1);
    }
    const botTopPages = Array.from(botPageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }));

    const familyCounts = new Map<string, number>();
    for (const e of botEvents) {
      const family = e.behavioral ? "Automated (crawl rate)" : botFamilyFromUa(e.ua);
      familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    }
    const botBreakdown = Array.from(familyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([family, hits]) => ({ family, hits }));

    const topBotAgent = botBreakdown[0]?.family ?? null;

    return {
      window: data.window,
      from,
      rawVisitors,
      rawPageviews,
      humanVisitors,
      humanPageviews,
      pagesPerHuman,
      topPages,
      topSources,
      botHits,
      botVisitors,
      aiCrawlerHits,
      behavioralBotVisitors,
      behavioralBotHits,
      topBotAgent,
      botBreakdown,
      botTopPages,
    };
  });
