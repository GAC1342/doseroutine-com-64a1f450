import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  ALLOWED_IMAGE_EXTENSIONS,
  LEGACY_RASTER_EXTENSIONS,
  OG_CARD_HEIGHT,
  OG_CARD_MAX_BYTES,
  OG_CARD_WIDTH,
  auditImgTag,
  extractImgTags,
} from "@/lib/image-optimization";

/**
 * Static half of the /articles image guard. It reads the source that renders
 * article pages and fails when an <img> ships without the attributes that keep
 * mobile downloads small and layout stable. The rendered half lives in
 * e2e/articles-images.spec.ts.
 */

/** Every source file that can emit an image on an /articles URL. */
const ARTICLE_SOURCES = [
  "src/routes/articles.index.tsx",
  "src/routes/articles.$slug.tsx",
  "src/components/local-article-view.tsx",
];

const OG_DIR = "public/og/articles";

/** Reads a PNG's IHDR box — avoids a runtime image dependency in unit tests. */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("/articles images — source lint", () => {
  for (const file of ARTICLE_SOURCES) {
    it(`${file} declares alt/width/height/loading/decoding on every <img>`, () => {
      const source = readFileSync(file, "utf8");
      const failures = extractImgTags(source)
        .map(auditImgTag)
        .filter((audit) => audit.missing.length > 0 || audit.problems.length > 0)
        .map(
          (audit) =>
            `${audit.tag}\n    missing: ${audit.missing.join(", ") || "none"}` +
            `\n    problems: ${audit.problems.join("; ") || "none"}`,
        );

      expect(failures, `${file}\n  ${failures.join("\n  ")}`).toEqual([]);
    });
  }

  it("the first-party article hero is eager with fetchPriority so it can be the LCP element", () => {
    const source = readFileSync("src/components/local-article-view.tsx", "utf8");
    const hero = extractImgTags(source).find((tag) => tag.includes("hero.src"));
    expect(hero, "expected a hero <img> in local-article-view.tsx").toBeTruthy();
    expect(hero).toMatch(/loading="eager"/);
    expect(hero).toMatch(/fetchPriority="high"/);
    expect(hero).toMatch(/sizes=\{hero\.sizes\}/);
  });

  it("the article hero is preloaded as the LCP image with a responsive srcset", () => {
    const source = readFileSync("src/routes/articles.$slug.tsx", "utf8");
    const preload = /rel: "preload"[\s\S]*?\}/.exec(source)?.[0];
    expect(preload, "expected a hero preload link in articles.$slug.tsx").toBeTruthy();
    expect(preload).toMatch(/hero\.preloadHref/);
    expect(preload).toMatch(/imagesrcset/);
    expect(preload).toMatch(/fetchpriority: "high"/);
  });

  it("article list thumbnails lazy-load", () => {
    const source = readFileSync("src/routes/articles.index.tsx", "utf8");
    const thumbs = extractImgTags(source);
    expect(thumbs.length).toBeGreaterThan(0);
    for (const tag of thumbs) expect(tag).toMatch(/loading="lazy"/);
  });

  it("markdown bodies render images through the optimized renderer", () => {
    const source = readFileSync("src/components/local-article-view.tsx", "utf8");
    // ReactMarkdown emits a bare <img> unless an `img` component is supplied.
    expect(source).toMatch(/img:\s*\(\{/);
  });
});

describe("/articles images — asset budget", () => {
  const cards = readdirSync(OG_DIR).filter((f) => !f.startsWith("."));

  it("social cards exist", () => {
    expect(cards.length).toBeGreaterThan(0);
    expect(existsSync(join(OG_DIR, "default.png"))).toBe(true);
  });

  for (const card of readdirSync(OG_DIR).filter((f) => !f.startsWith("."))) {
    const path = join(OG_DIR, card);

    it(`${card} uses an allowed format`, () => {
      expect(
        ALLOWED_IMAGE_EXTENSIONS.some((ext) => card.toLowerCase().endsWith(ext)),
        `${card} is not one of ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`,
      ).toBe(true);
    });

    // Only PNG carries a byte layout we can read without an image dependency;
    // the webp/avif siblings are generated from the same source PNG.
    if (card.toLowerCase().endsWith(".png")) {
      it(`${card} is exactly ${OG_CARD_WIDTH}x${OG_CARD_HEIGHT}`, () => {
        const { width, height } = pngSize(path);
        expect({ width, height }).toEqual({ width: OG_CARD_WIDTH, height: OG_CARD_HEIGHT });
      });

      it(`${card} has webp and avif siblings`, () => {
        const base = path.slice(0, -4);
        expect(existsSync(`${base}.webp`), `${base}.webp missing`).toBe(true);
        expect(existsSync(`${base}.avif`), `${base}.avif missing`).toBe(true);
      });
    }

    it(`${card} stays under the ${OG_CARD_MAX_BYTES / 1000}kB budget`, () => {
      const bytes = statSync(path).size;
      expect(bytes, `${card} is ${Math.round(bytes / 1000)}kB`).toBeLessThanOrEqual(
        OG_CARD_MAX_BYTES,
      );
    });
  }

  it("no legacy raster inline images are hardcoded in article sources", () => {
    for (const file of ARTICLE_SOURCES) {
      const source = readFileSync(file, "utf8");
      for (const tag of extractImgTags(source)) {
        const literal = /src="([^"]+)"/.exec(tag)?.[1];
        if (!literal) continue; // dynamic src — covered by the browser check
        const isLegacy = LEGACY_RASTER_EXTENSIONS.some((ext) =>
          literal.toLowerCase().endsWith(ext),
        );
        expect(isLegacy, `${file} inlines ${literal}; use webp or a ResponsiveImage`).toBe(false);
      }
    }
  });
});
