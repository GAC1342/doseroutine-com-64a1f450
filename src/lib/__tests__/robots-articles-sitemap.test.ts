import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { LOCAL_ARTICLE_SLUGS } from "@/lib/local-articles";
import {
  ALLOWED_SITEMAP_URLS,
  CANONICAL_SITEMAP_URL,
  decidePath,
  groupFor,
  isValidSitemapUrl,
  parseRobots,
  parseSitemapUrls,
  ROBOT_AGENT_POLICIES,
} from "@/lib/robots-policy";

/**
 * robots.txt has two jobs for the blog: point crawlers at the right sitemap,
 * and never block an /articles URL. Both are easy to break with a broad
 * Disallow prefix (`/a`, `/art`) or a stale sitemap host, so they're asserted
 * here against the file that actually ships.
 */

const ROBOTS = readFileSync("public/robots.txt", "utf8");
const GROUPS = parseRobots(ROBOTS);
const AGENTS = ["*", ...ROBOT_AGENT_POLICIES.map((p) => p.name)];

const ARTICLE_PATHS = [
  "/articles",
  "/articles/",
  "/articles/feed.xml",
  ...LOCAL_ARTICLE_SLUGS.map((slug) => `/articles/${slug}`),
];

describe("robots.txt sitemap directives", () => {
  const declared = parseSitemapUrls(ROBOTS);

  it("declares at least one sitemap", () => {
    expect(declared.length).toBeGreaterThan(0);
  });

  it("lists the canonical sitemap first", () => {
    expect(declared[0]).toBe(CANONICAL_SITEMAP_URL);
  });

  it("only advertises approved absolute https sitemap URLs", () => {
    for (const url of declared) {
      expect(isValidSitemapUrl(url), `${url} is not an absolute https .xml URL`).toBe(true);
      expect(ALLOWED_SITEMAP_URLS, `${url} is not an approved sitemap`).toContain(url);
    }
  });

  it("never points at a preview, www, or relative sitemap host", () => {
    const canonicalHost = new URL(CANONICAL_SITEMAP_URL).host;
    for (const url of declared) {
      expect(new URL(url).host).toBe(canonicalHost);
    }
  });

  it("declares no duplicate sitemap lines", () => {
    expect(new Set(declared).size).toBe(declared.length);
  });
});

describe("robots.txt never blocks /articles", () => {
  it("has article slugs to check", () => {
    expect(LOCAL_ARTICLE_SLUGS.length).toBeGreaterThan(0);
  });

  for (const agent of AGENTS) {
    it(`allows every /articles path for ${agent}`, () => {
      const group = groupFor(GROUPS, agent);
      const blocked = ARTICLE_PATHS.filter((path) => decidePath(group, path).allowed === false);
      expect(blocked, `blocked for ${agent}: ${blocked.join(", ")}`).toEqual([]);
    });
  }

  it("carries no Disallow rule that starts inside /articles", () => {
    const offenders: string[] = [];
    for (const group of GROUPS) {
      for (const rule of group.disallow) {
        const cleaned = rule.trim();
        if (!cleaned) continue;
        if ("/articles".startsWith(cleaned.replace(/\*+$/, "")) && cleaned !== "/") {
          offenders.push(`[${group.agents.join(", ")}] Disallow: ${cleaned}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
