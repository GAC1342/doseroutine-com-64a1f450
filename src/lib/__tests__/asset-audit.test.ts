import { describe, expect, it } from "vitest";

import {
  ASSET_BUDGETS,
  MAX_PAGE_TRANSFER_BYTES,
  auditAsset,
  auditHero,
  auditPage,
  formatAssetReport,
  formatBytes,
  rankFindings,
  renderAuditMarkdown,
  type AuditedAsset,
  type HeroInfo,
} from "../asset-audit";

const asset = (over: Partial<AuditedAsset> = {}): AuditedAsset => ({
  url: "https://doseroutine.com/img/photo.webp",
  kind: "image",
  bytes: 50_000,
  durationMs: 200,
  ...over,
});

const goodHero = (over: Partial<HeroInfo> = {}): HeroInfo => ({
  url: "https://doseroutine.com/img/hero.webp",
  bytes: 90_000,
  durationMs: 300,
  loading: "eager",
  fetchPriority: "high",
  hasDimensions: true,
  preloaded: true,
  naturalWidth: 780,
  naturalHeight: 440,
  displayWidth: 390,
  displayHeight: 220,
  devicePixelRatio: 2,
  hasModernSource: true,
  ...over,
});

describe("auditAsset", () => {
  it("passes an asset comfortably inside budget", () => {
    expect(auditAsset(asset())).toEqual([]);
  });

  it("fails an over-budget image", () => {
    const findings = auditAsset(asset({ bytes: ASSET_BUDGETS.image.maxBytes + 1 }));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("fail");
    expect(findings[0].message).toContain("exceeds the image budget");
  });

  it("fails a slow asset even when it is small", () => {
    const findings = auditAsset(asset({ bytes: 10_000, durationMs: 2_000 }));
    expect(findings.map((f) => f.severity)).toEqual(["fail"]);
    expect(findings[0].message).toContain("2000ms");
  });

  it("warns inside the 80-100% band and not below it", () => {
    const warn = auditAsset(asset({ bytes: ASSET_BUDGETS.image.maxBytes * 0.85 }));
    expect(warn.map((f) => f.severity)).toEqual(["warn"]);
    expect(auditAsset(asset({ bytes: ASSET_BUDGETS.image.maxBytes * 0.79 }))).toEqual([]);
  });

  it("uses the per-type budget for fonts", () => {
    const findings = auditAsset(asset({ kind: "font", bytes: 70_000 }));
    expect(findings[0].message).toContain("font budget");
  });

  it("warns on render-blocking non-stylesheet requests", () => {
    const findings = auditAsset(asset({ kind: "script", bytes: 1_000, renderBlocking: true }));
    expect(findings).toEqual([expect.objectContaining({ severity: "warn" })]);
  });

  it("honours route overrides for the articles index page weight", () => {
    const assets = [asset({ bytes: 1_300_000, kind: "other", url: "/bundle" })];
    expect(auditPage({ path: "/articles", assets, hero: null }).passed).toBe(false); // asset budget
    const spread = Array.from({ length: 13 }, (_, i) =>
      asset({ url: `/chunk-${i}.js`, kind: "script", bytes: 100_000 }),
    );
    expect(auditPage({ path: "/articles", assets: spread, hero: null }).failures).toEqual([]);
    expect(auditPage({ path: "/articles/x", assets: spread, hero: null }).failures).toHaveLength(1);
  });
});

describe("auditHero", () => {
  it("passes a well-configured hero", () => {
    expect(auditHero(goodHero())).toEqual([]);
  });

  it.each([
    ["lazy-loaded", { loading: "lazy" }, "lazy-loaded"],
    ["missing dimensions", { hasDimensions: false }, "no width/height"],
    ["missing priority", { fetchPriority: null }, "fetchpriority"],
    ["not preloaded", { preloaded: false }, "not preloaded"],
  ])("fails when the hero is %s", (_label, patch, expected) => {
    const findings = auditHero(goodHero(patch as Partial<HeroInfo>));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain(expected);
  });

  it("fails a legacy format with no modern sibling", () => {
    const findings = auditHero(
      goodHero({ url: "https://doseroutine.com/img/hero.jpg", hasModernSource: false }),
    );
    expect(findings[0].message).toContain("legacy format");
  });

  it("accepts a legacy extension when a modern source exists", () => {
    expect(auditHero(goodHero({ url: "/img/hero.jpg", hasModernSource: true }))).toEqual([]);
  });

  it("fails a hero downloading more than 2x the pixels it displays", () => {
    const findings = auditHero(goodHero({ naturalWidth: 2_400, naturalHeight: 1_400 }));
    expect(findings[0].message).toContain("more pixels than it displays");
  });
});

describe("auditPage", () => {
  it("fails when total transfer exceeds the page budget", () => {
    const assets = Array.from({ length: 10 }, (_, i) =>
      asset({ url: `/chunk-${i}.js`, kind: "script", bytes: 130_000 }),
    );
    const result = auditPage({ path: "/articles/test", assets, hero: null });
    expect(result.totalBytes).toBeGreaterThan(MAX_PAGE_TRANSFER_BYTES);
    expect(result.failures.some((f) => f.message.includes("page transfers"))).toBe(true);
    expect(result.passed).toBe(false);
  });

  it("warns about eager below-the-fold images but never about the hero", () => {
    const hero = goodHero();
    const result = auditPage({
      path: "/articles/test",
      assets: [],
      hero,
      offscreenImages: [
        { url: hero.url, loading: "eager", aboveFold: true },
        { url: "/img/chart.webp", loading: "eager", aboveFold: false },
        { url: "/img/foot.webp", loading: "lazy", aboveFold: false },
      ],
    });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].url).toBe("/img/chart.webp");
    expect(result.passed).toBe(true);
  });
});

describe("reporting", () => {
  it("ranks failures above warnings, heaviest first", () => {
    const ranked = rankFindings([
      { severity: "warn", url: "a", kind: "image", bytes: 900, durationMs: 0, message: "w" },
      { severity: "fail", url: "b", kind: "image", bytes: 10, durationMs: 0, message: "f1" },
      { severity: "fail", url: "c", kind: "image", bytes: 500, durationMs: 0, message: "f2" },
    ]);
    expect(ranked.map((f) => f.url)).toEqual(["c", "b", "a"]);
  });

  it("formats bytes readably", () => {
    expect(formatBytes(412_000)).toBe("412 KB");
    expect(formatBytes(1_400_000)).toBe("1.4 MB");
    expect(formatBytes(640)).toBe("640 B");
  });

  it("renders a page report and a markdown summary", () => {
    const result = auditPage({
      path: "/articles/test",
      assets: [asset({ bytes: 400_000, url: "https://doseroutine.com/img/hero.jpg" })],
      hero: null,
    });
    expect(formatAssetReport(result)).toContain("FAIL");
    const markdown = renderAuditMarkdown([result]);
    expect(markdown).toContain("# Asset audit");
    expect(markdown).toContain("/articles/test");
  });
});
