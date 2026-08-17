import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { isIndexablePath } from "./lib/non-indexable";
import { BUILD_STAMP_ID, BUILT_AT } from "./lib/build-stamp";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const CANONICAL_ORIGIN = "https://doseroutine.com";

// Static crawler-facing text files: same bytes for long stretches, so they are
// safe to cache aggressively at the edge.
const CRAWLER_TEXT_FILES = new Set(["/robots.txt", "/llms.txt", "/llms-full.txt", "/ai.txt"]);

// Anonymous HTML must be byte-identical for every client, so the shared cache
// key must never include the User-Agent. Any `Vary: User-Agent` (from an
// upstream default or a framework header) would let a CDN keep one stale
// variant per crawler UA — the classic "bots see months-old HTML" bug.
function sanitizeVary(headers: Headers) {
  const raw = headers.get("vary");
  if (!raw) return;
  const tokens = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const kept: string[] = [];
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower === "user-agent" || lower === "*") continue;
    if (!kept.some((k) => k.toLowerCase() === lower)) kept.push(token);
  }
  if (kept.length) headers.set("vary", kept.join(", "));
  else headers.delete("vary");
}

/** Small, stable, dependency-free hash (FNV-1a) used for HTML ETags. */
function weakHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

// Validators derived from the RENDERED bytes (plus the build stamp), not from
// any content date. A conditional request therefore revalidates against what
// was actually served, and every deploy invalidates every validator.
async function addHtmlValidators(request: Request, response: Response): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return response;
  if (response.status !== 200) return response;
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;
  if (response.headers.has("etag")) return response;

  const body = await response.text();
  // The router serialises per-render hydration timestamps (`u:1786509766624`)
  // into the dehydrated state. They change on every render without the page
  // content changing, so normalise them out before hashing — otherwise the
  // ETag would never match and conditional requests could never 304.
  const etag = `W/"${BUILD_STAMP_ID.slice(0, 12)}-${weakHash(body.replace(/\bu:1\d{12}\b/g, "u:0"))}"`;
  const headers = new Headers(response.headers);
  headers.set("etag", etag);
  headers.set("last-modified", new Date(BUILT_AT).toUTCString());

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch.split(",").some((t) => t.trim() === etag)) {
    headers.delete("content-length");
    return new Response(null, { status: 304, headers });
  }

  return new Response(body, { status: 200, statusText: response.statusText, headers });
}

function isCanonicalHost(hostname: string): boolean {
  return hostname === "doseroutine.com" || hostname === "www.doseroutine.com";
}

function appendLinkHeader(headers: Headers, value: string) {
  const existing = headers.get("link");
  headers.set("link", existing ? `${existing}, ${value}` : value);
}

// Anonymous = no Supabase auth cookie and no Authorization header. Only these
// requests are safe to serve from the shared edge cache; signed-in HTML embeds
// per-user state and must never be cached at the edge.
function isAnonymousRequest(request: Request): boolean {
  if (request.headers.get("authorization")) return false;
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie) return true;
  // Supabase SSR auth cookies: sb-<ref>-auth-token(.N)
  return !/(?:^|;\s*)sb-[^=]*-auth-token(?:\.\d+)?=/.test(cookie);
}

function applyCacheHeaders(
  request: Request,
  response: Response,
  { anonymous }: { anonymous: boolean },
): Response {
  if (request.method !== "GET" && request.method !== "HEAD") return response;

  // 404s must never be cached anywhere: a cached 404 would keep serving the
  // noindex signal (or worse, be revalidated as a normal page) after the URL
  // becomes real. Always pair the noindex 404 with private, no-store — this
  // runs BEFORE the "already has cache-control" bail-out because the router
  // emits its own `no-cache, must-revalidate` on not-found responses, which
  // still permits a shared cache to store them.
  if (response.status === 404) {
    const notFoundHeaders = new Headers(response.headers);
    notFoundHeaders.append("vary", "Cookie, Authorization, Accept-Encoding");
    notFoundHeaders.set("cache-control", "private, no-store");
    sanitizeVary(notFoundHeaders);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: notFoundHeaders,
    });
  }

  if (response.status !== 200) return response;

  const url = new URL(request.url);
  const contentType = response.headers.get("content-type") ?? "";
  const isHtml = contentType.includes("text/html");

  // The router emits its own `no-cache, must-revalidate` on HTML. That pins
  // every crawler to an origin round-trip and gives the edge nothing to serve,
  // so we deliberately override it for anonymous, indexable HTML. Non-HTML
  // responses keep whatever cache-control they already declared.
  if (!isHtml && response.headers.has("cache-control")) return response;


  const headers = new Headers(response.headers);
  headers.append("vary", "Cookie, Authorization, Accept-Encoding");

  if (isHtml) {
    if (anonymous && isCanonicalHost(url.hostname) && isIndexablePath(url.pathname)) {
      // Browser revalidates every request; hosting/CDN can cache anonymous HTML
      // for 5 min and revalidate stale copies in the background for up to a day.
      headers.set(
        "cache-control",
        "public, max-age=0, s-maxage=300, stale-while-revalidate=600, must-revalidate",
      );
    } else {
      headers.set("cache-control", "private, no-store");
    }
  } else if (url.pathname.startsWith("/assets/")) {
    // Vite emits content-hashed asset URLs.
    headers.set("cache-control", "public, max-age=31536000, immutable");
  } else if (CRAWLER_TEXT_FILES.has(url.pathname)) {
    // robots.txt / llms.txt change rarely. Let the CDN serve
    // them for a day (and stale for a week) so crawler hits don't reach the
    // origin. Content is unchanged.
    headers.set(
      "cache-control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
  }

  sanitizeVary(headers);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function applyAttributionHeaders(request: Request, response: Response): Response {
  const url = new URL(request.url);
  const contentType = response.headers.get("content-type") ?? "";
  const isHtml = contentType.includes("text/html");
  const headers = new Headers(response.headers);

  headers.set(
    "X-Content-Attribution",
    "DoseRoutine; source=https://doseroutine.com; citation-required=true",
  );
  appendLinkHeader(
    headers,
    '<https://doseroutine.com/llms.txt>; rel="alternate"; type="text/plain"; title="AI citation policy"',
  );

  if (isHtml) {
    const citeAsUrl = `${CANONICAL_ORIGIN}${url.pathname === "/" ? "/" : url.pathname}`;
    appendLinkHeader(headers, `<${citeAsUrl}>; rel="cite-as"`);
  }

  if (isHtml) {
    const canonicalUrl = `${CANONICAL_ORIGIN}${url.pathname === "/" ? "/" : url.pathname}`;
    appendLinkHeader(headers, `<${canonicalUrl}>; rel="canonical"`);

    // 404s are never indexable, whatever the path looks like.
    if (
      response.status === 404 ||
      !isCanonicalHost(url.hostname) ||
      !isIndexablePath(url.pathname)
    ) {
      headers.set("X-Robots-Tag", "noindex, nofollow");
    }
  }

  sanitizeVary(headers);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      let canonicalized = false;
      if (url.hostname === "www.doseroutine.com") {
        url.hostname = "doseroutine.com";
        canonicalized = true;
      }
      if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.replace(/\/+$/, "");
        canonicalized = true;
      }
      // Legacy ?lang= URLs: the UI language switcher uses ?n= now, and every
      // ?lang= copy served identical English HTML canonicalising back to the
      // clean path. Google crawled thousands of them ("Crawled - currently not
      // indexed"). Collapse them with a 301 so the duplicates disappear.
      if (url.searchParams.has("lang")) {
        url.searchParams.delete("lang");
        canonicalized = true;
      }

      if (canonicalized) {
        return Response.redirect(url.toString(), 301);
      }

      const anonymous = isAnonymousRequest(request);

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      const withAttribution = applyAttributionHeaders(request, normalized);
      const withValidators = await addHtmlValidators(request, withAttribution);
      const finalResponse = applyCacheHeaders(request, withValidators, { anonymous });

      return finalResponse;
    } catch (error) {
      console.error(error);
      return applyAttributionHeaders(
        request,
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
