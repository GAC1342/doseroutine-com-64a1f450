import { describe, expect, it } from "vitest";

import {
  MIME_BY_FORMAT,
  auditEagerCount,
  auditLoadingStrategy,
  auditPictureFormats,
  type LoadingStrategy,
  type PictureAuditInput,
} from "@/lib/image-optimization";

function strategy(overrides: Partial<LoadingStrategy> = {}): LoadingStrategy {
  return {
    role: "content",
    loading: "lazy",
    fetchPriority: "low",
    decoding: "async",
    ...overrides,
  };
}

describe("auditLoadingStrategy", () => {
  it("accepts an eager, high-priority hero", () => {
    expect(
      auditLoadingStrategy(strategy({ role: "hero", loading: "eager", fetchPriority: "high" })),
    ).toEqual([]);
  });

  it("rejects a lazy hero and a hero without high priority", () => {
    const lazyHero = auditLoadingStrategy(strategy({ role: "hero", fetchPriority: "high" }));
    expect(lazyHero.join()).toContain('hero must use loading="eager"');
    const lowHero = auditLoadingStrategy(strategy({ role: "hero", loading: "eager" }));
    expect(lowHero.join()).toContain('hero must use fetchPriority="high"');
  });

  it("accepts lazy thumbnails and content images", () => {
    expect(auditLoadingStrategy(strategy({ role: "thumbnail" }))).toEqual([]);
    expect(auditLoadingStrategy(strategy({ fetchPriority: null }))).toEqual([]);
  });

  it("rejects an eager non-hero and a non-hero claiming high priority", () => {
    expect(auditLoadingStrategy(strategy({ loading: "eager" })).join()).toContain(
      'content must use loading="lazy"',
    );
    expect(auditLoadingStrategy(strategy({ fetchPriority: "high" })).join()).toContain(
      'must not claim fetchPriority="high"',
    );
  });

  it("treats an unset loading attribute as eager, because that is the HTML default", () => {
    expect(auditLoadingStrategy(strategy({ loading: null })).join()).toContain('found "unset"');
  });

  it("requires async decoding everywhere", () => {
    expect(auditLoadingStrategy(strategy({ decoding: "sync" })).join()).toContain(
      'decoding must be "async"',
    );
  });

  it("cross-checks the declared role against real geometry", () => {
    expect(
      auditLoadingStrategy(
        strategy({ role: "hero", loading: "lazy", fetchPriority: "high", aboveFold: true }),
      ).join(),
    ).toContain("above-the-fold hero is lazy-loaded");
    expect(
      auditLoadingStrategy(strategy({ fetchPriority: "high", aboveFold: false })).join(),
    ).toContain("below-the-fold image claims high fetch priority");
  });
});

describe("auditEagerCount", () => {
  it("allows exactly one LCP candidate", () => {
    expect(
      auditEagerCount([strategy({ role: "hero", fetchPriority: "high" }), strategy()]),
    ).toEqual([]);
  });

  it("flags competing high-priority images", () => {
    const issues = auditEagerCount([
      strategy({ fetchPriority: "high" }),
      strategy({ fetchPriority: "High" }),
    ]);
    expect(issues.join()).toContain('2 images claim fetchPriority="high"');
  });
});

describe("auditPictureFormats", () => {
  function picture(overrides: Partial<PictureAuditInput> = {}): PictureAuditInput {
    return {
      sources: [
        { type: "image/avif", srcSet: "/hero.avif 1x, /hero@2x.avif 2x" },
        { type: "image/webp", srcSet: "/hero.webp 1x, /hero@2x.webp 2x" },
      ],
      fallbackSrc: "/hero.jpg",
      fallbackFormat: "jpg",
      decoding: "async",
      ...overrides,
    };
  }

  it("accepts avif + webp sources with a jpeg fallback", () => {
    expect(auditPictureFormats(picture())).toEqual([]);
    expect(auditPictureFormats(picture({ fallbackFormat: "png", fallbackSrc: "/h.png" }))).toEqual(
      [],
    );
  });

  it("requires both modern formats", () => {
    const noAvif = auditPictureFormats(
      picture({ sources: [{ type: "image/webp", srcSet: "/hero.webp" }] }),
    );
    expect(noAvif).toContain('missing <source type="image/avif">');
    const noWebp = auditPictureFormats(
      picture({ sources: [{ type: "image/avif", srcSet: "/hero.avif" }] }),
    );
    expect(noWebp).toContain('missing <source type="image/webp">');
  });

  it("rejects an empty srcSet and a source without a type attribute", () => {
    expect(
      auditPictureFormats(
        picture({
          sources: [
            { type: "image/avif", srcSet: "  " },
            { type: null, srcSet: "/hero.webp" },
          ],
        }),
      ).join(),
    ).toContain("empty srcSet");
    expect(
      auditPictureFormats(
        picture({
          sources: [
            { type: "image/avif", srcSet: "/a.avif" },
            { type: "image/webp", srcSet: "/a.webp" },
            { type: null, srcSet: "/a.png" },
          ],
        }),
      ),
    ).toContain("every <source> must declare a type attribute");
  });

  it("requires avif before webp", () => {
    expect(
      auditPictureFormats(
        picture({
          sources: [
            { type: "image/webp", srcSet: "/a.webp" },
            { type: "image/avif", srcSet: "/a.avif" },
          ],
        }),
      ).join(),
    ).toContain("AVIF <source> must come before WebP");
  });

  it("requires a universally supported <img> fallback", () => {
    expect(auditPictureFormats(picture({ fallbackSrc: null }))).toContain(
      "<picture> has no <img> fallback",
    );
    expect(
      auditPictureFormats(picture({ fallbackFormat: "webp", fallbackSrc: "/h.webp" })).join(),
    ).toContain('fallback is "webp"');
  });

  it("requires async decoding on the fallback img", () => {
    expect(auditPictureFormats(picture({ decoding: null })).join()).toContain(
      'must set decoding="async"',
    );
  });

  it("maps every supported format to the right MIME type", () => {
    expect(MIME_BY_FORMAT["avif"]).toBe("image/avif");
    expect(MIME_BY_FORMAT["jpg"]).toBe("image/jpeg");
  });
});
