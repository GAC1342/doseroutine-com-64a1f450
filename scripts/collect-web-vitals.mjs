#!/usr/bin/env node
/**
 * Core Web Vitals collection for the SEO QA sweep.
 *
 * Loads each given path in headless Chromium (mobile-shaped viewport), records
 * LCP, CLS and an INP sample (driven by a real click + keypress), and prints a
 * JSON report to stdout:
 *
 *   { "results": [ { path, lcp, cls, inp, lcpElement, shifters } ], "errors": [...] }
 *
 * Usage:
 *   node scripts/collect-web-vitals.mjs <baseUrl> <path> [path...]
 *   node scripts/collect-web-vitals.mjs <baseUrl> --paths-file /tmp/paths.txt
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const [, , baseUrl, ...rest] = process.argv;
if (!baseUrl) {
  console.error("usage: collect-web-vitals.mjs <baseUrl> <path...>");
  process.exit(2);
}

let paths = [];
const fileFlag = rest.indexOf("--paths-file");
if (fileFlag !== -1) {
  paths = readFileSync(rest[fileFlag + 1], "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
} else {
  paths = rest.filter((a) => !a.startsWith("--"));
}

const COLLECTOR = `
window.__vitals = { lcp: 0, cls: 0, inp: 0, lcpElement: '', shifters: [] };
try {
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__vitals.lcp = e.startTime;
      const el = e.element;
      window.__vitals.lcpElement = el
        ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '')
        : '';
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
} catch {}
try {
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__vitals.cls += e.value;
      for (const s of e.sources || []) {
        const n = s.node;
        if (!n || !n.tagName) continue;
        const label = n.tagName.toLowerCase() + (n.id ? '#' + n.id : '');
        if (!window.__vitals.shifters.includes(label)) window.__vitals.shifters.push(label);
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });
} catch {}
try {
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.interactionId && e.duration > window.__vitals.inp) window.__vitals.inp = e.duration;
    }
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
} catch {}
`;

async function measure(context, path) {
  const page = await context.newPage();
  try {
    await page.addInitScript(COLLECTOR);
    await page.goto(new URL(path, baseUrl).toString(), {
      waitUntil: "load",
      timeout: 60_000,
    });
    await page.waitForTimeout(1_500);
    // Drive a real interaction so INP has something to measure.
    await page.mouse.move(10, 10);
    await page.mouse.click(10, 10);
    await page.keyboard.press("Tab");
    await page.keyboard.press("End");
    await page.mouse.wheel(0, 2_000);
    await page.waitForTimeout(1_200);
    const v = await page.evaluate(() => window.__vitals);
    return {
      path,
      lcp: Math.round(v.lcp),
      cls: Math.round(v.cls * 1000) / 1000,
      inp: Math.round(v.inp),
      lcpElement: v.lcpElement,
      shifters: v.shifters.slice(0, 5),
    };
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({
  args: ["--no-sandbox"],
  // CI images sometimes ship a system Chromium instead of the pinned download.
  ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
});

const results = [];
const errors = [];
for (const path of paths) {
  try {
    results.push(await measure(context, path));
  } catch (e) {
    errors.push({ path, error: String(e).slice(0, 200) });
  }
}
await context.close();
await browser.close();

process.stdout.write(JSON.stringify({ results, errors }, null, 2));
