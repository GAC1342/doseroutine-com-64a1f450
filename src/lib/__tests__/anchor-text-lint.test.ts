import { beforeAll, describe, expect, it } from "vitest";
import { lintAnchorText } from "../anchor-text-lint";
import { crawlSitemap } from "../crawl-cache";


/**
 * Internal anchor-text lint.
 *
 * Part 1 unit-tests the rules against synthetic HTML (always runs).
 * Part 2 crawls the rendered pages of a running site and fails the build when
 * any internal link has empty, generic, URL-shaped, too-short or inconsistent
 * anchor text.
 *
 * Base URL: ANCHOR_LINT_BASE_URL (default http://localhost:8080).
 * ANCHOR_LINT_REQUIRE_SERVER=1 turns an unreachable server into a failure.
 * ANCHOR_LINT_MAX_PAGES=N caps the crawl (default 120).
 */
const BASE_URL = (process.env["ANCHOR_LINT_BASE_URL"] ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);
const REQUIRE_SERVER = process.env["ANCHOR_LINT_REQUIRE_SERVER"] === "1";
const MAX_PAGES = Number(process.env["ANCHOR_LINT_MAX_PAGES"] ?? 120) || 120;
const CONCURRENCY = 6;

const wrap = (body: string) => `<!doctype html><html><body>${body}</body></html>`;

describe("anchor-text-lint rules", () => {
  it("accepts descriptive internal anchor text", () => {
    const html = wrap(`<a href="/library/retatrutide">Retatrutide dosage guide</a>`);
    expect(lintAnchorText(html).ok).toBe(true);
  });

  it("flags generic anchor text", () => {
    const html = wrap(`<a href="/library/retatrutide">click here</a>`);
    expect(lintAnchorText(html).issues.map((i) => i.code)).toContain("generic-anchor-text");
  });

  it("flags a link with no accessible name at all", () => {
    const html = wrap(`<a href="/library/retatrutide"><span></span></a>`);
    expect(lintAnchorText(html).issues.map((i) => i.code)).toContain("empty-anchor-text");
  });

  it("counts aria-label as the anchor text search engines read", () => {
    const html = wrap(
      `<a href="/library/retatrutide" aria-label="Retatrutide benefits">Benefits</a>`,
    );
    expect(lintAnchorText(html).ok).toBe(true);
  });

  it("flags the same anchor text pointing at different destinations", () => {
    const html = wrap(
      `<a href="/a">Dosage guide</a><a href="/b">Dosage guide</a>`,
    );
    expect(lintAnchorText(html).issues.map((i) => i.code)).toContain("inconsistent-anchor-text");
  });

  it("allows a citation link that quotes its own URL", () => {
    const html = wrap(`<a href="https://doseroutine.com/sources">https://doseroutine.com/sources</a>`);
    expect(lintAnchorText(html).ok).toBe(true);
  });

  it("allows short compound abbreviations as anchor text", () => {
    const html = wrap(`<a href="/library/hcg">hCG</a><a href="/library/nmn">NMN</a>`);
    expect(lintAnchorText(html).ok).toBe(true);
  });

  it("ignores navigation chrome and opted-out links", () => {
    const html = wrap(
      `<a href="/">Home</a><a href="/x" data-anchor-lint="ignore">more</a>` +
        `<a href="/y" aria-hidden="true">→</a>`,
    );
    expect(lintAnchorText(html).ok).toBe(true);
  });

  it("flags an icon-only link that has no aria-label", () => {
    const html = wrap(`<a href="/library/retatrutide" title="Retatrutide"><svg></svg></a>`);
    expect(lintAnchorText(html).issues.map((i) => i.code)).toContain("missing-aria-label");
  });

  it("flags a generic aria-label even when visible text is descriptive", () => {
    const html = wrap(
      `<a href="/library/retatrutide" aria-label="read more">Retatrutide dosage guide</a>`,
    );
    expect(lintAnchorText(html).issues.map((i) => i.code)).toContain("generic-aria-label");
  });

  it("flags an aria-label that omits the visible text (WCAG label-in-name)", () => {
    const html = wrap(
      `<a href="/library/retatrutide" aria-label="Open the peptide index">Retatrutide dosage guide</a>`,
    );
    expect(lintAnchorText(html).issues.map((i) => i.code)).toContain("aria-label-mismatch");
  });

  it("accepts an aria-label that extends the visible text", () => {
    const html = wrap(
      `<a href="/library/retatrutide" aria-label="Retatrutide dosage guide for weekly titration">Retatrutide dosage guide</a>`,
    );
    expect(lintAnchorText(html).ok).toBe(true);
  });

  it("can disable the accessibility rules", () => {
    const html = wrap(`<a href="/library/retatrutide" title="Retatrutide"><svg></svg></a>`);
    expect(lintAnchorText(html, { accessibility: false }).ok).toBe(true);
  });

  it("skips external links", () => {
    const html = wrap(`<a href="https://example.com/whatever">read more</a>`);
    expect(lintAnchorText(html).links).toHaveLength(0);
  });
});

interface PageResult {
  path: string;
  issues: string[];
}

let serverUp = false;
let crawled = 0;
let results: PageResult[] = [];

beforeAll(async () => {
  const crawl = await crawlSitemap({
    baseUrl: BASE_URL,
    max: MAX_PAGES,
    concurrency: CONCURRENCY,
  });
  if (!crawl.reachable) return;
  serverUp = true;

  const pageResults = crawl.pages.map((page) => ({
    path: page.path,
    issues: lintAnchorText(page.html).issues.map(
      (i) => `[${i.code}] "${i.text}" -> ${i.href} — ${i.detail}`,
    ),
  } satisfies PageResult));

  crawled = crawl.paths.length;
  results = pageResults.filter((r) => r.issues.length > 0);
}, 300_000);


describe("rendered pages use descriptive internal anchor text", () => {
  it("reaches the site or is explicitly allowed to skip", () => {
    if (!serverUp && REQUIRE_SERVER) {
      throw new Error(`anchor-text lint could not reach ${BASE_URL}`);
    }
    expect(serverUp || !REQUIRE_SERVER).toBe(true);
  });

  it("has no anchor-text issues on any crawled page", () => {
    if (!serverUp) return;
    expect(crawled).toBeGreaterThan(0);
    const report = results
      .slice(0, 30)
      .map((r) => `${r.path}\n  ${r.issues.slice(0, 8).join("\n  ")}`)
      .join("\n");
    expect(report).toBe("");
  });
});
