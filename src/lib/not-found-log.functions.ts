import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Public server function called from notFoundComponent. Rate-limited by
// (path, ip_hash) — same visitor bouncing on the same missing URL only
// logs once per 15 minutes. IPs are salted+hashed before storage.

const inputSchema = z.object({
  path: z.string().min(1).max(500),
  referrer: z.string().max(1000).optional().nullable(),
});

const DEDUP_WINDOW_MINUTES = 15;

async function hashIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null;
  const salt = process.env.NOT_FOUND_IP_SALT ?? "doseroutine-notfound-v1";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function extractIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export const logNotFound = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const req = getRequest();
      const ip = extractIp(req);
      const ipHash = await hashIp(ip);
      const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Dedup: skip if same (path, ip_hash) logged in the last 15 minutes.
      const since = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60_000).toISOString();
      const dedup = await supabaseAdmin
        .from("not_found_log")
        .select("id")
        .eq("path", data.path)
        .eq("ip_hash", ipHash ?? "")
        .gte("occurred_at", since)
        .limit(1);

      if (dedup.data && dedup.data.length > 0) {
        return { logged: false, reason: "deduped" as const };
      }

      await supabaseAdmin.from("not_found_log").insert({
        path: data.path,
        referrer: data.referrer ?? null,
        user_agent: ua,
        ip_hash: ipHash,
      });

      return { logged: true };
    } catch (err) {
      // Never let 404 logging break the 404 page render.
      console.error("logNotFound failed:", err);
      return { logged: false, reason: "error" as const };
    }
  });
