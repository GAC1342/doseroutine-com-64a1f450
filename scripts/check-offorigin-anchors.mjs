#!/usr/bin/env node
/**
 * check-offorigin-anchors.mjs — build-time guard for native shell navigation.
 *
 * Inside the iOS/Android webview an off-origin `<a href="https://...">` without
 * `target="_blank"` navigates the app's own webview to a third-party site: the
 * user is stranded with no chrome and no back button, which App Review treats
 * as a broken experience. Two rules, checked statically over src/:
 *
 *   1. OFF_ORIGIN_INLINE_NAV — off-origin anchor missing target="_blank".
 *   2. SAME_SITE_ABSOLUTE    — absolute doseroutine.com URL that should be a
 *      router <Link>, otherwise the shell hands it to the system browser.
 *
 * Exit code 1 on any violation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const SITE_HOSTS = /^(https?:)?\/\/(www\.)?doseroutine\.com/i;

/** Files that legitimately embed absolute site URLs (metadata, not navigation). */
const ALLOW_FILE = [
  /[\\/]lib[\\/]seo/i,
  /[\\/]lib[\\/].*canonical/i,
  /[\\/]lib[\\/].*sitemap/i,
  /[\\/]lib[\\/].*jsonld/i,
  /[\\/]lib[\\/].*schema/i,
  /[\\/]routes[\\/]sitemap/i,
  /[\\/]routes[\\/]lovable[\\/]/i,
  // Email bodies render in a mail client, never in the app webview.
  /[\\/]lib[\\/]email-templates[\\/]/i,
  /__tests__/,
  /\.test\.[tj]sx?$/,
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Matches a whole opening <a ...> tag, including multi-line JSX attributes. */
const ANCHOR_RE = /<a\s([^>]*?)>/gs;

const violations = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file);
  if (ALLOW_FILE.some((re) => re.test(rel))) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(ANCHOR_RE)) {
    const attrs = match[1];
    const href = /href\s*=\s*["'{]\s*(?:`)?([^"'`}\s]+)/.exec(attrs)?.[1] ?? "";
    if (!href.startsWith("http") && !href.startsWith("//")) continue;
    const line = source.slice(0, match.index).split("\n").length;
    if (SITE_HOSTS.test(href)) {
      violations.push({
        rel,
        line,
        href,
        code: "SAME_SITE_ABSOLUTE",
        detail: 'Use a TanStack router <Link to="/path"> so the native shell stays in the app.',
      });
      continue;
    }
    if (!/target\s*=\s*["'{]?\s*(?:`)?_blank/.test(attrs)) {
      violations.push({
        rel,
        line,
        href,
        code: "OFF_ORIGIN_INLINE_NAV",
        detail:
          'Off-origin links must open in the system browser: add target="_blank" rel="noopener noreferrer".',
      });
    }
  }
}

if (violations.length === 0) {
  console.log("[offorigin-anchors] clean — every off-origin anchor targets the system browser.");
  process.exit(0);
}

console.error(`[offorigin-anchors] ${violations.length} violation(s):\n`);
for (const v of violations) {
  console.error(`  ${v.rel}:${v.line}  [${v.code}]\n    ${v.href}\n    ${v.detail}\n`);
}
process.exit(1);
