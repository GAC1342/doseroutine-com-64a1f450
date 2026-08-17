#!/usr/bin/env node
/**
 * Blog citation checker.
 *
 * 1. Static pass  — offline rules from src/lib/blog-citation-audit.ts
 *                   (bad URLs, unknown hosts, duplicates, thin/stale sourcing).
 * 2. Live pass    — fetches every citation URL and flags dead links (4xx/5xx),
 *                   permanent redirects (the stored URL should be updated) and
 *                   timeouts.
 *
 * Usage:
 *   node scripts/check-blog-citations.mjs            # static + live
 *   node scripts/check-blog-citations.mjs --static   # offline only (no network)
 *   node scripts/check-blog-citations.mjs --json out.json
 *
 * Exit code 1 when any blocking error is found, so it can gate a deploy.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const STATIC_ONLY = argv.includes("--static");
const JSON_OUT = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : null;
const CONCURRENCY = 6;
const TIMEOUT_MS = 20_000;
const UA = "DoseRoutineCitationBot/1.0 (+https://doseroutine.com/about; citation link validation)";

/** Bundle the TS sources so this plain-Node script can import them. */
async function loadModules() {
  const outfile = path.join(ROOT, "node_modules", ".cache", "blog-citations.mjs");
  await build({
    entryPoints: [path.join(ROOT, "scripts", "blog-citations.entry.ts")],
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
    // Plenty of publishers reject HEAD outright — retry once with GET.
    if (res.status === 403 || res.status === 405 || res.status === 501) {
      res = await attempt("GET");
    }
    const finalUrl = res.url || url;
    const moved = finalUrl.replace(/\/$/, "") !== url.replace(/\/$/, "");
    if (res.status >= 500) {
      return { ok: false, level: "warning", code: "server_error", status: res.status, finalUrl };
    }
    if (res.status === 429) {
      return { ok: true, level: "warning", code: "rate_limited", status: res.status, finalUrl };
    }
    // 401/403 after a GET retry is almost always bot blocking, not a dead
    // source — report it, but don't fail the deploy on someone's WAF.
    if (res.status === 401 || res.status === 403) {
      return { ok: true, level: "warning", code: "bot_blocked", status: res.status, finalUrl };
    }
    if (res.status >= 400) {
      return { ok: false, level: "error", code: "dead_link", status: res.status, finalUrl };
    }
    if (moved) {
      return { ok: true, level: "warning", code: "redirected", status: res.status, finalUrl };
    }
    return { ok: true, level: "info", code: "ok", status: res.status, finalUrl };
  } catch (err) {
    const aborted = err?.name === "AbortError";
    return {
      ok: false,
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
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function main() {
  const { BLOG_POSTS, auditBlogCitations } = await loadModules();

  const staticIssues = auditBlogCitations(BLOG_POSTS);
  const liveIssues = [];

  const refs = BLOG_POSTS.flatMap((p) =>
    p.refs.map((r) => ({ slug: p.slug, cite: r.cite, url: r.url })),
  );

  if (!STATIC_ONLY) {
    const results = await mapLimit(refs, CONCURRENCY, async (ref) => ({
      ref,
      result: await checkUrl(ref.url),
    }));
    for (const { ref, result } of results) {
      if (result.code === "ok") continue;
      liveIssues.push({
        slug: ref.slug,
        url: ref.url,
        level: result.level === "info" ? "warning" : result.level,
        code: result.code,
        message:
          result.code === "redirected"
            ? `Redirects to ${result.finalUrl} — update the stored URL.`
            : `HTTP ${result.status || "—"}${result.detail ? ` (${result.detail})` : ""}`,
      });
    }
  }

  const issues = [...staticIssues, ...liveIssues];
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  const report = {
    checkedAt: new Date().toISOString(),
    posts: BLOG_POSTS.length,
    citations: refs.length,
    mode: STATIC_ONLY ? "static" : "static+live",
    errors,
    warnings,
  };

  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));

  console.log(
    `Blog citation check — ${report.posts} posts, ${report.citations} citations (${report.mode})`,
  );
  for (const i of warnings) console.log(`  ⚠ ${i.slug} [${i.code}] ${i.url ?? ""} ${i.message}`);
  for (const i of errors) console.error(`  ✖ ${i.slug} [${i.code}] ${i.url ?? ""} ${i.message}`);

  if (errors.length) {
    console.error(`\n${errors.length} blocking citation problem(s).`);
    process.exit(1);
  }
  console.log(`\nOK — no broken citations. ${warnings.length} warning(s).`);
}

main().catch((err) => {
  console.error("citation check crashed:", err);
  process.exit(1);
});
