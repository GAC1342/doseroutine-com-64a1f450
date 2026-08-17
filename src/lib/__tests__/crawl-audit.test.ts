import { describe, expect, it } from "vitest";
import {
  checkJsonLd,
  checkMetadata,
  classifyLinkStatus,
  extractH1s,
  extractInternalLinks,
  extractMeta,
  parseSitemapXml,
  sampleEvenly,
} from "../../../scripts/crawl-audit.mjs";

const goodPage = (url: string) => `<!doctype html><html lang="en"><head>
<title>Retatrutide Dosage Guide — DoseRoutine</title>
<meta name="description" content="A practical retatrutide dosage guide covering titration schedules, common protocols, and what the current clinical evidence actually shows." />
<link rel="canonical" href="${url}" />
<meta property="og:title" content="Retatrutide Dosage Guide" />
<meta property="og:description" content="Titration schedules and evidence." />
<meta property="og:type" content="article" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Retatrutide Dosage Guide"}</script>
</head><body><h1>Retatrutide dosage</h1><a href="/library">Library</a><a href="https://pubmed.ncbi.nlm.nih.gov/1">Study</a></body></html>`;

describe("crawl-audit metadata checks", () => {
  const url = "https://doseroutine.com/library/retatrutide-dosage";

  it("passes a well-formed page", () => {
    expect(checkMetadata(url, goodPage(url))).toEqual([]);
  });

  it("flags a canonical pointing at another page", () => {
    const html = goodPage("https://doseroutine.com/");
    expect(checkMetadata(url, html).join()).toMatch(/Canonical points elsewhere/);
  });

  it("flags noindex, missing og tags and duplicate h1s", () => {
    const html = goodPage(url)
      .replace(
        '<meta property="og:type" content="article" />',
        '<meta name="robots" content="noindex" />',
      )
      .replace("</body>", "<h1>Second heading</h1></body>");
    const problems = checkMetadata(url, html).join(" | ");
    expect(problems).toMatch(/noindex/);
    expect(problems).toMatch(/Missing og:type/);
    expect(problems).toMatch(/Multiple <h1>/);
  });

  it("flags an over-long title", () => {
    const html = goodPage(url).replace(/<title>[^<]*<\/title>/, `<title>${"x".repeat(90)}</title>`);
    expect(checkMetadata(url, html).join()).toMatch(/Title too long/);
  });

  it("reads meta by name and property", () => {
    const meta = extractMeta(goodPage(url));
    expect(meta["description"]).toBeTruthy();
    expect(meta["og:title"]).toBe("Retatrutide Dosage Guide");
  });

  it("extracts headings", () => {
    expect(extractH1s(goodPage(url))).toEqual(["Retatrutide dosage"]);
  });
});

describe("crawl-audit JSON-LD checks", () => {
  it("accepts valid structured data", () => {
    expect(checkJsonLd(goodPage("https://doseroutine.com/x"))).toEqual([]);
  });

  it("reports unparseable JSON-LD", () => {
    const html = '<script type="application/ld+json">{oops}</script>';
    expect(checkJsonLd(html).join()).toMatch(/does not parse/);
  });

  it("reports missing required fields inside @graph", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "FAQPage", mainEntity: [] }],
    })}</script>`;
    expect(checkJsonLd(html).join()).toMatch(/FAQPage is missing required field "mainEntity"/);
  });

  it("reports pages with no structured data", () => {
    expect(checkJsonLd("<html><body>hi</body></html>")).toEqual([
      "No JSON-LD structured data on page",
    ]);
  });
});

describe("crawl-audit link + sitemap helpers", () => {
  it("keeps only same-origin links", () => {
    const links = extractInternalLinks(
      goodPage("https://doseroutine.com/a"),
      "https://doseroutine.com/a",
    );
    expect(links).toEqual(["https://doseroutine.com/library"]);
  });

  it("classifies statuses", () => {
    expect(classifyLinkStatus("https://d.com/a", 200)).toBeNull();
    expect(classifyLinkStatus("https://d.com/a", 404)).toMatch(/Broken link/);
    expect(classifyLinkStatus("https://d.com/a", 302, "/auth")).toMatch(/auth wall/);
    expect(classifyLinkStatus("https://d.com/a", 302, "/today")).toMatch(/private area/);
  });

  it("parses sitemap indexes and urlsets", () => {
    expect(
      parseSitemapXml(
        "<sitemapindex><sitemap><loc>https://d.com/s1.xml</loc></sitemap></sitemapindex>",
      ),
    ).toEqual({
      kind: "index",
      locs: ["https://d.com/s1.xml"],
    });
    expect(parseSitemapXml("<urlset><url><loc>https://d.com/a</loc></url></urlset>").kind).toBe(
      "urlset",
    );
  });

  it("samples evenly across the whole list", () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const sampled = sampleEvenly(items, 10);
    expect(sampled).toHaveLength(10);
    expect(sampled[0]).toBe(0);
    expect(sampled.at(-1)).toBeGreaterThan(80);
    expect(sampleEvenly(items, 0)).toHaveLength(100);
  });
});

describe("crawl-audit JSON-LD @graph handling", () => {
  it("accepts a @context + @graph wrapper without a root @type", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1 }] },
      ],
    })}</script>`;
    expect(checkJsonLd(html)).toEqual([]);
  });

  it("still flags a typeless non-graph root", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", name: "x" })}</script>`;
    expect(checkJsonLd(html).join()).toMatch(/root node is missing @type/);
  });
});
