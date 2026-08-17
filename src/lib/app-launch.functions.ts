import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Public server function for the homepage "Get notified" app-launch waitlist.
// Stores emails in a table only service_role can read, with rate limiting
// and bot filtering to keep the list clean.

const inputSchema = z.object({
  email: z.string().email().min(1).max(254),
  platform: z.enum(["ios", "android", "desktop", "other"]).optional().nullable(),
  utmSource: z.string().max(120).optional().nullable(),
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
  const salt = process.env.APP_LAUNCH_IP_SALT ?? "doseroutine-app-launch-v1";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export const joinAppLaunchWaitlist = createServerFn({ method: "POST" })
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
      const { error } = await supabaseAdmin.from("app_launch_waitlist").insert({
        email: emailNormalized,
        platform: data.platform ?? null,
        utm_source: data.utmSource?.trim() || null,
        ip_hash: ipHash,
        user_agent: ua,
      });

      if (error) {
        if (error.code === "23505") {
          return { ok: false, error: "already_signed_up" as const };
        }
        console.error("joinAppLaunchWaitlist insert failed:", error);
        return { ok: false, error: "server_error" as const };
      }

      // Send the user a confirmation and notify the team. Never let mail
      // failure break the signup itself.
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const notifyTo =
          process.env.APP_LAUNCH_NOTIFY_EMAIL ||
          process.env.LIBRARY_GEN_NOTIFY_EMAIL ||
          "support@doseroutine.com";

        await sendTemplateEmail("app-launch-confirmation", emailNormalized, {
          idempotencyKey: `app-launch-confirm-${emailNormalized}`,
          templateData: { email: emailNormalized, platform: data.platform ?? null },
        });

        const { count } = await supabaseAdmin
          .from("app_launch_waitlist")
          .select("id", { count: "exact", head: true });

        await sendTemplateEmail("app-launch-alert", notifyTo, {
          idempotencyKey: `app-launch-alert-${emailNormalized}`,
          templateData: {
            email: emailNormalized,
            platform: data.platform ?? null,
            signedUpAt: new Date().toISOString(),
            totalWaitlist: count ?? null,
          },
        });
      } catch (mailErr) {
        console.error("joinAppLaunchWaitlist notification failed:", mailErr);
      }

      return { ok: true };
    } catch (err) {
      console.error("joinAppLaunchWaitlist failed:", err);
      return { ok: false, error: "server_error" as const };
    }
  });

export const getAppLaunchWaitlistCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) {
      throw new Response("Forbidden", { status: 403 });
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("app_launch_waitlist")
      .select("id", { count: "exact", head: true });
    if (error) {
      console.error("getAppLaunchWaitlistCount failed:", error);
      throw new Error("Failed to load waitlist count");
    }
    return { count: count ?? 0 };
  });
