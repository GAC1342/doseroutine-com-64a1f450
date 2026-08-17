import { describe, expect, it } from "vitest";
import {
  classifyUrlResponse,
  discoverSitemapUrls,
  parseSitemapXml,
  runPool,
  checkCanonicalTag,
  extractCanonicals,
  normaliseForCanonical,
  withKeyPublicPages,
  KEY_PUBLIC_PATHS,
  type SitemapFetchResult,
} from "../sitemap-url-health";

const ok = (text: string): SitemapFetchResult => ({ ok: true, status: 200, text });

const INDEX = `<?xml version="1.0"?><sitemapindex xmlns="x">
  <sitemap><loc>https://d.com/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>https://d.com/sitemap-library.xml</loc></sitemap>
</sitemapindex>`;

const PAGES = `<urlset xmlns="x"><url><loc>https://d.com/</loc></url><url><loc>https://d.com/faq</loc></url></urlset>`;
const LIB = `<urlset xmlns="x"><url><loc>https://d.com/library/a</loc></url><url><loc>https://d.com/faq</loc></url></urlset>`;

const page = (url: string, opts: { canonical?: string | null; extraHead?: string } = {}) => {
  const canonical =
    opts.canonical === null ? "" : `<link rel="canonical" href="${opts.canonical ?? url}">`;
  return `<html><head><title>Hi</title>${canonical}${opts.extraHead ?? ""}</head><body>${"x".repeat(600)}</body></html>`;
};

describe("parseSitemapXml", () => {
  it("detects a sitemap index", () => {
    const p = parseSitemapXml(INDEX);
    expect(p.kind).toBe("index");
    expect(p.locs).toHaveLength(2);
  });

  it("detects a urlset and decodes entities", () => {
    const p = parseSitemapXml("<urlset><url><loc>https://d.com/a?x=1&amp;y=2</loc></url></urlset>");
    expect(p.kind).toBe("urlset");
    expect(p.locs).toEqual(["https://d.com/a?x=1&y=2"]);
  });

  it("returns unknown for junk", () => {
    expect(parseSitemapXml("<html></html>").kind).toBe("unknown");
  });
});

describe("discoverSitemapUrls", () => {
  const fetcher = async (url: string) => {
    if (url.endsWith("sitemap.xml")) return ok(INDEX);
    if (url.endsWith("sitemap-pages.xml")) return ok(PAGES);
    if (url.endsWith("sitemap-library.xml")) return ok(LIB);
    return { ok: false, status: 404, text: "" };
  };

  it("follows an index and dedupes URLs", async () => {
    const r = await discoverSitemapUrls("https://d.com/sitemap.xml", fetcher);
    expect(r.sitemaps).toHaveLength(3);
    expect(r.urls).toEqual(["https://d.com/", "https://d.com/faq", "https://d.com/library/a"]);
    expect(r.source["https://d.com/library/a"]).toBe("https://d.com/sitemap-library.xml");
    expect(r.failures).toEqual([]);
  });

  it("handles a flat urlset root", async () => {
    const r = await discoverSitemapUrls("https://d.com/sitemap.xml", async () => ok(PAGES));
    expect(r.sitemaps).toEqual(["https://d.com/sitemap.xml"]);
    expect(r.urls).toHaveLength(2);
  });

  it("records a failing child sitemap without aborting", async () => {
    const r = await discoverSitemapUrls("https://d.com/sitemap.xml", async (u) =>
      u.endsWith("sitemap-library.xml") ? { ok: false, status: 500, text: "" } : fetcher(u),
    );
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0].reason).toContain("500");
    expect(r.urls).toHaveLength(2);
  });

  it("records fetch exceptions", async () => {
    const r = await discoverSitemapUrls("https://d.com/sitemap.xml", async () => {
      throw new Error("boom");
    });
    expect(r.failures[0].reason).toBe("boom");
  });

  it("flags an empty sitemap", async () => {
    const r = await discoverSitemapUrls("https://d.com/sitemap.xml", async () =>
      ok("<urlset></urlset>"),
    );
    expect(r.failures[0].reason).toContain("no <loc>");
  });
});

describe("classifyUrlResponse", () => {
  const base = {
    url: "https://d.com/a",
    contentType: "text/html",
    body: page("https://d.com/a"),
  };

  it("passes a healthy page", () => {
    expect(classifyUrlResponse({ ...base, status: 200 })).toBeNull();
  });

  it("flags 404 and 500", () => {
    expect(classifyUrlResponse({ ...base, status: 404 })?.reason).toBe("HTTP 404");
    expect(classifyUrlResponse({ ...base, status: 500 })?.reason).toBe("HTTP 500");
  });

  it("flags auth status codes", () => {
    expect(classifyUrlResponse({ ...base, status: 401 })?.reason).toContain("Blocked by auth");
    expect(classifyUrlResponse({ ...base, status: 403 })?.reason).toContain("Blocked by auth");
  });

  it("flags any redirect", () => {
    const f = classifyUrlResponse({ ...base, status: 301, location: "https://d.com/b" });
    expect(f?.reason).toContain("Unexpected redirect");
    expect(f?.finalUrl).toBe("https://d.com/b");
  });

  it("flags redirects to an auth wall specifically", () => {
    expect(
      classifyUrlResponse({ ...base, status: 302, location: "/auth?redirect=/a" })?.reason,
    ).toContain("auth wall");
    expect(classifyUrlResponse({ ...base, status: 302, location: "/login" })?.reason).toContain(
      "auth wall",
    );
  });

  it("flags non-HTML, tiny, noindex, and titleless pages", () => {
    expect(
      classifyUrlResponse({ ...base, status: 200, contentType: "application/json" })?.reason,
    ).toContain("Non-HTML");
    expect(classifyUrlResponse({ ...base, status: 200, body: "tiny" })?.reason).toContain(
      "small body",
    );
    expect(
      classifyUrlResponse({
        ...base,
        status: 200,
        body: page("https://d.com/a", { extraHead: '<meta name="robots" content="noindex">' }),
      })?.reason,
    ).toContain("noindex");
    expect(
      classifyUrlResponse({
        ...base,
        status: 200,
        body: `<html><body>${"x".repeat(600)}</body></html>`,
      })?.reason,
    ).toContain("<title>");
  });

  it("flags a meta-refresh auth gate", () => {
    const body = page("https://d.com/a", {
      extraHead: '<meta http-equiv="refresh" content="0;url=/auth">',
    });
    expect(classifyUrlResponse({ ...base, status: 200, body })?.reason).toContain("Meta-refresh");
  });

  it("flags redirects into private areas", () => {
    for (const p of ["/admin", "/settings", "/today", "/dashboard/x", "/onboarding"]) {
      const f = classifyUrlResponse({ ...base, status: 302, location: p });
      expect(f?.reason, p).toContain("private area");
    }
  });

  it("flags a missing, foreign, relative, or duplicated canonical", () => {
    expect(
      classifyUrlResponse({
        ...base,
        status: 200,
        body: page("https://d.com/a", { canonical: null }),
      })?.reason,
    ).toContain('Missing <link rel="canonical">');
    expect(
      classifyUrlResponse({
        ...base,
        status: 200,
        body: page("https://d.com/a", { canonical: "https://d.com/" }),
      })?.reason,
    ).toContain("points elsewhere");
    expect(
      classifyUrlResponse({
        ...base,
        status: 200,
        body: page("https://d.com/a", { canonical: "/a" }),
      })?.reason,
    ).toContain("not an absolute URL");
    expect(
      classifyUrlResponse({
        ...base,
        status: 200,
        body: page("https://d.com/a", {
          extraHead: '<link rel="canonical" href="https://d.com/a">',
        }),
      })?.reason,
    ).toContain("Multiple canonical tags");
  });

  it("accepts a trailing-slash / hash difference and can skip the canonical check", () => {
    expect(
      classifyUrlResponse({
        ...base,
        status: 200,
        body: page("https://d.com/a", { canonical: "https://d.com/a/#top" }),
      }),
    ).toBeNull();
    expect(
      classifyUrlResponse({
        ...base,
        status: 200,
        checkCanonical: false,
        body: page("https://d.com/a", { canonical: null }),
      }),
    ).toBeNull();
  });
});

describe("canonical helpers", () => {
  it("extracts canonical hrefs regardless of attribute order or quotes", () => {
    expect(
      extractCanonicals(
        `<link href='https://d.com/a' rel=canonical><link rel="stylesheet" href="/s.css">`,
      ),
    ).toEqual(["https://d.com/a"]);
  });

  it("normalises trailing slashes and hashes", () => {
    expect(normaliseForCanonical("https://d.com/a/#x")).toBe("https://d.com/a");
    expect(normaliseForCanonical("https://d.com/")).toBe("https://d.com/");
    expect(normaliseForCanonical("not a url")).toBeNull();
  });

  it("checkCanonicalTag passes a self-referencing canonical", () => {
    expect(checkCanonicalTag("https://d.com/a", page("https://d.com/a"))).toBeNull();
  });
});

describe("withKeyPublicPages", () => {
  it("adds missing key pages and never duplicates existing ones", () => {
    const merged = withKeyPublicPages("https://d.com", [
      "https://d.com/",
      "https://d.com/library/x",
    ]);
    for (const p of KEY_PUBLIC_PATHS) {
      expect(
        merged.filter((u) => new URL(u).pathname.replace(/\/$/, "") === p.replace(/\/$/, "")),
      ).toHaveLength(1);
    }
    expect(merged).toContain("https://d.com/faq");
    expect(new Set(merged).size).toBe(merged.length);
  });
});

describe("runPool", () => {
  it("preserves order and respects concurrency", async () => {
    let active = 0;
    let peak = 0;
    const out = await runPool(
      [1, 2, 3, 4, 5],
      async (n) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 1));
        active--;
        return n * 2;
      },
      2,
    );
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
