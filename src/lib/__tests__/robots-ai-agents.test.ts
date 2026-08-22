import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CANONICAL_SITEMAP_URL,
  ROBOT_AGENT_POLICIES,
  WILDCARD_POLICY,
} from "../robots-policy.config";
import {
  crawlDelayProblems,
  decidePath,
  findPathConflicts,
  findPolicyViolations,
  groupFor,
  inspectCrawlDelay,
  isValidSitemapUrl,
  parseRobots,
  parseSitemapUrls,
  ruleMatches,
} from "../robots-policy";

/**
 * Guards the AI/search crawler policy in public/robots.txt.
 *
 * The agent list and their expected Allow paths live in
 * src/lib/robots-policy.config.ts — update that file, not this test.
 */
const robotsText = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");
const groups = parseRobots(robotsText);

describe("robots.txt AI/search crawler policy", () => {
  it("parses at least the wildcard group plus one explicit AI group", () => {
    expect(groups.length).toBeGreaterThanOrEqual(2);
    expect(groupFor(groups, "*")).toBeDefined();
  });

  it.each(ROBOT_AGENT_POLICIES)("names $name in an explicit group", (policy) => {
    expect(
      groupFor(groups, policy.name),
      `${policy.name} is missing from robots.txt`,
    ).toBeDefined();
  });

  it.each(ROBOT_AGENT_POLICIES)("allows $name at its configured paths", (policy) => {
    const group = groupFor(groups, policy.name);
    for (const path of policy.allow) {
      expect(group?.allow, `${policy.name} has no Allow: ${path}`).toContain(path);
    }
  });

  it.each(ROBOT_AGENT_POLICIES)("does not block $name with a site-wide Disallow", (policy) => {
    const group = groupFor(groups, policy.name);
    // An empty Disallow value ("Disallow:") means "allow everything" and is fine;
    // only a literal "/" is a full block.
    expect(group?.disallow ?? []).not.toContain("/");
  });

  it.each(ROBOT_AGENT_POLICIES)("keeps public content crawlable for $name", (policy) => {
    const disallow = groupFor(groups, policy.name)?.disallow ?? [];
    for (const path of policy.mustNotDisallow) {
      expect(disallow, `${policy.name} is blocked from ${path}`).not.toContain(path);
    }
  });

  it.each(ROBOT_AGENT_POLICIES)(
    "has no path-level Disallow contradicting the Allow entries for $name",
    (policy) => {
      const group = groupFor(groups, policy.name);
      const conflicts = findPathConflicts(group, policy.mustBeCrawlable);
      expect(
        conflicts.map((c) => `${c.path} blocked by Disallow: ${c.rule}`),
        `${policy.name} has contradictory path rules`,
      ).toEqual([]);
    },
  );

  it.each(ROBOT_AGENT_POLICIES)("declares an acceptable Crawl-delay for $name", (policy) => {
    const group = groupFor(groups, policy.name);
    expect(crawlDelayProblems(policy.name, group, policy.maxCrawlDelaySeconds)).toEqual([]);
  });

  it("keeps private app surfaces disallowed for AI agents", () => {
    const group = groupFor(groups, "GPTBot");
    for (const path of ["/settings", "/admin", "/api/chat"]) {
      expect(decidePath(group, path).allowed, `${path} should stay blocked`).toBe(false);
    }
  });

  it("satisfies the wildcard group expectations", () => {
    const wildcard = groupFor(groups, "*");
    for (const path of WILDCARD_POLICY.allow) expect(wildcard?.allow).toContain(path);
    for (const path of WILDCARD_POLICY.forbiddenDisallow) {
      expect(wildcard?.disallow ?? []).not.toContain(path);
    }
  });

  it("has no site-wide Disallow anywhere in the file", () => {
    const blocking = groups.filter((g) => g.disallow.includes("/"));
    expect(
      blocking.map((g) => g.agents.join(", ")),
      "a group blocks the whole site",
    ).toEqual([]);
  });

  it("reports no policy violations overall", () => {
    expect(findPolicyViolations(robotsText)).toEqual([]);
  });

  it("keeps the wildcard group free of Crawl-delay and path contradictions", () => {
    const wildcard = groupFor(groups, "*");
    expect(findPathConflicts(wildcard, [...WILDCARD_POLICY.mustBeCrawlable])).toEqual([]);
    expect(crawlDelayProblems("wildcard", wildcard, WILDCARD_POLICY.maxCrawlDelaySeconds)).toEqual(
      [],
    );
  });

  it("advertises the canonical sitemap", () => {
    const sitemaps = parseSitemapUrls(robotsText);
    expect(sitemaps).toContain(CANONICAL_SITEMAP_URL);
    for (const url of sitemaps) {
      expect(isValidSitemapUrl(url), `${url} is not a valid absolute https .xml URL`).toBe(true);
    }
  });
});

describe("robots rule precedence helpers", () => {
  it("matches prefix, wildcard, and anchored rules", () => {
    expect(ruleMatches("/library", "/library/retatrutide-dosage")).toBe(true);
    expect(ruleMatches("/lib", "/library")).toBe(true);
    expect(ruleMatches("/*.pdf$", "/docs/guide.pdf")).toBe(true);
    expect(ruleMatches("/*.pdf$", "/docs/guide.pdf.html")).toBe(false);
    expect(ruleMatches("", "/anything")).toBe(false);
  });

  it("lets the longest matching rule win, with Allow breaking ties", () => {
    const group = {
      agents: ["TestBot"],
      allow: ["/", "/library/public"],
      disallow: ["/library"],
      crawlDelay: [],
    };
    expect(decidePath(group, "/library/public/a").allowed).toBe(true);
    expect(decidePath(group, "/library/private").allowed).toBe(false);
    expect(decidePath(group, "/blog").allowed).toBe(true);
  });

  it("flags a Disallow that swallows a required path", () => {
    const group = { agents: ["TestBot"], allow: ["/"], disallow: ["/lib"], crawlDelay: [] };
    expect(findPathConflicts(group, ["/library"])).toEqual([{ path: "/library", rule: "/lib" }]);
  });

  it("rejects invalid, duplicated, and over-limit crawl delays", () => {
    const group = { agents: ["TestBot"], allow: ["/"], disallow: [], crawlDelay: ["abc", "5"] };
    expect(inspectCrawlDelay(group).invalid).toEqual(["abc"]);
    expect(crawlDelayProblems("TestBot", group, null).length).toBeGreaterThan(0);
    expect(crawlDelayProblems("TestBot", group, 10)).not.toContain(
      "TestBot Crawl-delay 5s exceeds the 10s ceiling",
    );
    expect(crawlDelayProblems("TestBot", group, 1)).toContain(
      "TestBot Crawl-delay 5s exceeds the 1s ceiling",
    );
  });
});
