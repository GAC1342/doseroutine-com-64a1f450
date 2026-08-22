import { describe, it, expect, vi, beforeEach } from "vitest";

const trackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }));

import {
  buildErrorReport,
  captureClientError,
  errorFingerprint,
  redactErrorText,
  __resetClientErrorMonitor,
} from "@/lib/client-error-monitor";

beforeEach(() => {
  trackEvent.mockClear();
  __resetClientErrorMonitor();
});

describe("redactErrorText", () => {
  it("strips query strings from URLs", () => {
    expect(redactErrorText("failed https://x.com/a?token=abc123")).toBe(
      "failed https://x.com/a?[redacted]",
    );
  });

  it("redacts JWTs, bearer tokens, supabase keys and emails", () => {
    expect(redactErrorText("eyJhbGciOiJIUzI1NiIsInR5cCI6")).toContain("[jwt]");
    expect(redactErrorText("Authorization: Bearer abc.def")).toContain("[redacted]");
    expect(redactErrorText("key sb_publishable_ABC-123")).toContain("sb_[redacted]");
    expect(redactErrorText("user nikk@example.com failed")).toContain("[email]");
  });
});

describe("errorFingerprint", () => {
  it("groups the same error with different numbers", () => {
    const a = errorFingerprint("uncaught", "Row 12 missing", "at foo (app.js:1:2)");
    const b = errorFingerprint("uncaught", "Row 998 missing", "at foo (app.js:44:9)");
    expect(a).toBe(b);
  });

  it("separates different errors", () => {
    expect(errorFingerprint("uncaught", "A failed")).not.toBe(
      errorFingerprint("uncaught", "B failed"),
    );
  });
});

describe("buildErrorReport", () => {
  it("handles Response throws from loaders", () => {
    const report = buildErrorReport("manual", new Response("no", { status: 401 }));
    expect(report.message).toContain("Response 401");
  });

  it("truncates enormous messages", () => {
    const report = buildErrorReport("manual", new Error("x".repeat(5000)));
    expect(report.message.length).toBeLessThanOrEqual(300);
  });
});

describe("captureClientError", () => {
  it("sends a client_error analytics event", () => {
    captureClientError(new Error("boom"), { source: "test" });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    const [name, props] = trackEvent.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe("client_error");
    expect(props.message).toBe("boom");
    expect(props.kind).toBe("manual");
  });

  it("de-duplicates repeats of the same error", () => {
    for (let i = 0; i < 5; i += 1) captureClientError(new Error("same"));
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it("caps the number of distinct errors per session", () => {
    for (let i = 0; i < 60; i += 1) captureClientError(new Error(`distinct-${i}-${"y".repeat(i)}`));
    expect(trackEvent.mock.calls.length).toBeLessThanOrEqual(25);
  });

  it("never throws on weird input", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => captureClientError(circular)).not.toThrow();
  });
});
