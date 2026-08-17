/**
 * Sitemap → compound page audit.
 *
 * Offline (always runs):
 *  - sitemap parsing isolates only single-slug /library/<slug> compound URLs
 *  - the required-JSON-LD checker accepts the markup the real
 *    /library/$slug route emits and rejects each missing/invalid field
 *  - a fake fetcher exercises the 200-status requirement
 *
 * Live (opt-in): set LIVE_SITEMAP_AUDIT=1 to fetch the production sitemap,
 * confirm every sampled compound URL returns 200, and validate its JSON-LD.
 * Set LIVE_SITEMAP_SAMPLE=<n> to change the sample size (default 25, 0 = all).
 */

import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  auditCompoundJsonLd,
  auditCompoundPage,
  compoundUrlsFromSitemap,
  isCompoundUrl,
  NON_COMPOUND_SEGMENTS,
  type PageFetchResult,
} from "../compound-page-audit";
import { discoverSitemapUrls, runPool } from "../sitemap-url-health";
import { cachedFetchText } from "../crawl-cache";
import { Route } from "@/routes/library.$slug";

const SITE = "https://doseroutine.com";

const SITEMAP = `<?xml version="1.0"?><urlset xmlns="x">
  <url><loc>${SITE}/</loc></url>
  <url><loc>${SITE}/library</loc></url>
  <url><loc>${SITE}/library/bpc-157</loc></url>
  <url><loc>${SITE}/library/tamoxifen</loc></url>
  <url><loc>${SITE}/library/bpc-157</loc></url>
  <url><loc>${SITE}/library/guides/hexarelin-protocol</loc></url>
  <url><loc>${SITE}/library/compare/a-vs-b</loc></url>
  <url><loc>${SITE}/library/womens-health/maca-libido</loc></url>
</urlset>`;

/** Render the JSON-LD the real compound route emits into a minimal HTML page. */
function renderCompoundHtml(slug: string, name: string): string {
  const head = Route.options.head as (ctx: unknown) => {
    scripts?: { type?: string; children?: string }[];
  };
  const out = head({
    params: { slug },
    loaderData: {
      compound: {
        id: `id-${slug}`,
        name,
        slug,
        category: "peptide",
        aliases: [],
        created_at: "2026-03-04T00:00:00Z",
      },
      content: null,
    },
  });
  const scripts = (out.scripts ?? [])
    .filter((s) => (s.type ?? "").toLowerCase() === "application/ld+json")
    .map((s) => `<script type="application/ld+json">${s.children}</script>`)
    .join("");
  return `<html><head>${scripts}</head><body>${name}</body></html>`;
}

describe("compound URL detection", () => {
  it("accepts single-slug library pages only", () => {
    expect(isCompoundUrl(`${SITE}/library/bpc-157`)).toBe(true);
    expect(isCompoundUrl(`${SITE}/library/bpc-157/`)).toBe(true);
    expect(isCompoundUrl(`${SITE}/library`)).toBe(false);
    expect(isCompoundUrl(`${SITE}/library/guides/hexarelin-protocol`)).toBe(false);
    expect(isCompoundUrl(`${SITE}/library/compare/a-vs-b`)).toBe(false);
    expect(isCompoundUrl(`${SITE}/faq`)).toBe(false);
    expect(isCompoundUrl("not a url")).toBe(false);
  });

  it("stays in sync with the static library.* route files", () => {
    const fsSegments = readdirSync(join(process.cwd(), "src", "routes"))
      .map((f) => /^library\.([a-z0-9-]+)\.tsx$/.exec(f)?.[1])
      .filter((s): s is string => Boolean(s) && s !== "index");
    const missing = fsSegments.filter((s) => !NON_COMPOUND_SEGMENTS.includes(s));
    expect(
      missing,
      `standalone /library/<slug> routes missing from NON_COMPOUND_SEGMENTS: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("extracts a deduped compound list from a sitemap", () => {
    expect(compoundUrlsFromSitemap(SITEMAP)).toEqual([
      `${SITE}/library/bpc-157`,
      `${SITE}/library/tamoxifen`,
    ]);
  });
});

describe("required JSON-LD fields", () => {
  const html = renderCompoundHtml("bpc-157", "BPC-157");

  it("passes on the markup the real compound route emits", () => {
    expect(auditCompoundJsonLd(html)).toEqual([]);
  });

  it("flags a page with no JSON-LD", () => {
    expect(auditCompoundJsonLd("<html><head></head><body>x</body></html>")).toContain(
      "no JSON-LD blocks found",
    );
  });

  it("flags unparseable JSON-LD", () => {
    const errs = auditCompoundJsonLd(
      '<html><head><script type="application/ld+json">{oops</script></head></html>',
    );
    expect(errs.some((e) => e.startsWith("invalid JSON-LD"))).toBe(true);
  });

  it("flags a missing BreadcrumbList, Article and substance node", () => {
    const errs = auditCompoundJsonLd(
      `<html><head><script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "x",
      })}</script></head></html>`,
    );
    expect(errs).toContain("missing BreadcrumbList");
    expect(errs).toContain("missing Article");
    expect(errs).toContain("missing substance node (#substance)");
  });

  it("flags an Article missing author, publisher logo and datePublished", () => {
    const errs = auditCompoundJsonLd(
      `<html><head><script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "H",
        description: "D",
        publisher: { "@type": "Organization", name: "DoseRoutine" },
      })}</script></head></html>`,
    );
    expect(errs).toContain("Article missing author.name");
    expect(errs).toContain("Article missing publisher.logo.url");
    expect(errs).toContain("Article datePublished is not a valid date");
  });

  it("flags an empty or non-absolute sameAs on the substance node", () => {
    const build = (sameAs: unknown) =>
      auditCompoundJsonLd(
        `<html><head><script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          "@id": `${SITE}/library/x#substance`,
          name: "X",
          url: `${SITE}/library/x`,
          sameAs,
        })}</script></head></html>`,
      );
    expect(build([])).toContain("substance sameAs present but empty");
    expect(build(["/relative"])).toContain("substance sameAs entry is not absolute: /relative");
    expect(build([`${SITE}/a`, `${SITE}/a`])).toContain("substance sameAs has duplicates");
  });

  it("flags out-of-order breadcrumb positions", () => {
    const errs = auditCompoundJsonLd(
      `<html><head><script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [{ "@type": "ListItem", position: 2, name: "Home", item: SITE }],
      })}</script></head></html>`,
    );
    expect(errs).toContain("breadcrumb item 0 position must be 1");
  });
});

describe("auditCompoundPage", () => {
  const good = renderCompoundHtml("tamoxifen", "Tamoxifen");

  it("passes a 200 page with complete JSON-LD", async () => {
    const res = await auditCompoundPage(`${SITE}/library/tamoxifen`, async () => ({
      status: 200,
      text: good,
    }));
    expect(res).toEqual({ url: `${SITE}/library/tamoxifen`, status: 200, errors: [] });
  });

  it("fails a non-200 response", async () => {
    const res = await auditCompoundPage(`${SITE}/library/gone`, async () => ({
      status: 404,
      text: "",
    }));
    expect(res.errors).toEqual(["expected HTTP 200, got 404"]);
  });

  it("reports fetch failures instead of throwing", async () => {
    const res = await auditCompoundPage(`${SITE}/library/x`, async () => {
      throw new Error("ECONNRESET");
    });
    expect(res.status).toBeNull();
    expect(res.errors[0]).toContain("ECONNRESET");
  });
});

const LIVE = process.env.LIVE_SITEMAP_AUDIT === "1";
const SAMPLE = Number(process.env.LIVE_SITEMAP_SAMPLE ?? "25");

describe.runIf(LIVE)("live sitemap compound audit", () => {
  it("every compound URL in sitemap.xml returns 200 with valid JSON-LD", async () => {
    // Shared crawl cache: pages already fetched by the FAQ/anchor sweeps in
    // this CI run are reused instead of downloaded again.
    const fetchText = (url: string) =>
      cachedFetchText(url, { headers: { "user-agent": "DoseRoutineSitemapAudit/1.0" } });

    const discovered = await discoverSitemapUrls(`${SITE}/sitemap.xml`, fetchText);
    const compounds = discovered.urls.filter(isCompoundUrl);
    expect(compounds.length, "sitemap listed no compound URLs").toBeGreaterThan(0);

    const targets = SAMPLE > 0 ? compounds.slice(0, SAMPLE) : compounds;
    const results = await runPool(
      targets,
      (u) =>
        auditCompoundPage(u, fetchText as unknown as (url: string) => Promise<PageFetchResult>),
      6,
    );
    const failures = results.filter((r) => r.errors.length > 0);
    expect(
      failures,
      failures.map((f) => `${f.url} [${f.status}] → ${f.errors.join("; ")}`).join("\n"),
    ).toEqual([]);
  }, 600_000);
});
