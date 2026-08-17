import { describe, it, expect, beforeAll } from "vitest";

/**
 * SEO meta-tag smoke tests.
 *
 * Fetches key routes from the running dev server (http://localhost:8080)
 * and asserts crawler-critical tags are present and well-formed:
 *   - <title>          (present, ≤ 65 chars decoded, no "Lovable")
 *   - meta description (non-empty)
 *   - og:title, og:description, og:type
 *   - twitter:card
 *   - >=1 valid application/ld+json block
 *
 * Routes flagged with `requiresImage: true` additionally require
 * og:image + twitter:image (absolute https URL).
 *
 * Run with: bunx vitest run src/tests/seo-meta.smoke.test.ts
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:8080";

type RouteSpec = {
  path: string;
  requiresImage?: boolean;
  expectedTitleIncludes?: string;
};

const ROUTES: RouteSpec[] = [
  { path: "/", expectedTitleIncludes: "DoseRoutine" },
  { path: "/library", expectedTitleIncludes: "Library" },
  { path: "/compare", requiresImage: true, expectedTitleIncludes: "Compare" },
  { path: "/help", expectedTitleIncludes: "Help" },
  { path: "/ai-policy", expectedTitleIncludes: "AI" },
  { path: "/legal", expectedTitleIncludes: "Legal" },
  { path: "/cookies", expectedTitleIncludes: "Cookie" },
  { path: "/auth" },
  // Representative dynamic pages
  { path: "/library/creatine", requiresImage: true },
  { path: "/goals/muscle" },
  { path: "/vs-supplement-planner" },
];

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) : null;
}

function getMeta(html: string, key: string, attr: "name" | "property"): string | null {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const alt = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`, "i");
  const m = html.match(re) ?? html.match(alt);
  return m ? decodeEntities(m[1]) : null;
}

function getJsonLdBlocks(html: string): string[] {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1].trim());
  return out;
}

type Fetched = { path: string; status: number; html: string };
const cache = new Map<string, Fetched>();

async function load(path: string): Promise<Fetched> {
  const hit = cache.get(path);
  if (hit) return hit;
  const res = await fetch(`${BASE}${path}`, {
    headers: { "user-agent": "DoseRoutine-SEO-Smoke/1.0" },
  });
  const html = await res.text();
  const out = { path, status: res.status, html };
  cache.set(path, out);
  return out;
}

describe(`SEO meta smoke tests (${BASE})`, () => {
  beforeAll(async () => {
    // Warm the cache in parallel to keep the suite fast.
    await Promise.all(ROUTES.map((r) => load(r.path)));
  }, 60_000);

  describe.each(ROUTES)("$path", (route) => {
    it("responds 200 OK", async () => {
      const { status } = await load(route.path);
      expect(status).toBe(200);
    });

    it("has a valid <title>", async () => {
      const { html } = await load(route.path);
      const title = getTitle(html);
      expect(title, "missing <title>").toBeTruthy();
      expect(title!.length, `title too long: "${title}"`).toBeLessThanOrEqual(65);
      expect(title!.toLowerCase()).not.toContain("lovable");
      if (route.expectedTitleIncludes) {
        expect(title!.toLowerCase()).toContain(route.expectedTitleIncludes.toLowerCase());
      }
    });

    it("has a non-empty meta description", async () => {
      const { html } = await load(route.path);
      const desc = getMeta(html, "description", "name");
      expect(desc, "missing meta description").toBeTruthy();
      expect(desc!.length).toBeGreaterThan(10);
      expect(desc!.length, `description too long: ${desc!.length}`).toBeLessThanOrEqual(200);
    });

    it("has OpenGraph title / description / type", async () => {
      const { html } = await load(route.path);
      expect(getMeta(html, "og:title", "property"), "og:title").toBeTruthy();
      expect(getMeta(html, "og:description", "property"), "og:description").toBeTruthy();
      expect(getMeta(html, "og:type", "property"), "og:type").toBeTruthy();
    });

    it("has twitter:card", async () => {
      const { html } = await load(route.path);
      expect(getMeta(html, "twitter:card", "name"), "twitter:card").toBeTruthy();
    });

    if (route.requiresImage) {
      it("has absolute og:image + twitter:image", async () => {
        const { html } = await load(route.path);
        const og = getMeta(html, "og:image", "property");
        const tw = getMeta(html, "twitter:image", "name");
        expect(og, "og:image").toBeTruthy();
        expect(tw, "twitter:image").toBeTruthy();
        expect(og!).toMatch(/^https:\/\//);
        expect(tw!).toMatch(/^https:\/\//);
      });
    }

    it("has at least one valid JSON-LD block", async () => {
      const { html } = await load(route.path);
      const blocks = getJsonLdBlocks(html);
      expect(blocks.length, "no application/ld+json").toBeGreaterThan(0);
      for (const b of blocks) {
        expect(() => JSON.parse(b), `invalid JSON-LD: ${b.slice(0, 80)}…`).not.toThrow();
      }
    });
  });
});
