import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROUNDUP_LIST, USE_CASE_LIST } from "@/lib/app-roundups";
import { CALCULATOR_PAGES } from "@/lib/compound-calculators";
import { BASE_URL, sitemapImageFor, sitemapImagePaths } from "@/lib/sitemap-images";

const ROOT = path.resolve(__dirname, "../../..");

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

  it("every mapped image file exists on disk", () => {
    const missing = sitemapImagePaths()
      .map((p) => sitemapImageFor(p)!.loc.replace(BASE_URL, ""))
      .filter((loc) => !existsSync(path.join(ROOT, "public", loc)));
    expect(missing).toEqual([]);
  });

  it("uses a distinct image per URL (no shared fallback card)", () => {
    const locs = sitemapImagePaths().map((p) => sitemapImageFor(p)!.loc);
    expect(new Set(locs).size).toBe(locs.length);
  });

  it("captions stay snippet-sized", () => {
    for (const p of sitemapImagePaths()) {
      expect(sitemapImageFor(p)!.caption!.length).toBeLessThanOrEqual(201);
    }
  });
});
