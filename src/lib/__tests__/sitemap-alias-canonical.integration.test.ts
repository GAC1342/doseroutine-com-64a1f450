import { beforeAll, describe, expect, it } from "vitest";
import { parseRobots } from "@/lib/robots-policy";
import { URL_ALIASES } from "@/lib/url-aliases";
import {
  CANONICAL_ALIAS_TARGETS,
  findRobotsAliasConflicts,
  findSitemapAliasProblems,
  pathOf,
} from "@/lib/sitemap-alias-policy";

/**
 * Integration test: the served /sitemap.xml and /robots.txt must agree with the
 * alias policy. A committed file can be correct while the route that renders it
 * is not, so this asserts what crawlers actually receive.
 *
 * Skips when no server is reachable, unless SEO_REQUIRE_SERVER=1 (CI).
 */
const BASE_URL = (process.env["SEO_BASE_URL"] ?? "http://localhost:8080").replace(/\/+$/, "");
const REQUIRE_SERVER = process.env["SEO_REQUIRE_SERVER"] === "1";

let sitemapXml: string | null = null;
let robotsText: string | null = null;
let fetchError: string | null = null;

async function get(path: string): Promise<string> {
  const res = await fetch(`${BASE_URL}${path}`, { redirect: "follow" });
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return await res.text();
}

beforeAll(async () => {
  try {
    [sitemapXml, robotsText] = await Promise.all([get("/sitemap.xml"), get("/robots.txt")]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    if (REQUIRE_SERVER) throw err;
  }
}, 60_000);

function locsFrom(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) =>
    m[1].trim().replace(/&amp;/g, "&"),
  );
}

describe("served sitemap and robots respect the alias policy", () => {
  it("serves a sitemap with canonical /blog and /for only", () => {
    if (!sitemapXml) return void expect(fetchError, "server unreachable — skipped").toBeTruthy();
    const locs = locsFrom(sitemapXml);
    expect(locs.length).toBeGreaterThan(10);
    expect(findSitemapAliasProblems(locs)).toEqual([]);
  });

  it("lists no descriptive alias anywhere in the sitemap body", () => {
    if (!sitemapXml) return void expect(fetchError).toBeTruthy();
    for (const alias of URL_ALIASES) expect(sitemapXml).not.toContain(alias.alias);
  });

  it("serves robots.txt that allows aliases and canonical targets", () => {
    if (!robotsText) return void expect(fetchError).toBeTruthy();
    expect(findRobotsAliasConflicts(parseRobots(robotsText))).toEqual([]);
  });

  it("redirects each alias to its canonical slug with a 301", async () => {
    if (!robotsText) return void expect(fetchError).toBeTruthy();
    for (const alias of URL_ALIASES) {
      const res = await fetch(`${BASE_URL}${alias.alias}`, { redirect: "manual" });
      expect([301, 308], `${alias.alias} status`).toContain(res.status);
      const location = res.headers.get("location") ?? "";
      expect(pathOf(location)).toBe(pathOf(alias.canonical));
    }
  }, 30_000);

  it("serves every canonical target as a 200", async () => {
    if (!robotsText) return void expect(fetchError).toBeTruthy();
    for (const canonical of CANONICAL_ALIAS_TARGETS) {
      const res = await fetch(`${BASE_URL}${canonical}`);
      expect(res.status, `${canonical} status`).toBe(200);
    }
  }, 30_000);
});
