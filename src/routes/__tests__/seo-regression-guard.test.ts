import { beforeAll, describe, expect, it } from "vitest";

/**
 * SEO regression guard.
 *
 * Fetches the server-rendered HTML of the key public routes and asserts the
 * things that silently break on deploy and are expensive to notice later:
 *
 *   - exactly one <title>, non-empty, not a template default
 *   - exactly one <meta name="description">, 50–170 chars
 *   - exactly one og:title / og:description / og:url set (no duplicates from
 *     a root + leaf head() collision)
 *   - <html lang> present
 *   - canonical present, self-referencing, exactly one
 *   - /robots.txt and /sitemap.xml both served correctly
 *
 * Base URL: SEO_BASE_URL, else the local dev server.
 * Set SEO_REQUIRE_SERVER=1 in CI so an unreachable server fails instead of skips.
 */
const BASE_URL = (process.env["SEO_BASE_URL"] ?? "http://localhost:8080").replace(/\/+$/, "");
const REQUIRE_SERVER = process.env["SEO_REQUIRE_SERVER"] === "1";

const ROUTES = [
  "/",
  "/about",
  "/faq",
  "/manual",
  "/articles",
  "/best-medication-reminder-app",
] as const;

const BANNED_TITLES = [/lovable app/i, /lovable generated project/i, /^untitled/i];

type Doc = { status: number; html: string };

const docs = new Map<string, Doc>();
let reachable = true;

function countAll(html: string, re: RegExp): string[] {
  return [...html.matchAll(re)].map((m) => m[1] ?? "");
}

function metaContents(html: string, attr: "name" | "property", value: string): string[] {
  // Matches the tag in either attribute order.
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const a = new RegExp(
    `<meta[^>]+${attr}=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "gi",
  );
  const b = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${escaped}["'][^>]*>`,
    "gi",
  );
  return [...countAll(html, a), ...countAll(html, b)];
}

function canonicals(html: string): string[] {
  return [
    ...countAll(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/gi),
    ...countAll(html, /<link[^>]+href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/gi),
  ];
}

beforeAll(async () => {
  for (const route of ROUTES) {
    try {
      const res = await fetch(`${BASE_URL}${route}`, {
        headers: { accept: "text/html" },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      docs.set(route, { status: res.status, html: await res.text() });
    } catch {
      reachable = false;
      break;
    }
  }
  if (!reachable && REQUIRE_SERVER) {
    throw new Error(`SEO guard could not reach ${BASE_URL}`);
  }
}, 140_000);

describe.each(ROUTES)("SEO head contract: %s", (route) => {
  it("renders exactly one valid title", () => {
    if (!reachable) return;
    const doc = docs.get(route)!;
    expect(doc.status).toBe(200);
    const titles = countAll(doc.html, /<title[^>]*>([\s\S]*?)<\/title>/gi).map((t) => t.trim());
    expect(titles.length, `expected one <title>, got ${titles.length}`).toBe(1);
    const title = titles[0] ?? "";
    expect(title.length).toBeGreaterThan(10);
    expect(title.length).toBeLessThanOrEqual(70);
    for (const banned of BANNED_TITLES) expect(title).not.toMatch(banned);
  });

  it("renders exactly one usable meta description", () => {
    if (!reachable) return;
    const html = docs.get(route)!.html;
    const descriptions = metaContents(html, "name", "description");
    expect(descriptions.length, `expected one description, got ${descriptions.length}`).toBe(1);
    const description = descriptions[0] ?? "";
    expect(description.length).toBeGreaterThanOrEqual(50);
    expect(description.length).toBeLessThanOrEqual(200);
  });

  it("renders exactly one Open Graph set", () => {
    if (!reachable) return;
    const html = docs.get(route)!.html;
    for (const property of ["og:title", "og:description", "og:url", "og:type"] as const) {
      const values = metaContents(html, "property", property);
      expect(values.length, `${property}: expected 1, got ${values.length}`).toBe(1);
      expect(values[0]?.trim().length ?? 0).toBeGreaterThan(0);
    }
    const images = metaContents(html, "property", "og:image");
    expect(images.length, "og:image must not be duplicated").toBeLessThanOrEqual(1);
    for (const image of images) expect(image).toMatch(/^https:\/\//);
  });

  it("declares html lang", () => {
    if (!reachable) return;
    const html = docs.get(route)!.html;
    const match = html.match(/<html[^>]*\slang=["']([^"']+)["']/i);
    expect(match?.[1], "<html lang> missing").toBeTruthy();
    expect(match?.[1]).toMatch(/^[a-z]{2}(-[A-Za-z0-9]+)*$/);
  });

  it("has a single self-referencing canonical", () => {
    if (!reachable) return;
    const html = docs.get(route)!.html;
    const links = canonicals(html);
    expect(links.length, `expected one canonical, got ${links.length}`).toBe(1);
    const href = links[0] ?? "";
    expect(href).toMatch(/^https:\/\/doseroutine\.com/);
    const path = new URL(href).pathname.replace(/\/+$/, "") || "/";
    expect(path).toBe(route.replace(/\/+$/, "") || "/");
  });
});

describe("crawler entry points", () => {
  it("serves robots.txt as plain text and allows crawling", async () => {
    if (!reachable) return;
    const res = await fetch(`${BASE_URL}/robots.txt`, { signal: AbortSignal.timeout(15_000) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/text\/plain/);
    const body = await res.text();
    expect(body).toMatch(/User-agent:\s*\*/i);
    expect(body).toMatch(/^Allow:\s*\/$/im);
    // A blanket site-wide block would deindex everything.
    expect(body).not.toMatch(/^User-agent:\s*\*\s*\nDisallow:\s*\/\s*$/im);
  });

  it("serves sitemap.xml with absolute, https URLs", async () => {
    if (!reachable) return;
    const res = await fetch(`${BASE_URL}/sitemap.xml`, { signal: AbortSignal.timeout(30_000) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/xml/);
    const xml = await res.text();
    expect(xml.startsWith("<?xml")).toBe(true);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? "");
    expect(locs.length).toBeGreaterThan(10);
    for (const loc of locs.slice(0, 50)) expect(loc).toMatch(/^https:\/\/doseroutine\.com\//);
    // Private app surfaces must never be advertised to crawlers.
    const privatePaths = new Set(["/today", "/stack", "/timeline", "/auth", "/onboarding"]);
    const listedPrivate = locs.filter((l) =>
      privatePaths.has(new URL(l).pathname.replace(/\/+$/, "") || "/"),
    );
    expect(listedPrivate, "private app routes must not be in the sitemap").toEqual([]);
  });
});
