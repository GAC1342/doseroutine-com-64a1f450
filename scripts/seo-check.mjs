#!/usr/bin/env node
/**
 * Local runner for the SEO JSON-LD + meta validations.
 *
 * Mirrors what CI runs (seo-meta-lint, jsonld-contract, blog-seo-score,
 * direct-answers, noindex-audit) so failures surface before pushing.
 *
 * Usage:
 *   node scripts/seo-check.mjs                 # offline groups (no build/server)
 *   node scripts/seo-check.mjs --live          # groups that need a served site
 *   node scripts/seo-check.mjs --all           # offline, then live
 *   node scripts/seo-check.mjs --only meta     # one group (repeatable, comma ok)
 *   node scripts/seo-check.mjs --live --base https://doseroutine.com
 *   node scripts/seo-check.mjs --list
 */

import { spawnSync } from "node:child_process";
import process from "node:process";

const DEFAULT_BASE = "http://127.0.0.1:8080";

/** @typedef {{ id: string, title: string, ci: string, mode: "offline"|"live", cmd: (base: string) => string[] }} Group */

const vitest = (...files) => ["npx", "vitest", "run", ...files];

/** @type {Group[]} */
const GROUPS = [
  {
    id: "meta",
    title: "Meta tags, canonical, OG/Twitter, snippet lengths",
    ci: "seo-meta-lint",
    mode: "offline",
    cmd: () =>
      vitest(
        "src/lib/__tests__/faqpage-rich-results.test.ts",
        "src/lib/__tests__/blog-jsonld.test.ts",
        "src/lib/__tests__/blog-social-meta.test.ts",
        "src/lib/__tests__/blog-faq-snippets.test.ts",
        "src/lib/__tests__/marketing-blog-links.test.ts",
        "src/lib/__tests__/blog-seo-score.test.ts",
        "src/routes/__tests__/seo-meta-lint.test.ts",
        "src/routes/__tests__/best-for-meta-snapshot.test.ts",
        "src/routes/__tests__/best-for-meta-uniqueness.test.ts",
        "src/routes/__tests__/public-route-meta.test.ts",
        "src/routes/__tests__/canonical-redirects.test.ts",
        "src/routes/__tests__/jsonld-duplicate-lint.test.ts",
        "src/lib/__tests__/jsonld-duplicates.test.ts",
        "src/lib/page2-rescue.test.ts",
      ),
  },
  {
    id: "jsonld",
    title: "JSON-LD schema contract + duplicate-block lint",
    ci: "jsonld-contract",
    mode: "offline",
    cmd: () =>
      vitest(
        "src/lib/__tests__/jsonld-schema-contract.test.ts",
        "src/lib/__tests__/entity-jsonld-lint.test.ts",
        "src/routes/__tests__/entity-jsonld-lint.test.ts",
        "src/routes/__tests__/jsonld-duplicate-lint.test.ts",
        "src/lib/__tests__/jsonld-duplicates.test.ts",
      ),
  },
  {
    id: "blog",
    title: "Blog Article/FAQPage schema, social meta, SEO score",
    ci: "blog-seo-score",
    mode: "offline",
    cmd: () =>
      vitest(
        "src/lib/__tests__/blog-seo-score.test.ts",
        "src/lib/__tests__/blog-jsonld.test.ts",
        "src/lib/__tests__/blog-social-meta.test.ts",
      ),
  },
  {
    id: "faq",
    title: "FAQ rich-results eligibility and anchor parity",
    ci: "blog-seo-score",
    mode: "offline",
    cmd: () =>
      vitest(
        "src/lib/__tests__/faqpage-rich-results.test.ts",
        "src/lib/__tests__/faq-anchor-parity.test.ts",
        "src/lib/__tests__/crawl-cache.test.ts",
      ),
  },
  {
    id: "anchors",
    title: "Internal anchor-text lint",
    ci: "blog-seo-score",
    mode: "offline",
    cmd: () => vitest("src/lib/__tests__/anchor-text-lint.test.ts"),
  },
  {
    id: "direct-answers",
    title: "Direct-answer SSR blocks",
    ci: "direct-answers",
    mode: "offline",
    cmd: () => vitest("src/lib/__tests__/direct-answer-ssr.test.ts"),
  },
  {
    id: "noindex",
    title: "Noindex / not-found indexing rules",
    ci: "noindex-audit",
    mode: "offline",
    cmd: () => vitest("src/lib/__tests__/not-found-indexing.test.ts"),
  },
  {
    id: "live-routes",
    title: "Rendered route meta on the served site",
    ci: "seo-validate",
    mode: "live",
    cmd: (base) => ["python3", "scripts/validate-seo-routes.py", base],
  },
  {
    id: "live-jsonld",
    title: "Rendered JSON-LD sweep on the served site",
    ci: "jsonld-schema",
    mode: "live",
    cmd: (base) => ["python3", "scripts/jsonld-sweep.py", base],
  },
  {
    id: "live-sitemap-schema",
    title: "Schema coverage across sitemap URLs",
    ci: "jsonld-schema",
    mode: "live",
    cmd: (base) => ["python3", "scripts/validate-schema-sitemap.py", base],
  },
  {
    id: "live-noindex",
    title: "Noindex consistency on the served site (incl. 404s)",
    ci: "noindex-audit",
    mode: "live",
    cmd: (base) => ["python3", "scripts/validate-noindex-audit.py", "--base", base],
  },
];

function parseArgs(argv) {
  const opts = {
    live: false,
    all: false,
    list: false,
    only: /** @type {string[]} */ ([]),
    base: process.env.SEO_CHECK_BASE || DEFAULT_BASE,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--live") opts.live = true;
    else if (arg === "--all") opts.all = true;
    else if (arg === "--list") opts.list = true;
    else if (arg === "--only") opts.only.push(...String(argv[++i] ?? "").split(","));
    else if (arg.startsWith("--only=")) opts.only.push(...arg.slice(7).split(","));
    else if (arg === "--base") opts.base = String(argv[++i] ?? opts.base);
    else if (arg.startsWith("--base=")) opts.base = arg.slice(7);
    else if (arg === "--help" || arg === "-h") opts.list = true;
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  opts.only = opts.only.map((s) => s.trim()).filter(Boolean);
  return opts;
}

function selectGroups(opts) {
  if (opts.only.length > 0) {
    const unknown = opts.only.filter((id) => !GROUPS.some((g) => g.id === id));
    if (unknown.length > 0) {
      console.error(
        `Unknown group(s): ${unknown.join(", ")}\nAvailable: ${GROUPS.map((g) => g.id).join(", ")}`,
      );
      process.exit(2);
    }
    return GROUPS.filter((g) => opts.only.includes(g.id));
  }
  if (opts.all) return GROUPS;
  return GROUPS.filter((g) => (opts.live ? g.mode === "live" : g.mode === "offline"));
}

function printList() {
  console.log("SEO check groups:\n");
  for (const g of GROUPS) {
    console.log(`  ${g.id.padEnd(20)} [${g.mode.padEnd(7)}] ${g.title}  (CI: ${g.ci})`);
  }
  console.log(
    "\nRun:  node scripts/seo-check.mjs [--live|--all] [--only <id>[,<id>]] [--base <url>]",
  );
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.list) {
    printList();
    return;
  }

  const groups = selectGroups(opts);
  const needsBase = groups.some((g) => g.mode === "live");
  if (needsBase) {
    console.log(`Live checks target: ${opts.base}\n`);
  }

  const results = [];
  let failed = null;

  for (const group of groups) {
    const cmd = group.cmd(opts.base);
    console.log(`\n\u2500\u2500 ${group.title}  (CI: ${group.ci})`);
    console.log(`   $ ${cmd.join(" ")}\n`);
    const started = Date.now();
    const res = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit", shell: false });
    const ms = Date.now() - started;
    const code = res.status ?? 1;
    if (res.error) console.error(res.error.message);
    results.push({ group, code, ms });
    if (code !== 0) {
      failed = group;
      break; // fail fast, same as CI
    }
  }

  console.log("\n\u2500\u2500 Summary");
  for (const r of results) {
    const mark = r.code === 0 ? "PASS" : "FAIL";
    console.log(`   ${mark}  ${r.group.id.padEnd(20)} ${(r.ms / 1000).toFixed(1)}s`);
  }
  const skipped = groups.length - results.length;
  if (skipped > 0) console.log(`   ---   ${skipped} group(s) skipped after the failure`);

  if (failed) {
    console.log(
      `\nFailed group: ${failed.id} (mirrors CI workflow "${failed.ci}").` +
        `\nRe-run just this one with:  npm run seo:check -- --only ${failed.id}\n`,
    );
    process.exit(1);
  }
  console.log("\nAll selected SEO checks passed.\n");
}

main();
