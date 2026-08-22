import { describe, it, expect, beforeEach } from "vitest";
import {
  ACCOUNT_RULE,
  READ_RULE,
  WRITE_RULE,
  consumeRateLimit,
  rateLimitMessage,
  resetRateLimits,
} from "../rate-limit";
import {
  friendlyDbError,
  friendlyUnexpectedError,
  guardCall,
  NOT_AUTHENTICATED_TEXT,
} from "../tool-guard";

beforeEach(() => resetRateLimits());

function spend(
  user: string | null | undefined,
  tool: string,
  times: number,
  rule = READ_RULE,
  now = 1_000_000,
) {
  let last = consumeRateLimit(user, tool, rule, now);
  for (let i = 1; i < times; i += 1) last = consumeRateLimit(user, tool, rule, now);
  return last;
}

describe("consumeRateLimit", () => {
  it("allows calls up to the tool limit", () => {
    const last = spend("u1", "list_doses", READ_RULE.limit);
    expect(last.allowed).toBe(true);
  });

  it("rejects the call past the tool limit with a retry hint", () => {
    spend("u1", "log_dose", WRITE_RULE.limit, WRITE_RULE);
    const decision = consumeRateLimit("u1", "log_dose", WRITE_RULE, 1_000_000);
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.scope).toBe("tool");
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
    expect(decision.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("frees the budget once the window slides past", () => {
    const t0 = 1_000_000;
    spend("u1", "log_dose", WRITE_RULE.limit, WRITE_RULE, t0);
    expect(consumeRateLimit("u1", "log_dose", WRITE_RULE, t0).allowed).toBe(false);
    const later = t0 + WRITE_RULE.windowMs + 1;
    expect(consumeRateLimit("u1", "log_dose", WRITE_RULE, later).allowed).toBe(true);
  });

  it("keeps budgets separate per user", () => {
    spend("u1", "log_dose", WRITE_RULE.limit, WRITE_RULE);
    expect(consumeRateLimit("u1", "log_dose", WRITE_RULE, 1_000_000).allowed).toBe(false);
    expect(consumeRateLimit("u2", "log_dose", WRITE_RULE, 1_000_000).allowed).toBe(true);
  });

  it("keeps budgets separate per tool", () => {
    spend("u1", "log_dose", WRITE_RULE.limit, WRITE_RULE);
    expect(consumeRateLimit("u1", "log_meal", WRITE_RULE, 1_000_000).allowed).toBe(true);
  });

  it("enforces an account-wide ceiling across different tools", () => {
    const now = 2_000_000;
    let calls = 0;
    for (let i = 0; i < ACCOUNT_RULE.limit + 5; i += 1) {
      const tool = `tool_${i % 10}`;
      const decision = consumeRateLimit("u1", tool, READ_RULE, now);
      if (decision.allowed) calls += 1;
      else {
        expect(decision.scope).toBe("account");
        break;
      }
    }
    expect(calls).toBe(ACCOUNT_RULE.limit);
  });

  it("does not burn the per-tool budget on an account-level rejection", () => {
    const now = 3_000_000;
    for (let i = 0; i < ACCOUNT_RULE.limit; i += 1) {
      consumeRateLimit("u1", `tool_${i % 10}`, READ_RULE, now);
    }
    const before = consumeRateLimit("u1", "fresh_tool", READ_RULE, now);
    expect(before.allowed).toBe(false);
    // After the account window slides, the untouched tool still has its full budget.
    const later = now + ACCOUNT_RULE.windowMs + 1;
    const after = consumeRateLimit("u1", "fresh_tool", READ_RULE, later);
    expect(after.allowed).toBe(true);
    if (after.allowed) expect(after.remaining).toBe(READ_RULE.limit - 1);
  });

  it("pools unauthenticated callers into one bucket", () => {
    spend(null, "search_compounds", READ_RULE.limit);
    expect(consumeRateLimit(undefined, "search_compounds", READ_RULE, 1_000_000).allowed).toBe(
      false,
    );
  });
});

describe("rateLimitMessage", () => {
  it("names the tool, the limit, and the wait", () => {
    spend("u1", "log_meal", WRITE_RULE.limit, WRITE_RULE);
    const decision = consumeRateLimit("u1", "log_meal", WRITE_RULE, 1_000_000);
    const message = rateLimitMessage("log_meal", decision);
    expect(message).toContain("log_meal");
    expect(message).toContain(String(WRITE_RULE.limit));
    expect(message).toMatch(/wait \d+ seconds?/);
    expect(message).toContain("What to do next");
  });

  it("explains the account-wide ceiling differently", () => {
    const now = 4_000_000;
    for (let i = 0; i < ACCOUNT_RULE.limit; i += 1) {
      consumeRateLimit("u1", `tool_${i % 10}`, READ_RULE, now);
    }
    const decision = consumeRateLimit("u1", "another_tool", READ_RULE, now);
    const message = rateLimitMessage("another_tool", decision);
    expect(message).toContain("account");
    expect(message).toContain("What to do next");
  });
});

describe("friendlyDbError", () => {
  const cases: Array<[string, RegExp]> = [
    ["42501", /Not allowed|reconnect/i],
    ["PGRST116", /Nothing found|list the items/i],
    ["23505", /already exists/i],
    ["23503", /no longer exists/i],
    ["22P02", /wrong format/i],
    ["57014", /took too long/i],
  ];

  for (const [code, pattern] of cases) {
    it(`explains ${code} in plain language`, () => {
      const text = friendlyDbError({ code, message: "raw pg text" }, "update that dose");
      expect(text).toMatch(pattern);
      expect(text).toContain("What to do next");
      expect(text).toContain("update that dose");
    });
  }

  it("falls back to the raw message with guidance", () => {
    const text = friendlyDbError({ message: "boom" }, "log that meal");
    expect(text).toContain("boom");
    expect(text).toContain("What to do next");
  });
});

describe("friendlyUnexpectedError", () => {
  it("recognises network failures and suggests one retry", () => {
    const text = friendlyUnexpectedError("list_doses", new Error("fetch failed"));
    expect(text).toMatch(/retry once/i);
  });

  it("tells the assistant not to loop on unknown failures", () => {
    const text = friendlyUnexpectedError("log_dose", new Error("kaboom"));
    expect(text).toContain("kaboom");
    expect(text).toMatch(/do not retry in a loop/i);
  });
});

describe("guardCall", () => {
  const ctx = (authed: boolean, userId: string | null = "u1") =>
    ({
      isAuthenticated: () => authed,
      getUserId: () => userId,
      getToken: () => "token",
      getUserEmail: () => null,
      getClientId: () => null,
      getClaims: () => ({}),
    }) as never;

  it("blocks unauthenticated callers with actionable text", () => {
    const result = guardCall("list_doses", ctx(false));
    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toBe(NOT_AUTHENTICATED_TEXT);
  });

  it("lets an authenticated caller through", () => {
    expect(guardCall("list_doses", ctx(true))).toBeNull();
  });

  it("refuses once the write budget is spent", () => {
    for (let i = 0; i < WRITE_RULE.limit; i += 1) {
      expect(guardCall("log_dose", ctx(true), { kind: "write" })).toBeNull();
    }
    const blocked = guardCall("log_dose", ctx(true), { kind: "write" });
    expect(blocked?.isError).toBe(true);
    expect(blocked?.content[0]?.text).toContain("Rate limit reached");
  });

  it("gives reads a larger budget than writes", () => {
    expect(READ_RULE.limit).toBeGreaterThan(WRITE_RULE.limit);
    for (let i = 0; i < WRITE_RULE.limit + 1; i += 1) {
      expect(guardCall("list_doses", ctx(true))).toBeNull();
    }
  });
});
