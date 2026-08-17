import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { MISSED_AFTER_MINUTES } from "@/lib/dose-status";

// Flips pending schedule_events past the missed window to status=missed.
// Called by pg_cron every ~10 minutes.

function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/hooks/mark-missed")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyCronSecret(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = new Date(Date.now() - MISSED_AFTER_MINUTES * 60_000).toISOString();

        const { data, error } = await supabaseAdmin
          .from("schedule_events")
          .update({ status: "missed" })
          .eq("status", "pending")
          .lt("scheduled_at", cutoff)
          .select("id");

        if (error) {
          console.error("mark-missed failed", error);
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ missed: data?.length ?? 0 });
      },
    },
  },
});
