import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cachedFetchText,
  crawlCacheStats,
  crawlSitemap,
  extractJsonLd,
  fetchPage,
  fetchSitemapPaths,
  fetchSitemapUrls,
  mapWithConcurrency,
  resetCrawlCache,
  type Fetcher,
} from "../crawl-cache";

const URL_A = "https://example.test/a";

function stubFetcher(
  body: string,
  opts: { etag?: string; lastModified?: string } = {},
): { fetcher: Fetcher; calls: Array<Record<string, string>>; conditional: number } {
  const state = {
    calls: [] as Array<Record<string, string>>,
    conditional: 0,
    fetcher: (async (_url, init) => {
      const headers = init?.headers ?? {};
      state.calls.push(headers);
      const revalidating =
        Boolean(headers["if-none-match"]) || Boolean(headers["if-modified-since"]);
      if (revalidating) {
        state.conditional += 1;
        return {
          ok: false,
          status: 304,
          headers: { get: () => null },
          text: async () => "",
        };
      }
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "etag"
              ? (opts.etag ?? null)
              : name.toLowerCase() === "last-modified"
                ? (opts.lastModified ?? null)
                : null,
        },
        text: async () => body,
      };
    }) as Fetcher,
  };
  return state;
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "crawl-cache-"));
  process.env["CRAWL_CACHE_DIR"] = dir;
  delete process.env["CRAWL_CACHE"];
  delete process.env["CRAWL_CACHE_TTL_MS"];
  resetCrawlCache();
});

afterEach(async () => {
  delete process.env["CRAWL_CACHE_DIR"];
  delete process.env["CRAWL_CACHE"];
  delete process.env["CRAWL_CACHE_TTL_MS"];
  await rm(dir, { recursive: true, force: true });
});

describe("crawl cache", () => {
  it("serves a repeat request from memory without refetching", async () => {
    const stub = stubFetcher("<html>a</html>");
    const first = await fetchPage(URL_A, { fetcher: stub.fetcher });
    const second = await fetchPage(URL_A, { fetcher: stub.fetcher });
    expect(first?.html).toBe("<html>a</html>");
    expect(second?.html).toBe("<html>a</html>");
    expect(stub.calls).toHaveLength(1);
  });

  it("reuses the stored body when the server answers 304", async () => {
    const stub = stubFetcher("<html>cached</html>", { etag: 'W/"v1"' });
    await fetchPage(URL_A, { fetcher: stub.fetcher });

    // New process, expired freshness window: must revalidate, not re-download.
    resetCrawlCache();
    process.env["CRAWL_CACHE_TTL_MS"] = "1";
    await new Promise((r) => setTimeout(r, 5));

    const revalidated = await fetchPage(URL_A, { fetcher: stub.fetcher });
    expect(revalidated?.html).toBe("<html>cached</html>");
    expect(revalidated?.fromCache).toBe(true);
    expect(stub.conditional).toBe(1);
    expect(stub.calls[1]?.["if-none-match"]).toBe('W/"v1"');
  });

  it("serves a fresh disk entry without any network call", async () => {
    const stub = stubFetcher("<html>fresh</html>");
    await fetchPage(URL_A, { fetcher: stub.fetcher });
    resetCrawlCache();
    const again = await fetchPage(URL_A, { fetcher: stub.fetcher });
    expect(again?.fromCache).toBe(true);
    expect(stub.calls).toHaveLength(1);
  });

  it("always refetches when CRAWL_CACHE=0", async () => {
    process.env["CRAWL_CACHE"] = "0";
    const stub = stubFetcher("<html>x</html>");
    await fetchPage(URL_A, { fetcher: stub.fetcher });
    resetCrawlCache();
    await fetchPage(URL_A, { fetcher: stub.fetcher });
    expect(stub.calls).toHaveLength(2);
    expect(stub.conditional).toBe(0);
  });

  it("returns null for an unreachable page with nothing cached", async () => {
    const failing: Fetcher = async () => {
      throw new Error("network down");
    };
    expect(await fetchPage("https://example.test/missing", { fetcher: failing })).toBeNull();
  });

  it("memoises JSON-LD parsing per page", async () => {
    const stub = stubFetcher(
      `<html><script type="application/ld+json">{"@type":"FAQPage"}</script></html>`,
    );
    const page = await fetchPage(URL_A, { fetcher: stub.fetcher });
    expect(page!.jsonLd).toHaveLength(1);
    expect(page!.jsonLd).toBe(page!.jsonLd);
  });

  it("extracts every JSON-LD block and skips malformed ones", () => {
    const html = `<script type="application/ld+json">{"a":1}</script>
      <script type="application/ld+json">not json</script>
      <script type="application/ld+json">{"b":2}</script>`;
    expect(extractJsonLd(html)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("parses unique sitemap paths and honours the cap", async () => {
    const xml = `<urlset>
      <url><loc>https://example.test/one</loc></url>
      <url><loc>https://example.test/one</loc></url>
      <url><loc>https://example.test/two</loc></url>
      <url><loc>https://example.test/three</loc></url>
    </urlset>`;
    const stub = stubFetcher(xml);
    const paths = await fetchSitemapPaths("https://example.test", 2, { fetcher: stub.fetcher });
    expect(paths).toEqual(["/one", "/two"]);
  });

  it("returns null sitemap paths when the site is unreachable", async () => {
    const failing: Fetcher = async () => {
      throw new Error("down");
    };
    expect(await fetchSitemapPaths("https://nope.test", 10, { fetcher: failing })).toBeNull();
  });

  it("maps with bounded concurrency preserving order", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight -= 1;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("revalidates every disk hit when the TTL is zero", async () => {
    const stub = stubFetcher("<html>zero</html>", { etag: 'W/"z"' });
    await fetchPage(URL_A, { fetcher: stub.fetcher });
    resetCrawlCache();
    process.env["CRAWL_CACHE_TTL_MS"] = "0";
    const again = await fetchPage(URL_A, { fetcher: stub.fetcher });
    expect(again?.html).toBe("<html>zero</html>");
    expect(stub.conditional).toBe(1);
  });

  it("falls back to the cached body when revalidation fails", async () => {
    const stub = stubFetcher("<html>offline-ok</html>", { etag: 'W/"o"' });
    await fetchPage(URL_A, { fetcher: stub.fetcher });
    resetCrawlCache();
    process.env["CRAWL_CACHE_TTL_MS"] = "0";
    const failing: Fetcher = async () => {
      throw new Error("network down");
    };
    const again = await fetchPage(URL_A, { fetcher: failing });
    expect(again?.html).toBe("<html>offline-ok</html>");
  });
});


const SITEMAP = `<urlset>
  <url><loc>https://example.test/library/zinc</loc></url>
  <url><loc>https://example.test/blog/retatrutide</loc></url>
  <url><loc>https://example.test/pricing</loc></url>
</urlset>`;

function siteFetcher(): { fetcher: Fetcher; urls: string[] } {
  const urls: string[] = [];
  const fetcher: Fetcher = async (url) => {
    urls.push(url);
    const body = url.endsWith("/sitemap.xml")
      ? SITEMAP
      : `<html><body>${url}<script type="application/ld+json">{"@type":"FAQPage","url":"${url}"}</script></body></html>`;
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => body,
    };
  };
  return { fetcher, urls };
}

describe("shared sitemap crawl", () => {
  it("crawls every sitemap page once and exposes paths, HTML and JSON-LD", async () => {
    const site = siteFetcher();
    const crawl = await crawlSitemap({
      baseUrl: "https://example.test",
      fetchOptions: { fetcher: site.fetcher },
    });
    expect(crawl.reachable).toBe(true);
    expect(crawl.paths).toEqual(["/library/zinc", "/blog/retatrutide", "/pricing"]);
    expect(crawl.pages.map((p) => p.path)).toEqual(crawl.paths);
    expect(crawl.pages[0]!.jsonLd).toEqual([
      { "@type": "FAQPage", url: "https://example.test/library/zinc" },
    ]);
    expect(site.urls).toHaveLength(4); // sitemap + 3 pages
  });

  it("hands a second consumer the same bodies without refetching", async () => {
    const site = siteFetcher();
    const options = {
      baseUrl: "https://example.test",
      fetchOptions: { fetcher: site.fetcher },
    };
    const first = await crawlSitemap(options);
    const second = await crawlSitemap(options);
    expect(second.pages[0]!.html).toBe(first.pages[0]!.html);
    expect(second.pages[0]!.jsonLd).toBe(first.pages[0]!.jsonLd);
    expect(site.urls).toHaveLength(4);
  });

  it("keeps filtered crawls separate from the full crawl", async () => {
    const site = siteFetcher();
    const blogOnly = await crawlSitemap({
      baseUrl: "https://example.test",
      key: "blog",
      include: (path) => path.startsWith("/blog/"),
      fetchOptions: { fetcher: site.fetcher },
    });
    expect(blogOnly.paths).toEqual(["/blog/retatrutide"]);

    const all = await crawlSitemap({
      baseUrl: "https://example.test",
      fetchOptions: { fetcher: site.fetcher },
    });
    expect(all.paths).toHaveLength(3);
    // sitemap + blog page + the two pages the full crawl still needed
    expect(site.urls).toHaveLength(4);
  });

  it("reports an unreachable site instead of throwing", async () => {
    const failing: Fetcher = async () => {
      throw new Error("down");
    };
    const crawl = await crawlSitemap({
      baseUrl: "https://nope.test",
      fetchOptions: { fetcher: failing },
    });
    expect(crawl).toMatchObject({ reachable: false, paths: [], pages: [] });
  });

  it("records cache effectiveness stats", async () => {
    const site = siteFetcher();
    await crawlSitemap({
      baseUrl: "https://example.test",
      fetchOptions: { fetcher: site.fetcher },
    });
    const before = crawlCacheStats();
    expect(before.downloads).toBe(4);
    expect(before.bytesDownloaded).toBeGreaterThan(0);

    await fetchPage("https://example.test/pricing", { fetcher: site.fetcher });
    expect(crawlCacheStats().memoryHits).toBe(before.memoryHits + 1);
  });
});

describe("text resources", () => {
  it("returns absolute sitemap URLs", async () => {
    const site = siteFetcher();
    const urls = await fetchSitemapUrls("https://example.test/", 2, { fetcher: site.fetcher });
    expect(urls).toEqual([
      "https://example.test/library/zinc",
      "https://example.test/blog/retatrutide",
    ]);
  });

  it("cachedFetchText matches the discoverSitemapUrls fetcher shape", async () => {
    const site = siteFetcher();
    const res = await cachedFetchText("https://example.test/sitemap.xml", {
      fetcher: site.fetcher,
    });
    expect(res).toMatchObject({ ok: true, status: 200, finalUrl: "https://example.test/sitemap.xml" });
    expect(res.text).toContain("<loc>");

    const again = await cachedFetchText("https://example.test/sitemap.xml", {
      fetcher: site.fetcher,
    });
    expect(again.text).toBe(res.text);
    expect(site.urls).toHaveLength(1);
  });

  it("reports a failed text fetch without throwing", async () => {
    const failing: Fetcher = async () => {
      throw new Error("down");
    };
    expect(await cachedFetchText("https://nope.test/robots.txt", { fetcher: failing })).toEqual({
      ok: false,
      status: 0,
      text: "",
      finalUrl: "https://nope.test/robots.txt",
    });
  });
});
