import { describe, it, expect } from "vitest";
import { nextDueStep } from "@/routes/api/public/hooks/tester-onboarding-sequence";

const NOW = Date.parse("2026-08-01T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const base = {
  created_at: daysAgo(20),
  invited_at: null,
  installed_at: null,
  welcome_email_at: daysAgo(20),
  install_reminder_at: null,
  feedback_prompt_at: null,
  wrapup_email_at: null,
  sequence_opted_out: false,
};

describe("tester onboarding sequence", () => {
  it("sends the welcome first when it hasn't gone out", () => {
    expect(nextDueStep({ ...base, welcome_email_at: null }, NOW)).toBe("welcome");
  });

  it("waits before nudging an invited tester to install", () => {
    expect(nextDueStep({ ...base, invited_at: daysAgo(1) }, NOW)).toBeNull();
    expect(nextDueStep({ ...base, invited_at: daysAgo(2.1) }, NOW)).toBe("install-reminder");
  });

  it("never nudges a tester who already installed", () => {
    expect(
      nextDueStep({ ...base, invited_at: daysAgo(5), installed_at: daysAgo(4) }, NOW),
    ).toBeNull();
  });

  it("sends the install reminder only once", () => {
    expect(
      nextDueStep({ ...base, invited_at: daysAgo(5), install_reminder_at: daysAgo(3) }, NOW),
    ).toBeNull();
  });

  it("prompts for feedback a week after install", () => {
    expect(nextDueStep({ ...base, installed_at: daysAgo(6) }, NOW)).toBeNull();
    expect(nextDueStep({ ...base, installed_at: daysAgo(7.5) }, NOW)).toBe("feedback");
  });

  it("falls back to the invite date when the install date is unknown", () => {
    expect(
      nextDueStep({ ...base, invited_at: daysAgo(8), install_reminder_at: daysAgo(6) }, NOW),
    ).toBe("feedback");
  });

  it("wraps up at day 14 and then stops", () => {
    const atDay14 = { ...base, installed_at: daysAgo(14.2), feedback_prompt_at: daysAgo(7) };
    expect(nextDueStep(atDay14, NOW)).toBe("wrapup");
    expect(nextDueStep({ ...atDay14, wrapup_email_at: daysAgo(0.1) }, NOW)).toBeNull();
  });

  it("prefers the wrap-up over a missed feedback prompt past day 14", () => {
    expect(nextDueStep({ ...base, installed_at: daysAgo(15) }, NOW)).toBe("wrapup");
  });

  it("sends nothing to a tester who opted out", () => {
    expect(
      nextDueStep({ ...base, installed_at: daysAgo(15), sequence_opted_out: true }, NOW),
    ).toBeNull();
  });

  it("sends nothing while a tester has no invite or install date", () => {
    expect(nextDueStep(base, NOW)).toBeNull();
  });
});
