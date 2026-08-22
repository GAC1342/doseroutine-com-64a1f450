import { describe, expect, it } from "vitest";
import {
  BASE_RETRY_MS,
  MAX_AUTO_ATTEMPTS,
  MAX_RETRY_MS,
  backoffDelayMs,
  classifyHealthError,
  describeCountdown,
  nextRetryAt,
  shouldAutoRetry,
} from "@/lib/health-sync-retry";

describe("classifyHealthError", () => {
  it("maps unavailable, permission, plugin and network reasons", () => {
    expect(classifyHealthError("Health sync is only available in the installed app.").kind).toBe(
      "unavailable",
    );
    expect(classifyHealthError("permission denied for weight").kind).toBe("permission");
    expect(classifyHealthError("The health plugin could not be loaded on this device.").kind).toBe(
      "plugin",
    );
    expect(classifyHealthError("fetch failed").kind).toBe("network");
    expect(classifyHealthError("429 rate limit").kind).toBe("rateLimit");
  });

  it("only marks transient failures retryable", () => {
    expect(classifyHealthError("network timeout").retryable).toBe(true);
    expect(classifyHealthError("permission denied").retryable).toBe(false);
    expect(classifyHealthError(undefined).retryable).toBe(true);
  });

  it("always returns a title, explanation and fix", () => {
    const info = classifyHealthError("something odd");
    expect(info.title).toBeTruthy();
    expect(info.explanation).toBeTruthy();
    expect(info.fix).toBeTruthy();
    expect(info.raw).toBe("something odd");
  });
});

describe("backoff", () => {
  it("doubles and caps", () => {
    expect(backoffDelayMs(0, 0)).toBe(BASE_RETRY_MS);
    expect(backoffDelayMs(1, 0)).toBe(BASE_RETRY_MS * 2);
    expect(backoffDelayMs(20, 0)).toBe(MAX_RETRY_MS);
  });

  it("adds bounded jitter", () => {
    expect(backoffDelayMs(0, 1)).toBe(Math.round(BASE_RETRY_MS * 1.2));
  });

  it("stops scheduling after the attempt cap", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(nextRetryAt(0, now, 0)?.getTime()).toBe(now.getTime() + BASE_RETRY_MS);
    expect(nextRetryAt(MAX_AUTO_ATTEMPTS, now, 0)).toBeNull();
  });
});

describe("shouldAutoRetry", () => {
  it("retries only when at least one failure is transient", () => {
    expect(shouldAutoRetry(1, [{ reason: "network error" }])).toBe(true);
    expect(shouldAutoRetry(1, [{ reason: "permission denied" }])).toBe(false);
    expect(shouldAutoRetry(MAX_AUTO_ATTEMPTS, [{ reason: "network error" }])).toBe(false);
  });
});

describe("describeCountdown", () => {
  it("formats seconds and minutes", () => {
    expect(describeCountdown(4_000)).toBe("in 4s");
    expect(describeCountdown(125_000)).toBe("in 3 min");
  });
});
