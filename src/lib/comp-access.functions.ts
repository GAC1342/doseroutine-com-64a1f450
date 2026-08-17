import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Complimentary ("comp") access — used to reward closed-testing participants
 * with 3 free months of Pro after they complete the 14-day test window.
 *
 * Codes are single-use. Redeeming one stamps `profiles.comp_access_until`,
 * which the access layer treats the same as an active subscription. This
 * deliberately bypasses Stripe / Apple / Google billing so we never have to
 * create a zero-dollar SKU in the stores.
 */

const CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export const redeemCompCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().min(4).max(32) }).parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const code = normalizeCode(data.code);
    if (!CODE_RE.test(code)) {
      return { ok: false as const, error: "invalid" as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("comp_codes")
      .select("code, months, redeemed_by, redeemed_at, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("redeemCompCode lookup failed", error);
      return { ok: false as const, error: "server_error" as const };
    }
    if (!row) return { ok: false as const, error: "invalid" as const };
    if (row.redeemed_by && row.redeemed_by !== userId) {
      return { ok: false as const, error: "already_used" as const };
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "expired" as const };
    }

    // Extend from whichever is later: now, or their existing comp window.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("comp_access_until")
      .eq("id", userId)
      .maybeSingle();

    const current = profile?.comp_access_until
      ? new Date(profile.comp_access_until as string).getTime()
      : 0;
    const base = new Date(Math.max(Date.now(), current));
    const until = new Date(base);
    until.setMonth(until.getMonth() + (row.months ?? 3));

    if (row.redeemed_by === userId) {
      // Idempotent replay of the same redemption — don't stack extra months.
      return {
        ok: true as const,
        months: row.months ?? 3,
        until: profile?.comp_access_until ?? null,
      };
    }

    // Claim the code first so two parallel redemptions can't both win.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("comp_codes")
      .update({ redeemed_by: userId, redeemed_at: new Date().toISOString() })
      .eq("code", code)
      .is("redeemed_by", null)
      .select("code")
      .maybeSingle();

    if (claimError) {
      console.error("redeemCompCode claim failed", claimError);
      return { ok: false as const, error: "server_error" as const };
    }
    if (!claimed) return { ok: false as const, error: "already_used" as const };

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ comp_access_until: until.toISOString() })
      .eq("id", userId);

    if (profileError) {
      console.error("redeemCompCode profile update failed", profileError);
      return { ok: false as const, error: "server_error" as const };
    }

    return { ok: true as const, months: row.months ?? 3, until: until.toISOString() };
  });

function randomCode(): string {
  // Ambiguity-free alphabet (no O/0/I/1).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/**
 * Admin-only: mint a batch of comp codes to hand out to testers.
 */
export const issueCompCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        count: z.number().int().min(1).max(200).default(20),
        months: z.number().int().min(1).max(24).default(3),
        reason: z.string().max(80).default("closed_testing"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = Array.from({ length: data.count }, () => ({
      code: randomCode(),
      months: data.months,
      reason: data.reason,
    }));

    const { data: inserted, error } = await supabaseAdmin
      .from("comp_codes")
      .insert(rows)
      .select("code, months");
    if (error) throw error;

    return { codes: (inserted ?? []).map((r) => r.code) };
  });
