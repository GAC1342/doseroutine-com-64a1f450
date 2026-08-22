#!/usr/bin/env node
/**
 * Article citation + medical-disclaimer checker for src/content/article-drafts.
 *
 * 1. Static pass — offline rules from src/lib/article-citation-audit.ts
 *                  (content type, sourcing depth, unknown hosts, duplicates,
 *                  inline disclaimers, stale sources).
 * 2. Live pass   — fetches every cited URL to catch dead links and permanent
 *                  redirects.
 *
 * Usage:
 *   node scripts/check-article-citations.mjs            # static + live
 *   node scripts/check-article-citations.mjs --static   # offline only
 *   node scripts/check-article-citations.mjs --json out.json
 *
 * Exit code 1 when any blocking error is found, so it can gate a publish.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRAFTS_DIR = path.join(ROOT, "src", "content", "article-drafts");
const argv = process.argv.slice(2);
const STATIC_ONLY = argv.includes("--static");
const JSON_OUT = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : null;
const CONCURRENCY = 6;
const TIMEOUT_MS = 20_000;
const UA = "DoseRoutineCitationBot/1.0 (+https://doseroutine.com/about; citation link validation)";

async function loadModules() {
  const outfile = path.join(ROOT, "node_modules", ".cache", "article-citations.mjs");
  await build({
    entryPoints: [path.join(ROOT, "scripts", "article-citations.entry.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile,
    logLevel: "silent",
    alias: { "@": path.join(ROOT, "src") },
  });
  return import(pathToFileURL(outfile).href);
}

/** Read every draft markdown file (skips planning docs without frontmatter). */
function readDrafts(toArticleDraft) {
  return readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => ({ file, raw: readFileSync(path.join(DRAFTS_DIR, file), "utf8") }))
    .filter(({ raw }) => /^---\r?\n/.test(raw))
    .map(({ file, raw }) => toArticleDraft(file, raw));
}

async function checkUrl(url) {
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "user-agent": UA, accept: "*/*" },
      });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let res = await attempt("HEAD");
    if (res.status === 403 || res.status === 405 || res.status === 501) {
      res = await attempt("GET");
    }
    const finalUrl = res.url || url;
    const moved = finalUrl.replace(/\/$/, "") !== url.replace(/\/$/, "");
    if (res.status >= 500) {
      return { level: "warning", code: "server_error", status: res.status, finalUrl };
    }
    if (res.status === 429) {
      return { level: "warning", code: "rate_limited", status: res.status, finalUrl };
    }
    // 401/403 after a GET retry is bot blocking, not a dead source.
    if (res.status === 401 || res.status === 403) {
      return { level: "warning", code: "bot_blocked", status: res.status, finalUrl };
    }
    if (res.status >= 400) {
      return { level: "error", code: "dead_link", status: res.status, finalUrl };
    }
    if (moved) {
      return { level: "warning", code: "redirected", status: res.status, finalUrl };
    }
    return { level: "info", code: "ok", status: res.status, finalUrl };
  } catch (err) {
    const aborted = err?.name === "AbortError";
    return {
      level: "warning",
      code: aborted ? "timeout" : "fetch_failed",
      status: 0,
      finalUrl: url,
      detail: aborted ? `no response in ${TIMEOUT_MS}ms` : String(err?.message ?? err),
    };
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) || 1 }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function main() {
  const { auditArticleCitations, extractCitations, splitIssues, toArticleDraft } =
    await loadModules();

  const drafts = readDrafts(toArticleDraft);
  const staticIssues = auditArticleCitations(drafts);

  const citations = drafts.flatMap((d) => extractCitations(d)).filter((c) => c.host);
  const unique = [...new Map(citations.map((c) => [c.url, c])).values()];
  const liveIssues = [];

  if (!STATIC_ONLY) {
    const results = await mapLimit(unique, CONCURRENCY, async (c) => ({
      citation: c,
      result: await checkUrl(c.url),
    }));
    for (const { citation, result } of results) {
      if (result.code === "ok") continue;
      liveIssues.push({
        slug: citation.slug,
        file: citation.file,
        url: citation.url,
        level: result.level === "info" ? "warning" : result.level,
        code: result.code,
        message:
          result.code === "redirected"
            ? `Redirects to ${result.finalUrl} — update the link.`
            : `HTTP ${result.status || "—"}${result.detail ? ` (${result.detail})` : ""}`,
      });
    }
  }

  const issues = [...staticIssues, ...liveIssues];
  const { errors, warnings } = splitIssues(issues);

  const report = {
    checkedAt: new Date().toISOString(),
    drafts: drafts.length,
    citations: citations.length,
    uniqueUrls: unique.length,
    mode: STATIC_ONLY ? "static" : "static+live",
    errors,
    warnings,
  };

  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));

  console.log(
    `Article citation check — ${report.drafts} drafts, ${report.citations} citations (${report.mode})`,
  );
  for (const i of warnings) {
    console.log(`  ⚠ ${i.slug} [${i.code}] ${i.url ?? ""} ${i.message}`);
  }
  for (const i of errors) {
    console.error(`  ✖ ${i.slug} [${i.code}] ${i.url ?? ""} ${i.message}`);
  }

  if (errors.length) {
    console.error(`\n${errors.length} blocking citation/disclaimer problem(s).`);
    process.exit(1);
  }
  console.log(`\nOK — drafts pass the citation gate. ${warnings.length} warning(s).`);
}

main().catch((err) => {
  console.error("article citation check crashed:", err);
  process.exit(1);
});
