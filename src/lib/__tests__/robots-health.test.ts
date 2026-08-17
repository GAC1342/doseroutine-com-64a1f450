import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  analyzeRobots,
  parseWildcardGroup,
  parseSitemapDirectives,
  matchesRule,
  parseGroupFor,
  isPathAllowed,
  fingerprintRules,
  MONITORED_CRAWLERS,
  MUST_ALLOW_PATHS,
  MUST_DISALLOW_PATHS,
} from "../robots-health";
import { ROBOTS_BASELINE } from "../robots-baseline";

const SITEMAP = "https://doseroutine.com/sitemap.xml";
const liveRobots = readFileSync(join(process.cwd(), "public", "robots.txt"), "utf8");

const base = {
  status: 200,
  contentType: "text/plain; charset=utf-8",
  expectedSitemapUrl: SITEMAP,
  sitemapReachable: true,
};

describe("parseWildcardGroup", () => {
  it("collects rules from the * group only", () => {
    const g = parseWildcardGroup(
      "User-agent: *\nAllow: /\nDisallow: /admin\n\nUser-agent: Googlebot\nDisallow: /secret\n",
    );
    expect(g.found).toBe(true);
    expect(g.allow).toEqual(["/"]);
    expect(g.disallow).toEqual(["/admin"]);
  });

  it("handles grouped user-agents", () => {
    const g = parseWildcardGroup("User-agent: Googlebot\nUser-agent: *\nDisallow: /x\n");
    expect(g.disallow).toEqual(["/x"]);
  });

  it("ignores comments", () => {
    const g = parseWildcardGroup("User-agent: *\n# Disallow: /nope\nAllow: /\n");
    expect(g.disallow).toEqual([]);
  });
});

describe("parseSitemapDirectives", () => {
  it("reads sitemap urls and skips commented ones", () => {
    expect(
      parseSitemapDirectives(`Sitemap: ${SITEMAP}\n# Sitemap: https://x.com/other.xml\n`),
    ).toEqual([SITEMAP]);
  });
});

describe("matchesRule", () => {
  it("prefix matches", () => expect(matchesRule("/admin", "/admin/users")).toBe(true));
  it("respects wildcards", () => expect(matchesRule("/a*/c", "/abc/c")).toBe(true));
  it("respects end anchors", () => {
    expect(matchesRule("/x$", "/x")).toBe(true);
    expect(matchesRule("/x$", "/x/y")).toBe(false);
  });
  it("does not match unrelated paths", () =>
    expect(matchesRule("/admin", "/library/nad")).toBe(false));
});

describe("analyzeRobots", () => {
  it("passes for the live project robots.txt", () => {
    const issues = analyzeRobots({
      ...base,
      body: liveRobots,
      sampleSitemapPaths: ["/", "/library", "/library/nad-plus", "/faq", "/interaction-checker"],
    });
    expect(issues).toEqual([]);
  });

  it("flags an unreachable file", () => {
    const issues = analyzeRobots({ ...base, status: 404, body: "" });
    expect(issues.map((i) => i.code)).toEqual(["unreachable"]);
  });

  it("flags a missing sitemap directive", () => {
    const issues = analyzeRobots({ ...base, body: "User-agent: *\nAllow: /\n" });
    expect(issues.map((i) => i.code)).toContain("missing_sitemap");
  });

  it("flags a wrong sitemap URL", () => {
    const issues = analyzeRobots({
      ...base,
      body: "User-agent: *\nAllow: /\nSitemap: https://my-stack-wise.com/sitemap.xml\n",
    });
    expect(issues.map((i) => i.code)).toContain("wrong_sitemap");
  });

  it("flags an unreachable sitemap", () => {
    const issues = analyzeRobots({
      ...base,
      sitemapReachable: false,
      body: `User-agent: *\nAllow: /\nSitemap: ${SITEMAP}\n`,
    });
    expect(issues.map((i) => i.code)).toContain("sitemap_unreachable");
  });

  it("flags a site-wide disallow", () => {
    const issues = analyzeRobots({
      ...base,
      body: `User-agent: *\nDisallow: /\nSitemap: ${SITEMAP}\n`,
    });
    expect(issues.map((i) => i.code)).toContain("site_wide_disallow");
  });

  it("flags noindex directives in the body", () => {
    const issues = analyzeRobots({
      ...base,
      body: `User-agent: *\nAllow: /\nNoindex: /library\nSitemap: ${SITEMAP}\n`,
    });
    expect(issues.map((i) => i.code)).toContain("noindex_directive");
  });

  it("flags an X-Robots-Tag noindex header", () => {
    const issues = analyzeRobots({
      ...base,
      xRobotsTag: "noindex, nofollow",
      body: `User-agent: *\nAllow: /\nSitemap: ${SITEMAP}\n`,
    });
    expect(issues.map((i) => i.code)).toContain("x_robots_noindex");
  });

  it("flags indexable sitemap URLs that are blocked", () => {
    const issues = analyzeRobots({
      ...base,
      body: `User-agent: *\nAllow: /\nDisallow: /library\nSitemap: ${SITEMAP}\n`,
      sampleSitemapPaths: ["/library/nad-plus"],
    });
    expect(issues.map((i) => i.code)).toContain("sitemap_url_blocked");
  });

  it("flags a non text/plain content type", () => {
    const issues = analyzeRobots({
      ...base,
      contentType: "text/html",
      body: `User-agent: *\nAllow: /\nSitemap: ${SITEMAP}\n`,
    });
    expect(issues.map((i) => i.code)).toContain("wrong_content_type");
  });
});

describe("crawler-specific rules", () => {
  it("lets Googlebot and Bingbot crawl public pages in the live file", () => {
    for (const bot of MONITORED_CRAWLERS) {
      const g = parseGroupFor(liveRobots, bot);
      for (const p of MUST_ALLOW_PATHS) expect(isPathAllowed(g, p), `${bot} ${p}`).toBe(true);
      for (const p of MUST_DISALLOW_PATHS) expect(isPathAllowed(g, p), `${bot} ${p}`).toBe(false);
    }
  });

  it("prefers a crawler-specific group over the * group", () => {
    const body = "User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nDisallow: /\n";
    expect(parseGroupFor(body, "Googlebot")).toMatchObject({ specific: true, disallow: ["/"] });
    expect(parseGroupFor(body, "Bingbot").specific).toBe(false);
  });

  it("flags a crawler blocked site-wide", () => {
    const body =
      "User-agent: *\nAllow: /\nSitemap: " + SITEMAP + "\n\nUser-agent: Bingbot\nDisallow: /\n";
    const codes = analyzeRobots({ ...base, body }).map((i) => i.code);
    expect(codes).toContain("crawler_blocked");
  });

  it("flags a public page blocked for a named crawler", () => {
    const body =
      "User-agent: *\nAllow: /\nSitemap: " +
      SITEMAP +
      "\n\nUser-agent: Googlebot\nAllow: /\nDisallow: /library\n";
    const issue = analyzeRobots({ ...base, body }).find((i) => i.code === "crawler_path_blocked");
    expect(issue?.message).toContain("/library");
  });

  it("flags private paths becoming crawlable", () => {
    const body = "User-agent: *\nAllow: /\nSitemap: " + SITEMAP + "\n";
    const issue = analyzeRobots({ ...base, body }).find((i) => i.code === "private_path_crawlable");
    expect(issue?.message).toContain("/admin");
  });

  it("longest-match Allow overrides a Disallow", () => {
    const g = { disallow: ["/library"], allow: ["/library/creatine"] };
    expect(isPathAllowed(g, "/library/creatine")).toBe(true);
    expect(isPathAllowed(g, "/library/zinc")).toBe(false);
  });
});

describe("baseline drift detection", () => {
  it("baseline matches the committed robots.txt", () => {
    expect(fingerprintRules(liveRobots)).toEqual([...ROBOTS_BASELINE].sort());
  });

  it("ignores comments, blank lines and rule order", () => {
    const a = fingerprintRules("User-agent: *\nAllow: /\nDisallow: /admin\n");
    const b = fingerprintRules("# hi\n\nUser-agent: *\n\nDisallow: /admin\nAllow: /\n");
    expect(a).toEqual(b);
  });

  it("reports added and removed rules", () => {
    // Drop the wildcard group's /admin rule specifically (named AI-crawler
    // groups above it carry their own copy) and add an unexpected rule.
    const body =
      liveRobots.slice(0, liveRobots.lastIndexOf("Disallow: /admin\n")) +
      liveRobots.slice(liveRobots.lastIndexOf("Disallow: /admin\n") + "Disallow: /admin\n".length) +
      "\nDisallow: /library\n";
    const issue = analyzeRobots({
      ...base,
      body,
      expectedFingerprint: ROBOTS_BASELINE,
    }).find((i) => i.code === "rules_changed");
    expect(issue).toBeTruthy();
    expect(issue!.message).toContain("*|disallow|/admin");
    expect(issue!.message).toContain("*|disallow|/library");
  });

  it("reports no drift for the unchanged live file", () => {
    const codes = analyzeRobots({
      ...base,
      body: liveRobots,
      expectedFingerprint: ROBOTS_BASELINE,
    }).map((i) => i.code);
    expect(codes).not.toContain("rules_changed");
  });
});
