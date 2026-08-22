import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  MAX_PAGE_IMAGE_BYTES,
  auditEagerCount,
  auditLoadingStrategy,
  auditPictureFormats,
  auditRenderedImage,
  formatImageReport,
  type LoadingStrategy,
  type RenderedImage,
} from "../src/lib/image-optimization";
import {
  buildImageReport,
  renderImageReportMarkdown,
  type ReportImage,
  type ReportPage,
} from "../src/lib/image-report";
import { REMOTE_IMAGE_FORMATS } from "../src/lib/remote-image";
import { articlePaths } from "./article-slugs";

/**
 * Rendered image gate for /articles.
 *
 * Loads every articles URL in Chromium at a phone viewport and FAILS when an
 * image downloads far more pixels than it displays, omits width/height, skips
 * lazy loading below the fold, lazy-loads the hero, or pushes the page's total
 * image weight past the budget. Run via `npm run test:articles-images`.
 */

const PATHS = articlePaths();

const ARTIFACT_DIR = join(process.cwd(), "artifacts");
/**
 * Collected across all specs and flushed once in afterAll, so CI gets a single
 * per-article summary (sizes, formats, bytes saved, failing checks) instead of
 * having to read every failure message in the log.
 */
const reportPages: ReportPage[] = [];

test.describe("/articles responsive images", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  for (const path of PATHS) {
    test(`${path} ships optimized images`, async ({ page }) => {
      // Track transferred image bytes so a page can't quietly balloon.
      const bytesBySrc = new Map<string, number>();
      page.on("response", async (response) => {
        if (!response.request().resourceType().match(/image/)) return;
        const length = Number(response.headers()["content-length"] ?? 0);
        if (length > 0) bytesBySrc.set(response.url(), length);
      });

      await page.goto(path, { waitUntil: "networkidle" });

      const pictures = await page.evaluate(() =>
        Array.from(document.querySelectorAll("picture")).map((picture) => {
          const img = picture.querySelector("img");
          const src = img?.getAttribute("src") ?? null;
          return {
            sources: Array.from(picture.querySelectorAll("source")).map((source) => ({
              type: source.getAttribute("type"),
              srcSet: source.getAttribute("srcset"),
            })),
            fallbackSrc: src,
            fallbackFormat:
              /[?&]output=([a-z0-9]+)/i.exec(src ?? "")?.[1]?.toLowerCase() ??
              /\.([a-z0-9]+)(?:$|\?)/i.exec(src ?? "")?.[1]?.toLowerCase() ??
              null,
            decoding: img?.getAttribute("decoding") ?? null,
          };
        }),
      );

      const images: RenderedImage[] = await page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        return Array.from(document.querySelectorAll("img")).map((img) => {
          const rect = img.getBoundingClientRect();
          return {
            src: img.currentSrc || img.src,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            displayWidth: rect.width,
            displayHeight: rect.height,
            loading: img.getAttribute("loading"),
            decoding: img.getAttribute("decoding"),
            alt: img.getAttribute("alt"),
            hasDimensions:
              img.hasAttribute("width") &&
              img.hasAttribute("height") &&
              // an aspect-ratio box set in CSS is an acceptable substitute
              getComputedStyle(img).aspectRatio !== "auto",
            aboveFold: rect.top < viewportHeight && rect.height > 0,
            fetchPriority: img.getAttribute("fetchpriority"),
            isHero: img.closest("article, main") !== null && rect.top < viewportHeight,
          };
        });
      });

      // The first above-the-fold image inside the article body is the LCP
      // candidate; everything else must stay lazy.
      const heroIndex = images.findIndex((image) => image.isHero && image.aboveFold);
      const strategies: LoadingStrategy[] = images.map((image, index) => ({
        role: index === heroIndex ? "hero" : image.displayWidth <= 128 ? "thumbnail" : "content",
        loading: image.loading,
        fetchPriority: image.fetchPriority,
        decoding: image.decoding,
        aboveFold: image.aboveFold,
      }));

      // Icons rendered as inline SVG are not <img>; anything left is content.
      const violations = images.map((image, index) => {
        const issues = [
          ...auditRenderedImage(image, 2),
          ...auditLoadingStrategy(strategies[index]!),
        ];
        return [image.src, issues] as [string, string[]];
      });

      const pictureIssues = pictures.flatMap((picture) =>
        auditPictureFormats({
          ...picture,
          // The proxy cannot encode AVIF, so WebP is the required modern format.
          requiredFormats: REMOTE_IMAGE_FORMATS.filter((format) => format === "webp"),
        }).map((issue) => `<picture>: ${issue}`),
      );
      const eagerIssues = auditEagerCount(strategies);

      reportPages.push({
        path,
        images: images.map<ReportImage>((image, index) => ({
          src: image.src,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          displayWidth: image.displayWidth,
          displayHeight: image.displayHeight,
          transferBytes: bytesBySrc.get(image.src) ?? 0,
          loading: image.loading,
          fetchPriority: image.fetchPriority,
          aboveFold: image.aboveFold,
          issues: violations[index]![1],
        })),
        extraIssues: [...pictureIssues, ...eagerIssues],
      });

      const failed = violations.filter(([, issues]) => issues.length > 0);
      expect(failed.length, formatImageReport(path, failed)).toBe(0);
      expect(pictureIssues.join("\n"), `${path} <picture> problems`).toBe("");
      expect(eagerIssues.join("\n"), `${path} loading priorities`).toBe("");

      const totalBytes = [...bytesBySrc.values()].reduce((sum, n) => sum + n, 0);
      expect(
        totalBytes,
        `${path} downloaded ${Math.round(totalBytes / 1000)}kB of images`,
      ).toBeLessThanOrEqual(MAX_PAGE_IMAGE_BYTES);
    });
  }
});

test.afterAll(() => {
  if (reportPages.length === 0) return;
  const report = buildImageReport(reportPages);
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(join(ARTIFACT_DIR, "image-report.md"), renderImageReportMarkdown(report), "utf8");
  writeFileSync(
    join(ARTIFACT_DIR, "image-report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
  console.log(`image report written to ${join(ARTIFACT_DIR, "image-report.md")}`);
});
