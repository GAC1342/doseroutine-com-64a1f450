import { describe, expect, it, vi } from "vitest";
import { createDeepLinkOpener, deepLinkPath } from "@/lib/deep-link";

describe("deepLinkPath", () => {
  it("maps universal links to in-app paths", () => {
    expect(deepLinkPath("https://doseroutine.com/today")).toBe("/today");
    expect(deepLinkPath("https://www.doseroutine.com/today?taken=abc")).toBe("/today?taken=abc");
    expect(deepLinkPath("https://doseroutine.com/")).toBe("/");
  });

  it("maps custom-scheme links to in-app paths", () => {
    expect(deepLinkPath("com.doseroutine.app://today")).toBe("/today");
    expect(deepLinkPath("com.doseroutine.app://library/bpc-157")).toBe("/library/bpc-157");
  });

  it("leaves server endpoints and machine-readable files in the browser", () => {
    expect(deepLinkPath("https://doseroutine.com/api/public/indexnow")).toBeNull();
    expect(deepLinkPath("https://doseroutine.com/sitemap.xml")).toBeNull();
    expect(deepLinkPath("https://doseroutine.com/robots.txt")).toBeNull();
    expect(
      deepLinkPath("https://doseroutine.com/.well-known/apple-app-site-association"),
    ).toBeNull();
  });

  it("still opens content and app routes in the app", () => {
    expect(deepLinkPath("https://doseroutine.com/articles/foo")).toBe("/articles/foo");
    expect(deepLinkPath("https://doseroutine.com/peptide-calculator")).toBe("/peptide-calculator");
    expect(deepLinkPath("https://doseroutine.com/auth/callback#access_token=x")).toBe(
      "/auth/callback#access_token=x",
    );
  });

  it("ignores foreign links", () => {
    expect(deepLinkPath("https://example.com/today")).toBeNull();
    expect(deepLinkPath("not a url")).toBeNull();
  });
});

type Harness = {
  order: string[];
  open: (rawUrl: string) => Promise<void>;
  navigate: ReturnType<typeof vi.fn>;
};

function harness(opts: { disposed?: boolean; sessionRejects?: boolean } = {}): Harness {
  const order: string[] = [];
  const navigate = vi.fn(async (path: string) => {
    order.push(`navigate:${path}`);
  });
  const open = createDeepLinkOpener({
    hydrateSession: async () => {
      order.push("session");
      if (opts.sessionRejects) throw new Error("storage unavailable");
      return { data: { session: null } };
    },
    navigate,
    isDisposed: () => Boolean(opts.disposed),
  });
  return { order, open, navigate };
}

describe("deep-link opener", () => {
  it("cold start: waits for session hydration before navigating", async () => {
    const h = harness();
    await h.open("https://doseroutine.com/today");
    expect(h.order).toEqual(["session", "navigate:/today"]);
  });

  it("warm start: routes an appUrlOpen link the same way", async () => {
    const h = harness();
    await h.open("com.doseroutine.app://today?taken=1");
    expect(h.navigate).toHaveBeenCalledWith("/today?taken=1");
  });

  it("queues links so a cold launch URL and a warm open cannot interleave", async () => {
    const h = harness();
    const first = h.open("https://doseroutine.com/today");
    const second = h.open("https://doseroutine.com/library");
    await Promise.all([first, second]);
    expect(h.order).toEqual(["session", "navigate:/today", "session", "navigate:/library"]);
  });

  it("still routes when the session lookup fails (offline cold start)", async () => {
    const h = harness({ sessionRejects: true });
    await h.open("https://doseroutine.com/today");
    expect(h.navigate).toHaveBeenCalledWith("/today");
  });

  it("never navigates after unmount", async () => {
    const h = harness({ disposed: true });
    await h.open("https://doseroutine.com/today");
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it("reports navigation failures instead of throwing", async () => {
    const onError = vi.fn();
    const open = createDeepLinkOpener({
      hydrateSession: async () => null,
      navigate: async () => {
        throw new Error("route missing");
      },
      isDisposed: () => false,
      onError,
    });
    await expect(open("https://doseroutine.com/nope")).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe("native OAuth callback", () => {
  it("routes the custom-scheme auth callback (with its code) to /auth/callback", () => {
    expect(deepLinkPath("com.doseroutine.app://auth/callback?code=abc123")).toBe(
      "/auth/callback?code=abc123",
    );
  });

  it("keeps implicit-flow tokens in the hash", () => {
    expect(deepLinkPath("com.doseroutine.app://auth/callback#access_token=a&refresh_token=b")).toBe(
      "/auth/callback#access_token=a&refresh_token=b",
    );
  });
});
