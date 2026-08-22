/**
 * Per-article image optimization report.
 *
 * The browser gate (e2e/articles-images.spec.ts) measures every rendered image
 * and hands the raw observations to this module, which turns them into a build
 * artifact: one row per image, grouped per article, with the delivered format,
 * the bytes it cost, an estimate of the bytes an optimized delivery would have
 * saved, and the exact checks that failed.
 *
 * Pure on purpose — CI reads the JSON, humans read the Markdown, and the unit
 * tests can assert both without a browser.
 */

import { MAX_PAGE_IMAGE_BYTES } from "@/lib/image-optimization";

export interface ReportImage {
  src: string;
  /** Delivered format, e.g. "webp" / "avif" / "png". */
  format: string;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  transferBytes: number;
  loading: string | null;
  fetchPriority: string | null;
  aboveFold: boolean;
  /** Human-readable failures from auditRenderedImage()/strategy checks. */
  issues: string[];
}

export interface ReportPageInput {
  path: string;
  images: ReportImage[];
  /** Page-level failures that don't belong to one image (<picture>, LCP count). */
  extraIssues?: string[];
}

export interface ReportImageRow extends ReportImage {
  /** Bytes we estimate a correctly sized + modern-format delivery would save. */
  bytesSaved: number;
  /** naturalWidth / (displayWidth * dpr); 1 means perfectly sized. */
  oversizeRatio: number;
  passed: boolean;
}

export interface ReportPage {
  path: string;
  imageCount: number;
  totalBytes: number;
  potentialSavings: number;
  failedImages: number;
  overBudget: boolean;
  failedChecks: string[];
  images: ReportImageRow[];
}

export interface ImageReport {
  generatedAt: string;
  budgetBytes: number;
  totals: {
    pages: number;
    images: number;
    bytes: number;
    potentialSavings: number;
    failedImages: number;
    failedPages: number;
  };
  /** Every distinct failed check with how many images tripped it. */
  checkCounts: Array<{ check: string; count: number }>;
  pages: ReportPage[];
}

/** Modern formats we don't try to re-encode further. */
const MODERN_FORMATS = new Set(["webp", "avif"]);
/** Rough share of bytes saved by moving a legacy raster to webp/avif. */
export const MODERN_FORMAT_SAVING = 0.3;

/** Delivered format for a URL, honouring proxy query params (`?output=webp`). */
export function deliveredFormat(src: string): string {
  let parsed: URL;
  try {
    parsed = new URL(src, "https://doseroutine.com");
  } catch {
    return "unknown";
  }
  const declared = parsed.searchParams.get("output") ?? parsed.searchParams.get("format");
  if (declared) return declared.toLowerCase();
  const ext = /\.([a-z0-9]+)$/i.exec(parsed.pathname)?.[1]?.toLowerCase();
  if (!ext) return "unknown";
  return ext === "jpeg" ? "jpg" : ext;
}

/**
 * Bytes an optimized delivery would have saved.
 *
 * Two independent wins compound: shipping only the pixels the box needs
 * (bytes scale with area, so the saving is 1 - 1/ratio²) and re-encoding a
 * legacy raster as webp/avif. SVGs are vector and always score 0.
 */
export function estimateBytesSaved(image: ReportImage, dpr = 2): number {
  if (image.transferBytes <= 0) return 0;
  const format = image.format || deliveredFormat(image.src);
  if (format === "svg") return 0;

  let remaining = 1;
  const target = image.displayWidth * dpr;
  if (target > 0 && image.naturalWidth > target) {
    remaining *= (target / image.naturalWidth) ** 2;
  }
  if (!MODERN_FORMATS.has(format)) {
    remaining *= 1 - MODERN_FORMAT_SAVING;
  }
  return Math.max(0, Math.round(image.transferBytes * (1 - remaining)));
}

export function oversizeRatio(image: ReportImage, dpr = 2): number {
  const target = image.displayWidth * dpr;
  if (target <= 0 || image.naturalWidth <= 0) return 1;
  return Number((image.naturalWidth / target).toFixed(2));
}

export function buildImageReport(
  pages: ReportPageInput[],
  options: { dpr?: number; budgetBytes?: number; now?: Date } = {},
): ImageReport {
  const dpr = options.dpr ?? 2;
  const budgetBytes = options.budgetBytes ?? MAX_PAGE_IMAGE_BYTES;
  const checkCounts = new Map<string, number>();

  const reportPages: ReportPage[] = pages.map((page) => {
    const images: ReportImageRow[] = page.images.map((image) => {
      const format = image.format || deliveredFormat(image.src);
      for (const issue of image.issues) {
        checkCounts.set(issue, (checkCounts.get(issue) ?? 0) + 1);
      }
      return {
        ...image,
        format,
        bytesSaved: estimateBytesSaved({ ...image, format }, dpr),
        oversizeRatio: oversizeRatio(image, dpr),
        passed: image.issues.length === 0,
      };
    });

    const totalBytes = images.reduce((sum, i) => sum + i.transferBytes, 0);
    const overBudget = totalBytes > budgetBytes;
    const extraIssues = page.extraIssues ?? [];
    for (const issue of extraIssues) {
      checkCounts.set(issue, (checkCounts.get(issue) ?? 0) + 1);
    }
    const failedChecks = [...new Set([...images.flatMap((i) => i.issues), ...extraIssues])].sort();
    if (overBudget) {
      const label = `page image weight over budget (${Math.round(totalBytes / 1000)}kB)`;
      failedChecks.push(label);
    }

    return {
      path: page.path,
      imageCount: images.length,
      totalBytes,
      potentialSavings: images.reduce((sum, i) => sum + i.bytesSaved, 0),
      failedImages: images.filter((i) => !i.passed).length,
      overBudget,
      failedChecks,
      images,
    };
  });

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    budgetBytes,
    totals: {
      pages: reportPages.length,
      images: reportPages.reduce((s, p) => s + p.imageCount, 0),
      bytes: reportPages.reduce((s, p) => s + p.totalBytes, 0),
      potentialSavings: reportPages.reduce((s, p) => s + p.potentialSavings, 0),
      failedImages: reportPages.reduce((s, p) => s + p.failedImages, 0),
      failedPages: reportPages.filter((p) => p.failedChecks.length > 0).length,
    },
    checkCounts: [...checkCounts.entries()]
      .map(([check, count]) => ({ check, count }))
      .sort((a, b) => b.count - a.count || a.check.localeCompare(b.check)),
    pages: reportPages,
  };
}

function kb(bytes: number): string {
  return `${(bytes / 1000).toFixed(1)}kB`;
}

function shortSrc(src: string): string {
  try {
    const url = new URL(src, "https://doseroutine.com");
    const proxied = url.searchParams.get("url");
    const shown = proxied ? `proxy:${proxied.split("/").pop()}` : url.pathname.split("/").pop();
    return (shown || url.pathname).slice(0, 60);
  } catch {
    return src.slice(0, 60);
  }
}

/** Markdown build artifact — the thing a human skims in the CI job summary. */
export function renderImageReportMarkdown(report: ImageReport): string {
  const { totals } = report;
  const lines: string[] = [
    "# /articles image optimization report",
    "",
    `Generated ${report.generatedAt}`,
    "",
    `- Pages checked: **${totals.pages}**`,
    `- Images: **${totals.images}**`,
    `- Total image weight: **${kb(totals.bytes)}** (budget ${kb(report.budgetBytes)} per page)`,
    `- Estimated savings still available: **${kb(totals.potentialSavings)}**`,
    `- Failing images: **${totals.failedImages}** across **${totals.failedPages}** page(s)`,
    "",
  ];

  if (report.checkCounts.length > 0) {
    lines.push("## Failed checks", "", "| Check | Images |", "| --- | ---: |");
    for (const { check, count } of report.checkCounts) {
      lines.push(`| ${check} | ${count} |`);
    }
    lines.push("");
  } else {
    lines.push("All image checks passed.", "");
  }

  lines.push("## Per-article detail", "");
  for (const page of report.pages) {
    const status = page.failedChecks.length === 0 ? "PASS" : "FAIL";
    lines.push(
      `### ${status} \`${page.path}\``,
      "",
      `${page.imageCount} image(s) · ${kb(page.totalBytes)} · ${kb(page.potentialSavings)} recoverable`,
      "",
      "| Image | Format | Delivered | Box | Oversize | Bytes | Saveable | Loading | Issues |",
      "| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |",
    );
    for (const img of page.images) {
      lines.push(
        `| ${shortSrc(img.src)} | ${img.format} | ${img.naturalWidth}×${img.naturalHeight} | ` +
          `${Math.round(img.displayWidth)}×${Math.round(img.displayHeight)} | ${img.oversizeRatio}x | ` +
          `${kb(img.transferBytes)} | ${kb(img.bytesSaved)} | ` +
          `${img.loading ?? "-"}${img.fetchPriority ? `/${img.fetchPriority}` : ""} | ` +
          `${img.issues.length === 0 ? "—" : img.issues.join("; ")} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
