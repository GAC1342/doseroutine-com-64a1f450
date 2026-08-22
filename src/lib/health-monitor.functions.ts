import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HealthWindow = "24h" | "7d" | "30d";

export type ErrorGroup = {
  fingerprint: string;
  kind: string;
  message: string;
  count: number;
  sessions: number;
  lastSeen: string;
  paths: string[];
};

export type PerfStat = {
  metric: string;
  p50: number;
  p75: number;
  p95: number;
  samples: number;
};

export type SlowRoute = {
  path: string;
  p75LoadMs: number;
  samples: number;
};

export type HealthSummary = {
  window: HealthWindow;
  from: string;
  totalErrors: number;
  affectedSessions: number;
  errorGroups: ErrorGroup[];
  vitals: PerfStat[];
  perf: PerfStat[];
  slowRoutes: SlowRoute[];
  slowResources: { resource: string; p75Ms: number; samples: number }[];
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round((sorted[idx] ?? 0) * 100) / 100;
}

function stat(metric: string, values: number[]): PerfStat {
  return {
    metric,
    p50: percentile(values, 50),
    p75: percentile(values, 75),
    p95: percentile(values, 95),
    samples: values.length,
  };
}

const WINDOW_DAYS: Record<HealthWindow, number> = { "24h": 1, "7d": 7, "30d": 30 };

/**
 * Admin-only production health summary: client error groups plus web-vital and
 * navigation-timing percentiles, read from `analytics_events`.
 */
export const getHealthSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const w = (input as { window?: string } | undefined)?.window;
    return { window: (w === "24h" || w === "30d" ? w : "7d") as HealthWindow };
  })
  .handler(async ({ context, data }): Promise<HealthSummary> => {
    const { supabase } = context;
    const { data: adminRow } = await supabase.rpc("is_admin");
    if (!adminRow) throw new Error("Forbidden");

    const from = new Date(Date.now() - WINDOW_DAYS[data.window] * 86_400_000).toISOString();
    const { data: rows, error } = await supabase
      .from("analytics_events")
      .select("event_name, session_id, path, properties, created_at")
      .in("event_name", [
        "client_error",
        "web_vital",
        "page_perf",
        "long_task",
        "route_perf",
        "slow_resource",
      ])
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(20_000);
    if (error) throw new Error(error.message);

    type Row = {
      event_name: string;
      session_id: string | null;
      path: string | null;
      properties: Record<string, unknown> | null;
      created_at: string;
    };
    const events = (rows ?? []) as unknown as Row[];
    const num = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

    // --- errors -------------------------------------------------------
    const groups = new Map<
      string,
      ErrorGroup & { sessionSet: Set<string>; pathSet: Set<string> }
    >();
    const errorSessions = new Set<string>();
    let totalErrors = 0;
    for (const e of events) {
      if (e.event_name !== "client_error") continue;
      const p = e.properties ?? {};
      if (p.is_bot === true) continue;
      totalErrors += 1;
      if (e.session_id) errorSessions.add(e.session_id);
      const fp = str(p.fingerprint) ?? str(p.message) ?? "unknown";
      const existing = groups.get(fp);
      const path = e.path ?? "";
      if (existing) {
        existing.count += 1;
        if (e.session_id) existing.sessionSet.add(e.session_id);
        if (path) existing.pathSet.add(path);
      } else {
        groups.set(fp, {
          fingerprint: fp,
          kind: str(p.kind) ?? "unknown",
          message: str(p.message) ?? "Unknown error",
          count: 1,
          sessions: 0,
          lastSeen: e.created_at,
          paths: [],
          sessionSet: new Set(e.session_id ? [e.session_id] : []),
          pathSet: new Set(path ? [path] : []),
        });
      }
    }
    const errorGroups: ErrorGroup[] = [...groups.values()]
      .map((g) => ({
        fingerprint: g.fingerprint,
        kind: g.kind,
        message: g.message,
        count: g.count,
        sessions: g.sessionSet.size,
        lastSeen: g.lastSeen,
        paths: [...g.pathSet].slice(0, 5),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    // --- vitals -------------------------------------------------------
    const vitalBuckets = new Map<string, number[]>();
    for (const e of events) {
      if (e.event_name !== "web_vital") continue;
      const p = e.properties ?? {};
      if (p.is_bot === true) continue;
      if (p.load_kind && p.load_kind !== "navigate") continue;
      const name = str(p.metric);
      const value = num(p.value);
      if (!name || value === null) continue;
      const list = vitalBuckets.get(name) ?? [];
      list.push(value);
      vitalBuckets.set(name, list);
    }
    const vitals = [...vitalBuckets.entries()]
      .map(([name, values]) => stat(name, values))
      .sort((a, b) => a.metric.localeCompare(b.metric));

    // --- navigation timing + blocking ---------------------------------
    const perfBuckets = new Map<string, number[]>();
    const routeLoad = new Map<string, number[]>();
    const slowRes = new Map<string, number[]>();
    for (const e of events) {
      const p = e.properties ?? {};
      if (p.is_bot === true) continue;
      if (e.event_name === "page_perf") {
        for (const key of [
          "ttfb_ms",
          "dom_content_loaded_ms",
          "load_ms",
          "transferred_bytes",
          "script_bytes",
        ]) {
          const v = num(p[key]);
          if (v === null) continue;
          const list = perfBuckets.get(key) ?? [];
          list.push(v);
          perfBuckets.set(key, list);
        }
        const load = num(p.load_ms);
        const path = e.path ?? str(p.path) ?? "";
        if (load !== null && path) {
          const list = routeLoad.get(path) ?? [];
          list.push(load);
          routeLoad.set(path, list);
        }
      } else if (e.event_name === "long_task") {
        const v = num(p.total_blocking_ms);
        if (v !== null) {
          const list = perfBuckets.get("total_blocking_ms") ?? [];
          list.push(v);
          perfBuckets.set("total_blocking_ms", list);
        }
      } else if (e.event_name === "route_perf") {
        const v = num(p.duration_ms);
        if (v !== null) {
          const list = perfBuckets.get("route_transition_ms") ?? [];
          list.push(v);
          perfBuckets.set("route_transition_ms", list);
        }
      } else if (e.event_name === "slow_resource") {
        const name = str(p.resource);
        const v = num(p.duration_ms);
        if (name && v !== null) {
          const list = slowRes.get(name) ?? [];
          list.push(v);
          slowRes.set(name, list);
        }
      }
    }

    const perf = [...perfBuckets.entries()].map(([metric, values]) => stat(metric, values));
    const slowRoutes: SlowRoute[] = [...routeLoad.entries()]
      .map(([path, values]) => ({
        path,
        p75LoadMs: percentile(values, 75),
        samples: values.length,
      }))
      .filter((r) => r.samples >= 3)
      .sort((a, b) => b.p75LoadMs - a.p75LoadMs)
      .slice(0, 10);
    const slowResources = [...slowRes.entries()]
      .map(([resource, values]) => ({
        resource,
        p75Ms: percentile(values, 75),
        samples: values.length,
      }))
      .sort((a, b) => b.p75Ms - a.p75Ms)
      .slice(0, 10);

    return {
      window: data.window,
      from,
      totalErrors,
      affectedSessions: errorSessions.size,
      errorGroups,
      vitals,
      perf,
      slowRoutes,
      slowResources,
    };
  });
