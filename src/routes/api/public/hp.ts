import { createFileRoute } from "@tanstack/react-router";

// Honeypot endpoint. Linked invisibly from the app shell with rel="nofollow"
// and aria-hidden so no human, screen reader, or well-behaved crawler will
// hit it. Anything that arrives here is either a scraper ignoring robots
// hints, an LLM training crawler walking every href, or an attacker probe.
//
// We log the hit into analytics_events (event_name = "honeypot_hit") via
// the service-role client so the row exists even without an anon RLS
// policy, then return a tiny 200 so the caller sees "success" and moves on.
//
// Never returns real content, never redirects, never sets a cookie.

export const Route = createFileRoute("/api/public/hp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ua = request.headers.get("user-agent") ?? "";
        const referer = request.headers.get("referer") ?? "";
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("analytics_events").insert({
            event_name: "honeypot_hit",
            session_id: null,
            path: "/api/public/hp",
            properties: {
              is_bot: true,
              crawler_trap: true,
              source: "hidden_honeypot_link",
              ua: ua.slice(0, 240),
              referer: referer.slice(0, 240),
              ip,
            },
          } as never);
        } catch {
          /* logging is best-effort */
        }
        return new Response("ok", {
          status: 200,
          headers: { "content-type": "text/plain", "x-robots-tag": "noindex, nofollow" },
        });
      },
    },
  },
});
