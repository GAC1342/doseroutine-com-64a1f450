/**
 * robots.txt guard.
 *
 * Verifies:
 *   1. Every private / authenticated route file has an explicit
 *      Disallow rule (so crawlers cannot index user surfaces).
 *   2. No Disallow rule accidentally blocks a URL that appears in
 *      the sitemap's static entries.
 *   3. The Sitemap: directive points at the canonical sitemap URL.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = join(process.cwd(), "src", "routes");
const ROBOTS_FILE = join(process.cwd(), "public", "robots.txt");
const SITEMAP_FILE = join(ROUTES_DIR, "sitemap[.]xml.ts");

const robots = readFileSync(ROBOTS_FILE, "utf8");
const disallowRules = robots
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.toLowerCase().startsWith("disallow:"))
  .map((l) => l.slice("disallow:".length).trim())
  .filter(Boolean);

/** Google-style path-prefix match with trailing `/` handling. */
function isBlocked(urlPath: string): string | null {
  for (const rule of disallowRules) {
    if (rule.endsWith("/")) {
      if (urlPath === rule.slice(0, -1) || urlPath.startsWith(rule)) return rule;
    } else {
      if (urlPath === rule || urlPath.startsWith(rule + "/")) return rule;
    }
  }
  return null;
}

// Public non-indexable routes (opt out via <meta robots noindex>) that
// must also be blocked in robots.txt.
const PUBLIC_NON_INDEXABLE = ["/auth", "/onboarding", "/reset-password", "/p/abc"];

function authenticatedRouteFiles(): string[] {
  return readdirSync(join(ROUTES_DIR, "_authenticated"))
    .filter((f) => f.endsWith(".tsx"))
    .filter((f) => f !== "route.tsx");
}

function fileToUrlPath(file: string): string {
  // "body-metrics.tsx" -> "/body-metrics"
  // "admin.schema-report.tsx" -> "/admin/schema-report"
  // "debug.crashlytics.tsx" -> "/debug/crashlytics"
  return "/" + file.replace(/\.tsx$/, "").replace(/\./g, "/");
}

function sitemapStaticPaths(): string[] {
  const src = readFileSync(SITEMAP_FILE, "utf8");
  const paths: string[] = [];
  const re = /\{\s*path:\s*["'`]([^"'`]+)["'`]/g;
  let m;
  while ((m = re.exec(src)) !== null) paths.push(m[1]);
  return paths;
}

describe("robots.txt", () => {
  it("blocks every authenticated route file", () => {
    const offenders: string[] = [];
    for (const f of authenticatedRouteFiles()) {
      const p = fileToUrlPath(f);
      if (!isBlocked(p)) offenders.push(`${f} -> ${p}`);
    }
    expect(offenders, `Missing Disallow rule for:\n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  it("blocks the public non-indexable pages", () => {
    for (const p of PUBLIC_NON_INDEXABLE) {
      expect(isBlocked(p), `${p} should be Disallowed`).not.toBeNull();
    }
  });

  it("does not accidentally block any sitemap URL", () => {
    const blocked: string[] = [];
    for (const p of sitemapStaticPaths()) {
      const rule = isBlocked(p);
      if (rule) blocked.push(`${p} blocked by "Disallow: ${rule}"`);
    }
    expect(blocked, `Sitemap URLs must not be Disallowed:\n  ${blocked.join("\n  ")}`).toEqual([]);
  });

  it("declares the canonical sitemap", () => {
    expect(robots).toMatch(/^Sitemap:\s*https:\/\/doseroutine\.com\/sitemap\.xml\s*$/m);
  });

  it("declares the RSS feed as a secondary sitemap for fast post discovery", () => {
    expect(robots).toMatch(/^Sitemap:\s*https:\/\/doseroutine\.com\/feed\.xml\s*$/m);
    expect(isBlocked("/feed.xml")).toBeNull();
    expect(isBlocked("/blog/how-much-protein-while-on-a-glp-1")).toBeNull();
  });

  it("allows the homepage and library root", () => {
    expect(isBlocked("/")).toBeNull();
    expect(isBlocked("/library")).toBeNull();
    expect(isBlocked("/library/mens-health")).toBeNull();
  });
});
