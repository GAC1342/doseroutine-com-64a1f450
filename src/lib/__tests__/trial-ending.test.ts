import { describe, it, expect } from "vitest";
import {
  daysUntil,
  isWarningDue,
  isFinalDayDue,
} from "@/routes/api/public/hooks/trial-ending-reminders";
import { daysLeftInTrial } from "@/components/trial-ending-banner";

const NOW = Date.parse("2026-08-01T00:00:00Z");
const inDays = (d: number) => new Date(NOW + d * 86_400_000).toISOString();

describe("trial ending reminders", () => {
  it("counts whole days until the trial ends", () => {
    expect(daysUntil(inDays(2), NOW)).toBe(2);
    expect(daysUntil(inDays(0.5), NOW)).toBe(1);
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil("not-a-date", NOW)).toBeNull();
  });

  it("warns only inside the final two days of a trial", () => {
    expect(isWarningDue({ status: "trialing", current_period_end: inDays(2) }, NOW)).toBe(true);
    expect(isWarningDue({ status: "trialing", current_period_end: inDays(5) }, NOW)).toBe(false);
    expect(isWarningDue({ status: "trialing", current_period_end: inDays(-1) }, NOW)).toBe(false);
  });

  it("never warns twice for the same trial", () => {
    expect(
      isWarningDue(
        {
          status: "trialing",
          current_period_end: inDays(1),
          trial_ending_email_at: inDays(-1),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("ignores active and cancelled subscriptions", () => {
    expect(isWarningDue({ status: "active", current_period_end: inDays(1) }, NOW)).toBe(false);
    expect(isWarningDue({ status: "canceled", current_period_end: inDays(1) }, NOW)).toBe(false);
  });

  it("banner and cron agree on days remaining", () => {
    expect(daysLeftInTrial(inDays(3), NOW)).toBe(daysUntil(inDays(3), NOW));
  });
});

describe("trial final-day email", () => {
  it("fires only on the last day", () => {
    expect(isFinalDayDue({ status: "trialing", current_period_end: inDays(0.5) }, NOW)).toBe(true);
    expect(isFinalDayDue({ status: "trialing", current_period_end: inDays(2) }, NOW)).toBe(false);
    expect(isFinalDayDue({ status: "trialing", current_period_end: inDays(-1) }, NOW)).toBe(false);
  });

  it("never sends twice", () => {
    expect(
      isFinalDayDue(
        {
          status: "trialing",
          current_period_end: inDays(1),
          trial_final_email_at: inDays(-0.2),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("is independent of the 2-day heads-up stamp", () => {
    const row = {
      status: "trialing",
      current_period_end: inDays(1),
      trial_ending_email_at: inDays(-1),
    };
    expect(isWarningDue(row, NOW)).toBe(false);
    expect(isFinalDayDue(row, NOW)).toBe(true);
  });

  it("ignores non-trialing subscriptions", () => {
    expect(isFinalDayDue({ status: "active", current_period_end: inDays(1) }, NOW)).toBe(false);
  });
});
