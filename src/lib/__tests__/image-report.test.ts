import { describe, expect, it } from "vitest";

import {
  buildImageReport,
  deliveredFormat,
  estimateBytesSaved,
  oversizeRatio,
  renderImageReportMarkdown,
  type ReportImage,
} from "@/lib/image-report";

function img(overrides: Partial<ReportImage> = {}): ReportImage {
  return {
    src: "https://wsrv.nl/?url=cdn.cms.ai%2Fhero.png&w=768&output=webp",
    format: "webp",
    naturalWidth: 768,
    naturalHeight: 403,
    displayWidth: 384,
    displayHeight: 202,
    transferBytes: 40_000,
    loading: "eager",
    fetchPriority: "high",
    aboveFold: true,
    issues: [],
    ...overrides,
  };
}

describe("deliveredFormat", () => {
  it("prefers the proxy output param over the path extension", () => {
    expect(deliveredFormat("https://wsrv.nl/?url=x.png&output=avif")).toBe("avif");
  });

  it("falls back to the extension and normalizes jpeg", () => {
    expect(deliveredFormat("/og/articles/pill.png")).toBe("png");
    expect(deliveredFormat("/photo.JPEG")).toBe("jpg");
    expect(deliveredFormat("/api/image")).toBe("unknown");
  });
});

describe("estimateBytesSaved", () => {
  it("is zero for a correctly sized modern image", () => {
    expect(estimateBytesSaved(img())).toBe(0);
  });

  it("scales the saving with the squared oversize ratio", () => {
    // 4x too wide = 16x the pixels, so ~93% of the bytes are waste.
    const saved = estimateBytesSaved(img({ naturalWidth: 1536, displayWidth: 192 }));
    expect(saved).toBe(Math.round(40_000 * (1 - (384 / 1536) ** 2)));
  });

  it("adds a re-encode saving for legacy formats", () => {
    expect(estimateBytesSaved(img({ format: "png" }))).toBe(12_000);
  });

  it("never claims savings on SVG or on unmeasured transfers", () => {
    expect(estimateBytesSaved(img({ format: "svg", naturalWidth: 4000 }))).toBe(0);
    expect(estimateBytesSaved(img({ transferBytes: 0, format: "png" }))).toBe(0);
  });

  it("does not divide by a zero-width box", () => {
    expect(() => estimateBytesSaved(img({ displayWidth: 0 }))).not.toThrow();
  });
});

describe("oversizeRatio", () => {
  it("reports 1 for a perfectly sized image and >1 when oversized", () => {
    expect(oversizeRatio(img())).toBe(1);
    expect(oversizeRatio(img({ naturalWidth: 1536 }))).toBe(2);
    expect(oversizeRatio(img({ displayWidth: 0 }))).toBe(1);
  });
});

describe("buildImageReport", () => {
  const report = buildImageReport(
    [
      { path: "/articles", images: [img({ format: "png", issues: ["missing alt attribute"] })] },
      {
        path: "/articles/pill-reminder-app",
        images: [
          img(),
          img({
            src: "/inline.png",
            format: "png",
            naturalWidth: 1200,
            displayWidth: 300,
            transferBytes: 200_000,
            loading: "lazy",
            fetchPriority: null,
            aboveFold: false,
            issues: ["missing alt attribute", "below-the-fold image is not lazy-loaded"],
          }),
        ],
      },
    ],
    { now: new Date("2026-08-18T00:00:00Z") },
  );

  it("groups rows per article with totals and savings", () => {
    expect(report.pages.map((p) => p.path)).toEqual(["/articles", "/articles/pill-reminder-app"]);
    expect(report.totals.pages).toBe(2);
    expect(report.totals.images).toBe(3);
    expect(report.totals.bytes).toBe(280_000);
    expect(report.totals.potentialSavings).toBeGreaterThan(0);
  });

  it("counts each failed check across the whole run", () => {
    const alt = report.checkCounts.find((c) => c.check === "missing alt attribute");
    expect(alt?.count).toBe(2);
    expect(report.totals.failedImages).toBe(2);
    expect(report.totals.failedPages).toBe(2);
  });

  it("marks passing images and lists per-page failed checks", () => {
    const page = report.pages[1]!;
    expect(page.images[0]!.passed).toBe(true);
    expect(page.images[1]!.passed).toBe(false);
    expect(page.failedChecks).toContain("below-the-fold image is not lazy-loaded");
  });

  it("flags a page over the weight budget", () => {
    const heavy = buildImageReport([
      { path: "/articles/heavy", images: [img({ transferBytes: 900_000 })] },
    ]);
    expect(heavy.pages[0]!.overBudget).toBe(true);
    expect(heavy.pages[0]!.failedChecks.join()).toContain("over budget");
  });

  it("produces a clean report when everything passes", () => {
    const clean = buildImageReport([{ path: "/articles", images: [img()] }]);
    expect(clean.checkCounts).toEqual([]);
    expect(clean.totals.failedPages).toBe(0);
    expect(renderImageReportMarkdown(clean)).toContain("All image checks passed.");
  });
});

describe("renderImageReportMarkdown", () => {
  const md = renderImageReportMarkdown(
    buildImageReport([
      {
        path: "/articles/pill-reminder-app",
        images: [img({ format: "png", issues: ["missing alt attribute"] })],
      },
    ]),
  );

  it("names the article, the format, the bytes and the failing check", () => {
    expect(md).toContain("### FAIL `/articles/pill-reminder-app`");
    expect(md).toContain("| missing alt attribute | 1 |");
    expect(md).toContain("40.0kB");
    expect(md).toContain("png");
  });

  it("keeps the table shape (one row per image)", () => {
    const rows = md.split("\n").filter((l) => l.startsWith("| ") && l.includes("kB"));
    expect(rows).toHaveLength(1);
  });
});
