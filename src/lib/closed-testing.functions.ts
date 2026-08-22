import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Public server function for the closed-testing sign-up page.
// Stores emails in a table only service_role can read, with basic rate
// limiting and bot filtering to keep the list clean.

const inputSchema = z.object({
  email: z.string().email().min(1).max(254),
  name: z.string().max(120).optional().nullable(),
  platformPreference: z
    .enum(["android", "android_phone", "android_tablet", "ios", "both"])
    .optional()
    .nullable(),
  source: z.string().max(80).optional().nullable(),
  attribution: z
    .object({
      utm_source: z.string().max(160).nullish(),
      utm_medium: z.string().max(160).nullish(),
      utm_campaign: z.string().max(160).nullish(),
      utm_content: z.string().max(160).nullish(),
      utm_term: z.string().max(160).nullish(),
      referrer: z.string().max(300).nullish(),
      landing_path: z.string().max(300).nullish(),
      last_source: z.string().max(160).nullish(),
    })
    .partial()
    .optional()
    .nullable(),
});

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX_PER_WINDOW) return false;
  b.count++;
  return true;
}

function maybeSweep() {
  if (buckets.size < 2000) return;
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
}

function extractIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

async function hashIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null;
  const salt = process.env.CLOSED_TESTING_IP_SALT ?? "doseroutine-closed-testing-v1";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export const joinClosedTesting = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const req = getRequest();
      const ip = extractIp(req);
      const ipHash = await hashIp(ip);
      const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

      if (!rateLimit(ip ?? "unknown")) {
        return { ok: false, error: "rate_limited" as const };
      }
      maybeSweep();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const emailNormalized = data.email.toLowerCase().trim();
      const attr = data.attribution ?? {};
      const { error } = await supabaseAdmin.from("closed_testing_signups").insert({
        email: emailNormalized,
        name: data.name?.trim() ?? null,
        platform_preference: data.platformPreference ?? null,
        source: data.source?.trim() || "closed-testing-page",
        ip_hash: ipHash,
        user_agent: ua,
        utm_source: attr.utm_source ?? null,
        utm_medium: attr.utm_medium ?? null,
        utm_campaign: attr.utm_campaign ?? null,
        utm_content: attr.utm_content ?? null,
        utm_term: attr.utm_term ?? null,
        referrer: attr.referrer ?? null,
        landing_path: attr.landing_path ?? null,
        attribution: (data.attribution ?? {}) as never,
      });

      if (error) {
        // Surface duplicate email as a friendly message instead of a 500.
        if (error.code === "23505") {
          return { ok: false, error: "already_signed_up" as const };
        }
        console.error("joinClosedTesting insert failed:", error);
        return { ok: false, error: "server_error" as const };
      }

      // Notify the team so testers can be added to the Play Console list
      // promptly. Never let a mail failure break the sign-up itself.
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const notifyTo =
          process.env.TESTER_NOTIFY_EMAIL ||
          process.env.LIBRARY_GEN_NOTIFY_EMAIL ||
          "support@doseroutine.com";
        const { count } = await supabaseAdmin
          .from("closed_testing_signups")
          .select("id", { count: "exact", head: true });

        await sendTemplateEmail("tester-signup-alert", notifyTo, {
          idempotencyKey: `tester-signup-${emailNormalized}`,
          templateData: {
            email: emailNormalized,
            name: data.name?.trim() ?? null,
            platform: data.platformPreference ?? null,
            source: data.source?.trim() || "closed-testing-page",
            utmSource: attr.utm_source ?? "direct",
            utmMedium: attr.utm_medium ?? "none",
            utmCampaign: attr.utm_campaign ?? "none",
            signedUpAt: new Date().toISOString(),
            totalSignups: count ?? null,
          },
        });
      } catch (mailErr) {
        console.error("joinClosedTesting notification failed:", mailErr);
      }

      // Step 1 of the tester onboarding sequence: a what-happens-next welcome.
      // The hourly sequence job handles the later steps (install reminder,
      // feedback prompt, 14-day wrap-up) and backfills this one if it fails.
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("tester-welcome", emailNormalized, {
          idempotencyKey: `tester-seq-welcome-${emailNormalized}`,
          templateData: {
            name: data.name?.trim() ?? null,
            platform: data.platformPreference ?? null,
          },
        });
        await supabaseAdmin
          .from("closed_testing_signups")
          .update({ welcome_email_at: new Date().toISOString() } as never)
          .eq("email", emailNormalized);
      } catch (welcomeErr) {
        console.error("joinClosedTesting welcome email failed:", welcomeErr);
      }

      return { ok: true };
    } catch (err) {
      console.error("joinClosedTesting failed:", err);
      return { ok: false, error: "server_error" as const };
    }
  });

// Public progress counter for the /closed-testing page. Returns only an
// aggregate count — never any tester emails or identifying data.
export const getClosedTestingProgress = createServerFn({ method: "GET" }).handler(async () => {
  const GOAL = 20;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("closed_testing_signups")
      .select("id", { count: "exact", head: true });
    if (error) {
      console.error("getClosedTestingProgress failed:", error);
      return { signups: null as number | null, goal: GOAL };
    }
    return { signups: count ?? 0, goal: GOAL };
  } catch (err) {
    console.error("getClosedTestingProgress failed:", err);
    return { signups: null as number | null, goal: GOAL };
  }
});
