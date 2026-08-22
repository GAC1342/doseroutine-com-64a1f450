import { describe, expect, it } from "vitest";

import {
  auditImgTag,
  auditRenderedImage,
  extractImgTags,
  type RenderedImage,
} from "@/lib/image-optimization";

/**
 * Proves the gate actually fails. Without these, a bug in the auditor would
 * make every /articles image check pass silently.
 */

const goodImage: RenderedImage = {
  src: "https://doseroutine.com/og/articles/default.png",
  naturalWidth: 400,
  naturalHeight: 400,
  displayWidth: 200,
  displayHeight: 200,
  loading: "lazy",
  decoding: "async",
  alt: "A card",
  hasDimensions: true,
  aboveFold: false,
};

describe("extractImgTags", () => {
  it("captures JSX img tags containing braces and nested >", () => {
    const source = `<div><img src={a} alt="x" className={cn("a>b")} /></div><img src="b.png">`;
    expect(extractImgTags(source)).toHaveLength(2);
  });
});

describe("auditImgTag", () => {
  it("passes a fully specified tag", () => {
    const audit = auditImgTag(
      '<img src={x} alt="hero" width={96} height={96} loading="lazy" decoding="async" />',
    );
    expect(audit.missing).toEqual([]);
    expect(audit.problems).toEqual([]);
  });

  it("flags missing dimensions and loading", () => {
    const audit = auditImgTag('<img src="a.webp" alt="a" decoding="async" />');
    expect(audit.missing).toEqual(expect.arrayContaining(["width", "height", "loading"]));
  });

  it("requires sizes on full-width images", () => {
    const audit = auditImgTag(
      '<img src={x} alt="a" width={1200} height={630} loading="lazy" decoding="async" className="w-full" />',
    );
    expect(audit.problems.join()).toContain("sizes");
  });
});

describe("auditRenderedImage", () => {
  it("accepts a correctly sized lazy image", () => {
    expect(auditRenderedImage(goodImage, 2)).toEqual([]);
  });

  it("rejects an oversized download", () => {
    const issues = auditRenderedImage({ ...goodImage, naturalWidth: 1280, displayWidth: 96 }, 2);
    expect(issues.join()).toContain("oversized");
  });

  it("rejects a lazy hero above the fold", () => {
    const issues = auditRenderedImage({ ...goodImage, aboveFold: true }, 2);
    expect(issues.join()).toContain("lazy-loaded");
  });

  it("rejects a below-fold image that is not lazy", () => {
    const issues = auditRenderedImage({ ...goodImage, loading: null }, 2);
    expect(issues.join()).toContain("not lazy-loaded");
  });

  it("rejects missing alt, dimensions and sync decoding", () => {
    const issues = auditRenderedImage(
      { ...goodImage, alt: null, hasDimensions: false, decoding: null },
      2,
    );
    expect(issues).toHaveLength(3);
  });

  it("rejects a disallowed format but accepts a proxy that declares webp output", () => {
    expect(auditRenderedImage({ ...goodImage, src: "/x/photo.gif" }, 2).join()).toContain(
      "unsupported image format",
    );
    expect(
      auditRenderedImage({ ...goodImage, src: "https://wsrv.nl/?url=a.webp&output=webp" }, 2),
    ).toEqual([]);
  });
});
