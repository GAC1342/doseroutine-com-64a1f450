/**
 * Rate limiting for MCP tool calls.
 *
 * An assistant can fire tool calls in a tight loop (retries, chained planning
 * steps, a runaway agent), and every call here is a Supabase round trip. This
 * is a sliding-window counter keyed by caller + tool that rejects excess calls
 * with a clear, actionable message instead of letting them reach the backend.
 *
 * State lives in the Worker isolate's memory: no extra infrastructure, and it
 * caps the burst any single connection can generate. It is deliberately not a
 * globally exact quota — an isolate recycle resets counters — so keep the
 * limits generous enough that honest use never trips them.
 */

export type RateLimitRule = {
  /** Max calls allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | {
      allowed: false;
      /** Which budget ran out: this tool, or the account-wide budget. */
      scope: "tool" | "account";
      /** Seconds until the caller may retry. */
      retryAfterSeconds: number;
      rule: RateLimitRule;
    };

/** Per-tool budgets. Reads are cheap; writes are the ones worth throttling. */
export const READ_RULE: RateLimitRule = { limit: 30, windowMs: 60_000 };
export const WRITE_RULE: RateLimitRule = { limit: 12, windowMs: 60_000 };

/** Every tool call also counts against one account-wide budget. */
export const ACCOUNT_RULE: RateLimitRule = { limit: 60, windowMs: 60_000 };

const HITS = new Map<string, number[]>();

/** Hard cap on tracked keys so a hostile caller can't grow the map forever. */
const MAX_KEYS = 5_000;

function prune(now: number) {
  if (HITS.size <= MAX_KEYS) return;
  for (const [key, stamps] of HITS) {
    if (stamps.length === 0 || now - stamps[stamps.length - 1]! > ACCOUNT_RULE.windowMs) {
      HITS.delete(key);
    }
    if (HITS.size <= MAX_KEYS) break;
  }
}

function check(key: string, rule: RateLimitRule, now: number): number | null {
  const cutoff = now - rule.windowMs;
  const stamps = (HITS.get(key) ?? []).filter((t) => t > cutoff);
  if (stamps.length >= rule.limit) {
    HITS.set(key, stamps);
    const oldest = stamps[0]!;
    return Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000));
  }
  stamps.push(now);
  HITS.set(key, stamps);
  return null;
}

/** Roll back the most recent hit recorded for a key (used when a later budget rejects). */
function rollback(key: string) {
  const stamps = HITS.get(key);
  if (stamps && stamps.length > 0) stamps.pop();
}

/**
 * Record a call and decide whether it may proceed.
 *
 * `callerId` should be the verified user id; unauthenticated or unidentified
 * callers share the `anonymous` bucket so they can't out-spend real users.
 */
export function consumeRateLimit(
  callerId: string | null | undefined,
  toolName: string,
  rule: RateLimitRule,
  now: number = Date.now(),
): RateLimitDecision {
  prune(now);
  const caller = callerId?.trim() || "anonymous";
  const accountKey = `account:${caller}`;
  const toolKey = `tool:${caller}:${toolName}`;

  const toolRetry = check(toolKey, rule, now);
  if (toolRetry !== null) {
    return { allowed: false, scope: "tool", retryAfterSeconds: toolRetry, rule };
  }

  const accountRetry = check(accountKey, ACCOUNT_RULE, now);
  if (accountRetry !== null) {
    // The tool budget already recorded this call; undo it so a rejected call
    // doesn't also burn the per-tool allowance.
    rollback(toolKey);
    return {
      allowed: false,
      scope: "account",
      retryAfterSeconds: accountRetry,
      rule: ACCOUNT_RULE,
    };
  }

  const used = HITS.get(toolKey)?.length ?? 0;
  return { allowed: true, remaining: Math.max(0, rule.limit - used) };
}

/** Human-readable, actionable text for a rejected call. */
export function rateLimitMessage(toolName: string, decision: RateLimitDecision): string {
  if (decision.allowed) return "";
  const wait = decision.retryAfterSeconds;
  const waitText = wait === 1 ? "1 second" : `${wait} seconds`;
  if (decision.scope === "account") {
    return [
      `Rate limit reached: this DoseRoutine account has made ${decision.rule.limit} tool calls in the last minute.`,
      `What to do next: wait ${waitText} and try again, and prefer one call that covers a date range over many single-item calls.`,
    ].join(" ");
  }
  return [
    `Rate limit reached for \`${toolName}\`: ${decision.rule.limit} calls per minute per account.`,
    `What to do next: wait ${waitText} before calling \`${toolName}\` again.`,
    "If you are logging several items, batch the details into a single call instead of retrying in a loop.",
  ].join(" ");
}

/** Test/dev helper: forget all recorded calls. */
export function resetRateLimits() {
  HITS.clear();
}
