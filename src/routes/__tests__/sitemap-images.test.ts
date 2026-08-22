import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROUNDUP_LIST, USE_CASE_LIST } from "@/lib/app-roundups";
import { CALCULATOR_PAGES } from "@/lib/compound-calculators";
import { FEATURE_VISUALS } from "@/lib/feature-visuals";
import { BASE_URL, sitemapImageFor, sitemapImagePaths } from "@/lib/sitemap-images";

const ROOT = path.resolve(__dirname, "../../..");
/** Uploaded feature renders live on the asset CDN, not in public/. */
const CDN_PREFIX = "/__l5e/";

/** Paths that must carry a unique branded image in the XML sitemap. */
const REQUIRED_PATHS = [
  ...ROUNDUP_LIST.map((r) => `/${r.slug}`),
  ...USE_CASE_LIST.map((u) => `/for/${u.slug}`),
  ...CALCULATOR_PAGES.map((c) => `/calculators/${c.slug}`),
];

describe("sitemap image entries", () => {
  it.each(REQUIRED_PATHS)("%s has a branded image entry", (urlPath) => {
    const image = sitemapImageFor(urlPath);
    expect(image, `${urlPath} is missing a sitemap image`).not.toBeNull();
    expect(image!.loc.startsWith(`${BASE_URL}/og/`)).toBe(true);
    expect(image!.title?.length).toBeGreaterThan(5);
    expect(image!.caption?.length).toBeGreaterThan(20);
  });

  it("every locally hosted mapped image file exists on disk", () => {
    const missing = sitemapImagePaths()
      .map((p) => sitemapImageFor(p)!.loc.replace(BASE_URL, ""))
      // CDN-hosted assets (uploaded feature renders) are not in public/.
      .filter((loc) => !loc.startsWith(CDN_PREFIX))
      .filter((loc) => !existsSync(path.join(ROOT, "public", loc)));
    expect(missing).toEqual([]);
  });

  it("reuses a CDN image only across URLs that share the same feature", () => {
    for (const visual of FEATURE_VISUALS.filter((v) => v.socialPaths.length > 0)) {
      const locs = visual.socialPaths.map((p) => sitemapImageFor(p)?.loc);
      expect(new Set(locs).size, `${visual.id} should map one image`).toBe(1);
      expect(locs[0]).toBeTruthy();
    }
  });

  it("uses a distinct image per URL outside shared feature renders", () => {
    const featurePaths = new Set(FEATURE_VISUALS.flatMap((v) => v.socialPaths));
    const locs = sitemapImagePaths()
      .filter((p) => !featurePaths.has(p))
      .map((p) => sitemapImageFor(p)!.loc);
    expect(new Set(locs).size).toBe(locs.length);
  });

  it("captions stay snippet-sized", () => {
    for (const p of sitemapImagePaths()) {
      expect(sitemapImageFor(p)!.caption!.length).toBeLessThanOrEqual(201);
    }
  });
});
