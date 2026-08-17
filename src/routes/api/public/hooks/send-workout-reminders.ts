import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import webpush from "web-push";
import { timingSafeEqual } from "crypto";
import { CAP_STATUS, localDayKey, resolveDailyLimit, usedBudget } from "@/lib/notification-budget";

// Called by pg_cron every ~10 minutes. Two jobs:
//   1) "planned"  — a workout with a start time is coming up within the user's
//                   lead window today.
//   2) "missed"   — a planned workout is still un-logged after its day (or
//                   after its start time today, once past the evening check
//                   hour).
// Dedupe lives in workout_notification_log (unique on log + kind + channel),
// so each nudge goes out at most once per channel.

function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Wall-clock parts for "now" in a given IANA timezone. */
function localParts(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value])) as Record<
    string,
    string
  >;
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  return {
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute),
  };
}

function timeLabel(hhmm: string | null): string {
  if (!hhmm) return "today";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return "today";
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

function minutesOfDay(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function isInQuietHours(nowMinutes: number, start: string | null, end: string | null): boolean {
  const s = minutesOfDay(start);
  const e = minutesOfDay(end);
  if (s == null || e == null || s === e) return false;
  if (s < e) return nowMinutes >= s && nowMinutes < e;
  return nowMinutes >= s || nowMinutes < e;
}

function previousDayKey(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/hooks/send-workout-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyCronSecret(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();

        // 1) Everyone with workout reminders switched on.
        const { data: settings, error: setErr } = await supabaseAdmin
          .from("workout_reminder_settings")
          .select("user_id, enabled, lead_minutes, missed_enabled, missed_check_hour")
          .eq("enabled", true);

        if (setErr) {
          console.error("send-workout-reminders: settings query failed", setErr);
          return Response.json({ error: setErr.message }, { status: 500 });
        }
        const active = settings ?? [];
        if (!active.length) return Response.json({ sent: 0, skipped: 0 });

        const userIds = Array.from(new Set(active.map((s: any) => s.user_id)));

        // 2) Profiles (timezone + quiet hours + email opt-out).
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select(
            "id, timezone, quiet_hours_start, quiet_hours_end, notify_email, daily_alert_limit",
          )
          .in("id", userIds);
        const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

        // 3) Candidate planned workouts: yesterday + today + tomorrow covers
        //    every timezone's "today" without a per-user round trip.
        const utcToday = now.toISOString().slice(0, 10);
        const from = previousDayKey(previousDayKey(utcToday));
        const to = new Date(now.getTime() + 2 * 86_400_000).toISOString().slice(0, 10);
        const { data: planned } = await supabaseAdmin
          .from("workout_logs")
          .select(
            "id, user_id, title, workout_type, performed_on, scheduled_time, duration_min, status",
          )
          .in("user_id", userIds)
          .eq("status", "planned")
          .gte("performed_on", from)
          .lte("performed_on", to);
        const plannedByUser = new Map<string, any[]>();
        for (const row of planned ?? []) {
          const list = plannedByUser.get(row.user_id) ?? [];
          list.push(row);
          plannedByUser.set(row.user_id, list);
        }

        // 4) Dedupe log.
        const logIds = (planned ?? []).map((p: any) => p.id);
        const alreadySent = new Set<string>();
        if (logIds.length) {
          const { data: rows } = await supabaseAdmin
            .from("workout_notification_log")
            .select("workout_log_id, kind, channel")
            .in("workout_log_id", logIds);
          for (const r of rows ?? []) alreadySent.add(`${r.workout_log_id}|${r.kind}|${r.channel}`);
        }

        // 5) Recipient emails.
        const emailByUser = new Map<string, string>();
        {
          const perPage = 1000;
          for (let page = 1; page <= 10; page++) {
            const { data: usersPage, error } = await supabaseAdmin.auth.admin.listUsers({
              page,
              perPage,
            });
            if (error || !usersPage) break;
            for (const u of usersPage.users ?? []) if (u.email) emailByUser.set(u.id, u.email);
            if ((usersPage.users?.length ?? 0) < perPage) break;
          }
        }

        // 6) Push subscriptions.
        const subsByUser = new Map<string, any[]>();
        const vapidPub = process.env.VAPID_PUBLIC_KEY;
        const vapidPriv = process.env.VAPID_PRIVATE_KEY;
        const vapidSub = process.env.VAPID_SUBJECT || "mailto:support@doseroutine.com";
        const pushReady = Boolean(vapidPub && vapidPriv);
        if (pushReady) {
          webpush.setVapidDetails(vapidSub, vapidPub!, vapidPriv!);
          const { data: subs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("id, user_id, endpoint, p256dh, auth")
            .in("user_id", userIds);
          for (const s of subs ?? []) {
            const list = subsByUser.get(s.user_id!) ?? [];
            list.push(s);
            subsByUser.set(s.user_id!, list);
          }
        }

        const siteUrl = process.env.SITE_URL || "https://doseroutine.com";
        const logInserts: any[] = [];
        // Mirror of every nudge into the in-app notification center.
        const inboxInserts: any[] = [];
        let sent = 0;
        let skipped = 0;
        let capped = 0;

        // Daily alert budget: workout nudges sit between doses and meals, and
        // stop buzzing once the user has had their allowance for the day. The
        // in-app inbox still gets every one of them.
        const remainingByUser = new Map<string, number>();
        {
          const dayKeyByUser = new Map<string, string>();
          for (const setting of active as any[]) {
            dayKeyByUser.set(
              setting.user_id,
              localDayKey(now, profileById.get(setting.user_id)?.timezone || "UTC"),
            );
          }
          const budgetDayKeys = Array.from(new Set(dayKeyByUser.values()));
          const since = new Date(now.getTime() - 36 * 3_600_000).toISOString();
          const [doseLogRes, routineLogRes, workoutLogRes] = await Promise.all([
            supabaseAdmin
              .from("notification_log")
              .select("user_id, schedule_event_id, channel, status")
              .in("user_id", userIds)
              .in("day_key", budgetDayKeys),
            supabaseAdmin
              .from("routine_notification_log")
              .select("user_id, routine_id, channel, status")
              .in("user_id", userIds)
              .in("day_key", budgetDayKeys),
            supabaseAdmin
              .from("workout_notification_log")
              .select("user_id, workout_log_id, kind, channel, status, sent_at")
              .in("user_id", userIds)
              .gte("sent_at", since),
          ]);
          const rowsByUser = new Map<string, any[]>();
          const push = (userId: string | null | undefined, row: any) => {
            if (!userId) return;
            const list = rowsByUser.get(userId) ?? [];
            list.push(row);
            rowsByUser.set(userId, list);
          };
          for (const r of (doseLogRes.data ?? []) as any[]) {
            push(r.user_id, { ...r, key: `dose:${r.schedule_event_id}` });
          }
          for (const r of (routineLogRes.data ?? []) as any[]) {
            push(r.user_id, { ...r, key: `routine:${r.routine_id}` });
          }
          for (const r of (workoutLogRes.data ?? []) as any[]) {
            // workout_notification_log has no day_key column, so bucket by the
            // user's local day derived from sent_at.
            const tz = profileById.get(r.user_id)?.timezone || "UTC";
            if (localDayKey(new Date(r.sent_at), tz) !== dayKeyByUser.get(r.user_id)) continue;
            push(r.user_id, { ...r, key: `workout:${r.workout_log_id}:${r.kind}` });
          }
          for (const userId of userIds) {
            const limit = resolveDailyLimit(profileById.get(userId)?.daily_alert_limit);
            remainingByUser.set(
              userId,
              limit === Infinity
                ? Number.POSITIVE_INFINITY
                : Math.max(0, limit - usedBudget(rowsByUser.get(userId) ?? [])),
            );
          }
        }

        for (const setting of active as any[]) {
          const profile = profileById.get(setting.user_id);
          const tz = profile?.timezone || "UTC";
          const { dayKey, minutes: nowMinutes } = localParts(now, tz);
          const quiet = isInQuietHours(
            nowMinutes,
            profile?.quiet_hours_start ?? null,
            profile?.quiet_hours_end ?? null,
          );
          if (quiet) {
            skipped++;
            continue;
          }

          const lead = Math.max(0, setting.lead_minutes ?? 30);
          const missedHour = Math.min(23, Math.max(0, setting.missed_check_hour ?? 20));
          const rows = plannedByUser.get(setting.user_id) ?? [];

          for (const row of rows) {
            const startMinutes = minutesOfDay(row.scheduled_time ?? null);
            let kind: "planned" | "missed" | null = null;

            if (row.performed_on === dayKey && startMinutes != null) {
              const remindAt = startMinutes - lead;
              if (nowMinutes >= remindAt && nowMinutes < startMinutes + 5) kind = "planned";
              else if (
                setting.missed_enabled &&
                nowMinutes >= Math.max(startMinutes + 60, missedHour * 60)
              )
                kind = "missed";
            } else if (row.performed_on < dayKey && setting.missed_enabled) {
              // Still sitting as "planned" after its day passed. Yesterday's
              // sessions wait for the evening check hour; older ones go now.
              const isYesterday = row.performed_on === previousDayKey(dayKey);
              if (!isYesterday || nowMinutes >= missedHour * 60) kind = "missed";
            }

            if (!kind) continue;

            const workoutName =
              (row.title && row.title.trim()) ||
              `${String(row.workout_type ?? "workout").replace(/^\w/, (c: string) => c.toUpperCase())} session`;
            const timeText =
              kind === "missed" && row.performed_on !== dayKey
                ? row.performed_on
                : timeLabel(row.scheduled_time ?? null);
            const detailText = row.duration_min ? `${Math.round(row.duration_min)} min` : "";
            const openUrl = `${siteUrl}/fitness?day=${row.performed_on}&workout=${row.id}`;

            inboxInserts.push({
              user_id: setting.user_id,
              kind: kind === "missed" ? "workout-missed" : "workout-planned",
              title: kind === "missed" ? `Missed: ${workoutName}` : `Coming up: ${workoutName}`,
              body:
                kind === "missed"
                  ? `Log it, move it, or skip it (${timeText}).`
                  : detailText
                    ? `${detailText} · ${timeText}`
                    : `Starts at ${timeText}`,
              url: `/fitness?day=${row.performed_on}&workout=${row.id}`,
              workout_log_id: row.id,
              dedupe_key: `workout:${row.id}:${kind}`,
            });

            // Daily alert cap: over the allowance this nudge stays in the
            // in-app inbox only.
            const remaining = remainingByUser.get(setting.user_id) ?? Number.POSITIVE_INFINITY;
            if (remaining <= 0) {
              const capKey = `${row.id}|${kind}|email`;
              if (!alreadySent.has(capKey)) {
                logInserts.push({
                  user_id: setting.user_id,
                  workout_log_id: row.id,
                  kind,
                  channel: "email",
                  status: CAP_STATUS,
                });
                alreadySent.add(capKey);
                alreadySent.add(`${row.id}|${kind}|push`);
                capped++;
              }
              continue;
            }
            if (Number.isFinite(remaining)) remainingByUser.set(setting.user_id, remaining - 1);

            // Email
            const emailKey = `${row.id}|${kind}|email`;
            const recipient = emailByUser.get(setting.user_id);
            if (!alreadySent.has(emailKey) && recipient && profile?.notify_email !== false) {
              try {
                const result = await sendTemplateEmail("workout-reminder", recipient, {
                  templateData: { kind, workoutName, timeText, detailText, openUrl },
                  idempotencyKey: `workout:${row.id}:${kind}:email`,
                });
                logInserts.push({
                  user_id: setting.user_id,
                  workout_log_id: row.id,
                  kind,
                  channel: "email",
                  status: result.sent ? "sent" : `skipped:${(result as any).reason ?? "unknown"}`,
                });
                alreadySent.add(emailKey);
                if (result.sent) sent++;
                else skipped++;
              } catch (err) {
                console.error("send-workout-reminders: email failed", err);
                logInserts.push({
                  user_id: setting.user_id,
                  workout_log_id: row.id,
                  kind,
                  channel: "email",
                  status: `error:${err instanceof Error ? err.message.slice(0, 120) : "unknown"}`,
                });
                alreadySent.add(emailKey);
              }
            }

            // Push
            const pushKey = `${row.id}|${kind}|push`;
            const subs = subsByUser.get(setting.user_id) ?? [];
            if (pushReady && !alreadySent.has(pushKey) && subs.length) {
              const payload = JSON.stringify({
                title: kind === "missed" ? `Missed: ${workoutName}` : `Coming up: ${workoutName}`,
                body:
                  kind === "missed"
                    ? `Log it, move it, or skip it (${timeText}).`
                    : detailText
                      ? `${detailText} · ${timeText}`
                      : `Starts at ${timeText}`,
                url: `/fitness?day=${row.performed_on}&workout=${row.id}`,
                tag: `workout-${kind}-${row.id}`,
              });
              let pushOk = false;
              const deadIds: string[] = [];
              await Promise.all(
                subs.map(async (s: any) => {
                  try {
                    await webpush.sendNotification(
                      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                      payload,
                    );
                    pushOk = true;
                  } catch (err: any) {
                    const status = err?.statusCode;
                    if (status === 404 || status === 410) deadIds.push(s.id);
                    else console.error("send-workout-reminders: push failed", status);
                  }
                }),
              );
              if (deadIds.length) {
                await supabaseAdmin.from("push_subscriptions").delete().in("id", deadIds);
                subsByUser.set(
                  setting.user_id,
                  subs.filter((s: any) => !deadIds.includes(s.id)),
                );
              }
              logInserts.push({
                user_id: setting.user_id,
                workout_log_id: row.id,
                kind,
                channel: "push",
                status: pushOk ? "sent" : "error:all-endpoints-failed",
              });
              alreadySent.add(pushKey);
              if (pushOk) sent++;
            }
          }
        }

        if (logInserts.length) {
          const { error: logErr } = await supabaseAdmin
            .from("workout_notification_log")
            .upsert(logInserts, {
              onConflict: "workout_log_id,kind,channel",
              ignoreDuplicates: true,
            });
          if (logErr) console.error("send-workout-reminders: log insert failed", logErr);
        }

        if (inboxInserts.length) {
          const { error: inboxErr } = await supabaseAdmin
            .from("notifications")
            .upsert(inboxInserts, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
          if (inboxErr)
            console.error("send-workout-reminders: notifications insert failed", inboxErr);
        }

        return Response.json({ sent, skipped, capped });
      },
    },
  },
});
