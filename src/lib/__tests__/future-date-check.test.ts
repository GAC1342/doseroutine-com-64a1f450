import { describe, expect, it } from "vitest";

import {
  collectJsonLdDates,
  extractPageDates,
  futureDateViolations,
  parseDate,
  parseUrlEntries,
  sitemapLastmodViolations,
  // @ts-expect-error - plain .mjs CI script, no type declarations
} from "../../../scripts/future-date-check.mjs";

const NOW = Date.parse("2026-08-15T12:00:00Z");
const FUTURE = "2027-01-02T00:00:00Z";
const PAST = "2025-01-02T00:00:00Z";

describe("parseDate", () => {
  it("accepts ISO dates and datetimes", () => {
    expect(parseDate("2026-01-02")).toBe(Date.parse("2026-01-02"));
    expect(parseDate(PAST)).toBe(Date.parse(PAST));
  });

  it("ignores non-date strings so durations never trip the check", () => {
    expect(parseDate("PT5M")).toBeNull();
    expect(parseDate("weekly")).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate(undefined as unknown as string)).toBeNull();
  });
});

describe("collectJsonLdDates", () => {
  it("finds date fields at any nesting depth", () => {
    const dates = collectJsonLdDates({
      "@graph": [{ datePublished: PAST, author: { dateCreated: FUTURE } }],
    });
    expect(dates).toEqual([
      ["datePublished", PAST],
      ["dateCreated", FUTURE],
    ]);
  });
});

describe("extractPageDates", () => {
  it("reads JSON-LD, article meta and <time> values", () => {
    const html = `
      <script type="application/ld+json">{"@type":"Article","dateModified":"${FUTURE}"}</script>
      <meta property="article:published_time" content="${PAST}" />
      <time datetime="${PAST}">Jan 2</time>`;
    expect(extractPageDates(html).map((d: { value: string }) => d.value)).toEqual([FUTURE, PAST, PAST]);
  });

  it("skips unparseable JSON-LD instead of throwing", () => {
    expect(extractPageDates(`<script type="application/ld+json">{oops</script>`)).toEqual([]);
  });
});

describe("futureDateViolations", () => {
  it("flags dates after now", () => {
    const html = `<script type="application/ld+json">{"datePublished":"${FUTURE}"}</script>`;
    expect(futureDateViolations({ url: "https://x.test/a", html, now: NOW })).toHaveLength(1);
  });

  it("passes past dates and tolerates small clock skew", () => {
    const soon = new Date(NOW + 5 * 60 * 1000).toISOString();
    const html = `<time datetime="${PAST}"></time><time datetime="${soon}"></time>`;
    expect(futureDateViolations({ url: "https://x.test/a", html, now: NOW })).toEqual([]);
  });
});

describe("sitemap lastmod", () => {
  it("parses <url> entries with lastmod", () => {
    const xml = `<urlset><url><loc>https://x.test/a</loc><lastmod>${PAST}</lastmod></url><url><loc>https://x.test/b</loc></url></urlset>`;
    expect(parseUrlEntries(xml)).toEqual([
      { loc: "https://x.test/a", lastmod: PAST },
      { loc: "https://x.test/b", lastmod: null },
    ]);
  });

  it("flags only future lastmod values", () => {
    const entries = [
      { loc: "https://x.test/a", lastmod: FUTURE },
      { loc: "https://x.test/b", lastmod: PAST },
      { loc: "https://x.test/c", lastmod: null },
    ];
    const failures = sitemapLastmodViolations(entries, { now: NOW });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("https://x.test/a");
  });
});
