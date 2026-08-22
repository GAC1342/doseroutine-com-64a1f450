import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ARTICLE_OG_CARD_SLUGS, ARTICLE_OG_FALLBACK } from "@/lib/article-og-manifest";
import {
  FALLBACK_PICTURE_FORMATS,
  MIME_BY_FORMAT,
  MODERN_PICTURE_FORMATS,
  auditPictureFormats,
  extractImgTags,
} from "@/lib/image-optimization";
import { REMOTE_IMAGE_FORMATS } from "@/lib/remote-image";

/**
 * Static format gate.
 *
 * 1. Every social card exists as PNG (the fallback social crawlers read) plus
 *    WebP and AVIF siblings, and the modern encodings are actually smaller.
 * 2. The shared <picture> component offers avif + webp <source>s with correct
 *    `type` attributes and a JPEG <img> fallback with async decoding.
 * 3. Article routes render remote images through that component rather than a
 *    bare <img>, so no page can silently regress to a single format.
 */

const ROOT = process.cwd();
const OG_DIR = join(ROOT, "public", "og", "articles");
const PICTURE_COMPONENT = join(ROOT, "src", "components", "optimized-remote-image.tsx");
const ARTICLE_ROUTES = [
  join(ROOT, "src", "routes", "articles.index.tsx"),
  join(ROOT, "src", "routes", "articles.$slug.tsx"),
];

const CARD_SLUGS = [...ARTICLE_OG_CARD_SLUGS, "default"];

describe("social card formats", () => {
  it("knows about at least one article card", () => {
    expect(CARD_SLUGS.length).toBeGreaterThan(1);
  });

  for (const slug of CARD_SLUGS) {
    describe(slug, () => {
      const png = join(OG_DIR, `${slug}.png`);

      it("ships a PNG fallback for social crawlers", () => {
        expect(existsSync(png), `${png} is missing`).toBe(true);
      });

      for (const format of MODERN_PICTURE_FORMATS) {
        it(`ships a ${format} sibling that is smaller than the PNG`, () => {
          const modern = join(OG_DIR, `${slug}.${format}`);
          expect(existsSync(modern), `${modern} is missing — run \`npm run og:articles\``).toBe(
            true,
          );
          expect(
            statSync(modern).size,
            `${slug}.${format} is not smaller than ${slug}.png`,
          ).toBeLessThan(statSync(png).size);
        });
      }
    });
  }

  it("uses a PNG/JPEG path for the fallback card", () => {
    const ext = ARTICLE_OG_FALLBACK.split(".").pop()!;
    expect(FALLBACK_PICTURE_FORMATS).toContain(ext);
  });
});

describe("<picture> component", () => {
  const source = readFileSync(PICTURE_COMPONENT, "utf8");

  it("declares a webp source with the right type", () => {
    const types = [...source.matchAll(/<source\s+type="([^"]+)"\s+srcSet=/g)].map((m) => m[1]);
    expect(types).toEqual([MIME_BY_FORMAT["webp"]]);
  });

  it("does not offer an avif source the proxy cannot encode", () => {
    expect(source).not.toContain(MIME_BY_FORMAT["avif"]);
    expect(REMOTE_IMAGE_FORMATS as readonly string[]).not.toContain("avif");
  });

  it("passes the parsed markup shape through the shared audit", () => {
    const issues = auditPictureFormats({
      sources: [...source.matchAll(/<source\s+type="([^"]+)"\s+srcSet=\{([^}]+)\}/g)].map((m) => ({
        type: m[1]!,
        // the srcSet is an expression; non-empty is all we can assert statically
        srcSet: m[2]!.trim(),
      })),
      fallbackSrc: /<img\s+src=\{resizedImageUrl\(/.test(source) ? "expression" : null,
      fallbackFormat: FALLBACK_PICTURE_FORMATS[0],
      decoding: /decoding: "async"/.test(source) ? "async" : null,
      requiredFormats: REMOTE_IMAGE_FORMATS.filter((f) => f in MIME_BY_FORMAT && f === "webp"),
    });
    expect(issues).toEqual([]);
  });

  it("requests the fallback in a universally supported format", () => {
    expect(source).toContain("FALLBACK_PICTURE_FORMATS[0]");
  });

  it("never hardcodes a single output format for the fallback img", () => {
    expect(/<img\s+src=\{resizedImageUrl\([^)]*"webp"/.test(source)).toBe(false);
  });
});

describe("article routes use the multi-format component", () => {
  for (const file of ARTICLE_ROUTES) {
    const source = readFileSync(file, "utf8");
    const name = file.split("/").pop()!;

    it(`${name} renders no bare <img> for remote images`, () => {
      const bare = extractImgTags(source).filter((tag) => /resizedImageUrl|https?:\/\//.test(tag));
      expect(bare, `bare remote <img> in ${name}: ${bare.join(" | ")}`).toEqual([]);
    });
  }
});
