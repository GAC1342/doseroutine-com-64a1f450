/**
 * Sitemap caching integration test.
 *
 * Invokes the real /sitemap.xml GET handler (with the database mocked) and
 * asserts the hourly in-memory cache behaves correctly for crawlers:
 *
 *   - the ETag is stable across repeated requests (same bytes -> same tag)
 *   - a conditional request with If-None-Match gets 304 Not Modified
 *   - the 304 carries no body but keeps ETag + Cache-Control
 *   - repeat hits are served from cache (no extra database queries)
 *   - a mismatched / absent If-None-Match still gets a full 200 XML response
 */
import { describe, it, expect, vi, beforeAll } from "vitest";

const selectCalls = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const rows = [{ slug: "bpc-157" }, { slug: "tb-500" }, { slug: "retatrutide" }];
  return {
    supabase: {
      from: (table: string) => ({
        select: () => {
          selectCalls(table);
          return {
            order: () => Promise.resolve({ data: rows, error: null }),
            then: (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null }),
          };
        },
      }),
    },
  };
});

type Handler = (ctx: { request: Request }) => Promise<Response>;

let GET: Handler;

beforeAll(async () => {
  const mod = await import("../sitemap[.]xml");
  const route = mod.Route as unknown as {
    options: { server: { handlers: { GET: Handler } } };
  };
  GET = route.options.server.handlers.GET;
});

const get = (headers?: Record<string, string>) =>
  GET({ request: new Request("https://doseroutine.com/sitemap.xml", { headers }) });

describe("sitemap.xml caching", () => {
  it("serves XML with an ETag and a freshness-aware cache policy", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/xml");

    const etag = res.headers.get("etag");
    expect(etag).toBeTruthy();
    expect(etag).toMatch(/^W\/"sitemap-[a-z0-9]+-[a-z0-9]+"$/);

    const cacheControl = res.headers.get("cache-control") ?? "";
    // Cache lifetime shortens while a post is newly published (see
    // blog-freshness.ts), so assert the shape and an upper bound instead of
    // one fixed value.
    expect(cacheControl).toMatch(/^public, max-age=\d+, s-maxage=\d+, stale-while-revalidate=\d+$/);
    const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)![1]);
    const sMaxAge = Number(/s-maxage=(\d+)/.exec(cacheControl)![1]);
    expect(maxAge).toBeGreaterThanOrEqual(600);
    expect(maxAge).toBeLessThanOrEqual(3600);
    expect(sMaxAge).toBeLessThanOrEqual(86400);

    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("https://doseroutine.com/");
  });

  it("returns an unchanged ETag on repeated requests", async () => {
    const first = await get();
    const second = await get();
    const third = await get();

    const etag = first.headers.get("etag");
    expect(second.headers.get("etag")).toBe(etag);
    expect(third.headers.get("etag")).toBe(etag);

    // Identical bytes, too — the ETag isn't stable by accident.
    expect(await second.text()).toBe(await third.text());
  });

  it("serves repeat requests from cache without re-querying the database", async () => {
    await get();
    const before = selectCalls.mock.calls.length;
    await get();
    await get();
    expect(selectCalls.mock.calls.length).toBe(before);
  });

  it("returns 304 Not Modified when If-None-Match matches", async () => {
    const first = await get();
    const etag = first.headers.get("etag")!;

    const conditional = await get({ "if-none-match": etag });
    expect(conditional.status).toBe(304);
    expect(conditional.headers.get("etag")).toBe(etag);
    expect(conditional.headers.get("cache-control")).toBe(first.headers.get("cache-control"));
    expect(await conditional.text()).toBe("");
  });

  it("honours a multi-value If-None-Match list", async () => {
    const etag = (await get()).headers.get("etag")!;
    const res = await get({ "if-none-match": `W/"something-else", ${etag}` });
    expect(res.status).toBe(304);
  });

  it("returns 200 with the full body when the ETag does not match", async () => {
    const res = await get({ "if-none-match": 'W/"sitemap-stale-000"' });
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).not.toBe('W/"sitemap-stale-000"');
    expect((await res.text()).length).toBeGreaterThan(100);
  });

  it("emits the same URL set on a cache hit as on the initial render", async () => {
    const initial = await (await get()).text();
    const repeat = await (await get()).text();
    const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs(repeat)).toEqual(locs(initial));
    expect(locs(initial).length).toBeGreaterThan(10);
  });
});
