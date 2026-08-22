#!/usr/bin/env node
/**
 * Breadcrumb audit.
 *
 * Crawls the sitemap and reports, for every page, whether it renders
 *   1. a visible breadcrumb trail (nav[aria-label="Breadcrumb"]), and
 *   2. valid BreadcrumbList JSON-LD (ordered positions, names, absolute items).
 *
 * Google only shows breadcrumbs in search results when both agree, so a page
 * that has one but not the other is a finding, not a pass.
 *
 * Usage:
 *   node scripts/breadcrumb-audit.mjs                 # 80 evenly-sampled URLs
 *   CRAWL_LIMIT=0 node scripts/breadcrumb-audit.mjs   # every sitemap URL
 *   CRAWL_BASE_URL=http://localhost:8080 node scripts/breadcrumb-audit.mjs
 */

import { writeFileSync } from "node:fs";

const BASE = (process.env.CRAWL_BASE_URL || "https://doseroutine.com").replace(/\/$/, "");
const LIMIT = Number(process.env.CRAWL_LIMIT ?? "80");
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY ?? "8");
const OUT = process.env.CRAWL_OUT || "breadcrumb-audit-report.json";

async function get(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "DoseRoutineBreadcrumbAudit/1.0" },
    redirect: "follow",
  });
  return { status: res.status, body: await res.text(), finalUrl: res.url };
}

function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

async function collectSitemapUrls() {
  const { body } = await get(`${BASE}/sitemap.xml`);
  const entries = locs(body);
  if (!/<sitemapindex/i.test(body)) return entries;
  const all = [];
  for (const child of entries) {
    const { body: childBody } = await get(child);
    all.push(...locs(childBody));
  }
  return all;
}

function sampleEvenly(items, limit) {
  if (!limit || limit >= items.length) return items;
  const step = items.length / limit;
  return Array.from({ length: limit }, (_, i) => items[Math.floor(i * step)]);
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1],
  );
}

function flattenGraph(parsed) {
  const out = [];
  const push = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(push);
    out.push(node);
    if (Array.isArray(node["@graph"])) node["@graph"].forEach(push);
  };
  push(parsed);
  return out;
}

/** Every BreadcrumbList node on the page, wherever it is nested. */
export function breadcrumbNodes(html) {
  const nodes = [];
  for (const block of jsonLdBlocks(html)) {
    let parsed;
    try {
      parsed = JSON.parse(block);
    } catch {
      continue;
    }
    for (const node of flattenGraph(parsed)) {
      if (node["@type"] === "BreadcrumbList") nodes.push(node);
    }
  }
  return nodes;
}

/** Rules that mirror what Google's Rich Results Test enforces. */
export function validateBreadcrumbNode(node) {
  const problems = [];
  const items = node.itemListElement;
  if (!Array.isArray(items) || items.length < 2) {
    problems.push("itemListElement needs at least 2 entries (Home + current page)");
    return problems;
  }
  items.forEach((item, i) => {
    const at = `item ${i + 1}`;
    if (item["@type"] !== "ListItem") problems.push(`${at}: @type must be ListItem`);
    if (item.position !== i + 1) problems.push(`${at}: position must be ${i + 1}`);
    if (!item.name || typeof item.name !== "string") problems.push(`${at}: missing name`);
    const url = typeof item.item === "string" ? item.item : item.item?.["@id"];
    // The final crumb may omit item; every other crumb needs an absolute URL.
    if (i < items.length - 1) {
      if (!url) problems.push(`${at}: missing item URL`);
      else if (!/^https:\/\//.test(url)) problems.push(`${at}: item URL must be absolute https`);
    }
  });
  return problems;
}

export function hasVisibleTrail(html) {
  return (
    /<nav[^>]+aria-label=["']Breadcrumb["']/i.test(html) || /data-site-breadcrumbs/i.test(html)
  );
}

async function auditUrl(url) {
  try {
    const { status, body } = await get(url);
    if (status !== 200) return { url, status, ok: false, problems: [`HTTP ${status}`] };
    const nodes = breadcrumbNodes(body);
    const visible = hasVisibleTrail(body);
    const problems = [];
    if (!nodes.length) problems.push("no BreadcrumbList JSON-LD");
    if (nodes.length > 1) problems.push(`${nodes.length} BreadcrumbList nodes (should be 1)`);
    for (const node of nodes) problems.push(...validateBreadcrumbNode(node));
    if (!visible) problems.push("no visible breadcrumb trail");
    return { url, status, visible, jsonLd: nodes.length, ok: problems.length === 0, problems };
  } catch (err) {
    return { url, status: 0, ok: false, problems: [`fetch failed: ${err.message}`] };
  }
}

async function main() {
  const all = await collectSitemapUrls();
  // The home page is the trail's root, so it never renders one itself.
  const crawlable = all.filter((u) => new URL(u).pathname !== "/");
  const targets = sampleEvenly(crawlable, LIMIT);
  const results = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, targets.length) }, async () => {
      while (cursor < targets.length) {
        const url = targets[cursor++];
        results.push(await auditUrl(url));
      }
    }),
  );

  results.sort((a, b) => a.url.localeCompare(b.url));
  const failures = results.filter((r) => !r.ok);
  const report = {
    base: BASE,
    generatedAt: new Date().toISOString(),
    sitemapUrls: all.length,
    pagesAudited: results.length,
    missingVisible: results.filter((r) => r.visible === false).length,
    missingJsonLd: results.filter((r) => r.jsonLd === 0).length,
    failures,
  };
  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log(
    `Audited ${results.length}/${all.length} URLs — ${results.length - failures.length} clean, ${failures.length} with findings`,
  );
  for (const f of failures.slice(0, 40))
    console.log(`  ${f.url}\n    - ${f.problems.join("\n    - ")}`);
  console.log(`Report written to ${OUT}`);
  process.exitCode = failures.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
