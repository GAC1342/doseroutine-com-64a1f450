import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  classifyBoundaryError,
  friendlyErrorMessage,
  isAuthExpiryError,
  isNetworkError,
} from "@/lib/error-classify";
import { isSessionExpired, loginRedirectSearch } from "@/lib/session-expiry";
import { profileGatePasses, profileGateQueryKey } from "@/lib/profile-gate-cache";
import { appSettingsUrl } from "@/lib/app-settings";
import { deepLinkPath } from "@/components/native-app-listeners";

describe("network error classification", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it.each([
    "TypeError: Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "Load failed",
    "net::ERR_INTERNET_DISCONNECTED",
    "fetch failed",
    "The request timed out",
    "AbortError: signal is aborted without reason",
  ])("treats %s as a network failure", (message) => {
    expect(isNetworkError(new Error(message))).toBe(true);
    expect(classifyBoundaryError(new Error(message))).toBe("offline");
  });

  it.each([408, 502, 503, 504])("treats HTTP %i as retryable", (status) => {
    expect(isNetworkError({ status, message: "upstream" })).toBe(true);
  });

  it("treats a hard offline device as a network failure regardless of message", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isNetworkError(new Error("boom"))).toBe(true);
  });

  it("does not classify ordinary bugs as network failures", () => {
    expect(isNetworkError(new TypeError("x.map is not a function"))).toBe(false);
    expect(classifyBoundaryError(new TypeError("x.map is not a function"))).toBe("unknown");
  });
});

describe("auth expiry classification", () => {
  beforeEach(() => vi.stubGlobal("navigator", { onLine: true }));

  it.each([
    "JWT expired",
    "Invalid Refresh Token: Refresh Token Not Found",
    "Auth session missing!",
    "PGRST301: JWT expired",
    "Unauthorized",
  ])("detects %s", (message) => {
    expect(isAuthExpiryError(new Error(message))).toBe(true);
    expect(classifyBoundaryError(new Error(message))).toBe("auth-expired");
  });

  it("detects a 401 response object", () => {
    expect(isAuthExpiryError({ status: 401, message: "failed to fetch" })).toBe(true);
    // Auth wins over the network heuristic when both could match.
    expect(classifyBoundaryError({ status: 401, message: "failed to fetch" })).toBe("auth-expired");
  });

  it("leaves normal errors alone", () => {
    expect(isAuthExpiryError(new Error("Could not save dose"))).toBe(false);
  });
});

describe("friendlyErrorMessage", () => {
  it("falls back for empty and oversized messages", () => {
    expect(friendlyErrorMessage(new Error(""), "fallback")).toBe("fallback");
    expect(friendlyErrorMessage(new Error("x".repeat(300)), "fallback")).toBe("fallback");
    expect(friendlyErrorMessage(new Error("Could not load"), "fallback")).toBe("Could not load");
  });
});

describe("session expiry", () => {
  it("treats a missing session as expired", () => {
    expect(isSessionExpired(null)).toBe(true);
  });

  it("treats a past expires_at as expired (with skew)", () => {
    const now = 1_000_000_000_000;
    expect(isSessionExpired({ expires_at: Math.floor(now / 1000) - 10 }, now)).toBe(true);
    expect(isSessionExpired({ expires_at: Math.floor(now / 1000) + 600 }, now)).toBe(false);
  });

  it("builds a login redirect that returns the user to their screen", () => {
    expect(loginRedirectSearch("/today")).toEqual({ redirect: "/today" });
    expect(loginRedirectSearch("/")).toEqual({});
    expect(loginRedirectSearch("/auth")).toEqual({});
  });
});

describe("profile gate cache contract", () => {
  it("keys and passes consistently", () => {
    expect(profileGateQueryKey("abc")).toEqual(["profile-gate", "abc"]);
    expect(profileGatePasses({ is_adult: true, consented_at: "2026-01-01" })).toBe(true);
    expect(profileGatePasses({ is_adult: true, consented_at: null })).toBe(false);
    expect(profileGatePasses(null)).toBe(false);
  });
});

describe("native recovery helpers", () => {
  it("builds platform-specific settings URLs", () => {
    expect(appSettingsUrl("ios")).toBe("app-settings:");
    expect(appSettingsUrl("android")).toContain("APPLICATION_DETAILS_SETTINGS");
    expect(appSettingsUrl("web")).toBeNull();
  });

  it("maps deep links to in-app paths and ignores foreign URLs", () => {
    expect(deepLinkPath("https://doseroutine.com/today")).toBe("/today");
    expect(deepLinkPath("https://www.doseroutine.com/stack?tab=all")).toBe("/stack?tab=all");
    expect(deepLinkPath("com.doseroutine.app://today")).toBe("/today");
    expect(deepLinkPath("https://example.com/today")).toBeNull();
    expect(deepLinkPath("not a url")).toBeNull();
  });
});
