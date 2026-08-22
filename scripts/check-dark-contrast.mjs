#!/usr/bin/env node
/**
 * Design-time contrast lint.
 *
 * Rule families:
 *   1. `palette`   — severity/chip/status colours written as light-only
 *                    Tailwind palette classes (`bg-amber-50`) with no `dark:`
 *                    counterpart. Covers base, hover, focus and active states.
 *   2. `malformed` — broken severity CSS variable usage (`--severity-x-bg))`).
 *   3. `link`      — anchors/links coloured with a raw palette class.
 *   4. `muted`     — helper text faded below a readable alpha
 *                    (`text-muted-foreground/40`).
 *   5. `skeleton`  — loading placeholders tinted with a palette colour instead
 *                    of the neutral `bg-muted` surface.
 *
 * Every violation carries a suggested semantic replacement token
 * (see scripts/dark-contrast-token-map.mjs).
 *
 * Usage:
 *   node scripts/check-dark-contrast.mjs                 # lint
 *   node scripts/check-dark-contrast.mjs --github        # + PR annotations
 *   node scripts/check-dark-contrast.mjs --fix           # apply suggestions
 *   node scripts/check-dark-contrast.mjs --json out.json # machine readable
 *   node scripts/check-dark-contrast.mjs --update-allowlist
 */
import { readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { suggestToken, mirrorDarkVariant } from "./dark-contrast-token-map.mjs";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const ALLOWLIST_PATH = path.join(ROOT, "scripts", "dark-contrast-allowlist.json");

/** Palette families that commonly carry severity / chip / status meaning. */
const FAMILIES = [
  "red",
  "rose",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
];

const FAMILY_RE = FAMILIES.join("|");
const UTILITIES =
  "bg|text|border|ring|fill|stroke|from|via|to|decoration|outline|shadow|divide|placeholder|accent|caret";

// Captures a full variant chain (`dark:hover:`, `group-hover:`, `data-[x]:`)
// followed by a palette colour class.
const COLOR_CLASS_RE = new RegExp(
  `(?<![\\w-])((?:(?:[a-z][\\w-]*|data-\\[[^\\]]+\\]|\\[[^\\]]+\\]):)*)((?:${UTILITIES})-(?:${FAMILY_RE})-\\d{2,3}(?:\\/\\d{1,3})?)`,
  "g",
);
// `var(--severity-x-bg))` style typos and bare unwrapped variables in className.
const MALFORMED_TOKEN_RE = /--severity-[a-z-]+\)\)(?!\s*[;,)])/g;
// Helper text faded below a readable level.
const FADED_MUTED_RE = /\b(text-muted-foreground\/([0-9]{1,2}))\b/g;
const MIN_MUTED_ALPHA = 70;

const INTERACTIVE_VARIANTS = ["hover", "focus", "focus-visible", "active", "group-hover"];

const IGNORED_DIRS = new Set(["node_modules", "__snapshots__", "integrations"]);

async function collectFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      out.push(...(await collectFiles(full)));
    } else if (/\.(tsx|ts)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function loadAllowlist() {
  try {
    const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
    return new Set(raw.entries ?? []);
  } catch {
    return new Set();
  }
}

const isLinkLine = (line) => /<(?:a|Link|NavLink)[\s>]/.test(line) || /\bhref=/.test(line);
const isSkeletonLine = (line) => /Skeleton|animate-pulse|skeleton/i.test(line);

function describeVariants(chain) {
  const parts = chain.split(":").filter(Boolean);
  return parts.filter((p) => INTERACTIVE_VARIANTS.includes(p));
}

/**
 * Scan one file's source for unreadable-in-dark colour usage.
 * @returns {{key:string,file:string,line:number,column:number,rule:string,
 *            message:string,offending:string,suggestion:string|null,reason:string}[]}
 */
export function findViolations(source, relPath) {
  const violations = [];
  const byLine = source.split("\n");

  byLine.forEach((line, index) => {
    if (line.includes("dark-contrast-lint-ignore")) return;
    const lineNo = index + 1;
    const link = isLinkLine(line);
    const skeleton = isSkeletonLine(line);

    // --- rule: palette (base + interactive states) --------------------------
    const seen = new Map();
    for (const match of line.matchAll(COLOR_CLASS_RE)) {
      const chain = match[1] ?? "";
      const cls = match[2];
      const variants = chain.split(":").filter(Boolean);
      const hasDark = variants.includes("dark");
      const stateChain = variants.filter((v) => v !== "dark");
      const utility = cls.replace(/-(?:\d{2,3})(?:\/\d{1,3})?$/, "");
      // Bucket per state so `hover:` needs its own dark counterpart.
      const bucketKey = `${stateChain.join(":")}|${utility}`;
      const bucket = seen.get(bucketKey) ?? {
        light: [],
        dark: false,
        column: match.index ?? 0,
        stateChain,
      };
      if (hasDark) bucket.dark = true;
      // Alpha-modified colours blend with whatever surface is behind them, so
      // they read acceptably in both themes.
      else if (!cls.includes("/")) {
        bucket.light.push(cls);
        bucket.column = (match.index ?? 0) + 1;
      }
      seen.set(bucketKey, bucket);
    }

    for (const bucket of seen.values()) {
      if (bucket.dark || bucket.light.length === 0) continue;
      const cls = bucket.light[0];
      const states = bucket.stateChain.filter((v) => INTERACTIVE_VARIANTS.includes(v));
      const prefix = bucket.stateChain.length ? `${bucket.stateChain.join(":")}:` : "";
      const { token, reason } = suggestToken(cls, {
        isLink: link,
        isSkeleton: skeleton,
        variants: prefix,
        isInteractive: states.length > 0,
      });
      const fallback = mirrorDarkVariant(cls);
      const suggestion =
        token ?? (fallback ? `${prefix}${cls} dark:${prefix}${fallback.slice(5)}` : null);
      const rule = skeleton ? "skeleton" : link ? "link" : states.length ? "state" : "palette";
      const where = states.length ? ` in the \`${states.join(":")}\` state` : "";
      violations.push({
        key: `${relPath}::${cls}`,
        file: relPath,
        line: lineNo,
        column: bucket.column,
        rule,
        offending: `${prefix}${cls}`,
        suggestion,
        reason: token ? reason : "pair the light class with a mirrored dark: variant",
        message: `light-only \`${prefix}${cls}\`${where} has no \`dark:${prefix}${cls.replace(/-(?:\d{2,3})(?:\/\d{1,3})?$/, "")}-…\` counterpart`,
      });
    }

    // --- rule: malformed severity token ------------------------------------
    for (const match of line.matchAll(MALFORMED_TOKEN_RE)) {
      violations.push({
        key: `${relPath}::malformed`,
        file: relPath,
        line: lineNo,
        column: (match.index ?? 0) + 1,
        rule: "malformed",
        offending: match[0],
        suggestion: null,
        reason: "close the CSS variable correctly",
        message: `malformed severity token usage \`${match[0]}\``,
      });
    }

    // --- rule: faded muted helper text --------------------------------------
    for (const match of line.matchAll(FADED_MUTED_RE)) {
      const alpha = Number(match[2]);
      if (alpha >= MIN_MUTED_ALPHA) continue;
      violations.push({
        key: `${relPath}::${match[1]}`,
        file: relPath,
        line: lineNo,
        column: (match.index ?? 0) + 1,
        rule: "muted",
        offending: match[1],
        suggestion: "text-muted-foreground",
        reason: `helper text below ${MIN_MUTED_ALPHA}% opacity fails contrast on the dark surface`,
        message: `faded helper text \`${match[1]}\` is unreadable in dark mode`,
      });
    }
  });

  return violations;
}

export async function runLint() {
  const files = await collectFiles(SRC);
  const all = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    all.push(...findViolations(readFileSync(file, "utf8"), rel));
  }
  return all;
}

/**
 * Apply every automatic token replacement for the given violations.
 * Only rewrites exact class-token matches, one file at a time.
 */
export function applyFixes(violations) {
  const byFile = new Map();
  for (const v of violations) {
    if (!v.suggestion || v.suggestion === v.offending) continue;
    if (!byFile.has(v.file)) byFile.set(v.file, []);
    byFile.get(v.file).push(v);
  }
  let fixed = 0;
  for (const [file, items] of byFile) {
    const abs = path.join(ROOT, file);
    const lines = readFileSync(abs, "utf8").split("\n");
    for (const v of items) {
      const idx = v.line - 1;
      const original = lines[idx];
      if (original === undefined) continue;
      const re = new RegExp(`(?<![\\w-])${escapeRe(v.offending)}(?![\\w-])`);
      if (!re.test(original)) continue;
      lines[idx] = original.replace(re, v.suggestion);
      fixed += 1;
    }
    writeFileSync(abs, lines.join("\n"));
  }
  return fixed;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

function annotate(v) {
  const suggestion = v.suggestion
    ? ` Suggested replacement: \`${v.suggestion}\` (${v.reason}).`
    : "";
  const title = `dark-contrast/${v.rule}`;
  const message = `${v.message}.${suggestion}`.replace(/\r?\n/g, " ");
  return `::error file=${v.file},line=${v.line},col=${v.column},title=${title}::${message}`;
}

export const REPORT_VERSION = 2;
export const DEFAULT_REPORT_PATH = "dark-contrast-report.json";

function tally(items, key) {
  const out = {};
  for (const item of items) out[item[key]] = (out[item[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

/**
 * Build the machine-readable report consumed by CI, the PR comment renderer
 * and anyone reviewing failures locally. Stable shape:
 *
 *   { version, generatedAt, status, summary, failuresByRule, failuresByFile,
 *     suggestions, failures, allowlisted, violations }
 *
 * `suggestions` lists only the failures that can be auto-fixed, so a reviewer
 * can see exactly which replacement `--fix` would apply.
 */
export function buildReport(violations, failures, options = {}) {
  const allowlisted = violations.filter((v) => !failures.includes(v));
  const fixable = failures.filter((f) => f.suggestion && f.suggestion !== f.offending);
  return {
    version: REPORT_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    status: failures.length === 0 ? "pass" : "fail",
    fixApplied: options.fixApplied ?? 0,
    summary: {
      violations: violations.length,
      failures: failures.length,
      allowlisted: allowlisted.length,
      fixable: fixable.length,
      filesAffected: new Set(failures.map((f) => f.file)).size,
    },
    failuresByRule: tally(failures, "rule"),
    failuresByFile: tally(failures, "file"),
    suggestions: fixable.map((f) => ({
      file: f.file,
      line: f.line,
      column: f.column,
      rule: f.rule,
      offending: f.offending,
      suggestion: f.suggestion,
      reason: f.reason,
    })),
    failures,
    allowlisted,
    violations,
  };
}

const isMain = process.argv[1] && process.argv[1].endsWith("check-dark-contrast.mjs");
if (isMain) {
  const argv = process.argv.slice(2);
  const update = argv.includes("--update-allowlist");
  const github = argv.includes("--github") || process.env.GITHUB_ACTIONS === "true";
  const fix = argv.includes("--fix");
  const jsonIdx = argv.indexOf("--json");
  const jsonNext = jsonIdx >= 0 ? argv[jsonIdx + 1] : null;
  const jsonPath =
    jsonIdx >= 0 ? (jsonNext && !jsonNext.startsWith("--") ? jsonNext : DEFAULT_REPORT_PATH) : null;

  let violations = await runLint();

  if (update) {
    const entries = [...new Set(violations.map((v) => v.key))].sort();
    writeFileSync(
      ALLOWLIST_PATH,
      `${JSON.stringify(
        {
          note: "Pre-existing light-only colour usages. Do not add new entries; run `bun run lint:dark-contrast:fix` or add a matching dark: variant instead.",
          entries,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`Wrote ${entries.length} allowlist entries.`);
    process.exit(0);
  }

  const allowed = loadAllowlist();
  let failures = violations.filter((v) => !allowed.has(v.key));

  let fixApplied = 0;
  if (fix) {
    fixApplied = applyFixes(failures);
    const count = fixApplied;
    console.log(`Applied ${count} automatic token replacement(s).`);
    violations = await runLint();
    failures = violations.filter((v) => !allowed.has(v.key));
  }

  if (jsonPath) {
    const report = buildReport(violations, failures, { fixApplied });
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(
      `Wrote dark-contrast report to ${jsonPath} (${report.summary.failures} failure(s), ${report.summary.fixable} auto-fixable).`,
    );
  }

  if (failures.length === 0) {
    console.log(`✓ dark-contrast lint passed (${violations.length} allowlisted legacy usages).`);
    process.exit(0);
  }

  if (github) for (const f of failures) console.log(annotate(f));

  console.error(`✗ dark-contrast lint found ${failures.length} issue(s):\n`);
  for (const f of failures) {
    console.error(`  ${f.file}:${f.line}:${f.column} [${f.rule}] ${f.message}`);
    if (f.suggestion) console.error(`      → replace with \`${f.suggestion}\` — ${f.reason}`);
  }
  console.error(
    "\nRun `bun run lint:dark-contrast:fix` to apply the suggested semantic tokens automatically.",
  );
  process.exit(1);
}
