import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import {
  MEAL_PHOTO_BATCH_SIZE,
  MEAL_PHOTO_RETENTION_OPTIONS,
  batched,
  normalizeRetentionDays,
  retentionCutoff,
} from "@/lib/meal-photo-retention";

// Weekly sweep: deletes meal photos older than each user's chosen retention
// window (7/30/90 days) and clears the photo reference on those meals. Macros
// and log rows are never touched.

function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/hooks/meal-photo-cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyCronSecret(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();
        // The widest window bounds the scan; each row is then judged against
        // its own owner's setting.
        const widest = Math.max(...MEAL_PHOTO_RETENTION_OPTIONS);
        const cutoff = retentionCutoff(now, Math.min(...MEAL_PHOTO_RETENTION_OPTIONS)).toISOString();

        const { data, error } = await supabaseAdmin
          .from("meals")
          .select("id,user_id,storage_path,logged_at")
          .not("storage_path", "is", null)
          .lt("logged_at", cutoff)
          .limit(4000);

        if (error) {
          console.error("meal-photo-cleanup query failed", error);
          return Response.json({ error: error.message }, { status: 500 });
        }

        const candidates = (data ?? []).filter((r) => Boolean(r.storage_path));
        if (candidates.length === 0) return Response.json({ removed: 0 });

        const userIds = [...new Set(candidates.map((r) => r.user_id).filter(Boolean))] as string[];
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id,meal_photo_retention_days")
          .in("id", userIds);
        const retention = new Map(
          (profiles ?? []).map((p) => [p.id, normalizeRetentionDays(p.meal_photo_retention_days)]),
        );

        const rows = candidates.filter((r) => {
          const days = retention.get(r.user_id as string) ?? 30;
          return new Date(r.logged_at ?? 0).getTime() < retentionCutoff(now, days).getTime();
        });
        if (rows.length === 0) return Response.json({ removed: 0 });

        let removed = 0;
        for (const chunk of batched(rows, MEAL_PHOTO_BATCH_SIZE)) {
          const paths = chunk.map((r) => r.storage_path as string);
          const { error: storageError } = await supabaseAdmin.storage
            .from("meal-photos")
            .remove(paths);
          if (storageError) {
            console.error("meal-photo-cleanup storage remove failed", storageError);
            continue;
          }
          const { error: clearError } = await supabaseAdmin
            .from("meals")
            .update({ storage_path: null, photo_url: null })
            .in(
              "id",
              chunk.map((r) => r.id),
            );
          if (clearError) {
            console.error("meal-photo-cleanup clear failed", clearError);
            continue;
          }
          removed += paths.length;
        }

        return Response.json({ removed, scanned: candidates.length, widestWindowDays: widest });
      },
    },
  },
});
