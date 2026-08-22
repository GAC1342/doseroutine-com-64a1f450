/**
 * Sitemap + robots.txt generation guard for the /best-* and /for/* marketing
 * routes.
 *
 * Two layers:
 *
 *  1. Offline (always runs): every best-*.tsx and for.*.tsx route file must
 *     have a matching entry in src/routes/sitemap[.]xml.ts, and public/robots.txt
 *     must not disallow any of those paths for any user-agent group.
 *  2. Integration (skips when no server): fetches the SERVED /sitemap.xml and
 *     /robots.txt, asserts transport (status, content type), well-formed
 *     <urlset>, absolute https://doseroutine.com URLs, no duplicate <loc>, and
 *     that every marketing URL is present and crawlable.
 *
 * Base URL: SITEMAP_BASE_URL (default http://localhost:8080).
 * Set SITEMAP_REQUIRE_SERVER=1 in CI to turn an unreachable server into a
 * failure instead of a skip.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROUTES_DIR = join(process.cwd(), "src", "routes");
const SITEMAP_SOURCE = readFileSync(join(ROUTES_DIR, "sitemap[.]xml.ts"), "utf8");
const ROBOTS_TXT = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");
export const CANONICAL_ORIGIN = "https://doseroutine.com";

const BASE_URL = (process.env["SITEMAP_BASE_URL"] ?? "http://localhost:8080").replace(/\/+$/, "");
const REQUIRE_SERVER = process.env["SITEMAP_REQUIRE_SERVER"] === "1";

/** best-*.tsx and for.*.tsx route files → their URL paths. */
function marketingPaths(): string[] {
  const files = readdirSync(ROUTES_DIR).filter(
    (f) =>
      /\.tsx$/.test(f) &&
      !f.includes("$") &&
      (f.startsWith("best-") || f === "for.tsx" || f.startsWith("for.")),
  );
  return files
    .map((f) => {
      const base = f.replace(/\.tsx$/, "");
      let path = "/" + base.replace(/\./g, "/");
      path = path.replace(/\/index$/, "");
      return path;
    })
    .sort();
}

const MARKETING_PATHS = marketingPaths();

/** Static { path: "/x" } entries declared in the sitemap route source. */
function declaredSitemapPaths(): Set<string> {
  const out = new Set<string>();
  for (const m of SITEMAP_SOURCE.matchAll(/path:\s*"([^"]+)"/g)) out.add(m[1]!);
  return out;
}

/** robots.txt Disallow rules, flattened across all user-agent groups. */
function disallowRules(): string[] {
  return ROBOTS_TXT.split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^disallow:/i.test(l))
    .map((l) => l.slice("disallow:".length).trim())
    .filter((l) => l.length > 0);
}

function isBlocked(path: string, rules: string[]): string | null {
  for (const rule of rules) {
    if (rule === "/") return rule;
    const prefix = rule.replace(/\*$/, "");
    if (path === rule || path.startsWith(prefix)) return rule;
  }
  return null;
}

describe("marketing routes: sitemap source coverage", () => {
  it("discovers the /best-* and /for/* route files", () => {
    expect(MARKETING_PATHS.length).toBeGreaterThan(5);
    expect(MARKETING_PATHS).toContain("/for");
    expect(MARKETING_PATHS.some((p) => p.startsWith("/best-"))).toBe(true);
  });

  it.each(MARKETING_PATHS)("%s is declared in sitemap[.]xml.ts", (path) => {
    expect(declaredSitemapPaths().has(path)).toBe(true);
  });
});

describe("marketing routes: robots.txt does not block them", () => {
  it("robots.txt has no site-wide Disallow", () => {
    expect(disallowRules()).not.toContain("/");
  });

  it.each(MARKETING_PATHS)("%s is crawlable", (path) => {
    expect(isBlocked(path, disallowRules())).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration: what the server actually serves.
// ---------------------------------------------------------------------------

interface Fetched {
  status: number;
  contentType: string;
  body: string;
}

let sitemap: Fetched | null = null;
let robots: Fetched | null = null;
let fetchError: string | null = null;

async function grab(path: string): Promise<Fetched> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { accept: "*/*" } });
  return {
    status: res.status,
    contentType: res.headers.get("content-type") ?? "",
    body: await res.text(),
  };
}

beforeAll(async () => {
  try {
    [sitemap, robots] = await Promise.all([grab("/sitemap.xml"), grab("/robots.txt")]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    if (REQUIRE_SERVER) throw err;
  }
}, 60_000);

function servedLocs(body: string): string[] {
  return [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.trim());
}

describe("served /sitemap.xml", () => {
  it("responds 200 as XML", () => {
    if (!sitemap) return expect(fetchError ?? "server unreachable").toBeTruthy();
    expect(sitemap.status).toBe(200);
    expect(sitemap.contentType).toMatch(/xml/i);
  });

  it("is a well-formed urlset with absolute canonical URLs", () => {
    if (!sitemap) return;
    expect(sitemap.body).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(sitemap.body).toContain("<urlset");
    expect(sitemap.body.trimEnd().endsWith("</urlset>")).toBe(true);

    const locs = servedLocs(sitemap.body);
    expect(locs.length).toBeGreaterThan(50);
    const bad = locs.filter((l) => !l.startsWith(`${CANONICAL_ORIGIN}/`) && l !== CANONICAL_ORIGIN);
    expect(bad).toEqual([]);
    // No unescaped ampersands anywhere in the payload.
    expect(sitemap.body).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;|#)/);
  });

  it("has no duplicate <loc> values", () => {
    if (!sitemap) return;
    const locs = servedLocs(sitemap.body);
    const dupes = locs.filter((l, i) => locs.indexOf(l) !== i);
    expect([...new Set(dupes)]).toEqual([]);
  });

  it("includes every /best-* and /for/* URL", () => {
    if (!sitemap) return;
    const locs = new Set(servedLocs(sitemap.body));
    const missing = MARKETING_PATHS.filter((p) => !locs.has(`${CANONICAL_ORIGIN}${p}`));
    expect(missing).toEqual([]);
  });
});

describe("served /robots.txt", () => {
  it("responds 200 as plain text and matches the committed file", () => {
    if (!robots) return expect(fetchError ?? "server unreachable").toBeTruthy();
    expect(robots.status).toBe(200);
    expect(robots.contentType).toMatch(/text\/plain/i);
    expect(robots.body.replace(/\r\n/g, "\n").trimEnd()).toBe(
      ROBOTS_TXT.replace(/\r\n/g, "\n").trimEnd(),
    );
  });

  it("keeps the /best-* and /for/* URLs crawlable as served", () => {
    if (!robots) return;
    const rules = robots.body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^disallow:/i.test(l))
      .map((l) => l.slice("disallow:".length).trim())
      .filter(Boolean);
    const blocked = MARKETING_PATHS.map((p) => [p, isBlocked(p, rules)] as const).filter(
      ([, r]) => r !== null,
    );
    expect(blocked).toEqual([]);
  });
});
