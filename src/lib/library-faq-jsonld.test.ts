// Rendered-HTML regression tests: fetches every /library/:slug page listed in
// the live sitemap.xml and verifies the SSR output contains a valid FAQPage
// JSON-LD block.
//
// Defaults to the local dev server so the suite exercises the CURRENT code.
// Override with LIB_FAQ_BASE_URL=https://doseroutine.com in post-deploy CI.
// Set FAQ_JSONLD_SKIP=1 to skip when the network is unavailable.
//
// Sitemap sweep controls:
//   LIB_FAQ_LIMIT       cap slugs (default: 12 locally, 0 = no cap in CI)
//   LIB_FAQ_ALL=1       force full sweep regardless of environment
//   LIB_FAQ_CONCURRENCY parallel fetches for cache warm-up (default 8)
//   LIB_FAQ_SLUGS       comma-separated override; skips sitemap discovery

import { describe, expect, it, beforeAll } from "vitest";
import {
  contextMatchesSchemaOrg,
  findDuplicateGroups,
  hasNormalizedContent,
  typeMatchesNormalized,
} from "./faq-normalize";

const typeOf = (v: unknown): string =>
  v === null ? "null" : Array.isArray(v) ? "array" : typeof v;

const RAW_BASE = (process.env.LIB_FAQ_BASE_URL || "").trim();
const BASE_URL = (RAW_BASE || "http://localhost:8080").replace(/\/$/, "");
const SKIP = process.env.FAQ_JSONLD_SKIP === "1";
const FORCE_ALL = process.env.LIB_FAQ_ALL === "1" || !!process.env.CI;
const CONCURRENCY = Math.max(1, Number(process.env.LIB_FAQ_CONCURRENCY) || 8);
const LIMIT_ENV = process.env.LIB_FAQ_LIMIT;
const DEFAULT_LIMIT = FORCE_ALL ? 0 : 12;
const LIMIT = LIMIT_ENV != null ? Math.max(0, Number(LIMIT_ENV) || 0) : DEFAULT_LIMIT;

// Fallback slugs used only when sitemap discovery fails AND no override is set.
// Covers each pipeline: vitamin, peptide, hormone, mineral, nootropic.
const FALLBACK_SLUGS = [
  "vitamin-b12",
  "bpc-157",
  "testosterone-cypionate",
  "magnesium-glycinate",
  "l-theanine",
];

const LIBRARY_DETAIL_RE = /^\/library\/([^/]+)\/?$/;
const LIBRARY_EXCLUDE_RE = /^\/library(\/(compare(\/.*)?)?)?$/;

function extractSitemapLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>([\s\S]*?)<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

// Process-lifetime cache of sitemap XML by URL. A vitest run may invoke
// discoverLibrarySlugs multiple times (top-level resolveSlugs plus any
// re-imports from sibling test files) and nested sitemap-index files
// often reference overlapping children — cache the raw XML so we hit the
// network at most once per URL, even across suites. Cache negatives as
// null so repeated failures don't retry either.
const sitemapXmlCache = new Map<string, string | null>();

async function fetchXml(url: string): Promise<string | null> {
  if (sitemapXmlCache.has(url)) return sitemapXmlCache.get(url)!;
  let value: string | null;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/xml,text/xml,*/*" },
      redirect: "follow",
    });
    value = res.ok ? await res.text() : null;
  } catch {
    value = null;
  }
  sitemapXmlCache.set(url, value);
  return value;
}

// Walks sitemap + nested sitemap-index files to collect every /library/:slug.
async function discoverLibrarySlugs(base: string): Promise<string[]> {
  const seen = new Set<string>();
  const slugs = new Set<string>();
  const queue: string[] = [`${base}/sitemap.xml`];

  while (queue.length) {
    const url = queue.shift()!;
    if (seen.has(url) || seen.size > 20) continue;
    seen.add(url);
    const xml = await fetchXml(url);
    if (!xml) continue;
    const isIndex = /<sitemapindex[\s>]/i.test(xml);
    const locs = extractSitemapLocs(xml);
    if (isIndex) {
      for (const child of locs) queue.push(child);
      continue;
    }
    for (const u of locs) {
      let path: string;
      try {
        path = new URL(u).pathname || "/";
      } catch {
        continue;
      }
      if (LIBRARY_EXCLUDE_RE.test(path)) continue;
      const m = LIBRARY_DETAIL_RE.exec(path);
      if (m) slugs.add(m[1]);
    }
  }
  return [...slugs].sort();
}

function resolveOverrideSlugs(): string[] | null {
  const raw = (process.env.LIB_FAQ_SLUGS || "").trim();
  if (!raw) return null;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : null;
}

async function resolveSlugs(): Promise<{ slugs: string[]; source: string }> {
  const override = resolveOverrideSlugs();
  if (override) return { slugs: override, source: "LIB_FAQ_SLUGS override" };
  try {
    const discovered = await discoverLibrarySlugs(BASE_URL);
    if (discovered.length > 0) {
      const capped = LIMIT > 0 ? discovered.slice(0, LIMIT) : discovered;
      return {
        slugs: capped,
        source: `sitemap (${discovered.length} found, running ${capped.length})`,
      };
    }
  } catch {
    // fall through to fallback
  }
  return { slugs: FALLBACK_SLUGS, source: "fallback (sitemap unreachable)" };
}

type Cached = { status: number; html: string };
const cache = new Map<string, Cached>();

async function fetchPage(slug: string): Promise<Cached> {
  const hit = cache.get(slug);
  if (hit) return hit;
  const res = await fetch(`${BASE_URL}/library/${slug}`, {
    redirect: "follow",
    headers: { Accept: "text/html", "User-Agent": "doseroutine-faq-jsonld-test/1.0" },
  });
  const html = await res.text();
  const entry = { status: res.status, html };
  cache.set(slug, entry);
  return entry;
}

async function warmCache(slugs: string[]): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, slugs.length) }, async () => {
    while (i < slugs.length) {
      const idx = i++;
      await fetchPage(slugs[idx]).catch(() => null);
    }
  });
  await Promise.all(workers);
}

function extractJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      // Skip malformed blocks — a dedicated test below asserts parseability.
    }
  }
  return out;
}

function findAllFaqPages(blocks: unknown[]): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  for (const b of blocks) {
    if (b && typeof b === "object" && typeMatchesNormalized((b as any)["@type"], "FAQPage")) {
      out.push(b as Record<string, any>);
    }
  }
  return out;
}

function findFaqPage(blocks: unknown[]): Record<string, any> | null {
  return findAllFaqPages(blocks)[0] ?? null;
}

// Resolve slugs synchronously up-front so vitest can register one describe per
// slug. Top-level await is supported in vitest's ESM test files.
const { slugs: SLUGS, source: SLUG_SOURCE } = await (async () => {
  if (SKIP) return { slugs: [] as string[], source: "skipped" };
  return resolveSlugs();
})();

// eslint-disable-next-line no-console
if (!SKIP)
  console.log(`[library-faq-jsonld] ${SLUGS.length} slug(s) from ${SLUG_SOURCE} @ ${BASE_URL}`);

describe.skipIf(SKIP)("library.$slug FAQPage JSON-LD (rendered HTML)", () => {
  beforeAll(
    async () => {
      await warmCache(SLUGS);
      // Warm-cache timeout scales with slug count: allow ~1s/page with a floor.
    },
    Math.max(60_000, SLUGS.length * 1500),
  );

  it("discovers at least one library slug to validate", () => {
    expect(SLUGS.length).toBeGreaterThan(0);
  });

  for (const slug of SLUGS) {
    describe(`/library/${slug}`, () => {
      it("returns HTTP 200 with HTML body", async () => {
        const { status, html } = await fetchPage(slug);
        expect(status).toBe(200);
        expect(html.length).toBeGreaterThan(1000);
      });

      it("emits at least one JSON-LD script tag", async () => {
        const { html } = await fetchPage(slug);
        const blocks = extractJsonLdBlocks(html);
        expect(blocks.length).toBeGreaterThan(0);
      });

      it("always renders a FAQPage JSON-LD block (never missing)", async () => {
        const { html } = await fetchPage(slug);
        const faqs = findAllFaqPages(extractJsonLdBlocks(html));
        expect(
          faqs.length,
          `[${slug}] expected /library/${slug} to render a FAQPage JSON-LD block, but found none. ` +
            `Every library detail route must emit a FAQPage — check buildFaqPairs/head() output for this slug.`,
        ).toBeGreaterThanOrEqual(1);
      });

      it("renders exactly one FAQPage JSON-LD block (no duplicates)", async () => {
        const { html } = await fetchPage(slug);
        const faqs = findAllFaqPages(extractJsonLdBlocks(html));
        expect(
          faqs.length,
          `[${slug}] expected exactly 1 FAQPage JSON-LD block on /library/${slug}, ` +
            `found ${faqs.length}. Duplicate blocks typically mean the schema is emitted from both ` +
            `head() meta and a body <script> tag — pick one source.`,
        ).toBe(1);
      });

      it("has every JSON-LD block parse as valid JSON", async () => {
        const { html } = await fetchPage(slug);
        const raw = [
          ...html.matchAll(
            /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
          ),
        ]
          .map((m) => m[1].trim())
          .filter(Boolean);
        expect(raw.length).toBeGreaterThan(0);
        for (const r of raw) {
          expect(() => JSON.parse(r)).not.toThrow();
        }
      });

      it("includes a FAQPage block with the schema.org context", async () => {
        const { html } = await fetchPage(slug);
        const faq = findFaqPage(extractJsonLdBlocks(html));
        const where = `[${slug}] FAQPage`;
        expect(
          faq,
          `${where}: expected a JSON-LD block with @type "FAQPage", but none was found`,
        ).not.toBeNull();
        expect(
          contextMatchesSchemaOrg(faq!["@context"]),
          `${where} $.@context: expected value referencing schema.org (case/whitespace-insensitive), received ${JSON.stringify(faq!["@context"])}`,
        ).toBe(true);
        expect(
          typeMatchesNormalized(faq!["@type"], "FAQPage"),
          `${where} $.@type: expected "FAQPage" (case/whitespace-insensitive), received ${JSON.stringify(faq!["@type"])}`,
        ).toBe(true);
      });

      it("has a non-empty mainEntity array of Question objects", async () => {
        const { html } = await fetchPage(slug);
        const faq = findFaqPage(extractJsonLdBlocks(html));
        const where = `[${slug}] FAQPage`;
        expect(faq, `${where}: no FAQPage block to inspect mainEntity on`).not.toBeNull();
        const entities = faq!.mainEntity;
        expect(
          Array.isArray(entities),
          `${where} $.mainEntity: expected Array, received ${typeOf(entities)} (${JSON.stringify(entities)?.slice(0, 120)})`,
        ).toBe(true);
        expect(
          entities.length,
          `${where} $.mainEntity.length: expected >= 2, received ${entities.length}`,
        ).toBeGreaterThanOrEqual(2);
        entities.forEach((e: any, i: number) => {
          const p = `${where} $.mainEntity[${i}]`;
          expect(
            typeMatchesNormalized(e["@type"], "Question"),
            `${p}.@type: expected "Question" (case/whitespace-insensitive), received ${JSON.stringify(e["@type"])}`,
          ).toBe(true);
          expect(
            typeof e.name,
            `${p}.name: expected typeof "string", received "${typeof e.name}" (value=${JSON.stringify(e.name)?.slice(0, 120)})`,
          ).toBe("string");
          expect(
            e.name,
            `${p}.name: expected trimmed value (no leading/trailing whitespace), received ${JSON.stringify(e.name)}`,
          ).toBe(e.name.trim());
          expect(
            hasNormalizedContent(e.name),
            `${p}.name: expected non-empty after whitespace normalization, received value=${JSON.stringify(e.name)}`,
          ).toBe(true);
        });
      });

      it("has each Question carrying a non-empty acceptedAnswer.text", async () => {
        const { html } = await fetchPage(slug);
        const faq = findFaqPage(extractJsonLdBlocks(html));
        const where = `[${slug}] FAQPage`;
        expect(faq, `${where}: no FAQPage block to inspect acceptedAnswer on`).not.toBeNull();
        (faq!.mainEntity as any[]).forEach((e, i) => {
          const p = `${where} $.mainEntity[${i}]`;
          expect(
            e.acceptedAnswer,
            `${p}.acceptedAnswer: expected an Answer object, received ${JSON.stringify(e.acceptedAnswer)}`,
          ).toBeTruthy();
          expect(
            typeMatchesNormalized(e.acceptedAnswer["@type"], "Answer"),
            `${p}.acceptedAnswer.@type: expected "Answer" (case/whitespace-insensitive), received ${JSON.stringify(e.acceptedAnswer["@type"])}`,
          ).toBe(true);
          expect(
            typeof e.acceptedAnswer.text,
            `${p}.acceptedAnswer.text: expected typeof "string", received "${typeof e.acceptedAnswer.text}" (value=${JSON.stringify(e.acceptedAnswer.text)?.slice(0, 120)})`,
          ).toBe("string");
          expect(
            e.acceptedAnswer.text,
            `${p}.acceptedAnswer.text: expected trimmed value (no leading/trailing whitespace), received ${JSON.stringify(e.acceptedAnswer.text)?.slice(0, 160)}`,
          ).toBe(e.acceptedAnswer.text.trim());
          expect(
            hasNormalizedContent(e.acceptedAnswer.text),
            `${p}.acceptedAnswer.text: expected non-empty after whitespace normalization (question=${JSON.stringify(e.name)?.slice(0, 80)})`,
          ).toBe(true);
        });
      });

      it("has unique Question.name values across mainEntity (no duplicates)", async () => {
        const { html } = await fetchPage(slug);
        const faq = findFaqPage(extractJsonLdBlocks(html));
        const where = `[${slug}] FAQPage`;
        expect(
          faq,
          `${where}: no FAQPage block to check Question.name uniqueness on`,
        ).not.toBeNull();
        const entities = faq!.mainEntity as any[];
        const dupes = findDuplicateGroups(entities, (e) => e?.name);
        const dupeReport = dupes.map(
          (g) => `"${g.key.slice(0, 80)}" at mainEntity[${g.indices.join(",")}]`,
        );
        expect(
          dupeReport,
          `${where} $.mainEntity[*].name: expected all unique (case/whitespace-normalized), received ${dupeReport.length} duplicate group(s): ${dupeReport.join(" | ")}`,
        ).toEqual([]);
      });

      it("has unique acceptedAnswer.text values across mainEntity (no duplicate answers)", async () => {
        const { html } = await fetchPage(slug);
        const faq = findFaqPage(extractJsonLdBlocks(html));
        const where = `[${slug}] FAQPage`;
        expect(
          faq,
          `${where}: no FAQPage block to check acceptedAnswer.text uniqueness on`,
        ).not.toBeNull();
        const entities = faq!.mainEntity as any[];
        const dupes = findDuplicateGroups(entities, (e) => e?.acceptedAnswer?.text);
        const dupeReport = dupes.map(
          (g) => `"${g.key.slice(0, 80)}…" at mainEntity[${g.indices.join(",")}]`,
        );
        expect(
          dupeReport,
          `${where} $.mainEntity[*].acceptedAnswer.text: expected all unique (case/whitespace-normalized), received ${dupeReport.length} duplicate group(s): ${dupeReport.join(" | ")}`,
        ).toEqual([]);
      });
    });
  }
});
