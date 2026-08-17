/**
 * Automated guard: every page we ask Google to index must be reachable
 * without signing up, and must not be blocked by robots.txt or noindex.
 *
 * Layer 1 (unit): the pure rules in src/lib/public-seo-access.ts.
 * Layer 2 (repo): run those rules over the real sitemap entries, the real
 * route files (public + _authenticated) and the real public/robots.txt.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  auditPublicSeoAccess,
  classifyLiveProbe,
  findAuthGate,
  robotsBlocks,
  robotsMetaFromHtml,
  robotsMetaFromSource,
  type RouteSource,
} from "../public-seo-access";

const ROUTES_DIR = join(process.cwd(), "src", "routes");
const ROBOTS_TXT = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");

function filenameToPath(file: string): string {
  const base = file.replace(/\.tsx?$/, "");
  if (base === "index") return "/";
  const p = ("/" + base.replace(/\./g, "/")).replace(/\/index$/, "");
  return p || "/";
}

function collectRoutes(): RouteSource[] {
  const out: RouteSource[] = [];
  for (const file of readdirSync(ROUTES_DIR)) {
    if (!/\.tsx?$/.test(file)) continue;
    if (file.startsWith("_") || file.startsWith("__") || file.startsWith("api.")) continue;
    if (file.includes("$")) continue;
    out.push({
      path: filenameToPath(file),
      file,
      source: readFileSync(join(ROUTES_DIR, file), "utf8"),
    });
  }
  try {
    for (const file of readdirSync(join(ROUTES_DIR, "_authenticated"))) {
      if (!/\.tsx?$/.test(file) || file.includes("$")) continue;
      out.push({
        path: filenameToPath(file),
        file: `_authenticated/${file}`,
        source: readFileSync(join(ROUTES_DIR, "_authenticated", file), "utf8"),
        authenticated: true,
      });
    }
  } catch {
    /* no _authenticated dir */
  }
  return out;
}

function sitemapStaticPaths(): string[] {
  const src = readFileSync(join(ROUTES_DIR, "sitemap[.]xml.ts"), "utf8");
  const paths = Array.from(src.matchAll(/\{\s*path:\s*"([^"]+)"/g)).map((m) => m[1]);
  if (src.includes("blogListSitemapPaths(")) paths.push("/blog");
  return Array.from(new Set(paths));
}

describe("findAuthGate", () => {
  it("flags an auth redirect in beforeLoad", () => {
    expect(
      findAuthGate(`beforeLoad: () => { throw redirect({ to: "/auth", search: {} }); }`),
    ).toMatch(/redirect/);
  });

  it("flags auth wrappers and hooks", () => {
    expect(findAuthGate("<RequireAuth><Page /></RequireAuth>")).toBeTruthy();
    expect(findAuthGate("const user = useRequireAuth();")).toBeTruthy();
    expect(findAuthGate(".middleware([requireSupabaseAuth])")).toBeTruthy();
  });

  it("leaves public pages alone", () => {
    expect(findAuthGate(`<Link to="/auth">Sign in</Link>`)).toBeNull();
  });
});

describe("robots meta extraction", () => {
  it("reads the head() robots value", () => {
    expect(
      robotsMetaFromSource(`{ name: "robots", content: "index, follow, max-snippet:-1" }`),
    ).toBe("index, follow, max-snippet:-1");
  });

  it("reads rendered HTML in either attribute order", () => {
    expect(robotsMetaFromHtml(`<meta name="robots" content="noindex, nofollow">`)).toBe(
      "noindex, nofollow",
    );
    expect(robotsMetaFromHtml(`<meta content="index, follow" name="robots">`)).toBe(
      "index, follow",
    );
    expect(robotsMetaFromHtml("<html></html>")).toBeNull();
  });
});

describe("classifyLiveProbe", () => {
  const base = { path: "/manual", status: 200, finalUrl: "https://doseroutine.com/manual" };

  it("passes a crawlable page", () => {
    expect(
      classifyLiveProbe({ ...base, robotsBlocked: false, html: "<html><body>hi</body></html>" }).ok,
    ).toBe(true);
  });

  it("fails on robots.txt, noindex header, noindex meta and non-200", () => {
    const bad = classifyLiveProbe({
      ...base,
      status: 500,
      robotsBlocked: true,
      xRobotsTag: "noindex, nofollow",
      html: `<meta name="robots" content="noindex">`,
    });
    expect(bad.ok).toBe(false);
    expect(bad.reasons).toHaveLength(4);
  });

  it("fails when the page bounces an anonymous visitor to sign-in", () => {
    const gated = classifyLiveProbe({
      ...base,
      path: "/today",
      finalUrl: "https://doseroutine.com/auth?redirect=/today",
      robotsBlocked: false,
    });
    expect(gated.ok).toBe(false);
    expect(gated.reasons[0]).toMatch(/sign-in/);
  });
});

describe("auditPublicSeoAccess", () => {
  it("reports a gated, blocked, noindexed page", () => {
    const issues = auditPublicSeoAccess({
      paths: ["/secret"],
      routes: [
        {
          path: "/secret",
          file: "_authenticated/secret.tsx",
          authenticated: true,
          source: `{ name: "robots", content: "noindex, nofollow" }`,
        },
      ],
      robotsTxt: "User-agent: *\nAllow: /\nDisallow: /secret\n",
    });
    expect(issues.map((i) => i.kind).sort()).toEqual(["auth-gated", "noindex", "robots-disallow"]);
  });

  it("passes a clean public page", () => {
    expect(
      auditPublicSeoAccess({
        paths: ["/manual"],
        routes: [
          {
            path: "/manual",
            file: "manual.tsx",
            source: `{ name: "robots", content: "index, follow" }`,
          },
        ],
        robotsTxt: "User-agent: *\nAllow: /\nDisallow: /today\n",
      }),
    ).toEqual([]);
  });
});

describe("this repo's SEO pages", () => {
  const paths = sitemapStaticPaths();
  const routes = collectRoutes();
  const issues = auditPublicSeoAccess({ paths, routes, robotsTxt: ROBOTS_TXT });

  it("has sitemap entries to check", () => {
    expect(paths.length).toBeGreaterThan(50);
  });

  it("keeps every sitemap page reachable without sign-up, robots-allowed and indexable", () => {
    const report = issues.map((i) => `${i.path} [${i.kind}] ${i.detail}`).sort();
    expect(report, `Unreachable SEO pages:\n${report.join("\n")}`).toEqual([]);
  });

  it("still blocks private app pages in robots.txt", () => {
    for (const p of ["/today", "/stack", "/food", "/admin", "/settings"]) {
      expect(robotsBlocks(ROBOTS_TXT, p), `${p} should stay disallowed`).toBe(true);
    }
  });
});
