import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  auditPage,
  formatAssetReport,
  renderAuditMarkdown,
  type AuditedAsset,
  type HeroInfo,
  type OffscreenImage,
  type PageAuditResult,
  type ResourceKind,
} from "../src/lib/asset-audit";
import { articlePaths } from "./article-slugs";

/**
 * Lightweight pre-release asset audit.
 *
 * Loads every /articles route on a throttled connection, records what each
 * request cost, and fails when a single asset blows its budget, a page gets
 * too heavy, or the hero image is not set up to paint fast. Runs in ~2 minutes
 * without Lighthouse: `npm run perf:assets`.
 */

const PATHS = articlePaths();
const OUT_DIR = join(process.cwd(), "test-results", "asset-audit");
const results: PageAuditResult[] = [];

function kindOf(resourceType: string, url: string): ResourceKind {
  if (resourceType === "image") return "image";
  if (resourceType === "font") return "font";
  if (resourceType === "script") return "script";
  if (resourceType === "stylesheet") return "stylesheet";
  if (/\.(woff2?|ttf|otf)(\?|$)/i.test(url)) return "font";
  return "other";
}

test.describe("article asset audit", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  for (const path of PATHS) {
    test(`${path} ships fast assets`, async ({ page }) => {
      test.setTimeout(120_000);
      const assets: AuditedAsset[] = [];
      const started = new Map<string, number>();

      // Fast-3G-ish throttling so slow assets surface instead of hiding behind
      // localhost bandwidth.
      const client = await page.context().newCDPSession(page);
      await client.send("Network.enable");
      await client.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
      });

      page.on("request", (request) => started.set(request.url(), Date.now()));
      page.on("response", async (response) => {
        const request = response.request();
        const url = response.url();
        if (url.startsWith("data:")) return;
        let bytes = Number(response.headers()["content-length"] ?? 0);
        if (!bytes) {
          try {
            bytes = (await response.body()).byteLength;
          } catch {
            bytes = 0;
          }
        }
        const start = started.get(url);
        assets.push({
          url,
          kind: kindOf(request.resourceType(), url),
          bytes,
          durationMs: start ? Date.now() - start : 0,
        });
      });

      await page.goto(path, { waitUntil: "load" });
      // networkidle never settles against a Vite dev server (HMR socket), so
      // settle manually: quiet for 1s, or 8s hard cap.
      const deadline = Date.now() + 8_000;
      let lastCount = -1;
      while (Date.now() < deadline) {
        if (assets.length === lastCount) break;
        lastCount = assets.length;
        await page.waitForTimeout(1_000);
      }

      const html = await page.content();
      const preloaded = new Set(
        Array.from(html.matchAll(/<link[^>]+rel=["']preload["'][^>]*>/gi), (match) => match[0])
          .filter((tag) => /as=["']image["']/i.test(tag))
          .map((tag) => /href=["']([^"']+)["']/i.exec(tag)?.[1] ?? "")
          .filter(Boolean)
          .map((href) => new URL(href, page.url()).href),
      );

      const dom = await page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        const images = Array.from(document.querySelectorAll("img")).map((img) => {
          const rect = img.getBoundingClientRect();
          const picture = img.closest("picture");
          return {
            url: img.currentSrc || img.src,
            loading: img.getAttribute("loading"),
            fetchPriority: img.getAttribute("fetchpriority"),
            hasDimensions:
              (img.hasAttribute("width") && img.hasAttribute("height")) ||
              getComputedStyle(img).aspectRatio !== "auto",
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            displayWidth: rect.width,
            displayHeight: rect.height,
            aboveFold: rect.top < viewportHeight && rect.height > 0,
            inArticle: img.closest("article, main") !== null,
            area: rect.width * rect.height,
            hasModernSource: picture
              ? Array.from(picture.querySelectorAll("source")).some((source) =>
                  /avif|webp/i.test(
                    `${source.getAttribute("type") ?? ""} ${source.getAttribute("srcset") ?? ""}`,
                  ),
                )
              : /\.(webp|avif)(\?|$)/i.test(img.currentSrc || img.src) ||
                /output=(webp|avif)/i.test(img.currentSrc || img.src),
            devicePixelRatio: window.devicePixelRatio,
          };
        });
        return { images };
      });

      // Hero rules apply to article detail pages only — the /articles index
      // renders a grid of card thumbnails, none of which is an LCP hero.
      const heroCandidate = (path === "/articles" ? [] : dom.images)
        .filter((img) => img.inArticle && img.aboveFold && img.area > 0)
        .sort((a, b) => b.area - a.area)[0];

      const bytesFor = (url: string) => assets.find((a) => a.url === url)?.bytes ?? 0;
      const durationFor = (url: string) => assets.find((a) => a.url === url)?.durationMs ?? 0;

      const hero: HeroInfo | null = heroCandidate
        ? {
            url: heroCandidate.url,
            bytes: bytesFor(heroCandidate.url),
            durationMs: durationFor(heroCandidate.url),
            loading: heroCandidate.loading,
            fetchPriority: heroCandidate.fetchPriority,
            hasDimensions: heroCandidate.hasDimensions,
            preloaded: preloaded.has(heroCandidate.url),
            naturalWidth: heroCandidate.naturalWidth,
            naturalHeight: heroCandidate.naturalHeight,
            displayWidth: heroCandidate.displayWidth,
            displayHeight: heroCandidate.displayHeight,
            devicePixelRatio: heroCandidate.devicePixelRatio,
            hasModernSource: heroCandidate.hasModernSource,
          }
        : null;

      const offscreenImages: OffscreenImage[] = dom.images.map((img) => ({
        url: img.url,
        loading: img.loading,
        aboveFold: img.aboveFold,
      }));

      // A Vite dev server serves hundreds of unbundled modules and raw CSS,
      // which says nothing about shipped weight. Audit images and fonts only
      // in dev; the full budget applies to preview/production builds.
      const isDevServer = assets.some((a) => a.url.includes("/@vite/"));
      const audited = isDevServer
        ? assets.filter((a) => a.kind === "image" || a.kind === "font")
        : assets;

      const result = auditPage({ path, assets: audited, hero, offscreenImages });
      results.push(result);

      console.log(formatAssetReport(result));

      expect(
        result.failures.map((f) => `${f.url}: ${f.message}`).join("\n"),
        `Asset audit failures on ${path}`,
      ).toBe("");
    });
  }

  test.afterAll(() => {
    if (results.length === 0) return;
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "report.json"), `${JSON.stringify(results, null, 2)}\n`);
    writeFileSync(join(OUT_DIR, "report.md"), renderAuditMarkdown(results));
  });
});
