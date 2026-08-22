import { describe, expect, it } from "vitest";

import {
  evaluateChain,
  evaluateCrawl,
  evaluateDuplicateParams,
  extractRobotsMeta,
  isNoindex,
  langVariants,
} from "../../../scripts/crawl-smoke.mjs";
import { evaluateSitemapUrl } from "../../../scripts/sitemap-crawlable.mjs";

const ORIGIN = "https://doseroutine.com";
const PAGE = `${ORIGIN}/library/creatine`;

function goodHtml(url = PAGE) {
  return `
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="en" href="${url}" />
    <link rel="alternate" hreflang="x-default" href="${url}" />`;
}

const SITEMAP = new Set([`${ORIGIN}/library/creatine`, `${ORIGIN}/library/bpc-157`]);

describe("langVariants", () => {
  it("appends ?lang= for each locale", () => {
    expect(langVariants(PAGE, ["ar", "es"])).toEqual([`${PAGE}?lang=ar`, `${PAGE}?lang=es`]);
  });
});

describe("robots directives", () => {
  it("reads meta robots and googlebot", () => {
    expect(extractRobotsMeta(`<meta name="robots" content="NOINDEX, follow">`)).toEqual([
      "noindex, follow",
    ]);
  });

  it("detects noindex from meta or header", () => {
    expect(isNoindex(`<meta name="robots" content="noindex">`)).toBe(true);
    expect(isNoindex("", { "x-robots-tag": "noindex" })).toBe(true);
    expect(isNoindex(`<meta name="robots" content="index,follow">`)).toBe(false);
  });
});

describe("evaluateChain", () => {
  const ok = { start: PAGE, chain: [], finalStatus: 200, finalUrl: PAGE };

  it("passes a direct 200", () => {
    expect(evaluateChain(ok)).toEqual([]);
  });

  it("passes a single resolving redirect", () => {
    expect(
      evaluateChain({
        start: `${PAGE}?lang=ar`,
        chain: [{ url: `${PAGE}?lang=ar`, status: 301, location: PAGE }],
        finalStatus: 200,
        finalUrl: PAGE,
      }),
    ).toEqual([]);
  });

  it("flags 404, 5xx and unresolved chains", () => {
    expect(evaluateChain({ ...ok, finalStatus: 404 })[0]).toContain("404");
    expect(evaluateChain({ ...ok, finalStatus: 503 })[0]).toContain("server error");
    expect(evaluateChain({ ...ok, finalStatus: 302 })[0]).toContain("never resolved");
  });

  it("detects redirect loops", () => {
    const failures = evaluateChain({
      start: PAGE,
      chain: [
        { url: PAGE, status: 301, location: `${PAGE}/` },
        { url: PAGE, status: 301, location: `${PAGE}/` },
      ],
      finalStatus: 301,
      finalUrl: PAGE,
    });
    expect(failures[0]).toContain("redirect loop");
  });

  it("flags overlong chains and missing Location headers", () => {
    const hop = (n: number) => ({ url: `${PAGE}/${n}`, status: 301, location: `${PAGE}/${n + 1}` });
    const long = evaluateChain({
      start: PAGE,
      chain: [0, 1, 2, 3, 4, 5].map(hop),
      finalStatus: 200,
      finalUrl: PAGE,
    });
    expect(long[0]).toContain("redirect hops");

    const noLocation = evaluateChain({
      start: PAGE,
      chain: [{ url: PAGE, status: 301, location: null }],
      finalStatus: 301,
      finalUrl: PAGE,
    });
    expect(noLocation[0]).toContain("without a Location header");
  });
});

describe("evaluateDuplicateParams", () => {
  it("requires ?lang= to be stripped by the destination", () => {
    expect(evaluateDuplicateParams({ start: `${PAGE}?lang=ar`, finalUrl: PAGE })).toEqual([]);
    expect(
      evaluateDuplicateParams({ start: `${PAGE}?lang=ar`, finalUrl: `${PAGE}?lang=ar` })[0],
    ).toContain("survived the redirect");
  });

  it("requires the destination to keep the same path", () => {
    expect(
      evaluateDuplicateParams({ start: `${PAGE}?lang=ar`, finalUrl: `${ORIGIN}/` })[0],
    ).toContain("off its own path");
  });
});

describe("evaluateCrawl", () => {
  const base = {
    start: `${PAGE}?lang=ar`,
    chain: [{ url: `${PAGE}?lang=ar`, status: 301, location: PAGE }],
    finalStatus: 200,
    finalUrl: PAGE,
    origin: ORIGIN,
    sitemapUrls: SITEMAP,
  };

  it("passes a healthy ?lang= redirect with canonical + hreflang", () => {
    expect(evaluateCrawl({ ...base, html: goodHtml() })).toEqual([]);
  });

  it("fails when the destination is noindex", () => {
    const failures = evaluateCrawl({
      ...base,
      html: `${goodHtml()}<meta name="robots" content="noindex">`,
    });
    expect(failures[0]).toContain("noindex");
  });

  it("fails when the canonical does not self-reference", () => {
    const failures = evaluateCrawl({ ...base, html: goodHtml(`${ORIGIN}/`) });
    expect(failures.join(" ")).toContain("canonical");
  });

  it("fails when the hreflang cluster is missing", () => {
    const failures = evaluateCrawl({ ...base, html: `<link rel="canonical" href="${PAGE}" />` });
    expect(failures).toEqual([]); // no cluster at all is tolerated by the shared rules
    const partial = evaluateCrawl({
      ...base,
      html: `<link rel="canonical" href="${PAGE}" /><link rel="alternate" hreflang="en" href="${PAGE}" />`,
    });
    expect(partial.join(" ")).toContain("x-default");
  });
});

describe("evaluateSitemapUrl", () => {
  const base = {
    url: PAGE,
    chain: [],
    finalStatus: 200,
    finalUrl: PAGE,
    sitemapUrls: SITEMAP,
  };

  it("passes a 200 self-canonical page", () => {
    expect(evaluateSitemapUrl({ ...base, html: goodHtml() })).toEqual([]);
  });

  it("fails a sitemap URL that 404s", () => {
    expect(evaluateSitemapUrl({ ...base, finalStatus: 404, html: "" })[0]).toContain("404");
  });

  it("fails a redirect to a page the sitemap does not list", () => {
    const target = `${ORIGIN}/somewhere-else`;
    const failures = evaluateSitemapUrl({
      ...base,
      chain: [{ url: PAGE, status: 301, location: target }],
      finalUrl: target,
      html: goodHtml(target),
    });
    expect(failures[0]).toContain("does not list");
  });

  it("passes a redirect to another sitemap-listed page", () => {
    const target = `${ORIGIN}/library/bpc-157`;
    expect(
      evaluateSitemapUrl({
        ...base,
        chain: [{ url: PAGE, status: 301, location: target }],
        finalUrl: target,
        html: goodHtml(target),
      }),
    ).toEqual([]);
  });

  it("fails a noindex destination", () => {
    const failures = evaluateSitemapUrl({
      ...base,
      html: `${goodHtml()}<meta name="robots" content="noindex,follow">`,
    });
    expect(failures[0]).toContain("noindex");
  });

  it("fails a missing or foreign canonical", () => {
    expect(evaluateSitemapUrl({ ...base, html: "<p>hi</p>" })[0]).toContain("no <link rel");
    expect(evaluateSitemapUrl({ ...base, html: goodHtml(`${ORIGIN}/`) })[0]).toContain(
      "points elsewhere",
    );
  });
});
