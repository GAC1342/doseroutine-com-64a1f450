import { createFileRoute } from "@tanstack/react-router";

declare const __BUILD_ID__: string;

const CURRENT_BUILD_ID = typeof __BUILD_ID__ === "string" && __BUILD_ID__ ? __BUILD_ID__ : "dev";

// Server start time — resets on each cold start of the worker. Useful as a
// coarse "did this instance just deploy / restart" signal.
const SERVER_START = Date.now();

type CheckResult = {
  name: string;
  ok: boolean;
  latency_ms: number | null;
  detail?: string;
};

async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ value: T | null; ms: number; error?: string }> {
  const start = Date.now();
  try {
    const value = await fn();
    return { value, ms: Date.now() - start };
  } catch (err) {
    return {
      value: null,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkDatabase(): Promise<CheckResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return { name: "database", ok: false, latency_ms: null, detail: "missing env" };
  }
  const { value, ms, error } = await timed(async () => {
    const res = await fetch(`${url}/rest/v1/compounds?select=id&limit=1`, {
      headers: { apikey: key, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  });
  return {
    name: "database",
    ok: value === true,
    latency_ms: ms,
    detail: error,
  };
}

async function checkAuth(): Promise<CheckResult> {
  const url = process.env.SUPABASE_URL;
  if (!url) return { name: "auth", ok: false, latency_ms: null, detail: "missing env" };
  const { value, ms, error } = await timed(async () => {
    const res = await fetch(`${url}/auth/v1/health`, { method: "GET" });
    if (!res.ok && res.status !== 401) throw new Error(`HTTP ${res.status}`);
    return true;
  });
  return { name: "auth", ok: value === true, latency_ms: ms, detail: error };
}

function checkAI(): CheckResult {
  const ok = Boolean(process.env.LOVABLE_API_KEY);
  return {
    name: "ai_gateway",
    ok,
    latency_ms: null,
    detail: ok ? "configured" : "no key",
  };
}

export const Route = createFileRoute("/api/public/status")({
  server: {
    handlers: {
      GET: async () => {
        const [db, auth] = await Promise.all([checkDatabase(), checkAuth()]);
        const ai = checkAI();
        const checks = [db, auth, ai];
        const healthy = checks.every((c) => c.ok);

        return new Response(
          JSON.stringify(
            {
              status: healthy ? "ok" : "degraded",
              build_id: CURRENT_BUILD_ID,
              server_started_at: new Date(SERVER_START).toISOString(),
              uptime_seconds: Math.round((Date.now() - SERVER_START) / 1000),
              now: new Date().toISOString(),
              checks,
            },
            null,
            2,
          ),
          {
            status: healthy ? 200 : 503,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, must-revalidate",
            },
          },
        );
      },
    },
  },
});
