import { trackEvent } from "@/lib/analytics";

/**
 * Signup funnel:
 *   1. funnel_auth_view             — visitor lands on /auth
 *   2. funnel_signup_method         — a sign-up method was chosen (email/google/apple)
 *   3. funnel_signup_submitted      — credentials submitted / OAuth handoff started
 *   4. funnel_signup_pending_confirm— account made, waiting on email confirmation
 *   5. funnel_signup_completed      — new account created (email or OAuth)
 *   6. funnel_first_activation      — first dose logged as "taken"
 *
 * Each step fires at most once per browser (deduped via localStorage) so
 * funnel counts stay clean even if a user revisits /auth or logs many doses.
 */

const KEY = "sw_funnel_steps";

export type FunnelStep =
  | "funnel_save_gate_shown"
  | "funnel_save_gate_click"
  | "funnel_auth_view"
  | "funnel_signup_method"
  | "funnel_signup_submitted"
  | "funnel_signup_pending_confirm"
  | "funnel_signup_completed"
  | "funnel_first_activation";

function getSeen(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

function markSeen(step: FunnelStep) {
  if (typeof window === "undefined") return;
  try {
    const seen = getSeen();
    seen[step] = Date.now();
    window.localStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    /* noop */
  }
}

export function trackFunnelStep(step: FunnelStep, properties: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const seen = getSeen();
  if (seen[step]) return;
  markSeen(step);
  trackEvent(step, properties);
}
