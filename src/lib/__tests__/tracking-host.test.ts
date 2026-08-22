import { describe, expect, it } from "vitest";

import { isProductionAnalyticsHost } from "@/lib/tracking-host";

describe("third-party analytics host gate", () => {
  it("allows the canonical public site", () => {
    expect(isProductionAnalyticsHost("doseroutine.com")).toBe(true);
    expect(isProductionAnalyticsHost("www.doseroutine.com")).toBe(true);
    expect(isProductionAnalyticsHost("doseroutine-com.lovable.app")).toBe(true);
  });

  it("blocks local development", () => {
    expect(isProductionAnalyticsHost("localhost")).toBe(false);
    expect(isProductionAnalyticsHost("127.0.0.1")).toBe(false);
  });

  it("blocks editor preview and dev builds", () => {
    expect(isProductionAnalyticsHost("id-preview--abc123.lovable.app")).toBe(false);
    expect(isProductionAnalyticsHost("project--abc123-dev.lovable.app")).toBe(false);
    expect(isProductionAnalyticsHost("abc123.lovableproject.com")).toBe(false);
  });

  it("blocks missing or empty hostnames", () => {
    expect(isProductionAnalyticsHost(null)).toBe(false);
    expect(isProductionAnalyticsHost("")).toBe(false);
  });
});
