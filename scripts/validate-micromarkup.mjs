#!/usr/bin/env node
/**
 * Micromarkup / schema validator for the SERVED HTML.
 *
 * Several site audit tools regex the raw HTML case-sensitively, so React's
 * camelCase DOM props (itemScope / itemType / itemProp / hrefLang) are
 * reported as "no micromarkup" even though browsers parse them fine. This
 * check fetches the real server-rendered HTML for every key page and every
 * /articles/* URL and fails when:
 *
 *   • the page has no lowercase itemscope/itemtype pair
 *   • the sitewide WebPage + Organization microdata is missing
 *   • an article page is missing its Article microdata scope
 *   • any camelCase microdata / hreflang attribute name is emitted
 *   • a JSON-LD block does not parse or has no @context/@type
 *
 * Usage:
 *   node scripts/validate-micromarkup.mjs [baseUrl]
 *   MICROMARKUP_BASE_URL=https://doseroutine.com node scripts/validate-micromarkup.mjs
 */

import process from "node:process";
import { checkScopes } from "./lib/microdata-scopes.mjs";

const BASE = (
  process.argv[2] ||
  process.env["MICROMARKUP_BASE_URL"] ||
  "http://127.0.0.1:8080"
).replace(/\/+$/, "");

/** Pages that must always carry the sitewide micromarkup. */
const KEY_PAGES = [
  "/",
  "/install",
  "/articles",
  "/blog",
  "/library",
  "/calculators",
  "/manual",
  "/booty-workout",
  "/about",
  "/library/creatine",
];

/** Attribute names React would emit in camelCase — never valid for audits. */
const CAMEL_ATTRS = ["itemScope=", "itemType=", "itemProp=", "hrefLang=", "itemID="];

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { accept: "text/html" }, redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.text();
}

/** Every /articles/<slug> URL advertised by the sitemap. */
async function articleUrls() {
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
      .filter((p) => p && /^\/articles\/[^/]+$/.test(p));
    return [...new Set(paths)];
  } catch (err) {
    console.warn(`  ! could not read sitemap.xml (${err.message}) — falling back to /articles`);
    try {
      const html = await fetchHtml(`${BASE}/articles`);
      return [...new Set([...html.matchAll(/href="(\/articles\/[a-z0-9-]+)"/g)].map((m) => m[1]))];
    } catch {
      return [];
    }
  }
}

function lowercaseItemtypes(html) {
  return [...html.matchAll(/\bitemtype=["']([^"']+)["']/g)].map((m) => m[1]);
}

function checkJsonLd(html, problems, path) {
  const blocks = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  if (blocks.length === 0) problems.push(`${path}: no JSON-LD blocks`);
  blocks.forEach(([, body], i) => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      problems.push(`${path}: JSON-LD block #${i + 1} does not parse (${err.message})`);
      return;
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of nodes) {
      if (!node || typeof node !== "object") {
        problems.push(`${path}: JSON-LD block #${i + 1} is not an object`);
        continue;
      }
      const graph = Array.isArray(node["@graph"]) ? node["@graph"] : [node];
      if (!node["@context"]) problems.push(`${path}: JSON-LD block #${i + 1} missing @context`);
      for (const g of graph) {
        if (!g || !g["@type"]) {
          problems.push(`${path}: JSON-LD block #${i + 1} has a node without @type`);
        }
      }
    }
  });
}

function checkPage(path, html, { isArticle }) {
  const problems = [];

  for (const attr of CAMEL_ATTRS) {
    if (html.includes(attr)) {
      problems.push(`${path}: camelCase attribute "${attr.slice(0, -1)}" in served HTML`);
    }
  }

  if (!/\bitemscope\b/.test(html)) problems.push(`${path}: no lowercase itemscope attribute`);

  const types = lowercaseItemtypes(html);
  if (types.length === 0) problems.push(`${path}: no lowercase itemtype attribute`);
  if (!types.some((t) => /schema\.org\/(WebPage|Article|CollectionPage|MedicalWebPage)/.test(t))) {
    problems.push(`${path}: missing a page-level schema.org itemtype (got: ${types.join(", ")})`);
  }
  if (!types.some((t) => t.endsWith("/Organization"))) {
    problems.push(`${path}: missing the publisher Organization microdata scope`);
  }
  if (!/\bitemprop=["']publisher["']/.test(html)) {
    problems.push(`${path}: missing itemprop="publisher"`);
  }

  if (isArticle) {
    if (!types.some((t) => t.endsWith("/Article"))) {
      problems.push(`${path}: article page missing schema.org/Article microdata scope`);
    }
    if (!/\bitemprop=["']headline["']/.test(html)) {
      problems.push(`${path}: article page missing itemprop="headline"`);
    }
    if (!/\bitemprop=["']datePublished["']/.test(html)) {
      problems.push(`${path}: article page missing itemprop="datePublished"`);
    }
  }

  // Exactly one page-level scope, no empty scopes, every scope typed.
  problems.push(...checkScopes(path, html));

  checkJsonLd(html, problems, path);
  return problems;
}

async function main() {
  console.log(`Micromarkup validator — base: ${BASE}\n`);
  const articles = await articleUrls();
  if (articles.length === 0) console.warn("  ! no /articles/* URLs discovered");

  const targets = [
    ...KEY_PAGES.map((p) => ({ path: p, isArticle: false })),
    ...articles.map((p) => ({ path: p, isArticle: true })),
  ];

  const failures = [];
  let checked = 0;

  for (const target of targets) {
    let html;
    try {
      html = await fetchHtml(`${BASE}${target.path}`);
    } catch (err) {
      failures.push(`${target.path}: fetch failed (${err.message})`);
      continue;
    }
    checked += 1;
    const problems = checkPage(target.path, html, target);
    if (problems.length === 0) console.log(`  ok   ${target.path}`);
    else {
      console.log(`  FAIL ${target.path}`);
      failures.push(...problems);
    }
  }

  console.log(`\nChecked ${checked} page(s) (${articles.length} article URLs).`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} problem(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("All pages expose valid lowercase micromarkup and parseable JSON-LD.");
}

if (process.argv[1] && process.argv[1].endsWith("validate-micromarkup.mjs")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { checkPage, main };
