/**
 * /articles canonicalization guard.
 *
 * Every first-party article slug must resolve to exactly one final URL:
 *
 *   https://doseroutine.com/articles/<slug>
 *
 * That means (a) the route's own head() self-references that URL in
 * <link rel="canonical"> and og:url, (b) every non-canonical variant
 * (www host, trailing slash, legacy ?lang=) 301s to it in a single hop, and
 * (c) the canonical URL itself never redirects (no loops), and (d) every
 * internal reference we publish — sitemap, RSS, prev/next, related links —
 * points at the canonical form, never at a variant that redirects.
 */

import { describe, it, expect } from "vitest";
import server from "../../server";
import { LOCAL_ARTICLES } from "../../lib/local-articles";
import { articlePostUrl, SITE_URL, ARTICLES_PREFIX } from "../../lib/article-config";
import { articleNeighbors, ARTICLES_CHRONOLOGICAL } from "../../lib/article-navigation";
import { relatedArticles } from "../../lib/article-cluster";
import { Route as ArticleRoute } from "../articles.$slug";

const SLUGS = LOCAL_ARTICLES.map((a) => a.slug);

type HeadOut = {
  meta?: Array<Record<string, string>>;
  links?: Array<Record<string, string>>;
};

function headFor(slug: string): HeadOut {
  const article = LOCAL_ARTICLES.find((a) => a.slug === slug)!;
  const head = ArticleRoute.options.head as unknown as (ctx: unknown) => HeadOut;
  return head({
    params: { slug },
    loaderData: { kind: "local", article },
    matches: [],
  });
}

async function fetchUrl(url: string) {
  return server.fetch(new Request(url, { method: "GET" }), {}, {});
}

describe("/articles head canonical", () => {
  it("has first-party articles to check", () => {
    expect(SLUGS.length).toBeGreaterThan(0);
  });

  it.each(SLUGS)("%s self-references its canonical URL", (slug) => {
    const head = headFor(slug);
    const expected = articlePostUrl(slug);

    const canonical = head.links?.find((l) => l.rel === "canonical")?.href;
    const ogUrl = head.meta?.find((m) => m.property === "og:url")?.content;

    expect(canonical).toBe(expected);
    expect(ogUrl).toBe(expected);
    expect(expected.startsWith("https://doseroutine.com/articles/")).toBe(true);
    expect(expected.endsWith("/")).toBe(false);
    expect(expected).toBe(expected.toLowerCase());
  });

  it.each(SLUGS)("%s emits exactly one canonical link", (slug) => {
    const canonicals = (headFor(slug).links ?? []).filter((l) => l.rel === "canonical");
    expect(canonicals).toHaveLength(1);
  });

  it.each(SLUGS)("%s prev/next links use absolute canonical URLs", (slug) => {
    const links = headFor(slug).links ?? [];
    const neighbors = articleNeighbors(slug);

    for (const [rel, neighbor] of [
      ["prev", neighbors.previous],
      ["next", neighbors.next],
    ] as const) {
      const link = links.find((l) => l.rel === rel);
      if (!neighbor) {
        expect(link, `${slug} should not emit rel=${rel}`).toBeUndefined();
        continue;
      }
      expect(link?.href).toBe(articlePostUrl(neighbor.slug));
    }
  });
});

describe("/articles redirects resolve to the canonical URL", () => {
  it.each(SLUGS)("www variant of %s 301s to the canonical host", async (slug) => {
    const res = await fetchUrl(`https://www.doseroutine.com${ARTICLES_PREFIX}/${slug}`);
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(articlePostUrl(slug));
  });

  it.each(SLUGS)("trailing-slash variant of %s 301s to the canonical URL", async (slug) => {
    const res = await fetchUrl(`${articlePostUrl(slug)}/`);
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(articlePostUrl(slug));
  });

  it.each(SLUGS)("www + trailing slash for %s resolves in a single 301", async (slug) => {
    const res = await fetchUrl(`https://www.doseroutine.com${ARTICLES_PREFIX}/${slug}/`);
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(articlePostUrl(slug));

    // Single hop: the target of the redirect must not redirect again.
    const followed = await fetchUrl(res.headers.get("location")!);
    expect(followed.status).not.toBe(301);
  });

  it.each(SLUGS)("legacy ?lang= on %s is stripped by a 301", async (slug) => {
    const res = await fetchUrl(`${articlePostUrl(slug)}?lang=de`);
    expect(res.status).toBe(301);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.searchParams.has("lang")).toBe(false);
    expect(`${loc.origin}${loc.pathname}`).toBe(articlePostUrl(slug));
  });

  it.each(SLUGS)("canonical URL for %s never redirects", async (slug) => {
    const res = await fetchUrl(articlePostUrl(slug));
    expect(res.status).not.toBe(301);
    expect(res.status).not.toBe(302);
  });

  it("the /articles index and feed are canonical too", async () => {
    for (const url of [`${SITE_URL}${ARTICLES_PREFIX}`, `${SITE_URL}${ARTICLES_PREFIX}/feed.xml`]) {
      const res = await fetchUrl(url);
      expect(res.status, `${url} must not redirect`).not.toBe(301);

      const wwwRes = await fetchUrl(url.replace("https://", "https://www."));
      expect(wwwRes.status).toBe(301);
      expect(wwwRes.headers.get("location")).toBe(url);
    }
  });
});

describe("internal /articles references use canonical URLs", () => {
  it("related-article hrefs point at real, canonical slugs", () => {
    for (const slug of SLUGS) {
      for (const related of relatedArticles(slug)) {
        expect(related.href).toBe(`${ARTICLES_PREFIX}/${related.slug}`);
        expect(SLUGS).toContain(related.slug);
        expect(related.href.endsWith("/")).toBe(false);
      }
    }
  });

  it("chronological order is total, stable and covers every article", () => {
    expect(ARTICLES_CHRONOLOGICAL.map((a) => a.slug).sort()).toEqual([...SLUGS].sort());
    const times = ARTICLES_CHRONOLOGICAL.map((a) => Date.parse(a.firstPublishedAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("prev/next chain is symmetric across the chronological list", () => {
    for (let i = 0; i < ARTICLES_CHRONOLOGICAL.length - 1; i += 1) {
      const current = ARTICLES_CHRONOLOGICAL[i].slug;
      const following = ARTICLES_CHRONOLOGICAL[i + 1].slug;
      expect(articleNeighbors(current).next?.slug).toBe(following);
      expect(articleNeighbors(following).previous?.slug).toBe(current);
    }
  });

  it("every article offers at least one onward link", () => {
    for (const slug of SLUGS) {
      const { previous, next } = articleNeighbors(slug);
      expect(previous || next, `${slug} is a dead end`).toBeTruthy();
    }
  });
});
