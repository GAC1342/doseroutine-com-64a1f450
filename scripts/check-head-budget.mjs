#!/usr/bin/env node
/**
 * CI gate: no rendered page may emit a `<head>` with more than 60 children.
 *
 * Audit crawlers flag "node with more than 60 childs" and browsers pay for it
 * in style recalculation. The head is the only node on this site that gets
 * close, so it is the one we police on every route.
 *
 * Usage:
 *   node scripts/check-head-budget.mjs [baseUrl]
 *   HEAD_BUDGET=60 HEAD_SAMPLE=0 node scripts/check-head-budget.mjs https://doseroutine.com
 *
 * HEAD_SAMPLE caps how many sitemap URLs are checked (0 = all).
 */

import process from "node:process";
import { HEAD_CHILD_BUDGET, checkHeadBudget } from "./lib/head-budget-check.mjs";

const BASE = (process.argv[2] || process.env["HEAD_BASE_URL"] || "http://127.0.0.1:8080").replace(
  /\/+$/,
  "",
);
const BUDGET = Number(process.env["HEAD_BUDGET"] || HEAD_CHILD_BUDGET);
const SAMPLE = Number(process.env["HEAD_SAMPLE"] ?? 60);

/** Routes that must always be checked, schema-heaviest first. */
const KEY_PAGES = [
  "/",
  "/library/retatrutide",
  "/library/creatine",
  "/library",
  "/articles",
  "/blog",
  "/calculators",
  "/manual",
  "/about",
  "/booty-workout",
];

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { accept: "text/html" }, redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.text();
}

async function sitemapPaths() {
  try {
    const xml = await fetchHtml(`${BASE}/sitemap.xml`);
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    const paths = locs
      .map((loc) => {
        try {
          return new URL(loc).pathname;
        } catch {
          return null;
        }
      })
      .filter((p) => p && !p.endsWith(".xml"));
    return [...new Set(paths)];
  } catch (err) {
    console.warn(`  ! sitemap unavailable (${err.message}) — checking key pages only`);
    return [];
  }
}

async function main() {
  console.log(`Head budget check — base: ${BASE}, budget: ${BUDGET} children\n`);
  const discovered = await sitemapPaths();
  const extra = discovered.filter((p) => !KEY_PAGES.includes(p));
  const sampled = SAMPLE > 0 ? extra.slice(0, SAMPLE) : extra;
  const targets = [...KEY_PAGES, ...sampled];

  const failures = [];
  let worst = { path: "-", count: 0 };
  let checked = 0;

  for (const path of targets) {
    let html;
    try {
      html = await fetchHtml(`${BASE}${path}`);
    } catch (err) {
      failures.push(`${path}: fetch failed (${err.message})`);
      continue;
    }
    checked += 1;
    const result = checkHeadBudget(path, html, BUDGET);
    if (result.count > worst.count) worst = { path, count: result.count };
    if (result.ok) console.log(`  ok   ${result.message}`);
    else {
      console.log(`  FAIL ${result.message}`);
      failures.push(result.message);
    }
  }

  console.log(
    `\nChecked ${checked} page(s). Largest head: ${worst.count} children (${worst.path}).`,
  );
  if (failures.length > 0) {
    console.error(`\n${failures.length} page(s) over budget:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`Every head is within the ${BUDGET}-child budget.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
