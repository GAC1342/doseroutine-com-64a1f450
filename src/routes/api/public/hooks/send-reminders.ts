import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import webpush from "web-push";
import { timingSafeEqual } from "crypto";
import { createRunMetrics, instrumentSupabase } from "@/lib/cron-metrics";
import { CAP_STATUS, localDayKey, resolveDailyLimit, usedBudget } from "@/lib/notification-budget";

// Called by pg_cron every ~10 minutes. Finds pending schedule_events whose
// scheduled_at is within the reminder lead time window, respects the user's
// quiet hours, dedupes via notification_log, and emails the recipient with a
// deep link to mark the dose taken.
//
// Batching strategy: one round trip per stage across ALL reminders in the
// batch — reminders, profiles, events, dedupe log, push subs — instead of
// per-reminder / per-event serial queries. Scales linearly with users, not
// (users × events).

function isInQuietHours(nowLocal: Date, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = nowLocal.getHours() * 60 + nowLocal.getMinutes();
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return false;
  if (s < e) return mins >= s && mins < e;
  return mins >= s || mins < e;
}

function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/hooks/send-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyCronSecret(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = new Date();
        const metrics = createRunMetrics("send-reminders", now);
        const db = instrumentSupabase(supabaseAdmin, metrics);

        // 1) All enabled email reminders.
        const { data: reminders, error: remErr } = await db
          .from("reminders")
          .select(
            "id, user_id, user_compound_id, channel, lead_time_minutes, enabled, user_compound:user_compounds(id, active, compound:compounds(name))",
          )
          .eq("enabled", true)
          .eq("channel", "email");

        if (remErr) {
          console.error("send-reminders: reminders query failed", remErr);
          metrics.delivered({ errors: 1 });
          await metrics.finish(supabaseAdmin);
          return Response.json({ error: remErr.message }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const activeReminders = (reminders ?? []).filter((r: any) => {
          const uc = r.user_compound;
          return uc && uc.active && r.user_compound_id;
        });
        if (!activeReminders.length) {
          await metrics.finish(supabaseAdmin);
          return Response.json({ sent: 0, skipped: 0 });
        }

        // 2) Batched profiles.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const userIds = Array.from(new Set(activeReminders.map((r: any) => r.user_id)));
        const { data: profiles } = await db
          .from("profiles")
          .select(
            "id, timezone, quiet_hours_start, quiet_hours_end, notify_email, daily_alert_limit",
          )
          .in("id", userIds);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

        // 3) Batched schedule_events. Widest possible window per reminder is
        //    ~60 min lookahead; we fetch once with the outer bound and filter
        //    per-reminder below.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const ucIds = Array.from(new Set(activeReminders.map((r: any) => r.user_compound_id!)));
        const outerStart = new Date(now.getTime() - 5 * 60_000).toISOString();
        const outerEnd = new Date(now.getTime() + 70 * 60_000).toISOString();
        const { data: allEvents } = await db
          .from("schedule_events")
          .select("id, user_compound_id, scheduled_at, dose_amount, dose_unit, status")
          .in("user_compound_id", ucIds)
          .eq("status", "pending")
          .gte("scheduled_at", outerStart)
          .lte("scheduled_at", outerEnd);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const eventsByUc = new Map<string, any[]>();
        for (const ev of allEvents ?? []) {
          const list = eventsByUc.get(ev.user_compound_id!) ?? [];
          list.push(ev);
          eventsByUc.set(ev.user_compound_id!, list);
        }

        // 4) Batched notification_log dedupe (both channels at once).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const allEventIds = (allEvents ?? []).map((e: any) => e.id);
        const alreadyLogged = { email: new Set<string>(), push: new Set<string>() };
        if (allEventIds.length) {
          const { data: existingLogs } = await db
            .from("notification_log")
            .select("schedule_event_id, channel")
            .in("schedule_event_id", allEventIds)
            .in("channel", ["email", "push"]);
          for (const row of existingLogs ?? []) {
            const channel = row.channel as "email" | "push";
            if (row.schedule_event_id) alreadyLogged[channel].add(row.schedule_event_id);
          }
        }

        // 5) Batched auth emails (auth.admin has no bulk-by-id, so paginate
        //    listUsers once and index by id).
        const emailByUser = new Map<string, string>();
        {
          const perPage = 1000;
          for (let page = 1; page <= 10; page++) {
            const { data: usersPage, error } = await db.auth.admin.listUsers({ page, perPage });
            if (error || !usersPage) break;
            for (const u of usersPage.users ?? []) {
              if (u.email) emailByUser.set(u.id, u.email);
            }
            if ((usersPage.users?.length ?? 0) < perPage) break;
          }
        }

        // 6) Batched push subs.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const subsByUser = new Map<string, any[]>();
        const vapidPub = process.env.VAPID_PUBLIC_KEY;
        const vapidPriv = process.env.VAPID_PRIVATE_KEY;
        const vapidSub = process.env.VAPID_SUBJECT || "mailto:support@doseroutine.com";
        if (vapidPub && vapidPriv) {
          webpush.setVapidDetails(vapidSub, vapidPub, vapidPriv);
          const { data: subs } = await db
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const logInserts: any[] = [];
        // Mirror of every nudge into the in-app notification center.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const inboxInserts: any[] = [];
        let sent = 0;
        let skipped = 0;

        // Flatten to (reminder, event) pairs and announce earliest-first, so a
        // user who hits the daily alert cap loses the latest dose nudges of the
        // day rather than an arbitrary one.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        const candidates: Array<{ rem: any; ev: any }> = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
        for (const rem of activeReminders as any[]) {
          const profile = profileById.get(rem.user_id);
          if (!profile || profile.notify_email === false) continue;

          const lead = rem.lead_time_minutes ?? 0;
          const windowStart = now.getTime() - 5 * 60_000;
          const windowEnd = now.getTime() + (lead + 10) * 60_000;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
          const events = (eventsByUc.get(rem.user_compound_id) ?? []).filter((ev: any) => {
            const t = new Date(ev.scheduled_at).getTime();
            return t >= windowStart && t <= windowEnd;
          });
          for (const ev of events) candidates.push({ rem, ev });
        }
        metrics.setContext({ usersScanned: userIds.length, candidates: candidates.length });
        candidates.sort(
          (a, b) =>
            new Date(a.ev.scheduled_at ?? 0).getTime() - new Date(b.ev.scheduled_at ?? 0).getTime(),
        );

        // Daily alert budget: how many buzzes each of these users has left today.
        const dayKeyByUser = new Map<string, string>();
        for (const { rem } of candidates) {
          if (dayKeyByUser.has(rem.user_id)) continue;
          dayKeyByUser.set(
            rem.user_id,
            localDayKey(now, profileById.get(rem.user_id)?.timezone || "UTC"),
          );
        }
        const remainingByUser = new Map<string, number>();
        if (dayKeyByUser.size) {
          const budgetUserIds = Array.from(dayKeyByUser.keys());
          const budgetDayKeys = Array.from(new Set(dayKeyByUser.values()));
          const [doseLogRes, routineLogRes] = await Promise.all([
            db
              .from("notification_log")
              .select("user_id, schedule_event_id, channel, status")
              .in("user_id", budgetUserIds)
              .in("day_key", budgetDayKeys),
            db
              .from("routine_notification_log")
              .select("user_id, routine_id, channel, status")
              .in("user_id", budgetUserIds)
              .in("day_key", budgetDayKeys),
          ]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
          const rowsByUser = new Map<string, any[]>();
          for (const row of [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
            ...(doseLogRes.data ?? []).map((r: any) => ({
              ...r,
              key: `dose:${r.schedule_event_id}`,
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
            ...(routineLogRes.data ?? []).map((r: any) => ({
              ...r,
              key: `routine:${r.routine_id}`,
            })),
          ]) {
            if (!row.user_id) continue;
            const list = rowsByUser.get(row.user_id) ?? [];
            list.push(row);
            rowsByUser.set(row.user_id, list);
          }
          for (const userId of budgetUserIds) {
            const limit = resolveDailyLimit(profileById.get(userId)?.daily_alert_limit);
            if (limit === Infinity) {
              remainingByUser.set(userId, Number.POSITIVE_INFINITY);
              continue;
            }
            remainingByUser.set(
              userId,
              Math.max(0, limit - usedBudget(rowsByUser.get(userId) ?? [])),
            );
          }
        }
        let capped = 0;

        {
          for (const { rem, ev } of candidates) {
            if (alreadyLogged.email.has(ev.id)) {
              skipped++;
              continue;
            }
            const profile = profileById.get(rem.user_id);
            const dayKey = dayKeyByUser.get(rem.user_id) ?? null;
            const tz = profile.timezone || "UTC";

            const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));

            if (
              isInQuietHours(
                nowLocal,
                profile.quiet_hours_start ?? null,
                profile.quiet_hours_end ?? null,
              )
            ) {
              skipped++;
              continue;
            }

            const recipient = emailByUser.get(rem.user_id);
            if (!recipient) {
              skipped++;
              continue;
            }

            const scheduledLocal = new Date(ev.scheduled_at ?? now).toLocaleString("en-US", {
              timeZone: tz,
              hour: "numeric",
              minute: "2-digit",
            });
            const doseText =
              ev.dose_amount != null && ev.dose_unit ? `${ev.dose_amount} ${ev.dose_unit}` : "";
            const markTakenUrl = `${siteUrl}/today?taken=${ev.id}`;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
            const uc = rem.user_compound as any;
            const compoundName = uc?.compound?.name || "Your dose";

            inboxInserts.push({
              user_id: rem.user_id,
              kind: "dose",
              title: `Time for ${compoundName}`,
              body: doseText
                ? `${doseText} · ${scheduledLocal}`
                : `Scheduled for ${scheduledLocal}`,
              url: `/today?taken=${ev.id}`,
              dedupe_key: `dose:${ev.id}`,
            });

            // Daily alert cap: past the allowance the dose still lands in the
            // in-app inbox above, it just stops buzzing the phone or inbox.
            const remaining = remainingByUser.get(rem.user_id) ?? Number.POSITIVE_INFINITY;
            if (remaining <= 0) {
              logInserts.push({
                user_id: rem.user_id,
                schedule_event_id: ev.id,
                day_key: dayKey,
                channel: "email",
                status: CAP_STATUS,
              });
              alreadyLogged.email.add(ev.id);
              alreadyLogged.push.add(ev.id);
              capped++;
              continue;
            }
            if (Number.isFinite(remaining)) remainingByUser.set(rem.user_id, remaining - 1);

            try {
              const result = await sendTemplateEmail("dose-reminder", recipient, {
                templateData: { compoundName, doseText, timeText: scheduledLocal, markTakenUrl },
                idempotencyKey: `reminder:${ev.id}:email`,
              });
              logInserts.push({
                user_id: rem.user_id,
                schedule_event_id: ev.id,
                day_key: dayKey,
                channel: "email",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
                status: result.sent ? "sent" : `skipped:${(result as any).reason ?? "unknown"}`,
              });
              alreadyLogged.email.add(ev.id);
              if (result.sent) {
                sent++;
                metrics.delivered({ email: 1 });
              } else skipped++;
            } catch (err) {
              console.error("send-reminders: send failed", err);
              metrics.delivered({ errors: 1 });
              logInserts.push({
                user_id: rem.user_id,
                schedule_event_id: ev.id,
                day_key: dayKey,
                channel: "email",
                status: `error:${err instanceof Error ? err.message.slice(0, 120) : "unknown"}`,
              });
            }

            // Push fan-out
            if (vapidPub && vapidPriv && !alreadyLogged.push.has(ev.id)) {
              const subs = subsByUser.get(rem.user_id) ?? [];
              if (subs.length) {
                const payload = JSON.stringify({
                  title: `Time for ${compoundName}`,
                  body: doseText
                    ? `${doseText} · ${scheduledLocal}`
                    : `Scheduled for ${scheduledLocal}`,
                  url: `/today?taken=${ev.id}`,
                  tag: `reminder-${ev.id}`,
                });
                let pushOk = false;
                const deadIds: string[] = [];
                const liveIds: string[] = [];
                await Promise.all(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
                  subs.map(async (s: any) => {
                    try {
                      await webpush.sendNotification(
                        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                        payload,
                      );
                      pushOk = true;
                      liveIds.push(s.id);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
                    } catch (err: any) {
                      const status = err?.statusCode;
                      if (status === 404 || status === 410) deadIds.push(s.id);
                      else console.error("send-reminders: push failed", status, err?.body);
                    }
                  }),
                );
                if (liveIds.length) {
                  await db
                    .from("push_subscriptions")
                    .update({ last_used_at: new Date().toISOString() })
                    .in("id", liveIds);
                }
                if (deadIds.length) {
                  await db.from("push_subscriptions").delete().in("id", deadIds);
                  // Drop from local cache so subsequent reminders in this run don't retry them.
                  subsByUser.set(
                    rem.user_id,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
                    subs.filter((s: any) => !deadIds.includes(s.id)),
                  );
                }
                logInserts.push({
                  user_id: rem.user_id,
                  schedule_event_id: ev.id,
                  day_key: dayKey,
                  channel: "push",
                  status: pushOk ? "sent" : "error:all-endpoints-failed",
                });

                alreadyLogged.push.add(ev.id);
                if (pushOk) {
                  sent++;
                  metrics.delivered({ push: 1 });
                }
              }
            }
          }
        }

        // Single write for all notification_log rows.
        if (logInserts.length) {
          const { error: logErr } = await db.from("notification_log").insert(logInserts);
          if (logErr) console.error("send-reminders: notification_log insert failed", logErr);
        }

        if (inboxInserts.length) {
          const { error: inboxErr } = await db
            .from("notifications")
            .upsert(inboxInserts, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
          if (inboxErr) console.error("send-reminders: notifications insert failed", inboxErr);
        }

        metrics.delivered({ inbox: inboxInserts.length, skipped, capped });
        const run = await metrics.finish(supabaseAdmin);
        return Response.json({
          sent,
          skipped,
          capped,
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
