import { describe, expect, it } from "vitest";
import { isSubscriptionActive, SUBSCRIPTION_EXPIRY_GRACE_MS } from "@/lib/access";

const NOW = Date.UTC(2026, 0, 15);
const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();
const DAY = 24 * 60 * 60 * 1000;

describe("isSubscriptionActive", () => {
  it("fails closed with no row", () => {
    expect(isSubscriptionActive(null, NOW)).toBe(false);
    expect(isSubscriptionActive(undefined, NOW)).toBe(false);
    expect(isSubscriptionActive({ status: "free" }, NOW)).toBe(false);
  });

  it("entitles active, trialing and past_due within the period", () => {
    for (const status of ["active", "trialing", "past_due", "ACTIVE"]) {
      expect(isSubscriptionActive({ status, current_period_end: iso(5 * DAY) }, NOW)).toBe(true);
    }
  });

  it("entitles rows without a period end", () => {
    expect(isSubscriptionActive({ status: "active", current_period_end: null }, NOW)).toBe(true);
  });

  it("expires a stale active row past the grace window", () => {
    expect(isSubscriptionActive({ status: "active", current_period_end: iso(-2 * DAY) }, NOW)).toBe(
      false,
    );
    expect(
      isSubscriptionActive(
        { status: "active", current_period_end: iso(-SUBSCRIPTION_EXPIRY_GRACE_MS / 2) },
        NOW,
      ),
    ).toBe(true);
  });

  it("honors canceled-but-paid-through, then drops access", () => {
    expect(isSubscriptionActive({ status: "canceled", current_period_end: iso(DAY) }, NOW)).toBe(
      true,
    );
    expect(isSubscriptionActive({ status: "canceled", current_period_end: iso(-DAY) }, NOW)).toBe(
      false,
    );
    expect(isSubscriptionActive({ status: "canceled", current_period_end: null }, NOW)).toBe(false);
  });

  it("ignores unparseable dates instead of granting forever", () => {
    expect(isSubscriptionActive({ status: "canceled", current_period_end: "nope" }, NOW)).toBe(
      false,
    );
    expect(isSubscriptionActive({ status: "active", current_period_end: "nope" }, NOW)).toBe(true);
  });
});
