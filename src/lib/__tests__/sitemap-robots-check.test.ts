import { describe, expect, it } from "vitest";
import {
  SITEMAP_MAX_URLS,
  checkUrlResult,
  isDisallowed,
  isPrivatePath,
  parseRobots,
  parseSitemap,
  pickSample,
  validateRobots,
  validateSitemapUrls,
} from "../../../scripts/sitemap-robots-check.mjs";

const BASE = "https://doseroutine.com";

const GOOD_ROBOTS = `# DoseRoutine
User-agent: *
Allow: /
Disallow: /auth
Disallow: /login
Disallow: /onboarding
Disallow: /admin
Disallow: /settings
Disallow: /chat
Disallow: /checkins
Disallow: /costs
Disallow: /export
Disallow: /injection-sites
Disallow: /today

Sitemap: https://doseroutine.com/sitemap.xml
`;

describe("parseSitemap", () => {
  it("reads a urlset", () => {
    const { kind, locs } = parseSitemap(
      `<urlset><url><loc>${BASE}/</loc></url><url><loc>${BASE}/faq</loc></url></urlset>`,
    );
    expect(kind).toBe("urlset");
    expect(locs).toEqual([`${BASE}/`, `${BASE}/faq`]);
  });

  it("reads an index and decodes entities", () => {
    const { kind, locs } = parseSitemap(
      `<sitemapindex><sitemap><loc>${BASE}/sitemap-a.xml?x=1&amp;y=2</loc></sitemap></sitemapindex>`,
    );
    expect(kind).toBe("index");
    expect(locs[0]).toBe(`${BASE}/sitemap-a.xml?x=1&y=2`);
  });

  it("flags a non-sitemap document", () => {
    expect(parseSitemap("<html><body>oops</body></html>").kind).toBe("unknown");
  });
});

describe("parseRobots", () => {
  it("groups directives and collects sitemaps", () => {
    const robots = parseRobots(GOOD_ROBOTS);
    expect(robots.groups).toHaveLength(1);
    expect(robots.groups[0].agents).toEqual(["*"]);
    expect(robots.groups[0].disallow).toContain("/admin");
    expect(robots.sitemaps).toEqual([`${BASE}/sitemap.xml`]);
  });

  it("keeps per-agent groups separate", () => {
    const robots = parseRobots("User-agent: Googlebot\nDisallow: /x\n\nUser-agent: *\nAllow: /\n");
    expect(robots.groups).toHaveLength(2);
    expect(robots.groups[1].agents).toEqual(["*"]);
  });
});

describe("isDisallowed", () => {
  const robots = parseRobots(GOOD_ROBOTS);

  it("blocks private prefixes", () => {
    expect(isDisallowed(robots, "/admin/search-console")).toBe(true);
    expect(isDisallowed(robots, "/today")).toBe(true);
  });

  it("allows public pages", () => {
    expect(isDisallowed(robots, "/library/retatrutide")).toBe(false);
    expect(isDisallowed(robots, "/booty-workout")).toBe(false);
    expect(isDisallowed(robots, "/")).toBe(false);
  });

  it("honours the longest match", () => {
    const r = parseRobots("User-agent: *\nDisallow: /library\nAllow: /library/public\n");
    expect(isDisallowed(r, "/library/x")).toBe(true);
    expect(isDisallowed(r, "/library/public/x")).toBe(false);
  });
});

describe("validateRobots", () => {
  it("passes the shipped policy", () => {
    expect(validateRobots(GOOD_ROBOTS, { baseUrl: BASE }).failures).toEqual([]);
  });

  it("fails a blanket block", () => {
    const { failures } = validateRobots("User-agent: *\nDisallow: /\n", { baseUrl: BASE });
    expect(failures.some((f) => f.includes("blocks the entire site"))).toBe(true);
  });

  it("fails when there is no wildcard group", () => {
    const { failures } = validateRobots("User-agent: Googlebot\nAllow: /\n", { baseUrl: BASE });
    expect(failures.some((f) => f.includes("User-agent: *"))).toBe(true);
  });

  it("fails an off-origin sitemap reference", () => {
    const { failures } = validateRobots(
      `${GOOD_ROBOTS}Sitemap: https://evil.example/sitemap.xml\n`,
      {
        baseUrl: BASE,
      },
    );
    expect(failures.some((f) => f.includes("off-origin"))).toBe(true);
  });
});

describe("validateSitemapUrls", () => {
  const robots = parseRobots(GOOD_ROBOTS);
  const ok = [`${BASE}/`, `${BASE}/faq`, `${BASE}/library/retatrutide`];

  it("passes a clean set", () => {
    expect(validateSitemapUrls(ok, { baseUrl: BASE, robots, minUrls: 3 })).toEqual([]);
  });

  it("keeps the public workout crawlable", () => {
    expect(
      validateSitemapUrls([`${BASE}/booty-workout`], { baseUrl: BASE, robots }),
    ).toEqual([]);
  });

  it("fails an empty sitemap", () => {
    expect(validateSitemapUrls([], { baseUrl: BASE, robots }).length).toBeGreaterThan(0);
  });

  it("fails when the count drops below the floor", () => {
    const failures = validateSitemapUrls(ok, { baseUrl: BASE, robots, minUrls: 100 });
    expect(failures.some((f) => f.includes("below the expected minimum"))).toBe(true);
  });

  it("flags duplicates", () => {
    const failures = validateSitemapUrls([...ok, `${BASE}/faq`], { baseUrl: BASE, robots });
    expect(failures.some((f) => f.includes("duplicate"))).toBe(true);
  });

  it("flags off-origin and private URLs", () => {
    const failures = validateSitemapUrls([`${BASE}/today`, "https://other.example/x"], {
      baseUrl: BASE,
      robots,
    });
    expect(failures.some((f) => f.includes("private route leaked"))).toBe(true);
    expect(failures.some((f) => f.includes("off-origin"))).toBe(true);
  });

  it("knows the 50k limit", () => {
    expect(SITEMAP_MAX_URLS).toBe(50000);
  });
});

describe("checkUrlResult", () => {
  it("accepts a 200", () => {
    expect(checkUrlResult({ url: `${BASE}/faq`, status: 200, finalUrl: `${BASE}/faq` })).toBeNull();
  });

  it("rejects a non-200", () => {
    expect(checkUrlResult({ url: `${BASE}/gone`, status: 404 })).toContain("HTTP 404");
  });

  it("rejects a redirect into auth", () => {
    expect(
      checkUrlResult({ url: `${BASE}/faq`, status: 200, finalUrl: `${BASE}/auth?next=/faq` }),
    ).toContain("private area");
  });
});

describe("helpers", () => {
  it("detects private paths", () => {
    expect(isPrivatePath("/admin/install-funnel")).toBe(true);
    expect(isPrivatePath("/library/tamoxifen")).toBe(false);
  });

  it("spreads the sample across the sitemap", () => {
    const urls = Array.from({ length: 100 }, (_, i) => `${BASE}/p${i}`);
    const sample = pickSample(urls, 10);
    expect(sample).toHaveLength(10);
    expect(sample[0]).toBe(`${BASE}/p0`);
    expect(sample.at(-1)).toBe(`${BASE}/p90`);
  });
});
