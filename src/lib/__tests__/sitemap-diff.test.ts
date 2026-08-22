import { describe, expect, it } from "vitest";

import {
  diffSitemaps,
  fingerprintSitemap,
  formatSitemapDiff,
  isArticleUrl,
  parseSitemap,
} from "@/lib/sitemap-diff";

function sitemap(entries: Array<{ loc: string; lastmod?: string; images?: string[] }>): string {
  const urls = entries
    .map((e) =>
      [
        "  <url>",
        `    <loc>${e.loc}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        ...(e.images ?? []).map(
          (i) => `    <image:image><image:loc>${i}</image:loc></image:image>`,
        ),
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>`;
}

const HOME = { loc: "https://doseroutine.com/" };
const ARTICLE = {
  loc: "https://doseroutine.com/articles/pill-reminder-app",
  lastmod: "2026-08-01",
  images: ["https://doseroutine.com/og/articles/pill-reminder-app.png"],
};

describe("parseSitemap", () => {
  it("reads locs, lastmods and image children", () => {
    const parsed = parseSitemap(sitemap([HOME, ARTICLE]));
    expect(parsed.urlCount).toBe(2);
    expect(parsed.imageCount).toBe(1);
    expect(parsed.articleCount).toBe(1);
    expect(parsed.byLoc.get(ARTICLE.loc)?.lastmod).toBe("2026-08-01");
  });

  it("decodes escaped URLs and dedupes repeated images", () => {
    const xml = sitemap([
      {
        loc: "https://doseroutine.com/articles?q=a&amp;b=1",
        images: ["https://x/y.png", "https://x/y.png"],
      },
    ]);
    const parsed = parseSitemap(xml);
    expect([...parsed.byLoc.keys()][0]).toBe("https://doseroutine.com/articles?q=a&b=1");
    expect(parsed.imageCount).toBe(1);
  });

  it("returns an empty snapshot for junk input", () => {
    expect(parseSitemap("<html>nope</html>").urlCount).toBe(0);
  });
});

describe("isArticleUrl", () => {
  it("matches only the /articles path", () => {
    expect(isArticleUrl("https://doseroutine.com/articles/x")).toBe(true);
    expect(isArticleUrl("https://doseroutine.com/articles")).toBe(true);
    expect(isArticleUrl("https://doseroutine.com/blog/articles-guide")).toBe(false);
  });
});

describe("diffSitemaps", () => {
  it("reports no change for identical sitemaps", () => {
    const xml = sitemap([HOME, ARTICLE]);
    const diff = diffSitemaps(xml, xml);
    expect(diff.changed).toBe(false);
    expect(diff.regressions).toEqual([]);
  });

  it("flags a missing article URL as a regression", () => {
    const diff = diffSitemaps(sitemap([HOME, ARTICLE]), sitemap([HOME]));
    expect(diff.removedArticleUrls).toEqual([ARTICLE.loc]);
    expect(diff.regressions.join()).toContain("article URL missing");
    // Its image disappeared with it.
    expect(diff.removedImages).toHaveLength(1);
  });

  it("flags an image entry dropped from a surviving URL", () => {
    const diff = diffSitemaps(sitemap([ARTICLE]), sitemap([{ ...ARTICLE, images: [] }]));
    expect(diff.removedUrls).toEqual([]);
    expect(diff.regressions.join()).toContain("image entry missing");
  });

  it("treats new URLs and images as a change but not a regression", () => {
    const diff = diffSitemaps(sitemap([HOME]), sitemap([HOME, ARTICLE]));
    expect(diff.addedUrls).toEqual([ARTICLE.loc]);
    expect(diff.addedImages).toBe(1);
    expect(diff.regressions).toEqual([]);
    expect(diff.changed).toBe(true);
  });

  it("notices lastmod-only changes", () => {
    const diff = diffSitemaps(
      sitemap([{ ...ARTICLE, lastmod: "2026-08-01" }]),
      sitemap([{ ...ARTICLE, lastmod: "2026-08-05" }]),
    );
    expect(diff.changedLastmod).toEqual([ARTICLE.loc]);
    expect(diff.regressions).toEqual([]);
  });

  it("does not call a removed non-article URL an article regression", () => {
    const diff = diffSitemaps(sitemap([HOME, ARTICLE]), sitemap([ARTICLE]));
    expect(diff.removedUrls).toEqual(["https://doseroutine.com/"]);
    expect(diff.removedArticleUrls).toEqual([]);
    expect(diff.regressions).toEqual([]);
  });

  it("formats a readable report", () => {
    const diff = diffSitemaps(sitemap([HOME, ARTICLE]), sitemap([HOME]));
    const report = formatSitemapDiff(diff);
    expect(report).toContain("removed URLs: 1");
    expect(report).toContain("REGRESSIONS:");
  });
});

describe("fingerprintSitemap", () => {
  it("is stable under entry reordering", () => {
    const a = fingerprintSitemap(parseSitemap(sitemap([HOME, ARTICLE])));
    const b = fingerprintSitemap(parseSitemap(sitemap([ARTICLE, HOME])));
    expect(a).toBe(b);
  });

  it("changes when a URL or image changes", () => {
    const base = fingerprintSitemap(parseSitemap(sitemap([HOME, ARTICLE])));
    expect(fingerprintSitemap(parseSitemap(sitemap([HOME])))).not.toBe(base);
    expect(
      fingerprintSitemap(
        parseSitemap(sitemap([HOME, { ...ARTICLE, images: ["https://x/z.png"] }])),
      ),
    ).not.toBe(base);
  });

  it("ignores lastmod churn so daily rebuilds don't resubmit for nothing", () => {
    const a = fingerprintSitemap(parseSitemap(sitemap([{ ...ARTICLE, lastmod: "2026-08-01" }])));
    const b = fingerprintSitemap(parseSitemap(sitemap([{ ...ARTICLE, lastmod: "2026-08-09" }])));
    expect(a).toBe(b);
  });
});
