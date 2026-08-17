import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";

/**
 * Guard for the responsive-image work. Content imagery must keep shipping
 * WebP candidates and an explicit `sizes` hint — without `sizes` the browser
 * assumes 100vw and happily downloads the 1200px file onto a phone.
 */
const PAGES = [
  "src/routes/library.retatrutide-dosage.tsx",
  "src/routes/library.cjc-1295-ipamorelin.tsx",
  "src/routes/install.tsx",
  "src/routes/promo-kit.tsx",
];

const HERO_VARIANTS = [
  "public/og/retatrutide-dosage-640.webp",
  "public/og/retatrutide-dosage-960.webp",
  "public/og/retatrutide-dosage-1200.webp",
  "public/og/retatrutide-dosage-640.jpg",
  "public/og/retatrutide-dosage-960.jpg",
  "public/og/cjc-1295-ipamorelin-640.webp",
  "public/og/cjc-1295-ipamorelin-960.webp",
  "public/og/cjc-1295-ipamorelin-1200.webp",
  "public/og/cjc-1295-ipamorelin-640.jpg",
  "public/og/cjc-1295-ipamorelin-960.jpg",
];

describe("responsive content images", () => {
  for (const page of PAGES) {
    it(`${page} uses ResponsiveImage with webp + sizes`, () => {
      const src = readFileSync(page, "utf8");
      expect(src).toContain("ResponsiveImage");
      expect(src).toMatch(/webpSrcSet=/);
      expect(src).toMatch(/sizes="/);
    });
  }

  for (const file of HERO_VARIANTS) {
    it(`${file} exists`, () => {
      expect(existsSync(file)).toBe(true);
    });
  }

  it("guide heroes are preloaded as webp with a matching srcset", () => {
    for (const page of PAGES.slice(0, 2)) {
      const src = readFileSync(page, "utf8");
      expect(src).toContain('rel: "preload"');
      expect(src).toContain("imageSrcSet:");
      expect(src).toContain('type: "image/webp"');
    }
  });

  it("ResponsiveImage lazy-loads by default and requires alt", () => {
    const src = readFileSync("src/components/responsive-image.tsx", "utf8");
    expect(src).toContain('loading = "lazy"');
    expect(src).toMatch(/alt: string;/);
    expect(src).toContain('decoding="async"');
  });
});
