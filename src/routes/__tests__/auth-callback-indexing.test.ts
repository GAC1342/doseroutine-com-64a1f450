/**
 * Regression guard: the OAuth redirect target /auth/callback must never
 * become crawlable again.
 *
 * Asserts, end to end:
 *   - the generated sitemap.xml body contains no /auth* URL
 *   - robots.txt disallows /auth/callback for the wildcard user-agent
 *   - the shared non-indexable config treats it as non-indexable
 *   - the route file itself declares robots noindex, nofollow
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { isDisallowedByRobots, isIndexablePath, parseRobotsDisallow } from "@/lib/non-indexable";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: async () => ({ data: [{ slug: "bpc-157" }], error: null }),
      }),
    }),
  },
}));

const CALLBACK_PATHS = ["/auth/callback", "/auth_/callback"];

const robotsTxt = readFileSync(join(process.cwd(), "public", "robots.txt"), "utf8");
const disallow = parseRobotsDisallow(robotsTxt);

let sitemapXml = "";

beforeAll(async () => {
  const mod = await import("../sitemap[.]xml");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  const handler = (mod.Route as any).options.server.handlers.GET;
  const res: Response = await handler({
    request: new Request("https://doseroutine.com/sitemap.xml"),
  });
  sitemapXml = await res.text();
});

describe("/auth/callback indexing", () => {
  it("generates a valid sitemap with real entries", () => {
    expect(sitemapXml).toContain("<urlset");
    expect(sitemapXml).toContain("<loc>https://doseroutine.com/</loc>");
  });

  it("never emits an /auth URL in the sitemap", () => {
    const locs = Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
    const leaked = locs.filter((loc) => /\/auth(\/|_|$)/.test(new URL(loc).pathname));
    expect(leaked, `Auth URLs leaked into sitemap: ${leaked.join(", ")}`).toEqual([]);
  });

  it("is disallowed by robots.txt", () => {
    for (const path of CALLBACK_PATHS) {
      expect(isDisallowedByRobots(path, disallow), path).toBe(true);
    }
  });

  it("is non-indexable in the shared config", () => {
    for (const path of CALLBACK_PATHS) {
      expect(isIndexablePath(path), path).toBe(false);
    }
  });

  it("declares robots noindex, nofollow in the route file", () => {
    const src = readFileSync(join(process.cwd(), "src", "routes", "auth_.callback.tsx"), "utf8");
    expect(src).toMatch(/name:\s*"robots"/);
    expect(src).toMatch(/noindex,\s*nofollow/);
  });
});
