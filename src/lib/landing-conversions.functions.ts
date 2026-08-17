import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deviceFromUa,
  findBehavioralBotSessions,
  normalizeAnalyticsPath,
  type DeviceKind,
} from "@/lib/bot-sessions";

export type LandingWindow = "7d" | "30d";

export type LandingRow = {
  /** Landing page = first path recorded in the session. */
  path: string;
  device: DeviceKind;
  sessions: number;
  bounced: number;
  bounceRate: number;
  saveGateShown: number;
  saveGateClicks: number;
  saveGateClickRate: number;
  signups: number;
};

export type DeviceRow = Omit<LandingRow, "path">;

export type LandingConversions = {
  window: LandingWindow;
  from: string;
  byLanding: LandingRow[];
  byDevice: DeviceRow[];
  totalSessions: number;
};

const SAVE_SHOWN = new Set(["funnel_save_gate_shown", "save_gate_shown"]);
const SAVE_CLICK = new Set(["funnel_save_gate_click", "save_gate_click"]);
const SIGNUP = new Set(["funnel_signup_completed"]);

/**
 * Admin-only breakdown of bounce rate and save/signup conversions by landing
 * page and device. Bots are filtered with the same rules as the traffic
 * summary so the session counts line up.
 */
export const getLandingConversions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const w = (input as { window?: string } | undefined)?.window;
    return { window: (w === "30d" ? "30d" : "7d") as LandingWindow };
  })
  .handler(async ({ context, data }): Promise<LandingConversions> => {
    const { supabase } = context;
    const { data: adminRow } = await supabase.rpc("is_admin");
    if (!adminRow) throw new Error("Forbidden");

    const days = data.window === "30d" ? 30 : 7;
    const from = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data: rows, error } = await supabase
      .from("analytics_events")
      .select("session_id, event_name, path, properties, created_at")
      .gte("created_at", from)
      .order("created_at", { ascending: true })
      .limit(20_000);

    if (error) throw new Error(error.message);

    const events = (rows ?? [])
      .map((r) => {
        const props = (r.properties ?? {}) as Record<string, unknown>;
        return {
          sessionId: r.session_id ?? "",
          event: r.event_name ?? "",
          path: r.path ?? "/",
          ts: r.created_at ? Date.parse(r.created_at) : 0,
          uaFlagged: props.is_bot === true || props.is_bot_inferred === true,
          ua: typeof props.ua === "string" ? props.ua : "",
        };
      })
      .filter((e) => e.sessionId);

    const behavioral = findBehavioralBotSessions(events);
    const human = events.filter((e) => !e.uaFlagged && !behavioral.has(e.sessionId));

    type SessionAgg = {
      landing: string;
      device: DeviceKind;
      paths: Set<string>;
      saveShown: boolean;
      saveClicked: boolean;
      signedUp: boolean;
    };

    const sessions = new Map<string, SessionAgg>();
    for (const e of human) {
      let s = sessions.get(e.sessionId);
      if (!s) {
        s = {
          // Rows arrive in ascending time order, so the first one wins.
          landing: normalizeAnalyticsPath(e.path),
          device: deviceFromUa(e.ua),
          paths: new Set<string>(),
          saveShown: false,
          saveClicked: false,
          signedUp: false,
        };
        sessions.set(e.sessionId, s);
      }
      if (s.device === "unknown" && e.ua) s.device = deviceFromUa(e.ua);
      s.paths.add(normalizeAnalyticsPath(e.path));
      if (SAVE_SHOWN.has(e.event)) s.saveShown = true;
      if (SAVE_CLICK.has(e.event)) s.saveClicked = true;
      if (SIGNUP.has(e.event)) s.signedUp = true;
    }

    type Acc = {
      sessions: number;
      bounced: number;
      saveGateShown: number;
      saveGateClicks: number;
      signups: number;
    };
    const blank = (): Acc => ({
      sessions: 0,
      bounced: 0,
      saveGateShown: 0,
      saveGateClicks: 0,
      signups: 0,
    });

    const byKey = new Map<string, Acc & { path: string; device: DeviceKind }>();
    const byDevice = new Map<DeviceKind, Acc>();

    for (const s of sessions.values()) {
      const key = `${s.device}|${s.landing}`;
      let row = byKey.get(key);
      if (!row) {
        row = { ...blank(), path: s.landing, device: s.device };
        byKey.set(key, row);
      }
      let dev = byDevice.get(s.device);
      if (!dev) {
        dev = blank();
        byDevice.set(s.device, dev);
      }
      const bounced = s.paths.size <= 1 ? 1 : 0;
      for (const target of [row, dev]) {
        target.sessions += 1;
        target.bounced += bounced;
        if (s.saveShown) target.saveGateShown += 1;
        if (s.saveClicked) target.saveGateClicks += 1;
        if (s.signedUp) target.signups += 1;
      }
    }

    const finish = <T extends Acc>(a: T) => ({
      ...a,
      bounceRate: a.sessions > 0 ? a.bounced / a.sessions : 0,
      saveGateClickRate: a.saveGateShown > 0 ? a.saveGateClicks / a.saveGateShown : 0,
    });

    const byLanding = Array.from(byKey.values())
      .map(finish)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 40);

    const deviceRows = Array.from(byDevice.entries())
      .map(([device, acc]) => ({ device, ...finish(acc) }))
      .sort((a, b) => b.sessions - a.sessions);

    return {
      window: data.window,
      from,
      byLanding,
      byDevice: deviceRows,
      totalSessions: sessions.size,
    };
  });
