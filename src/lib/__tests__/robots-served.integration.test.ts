import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CANONICAL_SITEMAP_URL,
  ROBOT_AGENT_POLICIES,
  blocksPublicContent,
  crawlDelayProblems,
  findPathConflicts,
  findPolicyViolations,
  groupFor,
  isValidSitemapUrl,
  parseRobots,
  parseSitemapUrls,
  type RobotsGroup,
} from "../robots-policy";

/**
 * Integration test: fetches /robots.txt from the running server rather than
 * reading the file off disk.
 *
 * A correct public/robots.txt is worthless if the server rewrites it, 404s it,
 * or serves it as HTML — so the transport is asserted first (status 200, a
 * plain-text content type, the expected directives present, and byte parity
 * with the committed file) before any parsing assertions run.
 *
 * Base URL: ROBOTS_BASE_URL, else the local dev server.
 */
const BASE_URL = (process.env["ROBOTS_BASE_URL"] ?? "http://localhost:8080").replace(/\/+$/, "");
/** Set to "1" in CI to turn an unreachable server into a failure, not a skip. */
const REQUIRE_SERVER = process.env["ROBOTS_REQUIRE_SERVER"] === "1";

const diskRobots = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");

interface Fetched {
  status: number;
  contentType: string;
  body: string;
}

let fetched: Fetched | null = null;
let fetchError: string | null = null;
let groups: RobotsGroup[] = [];

/** Normalize line endings and trailing whitespace before comparing payloads. */
function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").trimEnd();
}

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/robots.txt`, {
      redirect: "follow",
      headers: { accept: "text/plain,*/*" },
      signal: AbortSignal.timeout(15_000),
    });
    fetched = {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      body: await res.text(),
    };
    groups = parseRobots(fetched.body);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    if (REQUIRE_SERVER) throw err;
  }
}, 20_000);

/** Guards every assertion: without a served file there is nothing to assert. */
function served(): Fetched {
  if (!fetched) throw new Error(`robots.txt was not fetched from ${BASE_URL}: ${fetchError}`);
  return fetched;
}

const canRun = () => fetched !== null;
const maybe = (name: string, fn: () => void | Promise<void>, timeout?: number) =>
  it(
    name,
    () => {
      if (!canRun()) {
        // Server not running locally: skip rather than report a false failure.
        // CI sets ROBOTS_REQUIRE_SERVER=1, where the beforeAll hook throws instead.
        console.warn(`[robots integration] skipped "${name}" — ${fetchError}`);
        return;
      }
      return fn();
    },
    timeout,
  );

describe(`GET ${BASE_URL}/robots.txt`, () => {
  // --- transport contract: must pass before parsing means anything ---
  maybe("returns HTTP 200", () => {
    expect(served().status).toBe(200);
  });

  maybe("is served as plain text, not HTML", () => {
    const { contentType } = served();
    expect(contentType.toLowerCase()).toContain("text/plain");
  });

  maybe("returns a non-empty robots body, not an SPA shell", () => {
    const body = served().body;
    expect(body.trim().length).toBeGreaterThan(0);
    expect(body).not.toMatch(/<!doctype html|<html/i);
    expect(body).toMatch(/^\s*(#|User-agent:)/i);
  });

  maybe("contains the expected core directives", () => {
    const body = served().body;
    expect(body).toMatch(/User-agent:\s*\*/i);
    expect(body).toMatch(/^\s*Allow:\s*\/\s*$/im);
    expect(body).toMatch(/Sitemap:\s*https:\/\/doseroutine\.com\/sitemap\.xml/i);
  });

  maybe("matches the committed public/robots.txt byte-for-byte", () => {
    expect(normalize(served().body)).toBe(normalize(diskRobots));
  });

  // --- parsing assertions, only meaningful once the above hold ---
  maybe("parses into the wildcard group plus explicit AI groups", () => {
    expect(served().status).toBe(200);
    expect(groups.length).toBeGreaterThanOrEqual(2);
    expect(groupFor(groups, "*")).toBeDefined();
  });

  for (const policy of ROBOT_AGENT_POLICIES) {
    const agent = policy.name;
    maybe(`explicitly allows ${agent} with no site-wide Disallow`, () => {
      expect(served().status).toBe(200);
      const group = groupFor(groups, agent);
      expect(group, `${agent} is missing from the served robots.txt`).toBeDefined();
      for (const path of policy.allow) {
        expect(group?.allow, `${agent} has no Allow: ${path}`).toContain(path);
      }
      expect(group?.disallow ?? []).not.toContain("/");
      expect(blocksPublicContent(group), `${agent} is blocked from /library or /blog`).toBe(false);
    });

    maybe(`has no path-level Disallow contradicting the Allow entries for ${agent}`, () => {
      expect(served().status).toBe(200);
      const conflicts = findPathConflicts(groupFor(groups, agent), policy.mustBeCrawlable);
      expect(conflicts.map((c) => `${c.path} blocked by Disallow: ${c.rule}`)).toEqual([]);
    });

    maybe(`declares an acceptable Crawl-delay for ${agent}`, () => {
      expect(served().status).toBe(200);
      expect(
        crawlDelayProblems(agent, groupFor(groups, agent), policy.maxCrawlDelaySeconds),
      ).toEqual([]);
    });
  }

  maybe("has no site-wide Disallow anywhere in the served file", () => {
    expect(served().status).toBe(200);
    expect(groups.filter((g) => g.disallow.includes("/")).map((g) => g.agents.join(", "))).toEqual(
      [],
    );
  });

  maybe("reports zero policy violations overall", () => {
    expect(served().status).toBe(200);
    expect(findPolicyViolations(served().body)).toEqual([]);
  });

  // --- sitemap discovery: robots must point crawlers at a working sitemap ---
  maybe("declares at least one valid absolute https Sitemap URL", () => {
    expect(served().status).toBe(200);
    const urls = parseSitemapUrls(served().body);
    expect(urls.length, "robots.txt has no Sitemap: directive").toBeGreaterThan(0);
    for (const url of urls) {
      expect(isValidSitemapUrl(url), `invalid Sitemap URL: ${url}`).toBe(true);
    }
  });

  maybe("points at the canonical doseroutine.com sitemap", () => {
    expect(served().status).toBe(200);
    expect(parseSitemapUrls(served().body)).toContain(CANONICAL_SITEMAP_URL);
  });

  maybe(
    "serves every declared sitemap successfully as XML",
    async () => {
      expect(served().status).toBe(200);
      const urls = parseSitemapUrls(served().body);
      expect(urls.length).toBeGreaterThan(0);

      for (const declared of urls) {
        // Fetch the same path from the server under test, so the assertion
        // reflects this build rather than whatever production is serving.
        const path = new URL(declared).pathname;
        const res = await fetch(`${BASE_URL}${path}`, {
          redirect: "follow",
          headers: { accept: "application/xml,text/xml,*/*" },
          signal: AbortSignal.timeout(30_000),
        });
        expect(res.status, `${path} did not return 200`).toBe(200);
        expect(
          (res.headers.get("content-type") ?? "").toLowerCase(),
          `${path} is not served as XML`,
        ).toMatch(/xml/);

        const body = await res.text();
        expect(body).toMatch(/<\?xml/);
        // The sitemap protocol also accepts RSS/Atom feeds, and robots.txt
        // declares /feed.xml so new posts get discovered quickly.
        expect(body, `${path} is not a urlset, sitemapindex or RSS/Atom feed`).toMatch(
          /<(urlset|sitemapindex|rss|feed)\b/,
        );
        expect(body).toMatch(/<(loc|link)>?/);
      }
    },
    45_000,
  );
});
