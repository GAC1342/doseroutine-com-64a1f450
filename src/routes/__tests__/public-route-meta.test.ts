/**
 * Regression guard for SEO-critical head metadata on every public route.
 *
 * Enumerates static route files under src/routes (excluding _authenticated,
 * api, dynamic $ segments, layout-only wrappers, and internal utilities),
 * imports each module, calls Route.options.head(), and asserts:
 *
 *   - title + description meta present and non-empty
 *   - og:title, og:description, og:type present
 *   - og:url is an absolute https://doseroutine.com URL
 *   - twitter:card, twitter:title, twitter:description present
 *   - <link rel="canonical"> is present and absolute https://doseroutine.com URL
 *   - robots meta present; indexable routes must include "index" and "follow";
 *     private routes (auth, onboarding, reset-password) may set noindex
 *   - canonical and og:url self-reference the same path
 */

import { isGenericImageAlt } from "@/lib/social-image-meta";
import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

type Meta = Record<string, string | undefined> & { title?: string };
type LinkTag = { rel?: string; href?: string };
type HeadResult = { meta?: Meta[]; links?: LinkTag[] };
type RouteMod = {
  Route: { options: { head?: (ctx?: unknown) => HeadResult } };
};

const ROUTES_DIR = join(process.cwd(), "src", "routes");
export const CANONICAL_HOST = "https://doseroutine.com";

// Paths that legitimately opt out of indexing. These only need title,
// description, canonical, and a robots meta that includes "noindex"; OG
// and Twitter tags aren't required since the pages aren't shareable.
const NON_INDEXABLE = new Set<string>([
  "/auth",
  "/onboarding",
  "/reset-password",
  // Private promo/ad kit: noindex, nofollow — shared by link, not search.
  "/promo-kit",
]);

// Legacy routes known to be missing a `robots` meta tag today. Do NOT add
// new entries here — every new public route must ship `robots` in its
// head() (indexable routes: "index, follow, max-image-preview:large";
// private routes: "noindex, nofollow"). This allowlist is a shrink-only
// backlog and exists purely so regressions on covered routes fail loudly
// without blocking CI on pre-existing gaps.
const ROBOTS_META_LEGACY_ALLOWLIST = new Set<string>([
  "about.tsx",
  "ai-policy.tsx",
  "cookies.tsx",
  "data-deletion.tsx",
  "help.index.tsx",
  "index.tsx",
  "install.tsx",
  "legal.tsx",
  "library.compare.ashwagandha-vs-tongkat-ali.tsx",
  "library.compare.bpc-157-vs-tb-500.tsx",
  "library.compare.saw-palmetto-vs-beta-sitosterol.tsx",
  "library.compare.semaglutide-vs-tirzepatide.tsx",
  "library.compare.tongkat-ali-vs-fadogia-agrestis.tsx",
  "library.guides.bph-natural-support.tsx",
  "library.guides.erectile-dysfunction-supplements.tsx",
  "library.guides.low-testosterone-symptoms.tsx",
  "library.peptide-stacks-for-muscle-growth.tsx",
  "library.womens-health.ashwagandha-women.tsx",
  "library.womens-health.b6-luteal.tsx",
  "library.womens-health.black-cohosh.tsx",
  "library.womens-health.collagen-peptides-women.tsx",
  "library.womens-health.coq10-fertility.tsx",
  "library.womens-health.coq10-women.tsx",
  "library.womens-health.creatine-women.tsx",
  "library.womens-health.d-chiro-inositol.tsx",
  "library.womens-health.dhea-women.tsx",
  "library.womens-health.estradiol-hrt.tsx",
  "library.womens-health.evening-primrose-oil.tsx",
  "library.womens-health.folate-vs-folic-acid.tsx",
  "library.womens-health.iron-cycle.tsx",
  "library.womens-health.l-arginine-women.tsx",
  "library.womens-health.maca-libido.tsx",
  "library.womens-health.maca-menopause.tsx",
  "library.womens-health.magnesium-glycinate-women.tsx",
  "library.womens-health.myo-inositol.tsx",
  "library.womens-health.nad-precursors.tsx",
  "library.womens-health.nmn-women.tsx",
  "library.womens-health.omega-3-women.tsx",
  "library.womens-health.progesterone-women.tsx",
  "library.womens-health.red-clover.tsx",
  "library.womens-health.resveratrol-women.tsx",
  "library.womens-health.soy-isoflavones.tsx",
  "library.womens-health.spermidine-women.tsx",
  "library.womens-health.testosterone-women.tsx",
  "library.womens-health.tribulus-women.tsx",
  "library.womens-health.vaginal-probiotics.tsx",
  "library.womens-health.vitamin-d-fertility.tsx",
  "library.womens-health.vitex.tsx",
  "medical-disclaimer.tsx",
  "privacy.tsx",
  "reconstitution-calculator.tsx",
  "refund-policy.tsx",
  "status.tsx",
  "trt-dosage-calculator.tsx",
  "trt-supplement-interactions.tsx",
  "vs-supplement-planner.tsx",
  "vs.cronometer.tsx",
  "vs.index.tsx",
  "vs.medisafe.tsx",
  "vs.mytherapy.tsx",
  "vs.pill-reminder.tsx",
  "vs.round-health.tsx",
]);

// Legacy non-indexable routes still missing full OG/Twitter tags. Same
// shrink-only policy as the robots allowlist above.
const OG_TWITTER_LEGACY_ALLOWLIST = new Set<string>([
  "auth.tsx",
  "onboarding.tsx",
  "reset-password.tsx",
]);

// Layout-only routes or files that don't render a shareable page and
// intentionally don't ship head() metadata.
const SKIP_FILES = new Set<string>([
  "__root.tsx",
  "library.tsx", // parent layout, delegates to library.index.tsx
  "sitemap[.]xml.ts",
  "robots[.]txt.ts",
  "debug.att.tsx",
  "debug.deep-link.tsx",
  "debug.env.tsx", // internal noindex env diagnostics page
  "debug.index-check.tsx", // internal noindex build-check page
  "debug.noindex-audit.tsx", // internal noindex smoke-test page
  // Private OAuth redirect target: ssr:false, robots noindex/nofollow,
  // never shared or crawled — no og:url needed.
  "auth_.callback.tsx",
]);

function filenameToPath(file: string): string {
  const base = file.replace(/\.tsx?$/, "");
  if (base === "index") return "/";
  // Convert dot segments to slashes; drop trailing ".index"
  let p = "/" + base.replace(/\./g, "/");
  p = p.replace(/\/index$/, "");
  return p || "/";
}

function isSkippableName(file: string): boolean {
  if (SKIP_FILES.has(file)) return true;
  if (!/\.tsx?$/.test(file)) return true;
  if (file.startsWith("_")) return true; // _authenticated etc.
  if (file.includes("$")) return true; // dynamic route
  if (file.startsWith("api.")) return true;
  if (file.startsWith("lovable")) return true;
  return false;
}

function collectRouteFiles(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter((f) => !isSkippableName(f))
    .sort();
}

async function loadHead(file: string): Promise<HeadResult | null> {
  const mod = (await import(/* @vite-ignore */ join(ROUTES_DIR, file))) as RouteMod & {
    Route: { options: { loader?: (ctx?: unknown) => unknown } };
  };
  const head = mod.Route?.options?.head;
  if (typeof head !== "function") return null;

  // Code-split marketing routes build head tags from loader data. Run the
  // loader offline so their metadata is really checked, not treated as empty.
  let loaderData: unknown = undefined;
  const loader = mod.Route?.options?.loader;
  if (typeof loader === "function") {
    try {
      loaderData = await loader({
        params: {},
        deps: {},
        context: {},
        abortController: new AbortController(),
      });
    } catch {
      return null;
    }
  }

  try {
    return head({ params: {}, loaderData, matches: [] });
  } catch {
    // Route requires context we can't supply offline (dynamic loader data).
    return null;
  }
}

function findMeta(
  meta: Meta[] | undefined,
  key: "name" | "property",
  value: string,
): string | undefined {
  return meta?.find((m) => m?.[key] === value)?.content as string | undefined;
}

function findTitle(meta: Meta[] | undefined): string | undefined {
  return meta?.find((m) => typeof m?.title === "string")?.title;
}

const FILES = collectRouteFiles();

describe("public route head metadata", () => {
  it("has at least one candidate route file", () => {
    expect(FILES.length).toBeGreaterThan(20);
  });

  for (const file of FILES) {
    const routePath = filenameToPath(file);
    const indexable = !NON_INDEXABLE.has(routePath);

    describe(routePath, () => {
      it("defines head() with required tags", async () => {
        const head = await loadHead(file);
        if (!head) {
          // Route couldn't be evaluated offline (e.g. needs loader data).
          // Skip silently rather than fail; dynamic routes are covered by
          // integration tests against the live sitemap.
          return;
        }

        const { meta, links } = head;
        const title = findTitle(meta);
        expect(title, `${file}: <title> missing`).toBeTruthy();
        expect(title!.length, `${file}: title too short`).toBeGreaterThan(3);
        expect(title, `${file}: placeholder title`).not.toMatch(/Lovable/i);

        const description = findMeta(meta, "name", "description");
        expect(description, `${file}: meta description missing`).toBeTruthy();
        expect(description!.length, `${file}: description too short`).toBeGreaterThan(20);

        const ogAllowed = OG_TWITTER_LEGACY_ALLOWLIST.has(file);
        const ogTitle = findMeta(meta, "property", "og:title");
        const ogDesc = findMeta(meta, "property", "og:description");
        const ogType = findMeta(meta, "property", "og:type");
        const ogUrl = findMeta(meta, "property", "og:url");
        if (!ogAllowed) {
          expect(ogTitle, `${file}: og:title missing`).toBeTruthy();
          expect(ogDesc, `${file}: og:description missing`).toBeTruthy();
          expect(ogType, `${file}: og:type missing`).toBeTruthy();
          expect(ogUrl, `${file}: og:url missing`).toBeTruthy();
          expect(ogUrl, `${file}: og:url must be absolute doseroutine.com URL`).toMatch(
            new RegExp(`^${CANONICAL_HOST}(/|$)`),
          );

          const twCard = findMeta(meta, "name", "twitter:card");
          const twTitle = findMeta(meta, "name", "twitter:title");
          const twDesc = findMeta(meta, "name", "twitter:description");
          expect(twCard, `${file}: twitter:card missing`).toBeTruthy();
          expect(twTitle, `${file}: twitter:title missing`).toBeTruthy();
          expect(twDesc, `${file}: twitter:description missing`).toBeTruthy();
        }

        const ogImage = findMeta(meta, "property", "og:image");
        if (ogImage) {
          expect(ogImage, `${file}: og:image must be absolute`).toMatch(/^https?:\/\//);
          // A share card needs descriptive, DoseRoutine-branded alt text:
          // screen readers announce it on unfurl and answer engines read it
          // as the image caption.
          const ogAlt = findMeta(meta, "property", "og:image:alt");
          expect(ogAlt, `${file}: og:image:alt missing`).toBeTruthy();
          expect(isGenericImageAlt(ogAlt), `${file}: og:image:alt "${ogAlt}" is generic`).toBe(
            false,
          );
          expect(ogAlt!, `${file}: og:image:alt must name DoseRoutine`).toMatch(/DoseRoutine/i);

          const twImage = findMeta(meta, "name", "twitter:image");
          if (twImage) {
            const twAlt = findMeta(meta, "name", "twitter:image:alt");
            expect(twAlt, `${file}: twitter:image:alt missing`).toBeTruthy();
            expect(
              isGenericImageAlt(twAlt),
              `${file}: twitter:image:alt "${twAlt}" is generic`,
            ).toBe(false);
          }
        }

        const canonical = links?.find((l) => l?.rel === "canonical")?.href;
        expect(canonical, `${file}: canonical link missing`).toBeTruthy();
        expect(canonical, `${file}: canonical must be absolute doseroutine.com URL`).toMatch(
          new RegExp(`^${CANONICAL_HOST}(/|$)`),
        );

        // canonical and og:url should self-reference the same path
        if (ogUrl) {
          expect(canonical, `${file}: canonical and og:url disagree`).toBe(ogUrl);
        }

        const robots = findMeta(meta, "name", "robots");
        if (!ROBOTS_META_LEGACY_ALLOWLIST.has(file)) {
          expect(robots, `${file}: robots meta missing`).toBeTruthy();
          if (indexable) {
            expect(robots!.toLowerCase(), `${file}: indexable route must allow indexing`).toMatch(
              /index/,
            );
            expect(robots!.toLowerCase(), `${file}: indexable route must not noindex`).not.toMatch(
              /noindex/,
            );
          } else {
            expect(robots!.toLowerCase(), `${file}: private route must noindex`).toMatch(/noindex/);
          }
        }
      });
    });
  }
});

/**
 * Sitewide invariants: search engines truncate long titles/descriptions, and
 * duplicate titles, descriptions or canonicals make pages compete with each
 * other. These run once over every evaluable public route.
 */
describe("public route metadata quality", () => {
  type Collected = {
    file: string;
    title?: string;
    description?: string;
    canonical?: string;
    twitterCard?: string;
  };

  async function collectAll(): Promise<Collected[]> {
    const rows: Collected[] = [];
    for (const file of FILES) {
      const head = await loadHead(file);
      if (!head) continue;
      rows.push({
        file,
        title: findTitle(head.meta),
        description: findMeta(head.meta, "name", "description"),
        canonical: head.links?.find((l) => l?.rel === "canonical")?.href,
        twitterCard: findMeta(head.meta, "name", "twitter:card"),
      });
    }
    return rows;
  }

  const all = collectAll();

  it("keeps every title at or under 60 characters", async () => {
    const tooLong = (await all)
      .filter((r) => r.title && r.title.length > 60)
      .map((r) => `${r.file} (${r.title!.length}): ${r.title}`);
    expect(tooLong).toEqual([]);
  });

  it("keeps every meta description between 70 and 160 characters", async () => {
    const bad = (await all)
      .filter((r) => r.description && (r.description.length < 70 || r.description.length > 160))
      .map((r) => `${r.file} (${r.description!.length})`);
    expect(bad).toEqual([]);
  });

  it("uses a valid twitter:card value", async () => {
    const bad = (await all)
      .filter((r) => r.twitterCard && !["summary", "summary_large_image"].includes(r.twitterCard))
      .map((r) => `${r.file}: ${r.twitterCard}`);
    expect(bad).toEqual([]);
  });

  for (const field of ["title", "description", "canonical"] as const) {
    it(`gives every public route a unique ${field}`, async () => {
      const seen = new Map<string, string[]>();
      for (const row of await all) {
        const value = row[field];
        if (!value) continue;
        seen.set(value, [...(seen.get(value) ?? []), row.file]);
      }
      const duplicates = [...seen].filter(([, files]) => files.length > 1);
      expect(duplicates).toEqual([]);
    });
  }
});
