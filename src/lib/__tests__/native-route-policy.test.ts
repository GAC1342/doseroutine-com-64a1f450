import { describe, expect, it } from "vitest";
import { NATIVE_HOME, nativeRedirectFor } from "@/lib/native-route-policy";

/**
 * Guideline 4.2 / 2.5.x: the native shell must not expose marketing pages,
 * SEO landing pages, or internal tooling. Every restricted path has to land
 * on /today — never on an external URL and never on a dead end.
 */
const RESTRICTED = [
  "/",
  "/debug",
  "/debug/crashlytics",
  "/admin",
  "/admin/blog-seo",
  "/promo-kit",
  "/closed-testing",
  "/install",
  "/blog",
  "/blog/how-to-track-peptides",
  "/articles",
  "/articles/missed-dose-what-to-do",
  "/health-tracking-blog",
  "/alternatives",
  "/compare",
  "/vs/cronometer",
  "/for/trt-patients",
  "/goals/weight-loss",
  "/dose-routine",
  "/lovable/status",
  "/best-medication-reminder-app",
  // Trailing slashes must not slip past the policy.
  "/admin/",
  "/articles/",
];

const ALLOWED = [
  "/today",
  "/more",
  "/scan",
  "/stack",
  "/body",
  "/settings",
  "/legal",
  "/privacy",
  "/manual",
  "/auth",
  "/onboarding",
];

describe("native route policy", () => {
  it.each(RESTRICTED)("%s redirects into the app home", (path) => {
    expect(nativeRedirectFor(path)).toBe(NATIVE_HOME);
  });

  it.each(ALLOWED)("%s stays where it is", (path) => {
    expect(nativeRedirectFor(path)).toBeNull();
  });

  it("never redirects to an external destination", () => {
    for (const path of RESTRICTED) {
      const target = nativeRedirectFor(path);
      expect(target).toBeTruthy();
      expect(target!.startsWith("/")).toBe(true);
      expect(/^https?:/i.test(target!)).toBe(false);
    }
  });

  it("has no redirect loop: the home target is itself allowed", () => {
    expect(nativeRedirectFor(NATIVE_HOME)).toBeNull();
  });

  it("ignores non-path inputs", () => {
    expect(nativeRedirectFor("https://doseroutine.com/blog")).toBeNull();
  });
});

describe("native diagnostics allowlist", () => {
  it("redirects debug screens away inside the shell (guideline 2.3.1)", () => {
    expect(nativeRedirectFor("/debug/deep-link")).toBe(NATIVE_HOME);
    expect(nativeRedirectFor("/debug/deep-link/")).toBe(NATIVE_HOME);
    expect(nativeRedirectFor("/debug/env")).toBe(NATIVE_HOME);
  });
});
