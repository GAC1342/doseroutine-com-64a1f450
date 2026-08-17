import { createFileRoute } from "@tanstack/react-router";
import { isBotUA, isAIAssistantUA } from "@/lib/bot-detection";

// Public analytics ingestion. Client used to insert directly into
// `analytics_events` with an anon RLS policy — which let anyone flood the
// table with fabricated rows. This route replaces that path:
//
//  1. Direct anon INSERT is revoked at the DB layer.
//  2. All anonymous events go through here.
//  3. We rate-limit per IP (best-effort in-memory) and reject payloads
//     that don't look like our first-party client.
//  4. Insert runs through the service-role client, so RLS is bypassed
//     but only for this narrow, validated shape.
//
// Authenticated writes still work via the browser client because the
// remaining `authenticated` INSERT policy allows `user_id = auth.uid()`.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60; // 60 events / minute / IP is plenty for real users
const MAX_BOT_PER_WINDOW = 120; // crawlers can burst; still cap them
const buckets = new Map<string, { count: number; botCount: number; resetAt: number }>();

function rateLimit(ip: string, isBot: boolean): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, botCount: isBot ? 1 : 0, resetAt: now + WINDOW_MS });
    return true;
  }
  const cap = isBot ? MAX_BOT_PER_WINDOW : MAX_PER_WINDOW;
  if ((isBot ? b.botCount : b.count) >= cap) return false;
  if (isBot) b.botCount++;
  else b.count++;
  return true;
}

// Occasional cleanup so the Map doesn't grow unbounded on long-lived workers.
function maybeSweep() {
  if (buckets.size < 5000) return;
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
}

type Payload = {
  event_name?: unknown;
  session_id?: unknown;
  path?: unknown;
  properties?: unknown;
};

function sanitize(input: Payload):
  | { ok: false }
  | {
      ok: true;
      row: {
        event_name: string;
        session_id: string | null;
        path: string | null;
        properties: Record<string, unknown>;
      };
    } {
  const eventName = typeof input.event_name === "string" ? input.event_name.trim() : "";
  if (eventName.length < 1 || eventName.length > 80) return { ok: false };

  const sessionId =
    typeof input.session_id === "string" && input.session_id.length <= 80 ? input.session_id : null;

  const path = typeof input.path === "string" && input.path.length <= 300 ? input.path : null;

  const props =
    input.properties && typeof input.properties === "object"
      ? (input.properties as Record<string, unknown>)
      : {};
  // Cheap size guard — matches the old DB check.
  let approxBytes = 0;
  try {
    approxBytes = JSON.stringify(props).length;
  } catch {
    return { ok: false };
  }
  if (approxBytes > 4096) return { ok: false };

  return {
    ok: true,
    row: { event_name: eventName, session_id: sessionId, path, properties: props },
  };
}

export const Route = createFileRoute("/api/public/analytics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";

        let body: Payload;
        try {
          body = (await request.json()) as Payload;
        } catch {
          return new Response("bad_request", { status: 400 });
        }

        const parsed = sanitize(body);
        if (!parsed.ok) return new Response("bad_request", { status: 400 });

        const ua =
          typeof parsed.row.properties.ua === "string"
            ? parsed.row.properties.ua
            : (request.headers.get("user-agent") ?? "");
        const isBot = isBotUA(ua);
        const isAI = isAIAssistantUA(ua);

        if (!rateLimit(ip, isBot)) {
          return new Response("rate_limited", { status: 429 });
        }
        maybeSweep();

        // Enrich the row with server-side bot classification. We keep AI crawlers
        // in the table because they're useful for SEO monitoring, but we mark
        // them so they don't pollute human conversion numbers.
        parsed.row.properties = {
          ...parsed.row.properties,
          is_bot: isBot,
          is_ai_crawler: isAI,
          is_bot_inferred: false,
          ua_source: parsed.row.properties.ua ? "client" : "header",
        };

        // Drop obvious bot page-view noise on non-SEO paths. We still record
        // library/content hits so we can see what crawlers are indexing.
        const isLibraryHit = parsed.row.path?.startsWith("/library") ?? false;
        const isPageView = parsed.row.event_name === "landing_page_view";
        if (isBot && isPageView && !isLibraryHit) {
          return new Response("ok", {
            status: 202,
            headers: { "content-type": "text/plain" },
          });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("analytics_events").insert(parsed.row as never);
        } catch {
          // best-effort — never surface analytics failures to the client
        }

        return new Response("ok", {
          status: 202,
          headers: { "content-type": "text/plain" },
        });
      },
    },
  },
});
