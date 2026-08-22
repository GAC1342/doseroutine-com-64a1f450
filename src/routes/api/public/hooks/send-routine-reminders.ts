import { createFileRoute } from "@tanstack/react-router";
import webpush from "web-push";
import { timingSafeEqual } from "crypto";
import {
  isInQuietHours,
  localParts,
  routineAlertCopy,
  routineRemindersDue,
  type RoutineMealRow,
  type RoutineWorkoutRow,
} from "@/lib/routine-reminders";
import { createRunMetrics, instrumentSupabase } from "@/lib/cron-metrics";
import {
  applyDailyBudget,
  CAP_STATUS,
  resolveDailyLimit,
  usedBudget,
} from "@/lib/notification-budget";

// Called by pg_cron every 5 minutes. Alerts recurring routine anchors — the
// workout slots and meal times managed on /fitness — at their exact scheduled
// local minute. Dose reminders live in send-reminders; one-off planned
// workouts live in send-workout-reminders. Dedupe is one row per
// (routine, local day, channel) in routine_notification_log.

function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/hooks/send-routine-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyCronSecret(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();
        const metrics = createRunMetrics("send-routine-reminders", now);
        const db = instrumentSupabase(supabaseAdmin, metrics);

        // 1) Every recurring routine row that could alert.
        const [workoutsRes, mealsRes] = await Promise.all([
          db
            .from("workout_sessions")
            .select(
              "id, user_id, label, kind, planned_time, days_of_week, active, at_time_alert_on, pre_alert_on, pre_lead_min, interval_weeks, anchor_date, skipped_dates, time_overrides",
            )
            .eq("active", true)
            .not("planned_time", "is", null),
          db
            .from("meal_times")
            .select("id, user_id, label, planned_time, days_of_week, active, alerts_on")
            .eq("active", true)
            .eq("alerts_on", true),
        ]);

        if (workoutsRes.error || mealsRes.error) {
          const message = workoutsRes.error?.message ?? mealsRes.error?.message;
          console.error("send-routine-reminders: routine query failed", message);
          metrics.delivered({ errors: 1 });
          await metrics.finish(supabaseAdmin);
          return Response.json({ error: message }, { status: 500 });
        }

        const workouts = (workoutsRes.data ?? []) as unknown as RoutineWorkoutRow[];
        const meals = (mealsRes.data ?? []) as unknown as RoutineMealRow[];
        const userIds = Array.from(
          new Set([...workouts, ...meals].map((r) => r.user_id).filter(Boolean)),
        );
        if (!userIds.length) {
          await metrics.finish(supabaseAdmin);
          return Response.json({ sent: 0, skipped: 0 });
        }
        metrics.setContext({ usersScanned: userIds.length });

        // 2) Timezone + quiet hours per user.
        const { data: profiles } = await db
          .from("profiles")
          .select("id, timezone, quiet_hours_start, quiet_hours_end, daily_alert_limit")
          .in("id", userIds);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

        const workoutsByUser = new Map<string, RoutineWorkoutRow[]>();
        for (const w of workouts) {
          const list = workoutsByUser.get(w.user_id) ?? [];
          list.push(w);
          workoutsByUser.set(w.user_id, list);
        }
        const mealsByUser = new Map<string, RoutineMealRow[]>();
        for (const m of meals) {
          const list = mealsByUser.get(m.user_id) ?? [];
          list.push(m);
          mealsByUser.set(m.user_id, list);
        }

        // 3) Work out who is due right now, in their own local time.
        type Pending = ReturnType<typeof routineRemindersDue>[number] & { dayKey: string };
        const pending: Pending[] = [];
        let skipped = 0;
        for (const userId of userIds) {
          const profile = profileById.get(userId);
          const tz = profile?.timezone || "UTC";
          const { dayKey, minutes } = localParts(now, tz);
          const dueRows = routineRemindersDue({
            workouts: workoutsByUser.get(userId) ?? [],
            meals: mealsByUser.get(userId) ?? [],
            dayKey,
            nowMinutes: minutes,
          });
          if (!dueRows.length) continue;
          if (
            isInQuietHours(
              minutes,
              profile?.quiet_hours_start ?? null,
              profile?.quiet_hours_end ?? null,
            )
          ) {
            skipped += dueRows.length;
            continue;
          }
          for (const row of dueRows) pending.push({ ...row, dayKey });
        }

        if (!pending.length) {
          metrics.delivered({ skipped });
          await metrics.finish(supabaseAdmin);
          return Response.json({ sent: 0, skipped });
        }
        metrics.setContext({ candidates: pending.length });

        // 4) Drop anything already sent for this routine + day + channel.
        const { data: alreadyRows } = await db
          .from("routine_notification_log")
          .select("routine_id, day_key, channel")
          .in(
            "routine_id",
            pending.map((p) => p.routineId),
          );
        const already = new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
          (alreadyRows ?? []).map((r: any) => `${r.routine_id}|${r.day_key}|${r.channel}`),
        );

        // 4b) Daily alert budget. Routine anchors are the lowest priority, so
        //     they are the first thing to go quiet once a user has had their
        //     allowance of buzzes for the day. Capped rows still reach the
        //     in-app inbox — they just don't ring the phone.
        const pendingUserIds = Array.from(new Set(pending.map((p) => p.userId)));
        const dayKeys = Array.from(new Set(pending.map((p) => p.dayKey)));
        const [doseLogRes, routineLogRes] = await Promise.all([
          db
            .from("notification_log")
            .select("user_id, schedule_event_id, channel, status")
            .in("user_id", pendingUserIds)
            .in("day_key", dayKeys),
          db
            .from("routine_notification_log")
            .select("user_id, routine_id, channel, status")
            .in("user_id", pendingUserIds)
            .in("day_key", dayKeys),
        ]);
        const rowsByUser = new Map<
          string,
          Array<{ key: string; channel: string; status: string }>
        >();
        for (const row of [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
          ...(doseLogRes.data ?? []).map((r: any) => ({
            ...r,
            key: `dose:${r.schedule_event_id}`,
          })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
          ...(routineLogRes.data ?? []).map((r: any) => ({ ...r, key: `routine:${r.routine_id}` })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        ] as any[]) {
          if (!row.user_id) continue;
          const list = rowsByUser.get(row.user_id) ?? [];
          list.push(row);
          rowsByUser.set(row.user_id, list);
        }
        const usedByUser = new Map<string, number>();
        for (const [userId, rows] of rowsByUser) usedByUser.set(userId, usedBudget(rows));

        const buzzAllowed = new Set<string>();
        let cappedCount = 0;
        for (const userId of pendingUserIds) {
          const limit = resolveDailyLimit(profileById.get(userId)?.daily_alert_limit);
          const mine = pending.filter((p) => p.userId === userId);
          const { allowed, capped } = applyDailyBudget(
            mine.map((p) => ({
              category: p.routineKind === "workout" ? ("workout" as const) : ("meal" as const),
              id: p.routineId,
              time: p.time,
              payload: p,
            })),
            usedByUser.get(userId) ?? 0,
            limit,
          );
          for (const a of allowed) buzzAllowed.add(`${a.payload.routineId}|${a.payload.dayKey}`);
          cappedCount += capped.length;
        }

        // 5) Push subscriptions.
        const vapidPub = process.env.VAPID_PUBLIC_KEY;
        const vapidPriv = process.env.VAPID_PRIVATE_KEY;
        const vapidSub = process.env.VAPID_SUBJECT || "mailto:support@doseroutine.com";
        const pushReady = Boolean(vapidPub && vapidPriv);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const subsByUser = new Map<string, any[]>();
        if (pushReady) {
          webpush.setVapidDetails(vapidSub, vapidPub!, vapidPriv!);
          const { data: subs } = await db
            .from("push_subscriptions")
            .select("id, user_id, endpoint, p256dh, auth")
            .in("user_id", Array.from(new Set(pending.map((p) => p.userId))));
          for (const s of subs ?? []) {
            const list = subsByUser.get(s.user_id!) ?? [];
            list.push(s);
            subsByUser.set(s.user_id!, list);
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const logInserts: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const inboxInserts: any[] = [];
        let sent = 0;

        for (const row of pending) {
          const copy = routineAlertCopy(row);

          // In-app notification center mirror.
          const inboxKey = `${row.routineId}|${row.dayKey}|inbox`;
          if (!already.has(inboxKey)) {
            inboxInserts.push({
              user_id: row.userId,
              kind: row.routineKind === "workout" ? "routine-workout" : "routine-meal",
              title: copy.title,
              body: copy.body,
              url: copy.url,
              dedupe_key: `routine:${row.routineId}:${row.dayKey}`,
            });
            logInserts.push({
              user_id: row.userId,
              routine_kind: row.routineKind,
              routine_id: row.routineId,
              day_key: row.dayKey,
              channel: "inbox",
              status: "sent",
            });
            already.add(inboxKey);
          }

          // Push — unless the user has already used up their daily allowance.
          const pushKey = `${row.routineId}|${row.dayKey}|push`;
          if (!buzzAllowed.has(`${row.routineId}|${row.dayKey}`)) {
            if (!already.has(pushKey)) {
              logInserts.push({
                user_id: row.userId,
                routine_kind: row.routineKind,
                routine_id: row.routineId,
                day_key: row.dayKey,
                channel: "push",
                status: CAP_STATUS,
              });
              already.add(pushKey);
            }
            continue;
          }
          const subs = subsByUser.get(row.userId) ?? [];
          if (!pushReady || already.has(pushKey) || subs.length === 0) continue;

          const payload = JSON.stringify({
            title: copy.title,
            body: copy.body,
            url: copy.url,
            tag: `routine-${row.routineId}-${row.dayKey}`,
          });
          let pushOk = false;
          const deadIds: string[] = [];
          await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
            subs.map(async (s: any) => {
              try {
                await webpush.sendNotification(
                  { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                  payload,
                );
                pushOk = true;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
              } catch (err: any) {
                const status = err?.statusCode;
                if (status === 404 || status === 410) deadIds.push(s.id);
                else console.error("send-routine-reminders: push failed", status);
              }
            }),
          );
          if (deadIds.length) {
            await db.from("push_subscriptions").delete().in("id", deadIds);
            subsByUser.set(
              row.userId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
              subs.filter((s: any) => !deadIds.includes(s.id)),
            );
          }
          logInserts.push({
            user_id: row.userId,
            routine_kind: row.routineKind,
            routine_id: row.routineId,
            day_key: row.dayKey,
            channel: "push",
            status: pushOk ? "sent" : "error:all-endpoints-failed",
          });
          already.add(pushKey);
          if (pushOk) sent++;
        }

        if (inboxInserts.length) {
          const { error: inboxErr } = await db
            .from("notifications")
            .upsert(inboxInserts, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
          if (inboxErr)
            console.error("send-routine-reminders: notifications insert failed", inboxErr);
        }

        if (logInserts.length) {
          const { error: logErr } = await db.from("routine_notification_log").upsert(logInserts, {
            onConflict: "routine_id,day_key,channel",
            ignoreDuplicates: true,
          });
          if (logErr) console.error("send-routine-reminders: log insert failed", logErr);
        }

        metrics.delivered({
          push: sent,
          inbox: inboxInserts.length,
          skipped,
          capped: cappedCount,
        });
        const run = await metrics.finish(supabaseAdmin);
        return Response.json({
          sent,
          queued: inboxInserts.length,
          skipped,
          capped: cappedCount,
          metrics: {
            db_queries: run.db_queries,
            db_rows_read: run.db_rows_read,
            duration_ms: run.duration_ms,
            over_budget: run.over_budget,
          },
        });
      },
    },
  },
});
