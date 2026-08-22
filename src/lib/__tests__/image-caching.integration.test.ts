import { describe, expect, it } from "vitest";

import {
  MIN_IMAGE_MAX_AGE_SECONDS,
  auditImageCacheHeaders,
  auditRevalidation,
  isNoStore,
  normalizeEtag,
  parseMaxAge,
  type ImageCacheHeaders,
} from "@/lib/image-caching";
import { REMOTE_IMAGE_FORMATS, remoteFormatSrcSet, resizedImageUrl } from "@/lib/remote-image";

/**
 * Integration test: fetches real optimized image responses and asserts the
 * browser can reuse them.
 *
 * Two transports matter for /articles:
 *  - locally hosted cards under /og/articles/* served by our own server, and
 *  - remote article imagery resized through the wsrv.nl proxy.
 *
 * For each we check the response is cacheable for a meaningful time, exposes a
 * validator, returns the *same* validator on a second identical request, and
 * answers a conditional request with 304 rather than the bytes again.
 *
 * Base URL: IMAGE_BASE_URL, else the local dev server. Set
 * IMAGE_REQUIRE_NETWORK=1 in CI to turn an unreachable host into a failure.
 */

const BASE_URL = (process.env["IMAGE_BASE_URL"] ?? "http://localhost:8080").replace(/\/+$/, "");
const REQUIRE_NETWORK = process.env["IMAGE_REQUIRE_NETWORK"] === "1";
const TIMEOUT = 30_000;
/**
 * Vite's dev server deliberately answers static assets with `Cache-Control:
 * no-cache` so edits show up instantly; it still sends a stable ETag and
 * honours conditional requests. Freshness is therefore only asserted against a
 * non-localhost target (set IMAGE_BASE_URL to the deployed origin in CI);
 * validator stability and 304 revalidation are asserted everywhere.
 */
const IS_DEV_SERVER = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(BASE_URL);
const LOCAL_AUDIT = IS_DEV_SERVER ? { minMaxAge: 0, allowNoMaxAge: true } : {};

/** A real snapshotted CMS image, resized the same way the article pages do. */
const REMOTE_SAMPLE = "https://doseroutine.com/og/articles/default.png";

type Probe = {
  headers: ImageCacheHeaders;
  second: ImageCacheHeaders;
  conditionalStatus: number | null;
  bodyBytes: number;
};

async function head(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function readHeaders(res: Response): ImageCacheHeaders {
  return {
    status: res.status,
    cacheControl: res.headers.get("cache-control"),
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified"),
    contentType: res.headers.get("content-type"),
  };
}

async function probe(url: string): Promise<Probe | null> {
  let first: Response;
  try {
    first = await head(url);
  } catch {
    return null;
  }
  const headers = readHeaders(first);
  const bodyBytes = (await first.arrayBuffer()).byteLength;

  const secondRes = await head(url);
  const second = readHeaders(secondRes);
  await secondRes.arrayBuffer();

  // Ask the server to revalidate with whatever validator it gave us.
  let conditionalStatus: number | null = null;
  const conditional: Record<string, string> = {};
  if (headers.etag) conditional["If-None-Match"] = headers.etag;
  else if (headers.lastModified) conditional["If-Modified-Since"] = headers.lastModified;
  if (Object.keys(conditional).length > 0) {
    const res = await head(url, { headers: conditional });
    conditionalStatus = res.status;
    await res.arrayBuffer().catch(() => undefined);
  }

  return { headers, second, conditionalStatus, bodyBytes };
}

function skipOrFail(url: string, ctx: { skip: () => void }): void {
  if (REQUIRE_NETWORK) throw new Error(`could not reach ${url} (IMAGE_REQUIRE_NETWORK=1)`);
  ctx.skip();
}

describe("cache header helpers", () => {
  it("parses max-age out of a full directive list", () => {
    expect(parseMaxAge("public, max-age=31536000, immutable")).toBe(31_536_000);
    expect(parseMaxAge("public, s-maxage=60")).toBe(null);
    expect(parseMaxAge(null)).toBe(null);
  });

  it("detects no-store and normalizes weak ETags", () => {
    expect(isNoStore("no-store, max-age=0")).toBe(true);
    expect(isNoStore("public, max-age=60")).toBe(false);
    expect(normalizeEtag('W/"abc"')).toBe("abc");
    expect(normalizeEtag('"abc"')).toBe("abc");
    expect(normalizeEtag(null)).toBe(null);
  });

  it("flags uncacheable and unvalidatable responses", () => {
    const bad = auditImageCacheHeaders({
      status: 200,
      cacheControl: "no-store",
      etag: null,
      lastModified: null,
      contentType: "image/webp",
    });
    expect(bad.join()).toContain("no-store");
    expect(bad.join()).toContain("no max-age");
    expect(bad.join()).toContain("no ETag and no Last-Modified");
  });

  it("flags a max-age that is too short and a non-image content type", () => {
    const issues = auditImageCacheHeaders({
      status: 200,
      cacheControl: "public, max-age=10",
      etag: '"a"',
      lastModified: null,
      contentType: "text/html",
    });
    expect(issues.join()).toContain(`below the ${MIN_IMAGE_MAX_AGE_SECONDS}s minimum`);
    expect(issues.join()).toContain("not an image type");
  });

  it("accepts a well-cached immutable image", () => {
    expect(
      auditImageCacheHeaders({
        status: 200,
        cacheControl: "public, max-age=31536000, immutable",
        etag: '"abc"',
        lastModified: null,
        contentType: "image/avif",
      }),
    ).toEqual([]);
  });

  it("flags an unstable ETag and a conditional request that returns 200", () => {
    const issues = auditRevalidation({
      firstEtag: '"a"',
      secondEtag: '"b"',
      firstLastModified: null,
      secondLastModified: null,
      conditionalStatus: 200,
    });
    expect(issues.join()).toContain("ETag changed");
    expect(issues.join()).toContain("expected 304");
  });

  it("treats a weak/strong pair of the same ETag as stable", () => {
    expect(
      auditRevalidation({
        firstEtag: 'W/"abc"',
        secondEtag: '"abc"',
        firstLastModified: null,
        secondLastModified: null,
        conditionalStatus: 304,
      }),
    ).toEqual([]);
  });
});

describe("locally served social cards", () => {
  const url = `${BASE_URL}/og/articles/default.webp`;

  it(
    "is cacheable, keeps a stable validator, and 304s on revalidation",
    async (ctx) => {
      const result = await probe(url);
      if (!result) return skipOrFail(url, ctx);

      expect(result.headers.status, `${url} did not return 200`).toBe(200);
      expect(result.bodyBytes).toBeGreaterThan(0);
      expect(
        auditImageCacheHeaders(result.headers, LOCAL_AUDIT).join("\n"),
        `${url} cache headers: ${JSON.stringify(result.headers)}`,
      ).toBe("");
      expect(
        auditRevalidation({
          firstEtag: result.headers.etag,
          secondEtag: result.second.etag,
          firstLastModified: result.headers.lastModified,
          secondLastModified: result.second.lastModified,
          conditionalStatus: result.conditionalStatus,
        }).join("\n"),
      ).toBe("");
    },
    TIMEOUT * 3,
  );

  it(
    "serves the avif sibling with the right content type",
    async (ctx) => {
      const avifUrl = `${BASE_URL}/og/articles/default.avif`;
      const result = await probe(avifUrl);
      if (!result) return skipOrFail(avifUrl, ctx);
      expect(result.headers.status).toBe(200);
      expect(result.headers.contentType).toContain("image/avif");
      expect(auditImageCacheHeaders(result.headers, LOCAL_AUDIT).join("\n")).toBe("");
    },
    TIMEOUT * 3,
  );
});

describe("proxied remote article images", () => {
  for (const format of REMOTE_IMAGE_FORMATS) {
    it(
      `${format} variant is cacheable and revalidates to 304`,
      async (ctx) => {
        const url = resizedImageUrl(REMOTE_SAMPLE, 96, format);
        const result = await probe(url);
        if (!result) return skipOrFail(url, ctx);
        if (result.headers.status !== 200) return skipOrFail(url, ctx);

        expect(
          auditImageCacheHeaders(result.headers).join("\n"),
          `${url} cache headers: ${JSON.stringify(result.headers)}`,
        ).toBe("");
        expect(
          auditRevalidation({
            firstEtag: result.headers.etag,
            secondEtag: result.second.etag,
            firstLastModified: result.headers.lastModified,
            secondLastModified: result.second.lastModified,
            conditionalStatus: result.conditionalStatus,
          }).join("\n"),
          `${url} revalidation`,
        ).toBe("");
      },
      TIMEOUT * 3,
    );
  }

  it("builds 1x/2x srcSets that only differ by width, so both stay cacheable", () => {
    const srcSet = remoteFormatSrcSet(REMOTE_SAMPLE, 96, "webp")!;
    const [one, two] = srcSet.split(", ").map((c) => c.split(" ")[0]!);
    expect(one).toContain("w=96");
    expect(two).toContain("w=192");
    expect(one.replace("w=96", "w=192")).toBe(two);
  });
});
