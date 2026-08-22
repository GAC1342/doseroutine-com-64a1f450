import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

// Hourly cron. Walks the closed-testing signups and sends whichever step of
// the 14-day onboarding sequence is due for each tester:
//
//   day 0   welcome            — sent inline at sign-up, backfilled here
//   day 2   install reminder   — 2 days after invite, only if not installed
//   day 7   feedback prompt    — 7 days after install (or invite as fallback)
//   day 14  wrap-up            — 14 days after install (or invite)
//
// Each step stamps its own column, so a tester never receives the same step
// twice and the sequence stops on its own after the wrap-up.

const DAY = 86_400_000;
const INSTALL_REMINDER_AFTER_DAYS = 2;
const FEEDBACK_AFTER_DAYS = 7;
const WRAPUP_AFTER_DAYS = 14;
const MAX_PER_RUN = 60;

function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (now - t) / DAY;
}

type Step = "welcome" | "install-reminder" | "feedback" | "wrapup";

const STAMP_COLUMN: Record<Step, string> = {
  welcome: "welcome_email_at",
  "install-reminder": "install_reminder_at",
  feedback: "feedback_prompt_at",
  wrapup: "wrapup_email_at",
};

/** The single next step due for this tester, or null when nothing is due. */
export function nextDueStep(
  row: {
    created_at?: string | null;
    invited_at?: string | null;
    installed_at?: string | null;
    welcome_email_at?: string | null;
    install_reminder_at?: string | null;
    feedback_prompt_at?: string | null;
    wrapup_email_at?: string | null;
    sequence_opted_out?: boolean | null;
  },
  now: number,
): Step | null {
  if (row.sequence_opted_out) return null;

  // Wrap-up and feedback clocks start at install; fall back to the invite so
  // testers who installed before we tracked it still finish the sequence.
  const anchor = row.installed_at ?? row.invited_at ?? null;
  const sinceAnchor = daysSince(anchor, now);
  const sinceInvite = daysSince(row.invited_at, now);

  if (!row.welcome_email_at) return "welcome";

  if (!row.wrapup_email_at && sinceAnchor !== null && sinceAnchor >= WRAPUP_AFTER_DAYS) {
    return "wrapup";
  }

  if (!row.feedback_prompt_at && sinceAnchor !== null && sinceAnchor >= FEEDBACK_AFTER_DAYS) {
    return "feedback";
  }

  if (
    !row.install_reminder_at &&
    !row.installed_at &&
    sinceInvite !== null &&
    sinceInvite >= INSTALL_REMINDER_AFTER_DAYS
  ) {
    return "install-reminder";
  }

  return null;
}

export const Route = createFileRoute("/api/public/hooks/tester-onboarding-sequence")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyCronSecret(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();

        const { data: rows, error } = await supabaseAdmin
          .from("closed_testing_signups")
          .select(
            "id, email, name, platform_preference, created_at, invited_at, installed_at, welcome_email_at, install_reminder_at, feedback_prompt_at, wrapup_email_at, sequence_opted_out",
          )
          .eq("sequence_opted_out", false)
          .is("wrapup_email_at", null)
          .order("created_at", { ascending: true })
          .limit(500);

        if (error) {
          console.error("tester-onboarding-sequence: query failed", error);
          return Response.json({ error: error.message }, { status: 500 });
        }

        const optInUrl =
          process.env.PLAY_OPT_IN_URL ||
          "https://play.google.com/apps/internaltest/4701529032453556254";
        const feedbackUrl =
          process.env.TESTER_FEEDBACK_URL ||
          "mailto:support@doseroutine.com?subject=DoseRoutine%20tester%20feedback";

        let sent = 0;
        let suppressed = 0;
        let failed = 0;
        const byStep: Record<string, number> = {};

        for (const row of rows ?? []) {
          if (sent + suppressed >= MAX_PER_RUN) break;
          const step = nextDueStep(row, now);
          if (!step) continue;

          const templateData =
            step === "welcome"
              ? { name: row.name, platform: row.platform_preference }
              : step === "install-reminder"
                ? {
                    name: row.name,
                    optInUrl,
                    daysSinceInvite: Math.floor(daysSince(row.invited_at, now) ?? 0),
                  }
                : step === "feedback"
                  ? {
                      name: row.name,
                      feedbackUrl,
                      dayNumber: Math.floor(
                        daysSince(row.installed_at ?? row.invited_at, now) ?? FEEDBACK_AFTER_DAYS,
                      ),
                    }
                  : { name: row.name, feedbackUrl };

          const templateName =
            step === "welcome"
              ? "tester-welcome"
              : step === "install-reminder"
                ? "tester-install-reminder"
                : step === "feedback"
                  ? "tester-feedback-prompt"
                  : "tester-wrapup";

          try {
            const result = await sendTemplateEmail(templateName, row.email, {
              idempotencyKey: `tester-seq-${step}-${row.id}`,
              templateData,
            });
            if (result?.sent === false) suppressed++;
            else sent++;
            byStep[step] = (byStep[step] ?? 0) + 1;

            // Stamp either way: a suppressed recipient should not be retried.
            await supabaseAdmin
              .from("closed_testing_signups")
              .update({ [STAMP_COLUMN[step]]: new Date().toISOString() } as never)
              .eq("id", row.id);
          } catch (err) {
            failed++;
            console.error("tester-onboarding-sequence: send failed", step, err);
          }
        }

        return Response.json({ sent, suppressed, failed, byStep });
      },
    },
  },
});
