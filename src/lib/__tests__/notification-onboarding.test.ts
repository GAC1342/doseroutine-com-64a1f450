import { beforeEach, describe, expect, it } from "vitest";
import {
  ONBOARDING_KEY,
  loadOnboarding,
  saveOnboarding,
  shouldShowOnboarding,
} from "@/lib/notification-onboarding";

describe("refill alert onboarding state", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts pending and round-trips through storage", () => {
    expect(loadOnboarding().stage).toBe("pending");
    saveOnboarding("blocked");
    expect(loadOnboarding().stage).toBe("blocked");
    expect(window.localStorage.getItem(ONBOARDING_KEY)).toContain("blocked");
  });

  it("falls back to pending on malformed storage", () => {
    window.localStorage.setItem(ONBOARDING_KEY, "{not json");
    expect(loadOnboarding().stage).toBe("pending");
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ stage: "nonsense" }));
    expect(loadOnboarding().stage).toBe("pending");
  });

  it("shows until granted or dismissed, and keeps showing when blocked", () => {
    expect(shouldShowOnboarding({ stage: "pending", updatedAt: "" }, false)).toBe(true);
    expect(shouldShowOnboarding({ stage: "blocked", updatedAt: "" }, false)).toBe(true);
    expect(shouldShowOnboarding({ stage: "dismissed", updatedAt: "" }, false)).toBe(false);
    expect(shouldShowOnboarding({ stage: "granted", updatedAt: "" }, false)).toBe(false);
    expect(shouldShowOnboarding({ stage: "pending", updatedAt: "" }, true)).toBe(false);
  });
});
