import { describe, expect, it } from "vitest";
import { FALLBACK_SENTRY_DSN, isValidSentryDsn, resolveSentryDsn } from "@/lib/sentry-dsn";

describe("Sentry DSN resolution", () => {
  it("accepts a real DSN and rejects junk", () => {
    expect(isValidSentryDsn(FALLBACK_SENTRY_DSN)).toBe(true);
    expect(isValidSentryDsn("")).toBe(false);
    expect(isValidSentryDsn("not-a-dsn")).toBe(false);
    expect(isValidSentryDsn("https://example.com/1")).toBe(false);
  });

  it("prefers the build-time DSN", () => {
    const build = "https://abc@o1.ingest.us.sentry.io/2";
    expect(
      resolveSentryDsn({ buildTimeDsn: build, runtimeDsn: null, native: true, production: true }),
    ).toBe(build);
  });

  it("falls back to the runtime DSN when the build has none", () => {
    const runtime = "https://xyz@o1.ingest.us.sentry.io/3";
    expect(
      resolveSentryDsn({ buildTimeDsn: "", runtimeDsn: runtime, native: true, production: true }),
    ).toBe(runtime);
  });

  it("always yields a DSN in a native build, even with nothing configured", () => {
    expect(
      resolveSentryDsn({ buildTimeDsn: "", runtimeDsn: "", native: true, production: false }),
    ).toBe(FALLBACK_SENTRY_DSN);
    expect(
      resolveSentryDsn({ buildTimeDsn: null, runtimeDsn: null, native: false, production: true }),
    ).toBe(FALLBACK_SENTRY_DSN);
  });

  it("stays silent in web dev/preview when unconfigured", () => {
    expect(
      resolveSentryDsn({ buildTimeDsn: "", runtimeDsn: "", native: false, production: false }),
    ).toBeNull();
  });

  it("ignores a malformed configured value instead of initialising with it", () => {
    expect(
      resolveSentryDsn({
        buildTimeDsn: "https://sentry.example.com",
        runtimeDsn: "",
        native: true,
        production: true,
      }),
    ).toBe(FALLBACK_SENTRY_DSN);
  });
});
