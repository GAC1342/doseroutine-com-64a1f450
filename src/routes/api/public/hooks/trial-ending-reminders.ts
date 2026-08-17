import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

// Hourly cron. Emails anyone whose 7-day Pro trial is inside its final
// TRIAL_WARNING_DAYS window and who hasn't already been warned for this
// trial period. One email per trial period — the stamp column makes the
// job idempotent, so re-runs never double-send.

const DAY = 86_400_000;
const WARN_WITHIN_DAYS = 2;
const FINAL_WITHIN_DAYS = 1;
const MAX_PER_RUN = 200;
const UPGRADE_URL = "https://doseroutine.com/upgrade";

/**
 * One-click checkout link. When the plan will NOT auto-start we deep-link
 * straight into Stripe checkout for the billing period they trialled, so the
 * email button is a single tap. When it will auto-start, send them to the
 * plan screen instead (no second subscription).
 */
export function buildUpgradeUrl(priceId: string | null | undefined, willRenew: boolean): string {
  if (willRenew) return UPGRADE_URL;
  const plan = (priceId ?? "").includes("yearly") || (priceId ?? "").includes("annual")
    ? "yearly"
    : "monthly";
  return `${UPGRADE_URL}?checkout=1&plan=${plan}`;
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

/** Whole days (rounded up) until the trial ends; null when unknown. */
export function daysUntil(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / DAY);
}

/** True when this trial row is due for its single warning email. */
export function isWarningDue(
  row: {
    status?: string | null;
    current_period_end?: string | null;
    trial_ending_email_at?: string | null;
  },
  now: number,
): boolean {
  if (row.status !== "trialing") return false;
  if (row.trial_ending_email_at) return false;
  const days = daysUntil(row.current_period_end, now);
  if (days === null) return false;
  return days <= WARN_WITHIN_DAYS && days >= 0;
}

/** True when this trial row is due for its single final-day email. */
export function isFinalDayDue(
  row: {
    status?: string | null;
    current_period_end?: string | null;
    trial_final_email_at?: string | null;
  },
  now: number,
): boolean {
  if (row.status !== "trialing") return false;
  if (row.trial_final_email_at) return false;
  const days = daysUntil(row.current_period_end, now);
  if (days === null) return false;
  return days <= FINAL_WITHIN_DAYS && days >= 0;
}

export const Route = createFileRoute("/api/public/hooks/trial-ending-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyCronSecret(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();

        const { data: rows, error } = await supabaseAdmin
          .from("subscriptions")
          .select(
            "id, user_id, status, current_period_end, cancel_at_period_end, price_id, trial_ending_email_at, trial_final_email_at",
          )
          .eq("status", "trialing")
          .not("current_period_end", "is", null)
          .order("current_period_end", { ascending: true })
          .limit(MAX_PER_RUN);

        if (error) {
          console.error("trial-ending-reminders query failed:", error.message);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let sent = 0;
        let finalSent = 0;
        let skipped = 0;
        let failed = 0;

        for (const row of rows ?? []) {
          const warningDue = isWarningDue(row as Record<string, unknown>, now);
          const finalDue = isFinalDayDue(row as Record<string, unknown>, now);
          if (!warningDue && !finalDue) {
            skipped++;
            continue;
          }

          const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
          const email = userRes?.user?.email;
          if (!email) {
            skipped++;
            continue;
          }

          const daysLeft = daysUntil(row.current_period_end, now) ?? 0;
          const name =
            (userRes?.user?.user_metadata?.full_name as string | undefined) ??
            (userRes?.user?.user_metadata?.name as string | undefined) ??
            null;
          const willRenew = !row.cancel_at_period_end;
          const upgradeUrl = buildUpgradeUrl(row.price_id, willRenew);
          const stamp = new Date(now).toISOString();

          if (warningDue) {
            try {
              await sendTemplateEmail("trial-ending", email, {
                idempotencyKey: `trial-ending:${row.id}:${row.current_period_end}`,
                templateData: { name, daysLeft, upgradeUrl, willRenew },
              });
              sent++;
              const { error: stampError } = await supabaseAdmin
                .from("subscriptions")
                .update({ trial_ending_email_at: stamp })
                .eq("id", row.id);
              if (stampError) {
                console.error("trial-ending-reminders stamp failed:", stampError.message);
              }
            } catch (e) {
              failed++;
              console.error(
                "trial-ending-reminders send failed:",
                e instanceof Error ? e.message : String(e),
              );
            }
          }

          if (finalDue) {
            try {
              await sendTemplateEmail("trial-final-day", email, {
                idempotencyKey: `trial-final-day:${row.id}:${row.current_period_end}`,
                templateData: { name, upgradeUrl, willRenew },
              });
              finalSent++;
              const { error: stampError } = await supabaseAdmin
                .from("subscriptions")
                .update({ trial_final_email_at: stamp })
                .eq("id", row.id);
              if (stampError) {
                console.error("trial-final-day stamp failed:", stampError.message);
              }
            } catch (e) {
              failed++;
              console.error(
                "trial-final-day send failed:",
                e instanceof Error ? e.message : String(e),
              );
            }
          }
        }

        return new Response(JSON.stringify({ ok: true, sent, finalSent, skipped, failed }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
