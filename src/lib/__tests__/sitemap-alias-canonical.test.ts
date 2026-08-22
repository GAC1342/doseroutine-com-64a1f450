import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRobots, parseSitemapUrls } from "@/lib/robots-policy";
import { URL_ALIASES } from "@/lib/url-aliases";
import {
  CANONICAL_ALIAS_TARGETS,
  findRobotsAliasConflicts,
  findSitemapAliasProblems,
  pathOf,
} from "@/lib/sitemap-alias-policy";

/**
 * Static guards for the alias/canonical contract, run against the committed
 * robots.txt (no server required). The live sitemap is checked in
 * sitemap-alias-canonical.integration.test.ts.
 */
const robotsText = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");

describe("pathOf", () => {
  it("normalizes origin, trailing slash and case", () => {
    expect(pathOf("https://doseroutine.com/Blog/")).toBe("/blog");
    expect(pathOf("/for")).toBe("/for");
    expect(pathOf("https://doseroutine.com/")).toBe("/");
  });
});

describe("sitemap canonical policy", () => {
  const good = [
    "https://doseroutine.com/",
    ...CANONICAL_ALIAS_TARGETS.map((p) => `https://doseroutine.com${p}`),
  ];

  it("accepts a sitemap listing only canonical slugs", () => {
    expect(findSitemapAliasProblems(good)).toEqual([]);
  });

  it("rejects an alias URL in the sitemap", () => {
    const problems = findSitemapAliasProblems([
      ...good,
      "https://doseroutine.com/health-tracking-blog",
    ]);
    expect(problems.map((p) => p.reason).join(" ")).toContain("alias path /health-tracking-blog");
  });

  it("rejects a trailing-slash duplicate of a canonical slug", () => {
    const problems = findSitemapAliasProblems([...good, "https://doseroutine.com/blog/"]);
    expect(problems.some((p) => p.reason.includes("listed 2 times"))).toBe(true);
  });

  it("rejects a non-pagination query copy of a canonical slug", () => {
    const problems = findSitemapAliasProblems([...good, "https://doseroutine.com/blog?lang=es"]);
    expect(problems.some((p) => p.reason.includes('got "?lang=es"'))).toBe(true);
  });

  it("allows paginated canonical URLs", () => {
    expect(findSitemapAliasProblems([...good, "https://doseroutine.com/blog?page=2"])).toEqual([]);
  });

  it("fails when a canonical slug is missing entirely", () => {
    const problems = findSitemapAliasProblems(["https://doseroutine.com/"]);
    expect(problems).toHaveLength(CANONICAL_ALIAS_TARGETS.length);
  });

  it("never lists an alias in the sitemap route source", () => {
    const source = readFileSync(resolve(process.cwd(), "src/routes/sitemap[.]xml.ts"), "utf8");
    for (const alias of URL_ALIASES) expect(source).not.toContain(alias.alias);
  });
});

describe("robots directives vs alias redirects", () => {
  const groups = parseRobots(robotsText);

  it("lets every crawler group fetch aliases and their canonical targets", () => {
    expect(findRobotsAliasConflicts(groups)).toEqual([]);
  });

  it("also allows the AI answer-engine groups through", () => {
    expect(findRobotsAliasConflicts(groups, ["GPTBot", "ClaudeBot", "PerplexityBot"])).toEqual([]);
  });

  it("detects a conflicting Disallow that would strand a redirect", () => {
    const broken = parseRobots("User-agent: *\nAllow: /\nDisallow: /health-tracking-blog\n");
    const problems = findRobotsAliasConflicts(broken, ["*"]);
    expect(problems).toHaveLength(1);
    expect(problems[0].path).toBe("/health-tracking-blog");
  });

  it("detects a Disallow on the canonical destination", () => {
    const broken = parseRobots("User-agent: *\nAllow: /\nDisallow: /blog\n");
    expect(findRobotsAliasConflicts(broken, ["*"]).some((p) => p.path === "/blog")).toBe(true);
  });

  it("keeps the sitemap directive pointing at the canonical host", () => {
    const sitemaps = parseSitemapUrls(robotsText);
    expect(sitemaps).toContain("https://doseroutine.com/sitemap.xml");
  });
});
