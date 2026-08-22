#!/usr/bin/env node
/**
 * Static guard: long-form page copy must render inside the shared container.
 *
 * Two rules, both derived from bugs that actually shipped:
 *
 *  1. Every `<PageProse />` must be a direct child of `<ProseContainer>`.
 *     Hand-rolled `<div className="mx-auto max-w-3xl px-4">` wrappers drift —
 *     one page loses its `px-4` and its paragraphs run to the screen edge on
 *     iPhone while every neighbouring page still looks correct.
 *
 *  2. No route may hand-roll its own long-form container: the literal class
 *     combination the container owns must not be duplicated around prose.
 *
 * Usage: node scripts/check-prose-container.mjs
 * Exit code 1 on any violation (wired into the prepublish gate + CI).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = "src/routes";
const CONTAINER = "ProseContainer";

/** Recursively collect .tsx files under a directory. */
function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(path));
    else if (entry.name.endsWith(".tsx")) out.push(path);
  }
  return out;
}

/**
 * @param {string} source
 * @param {string} file
 * @returns {string[]} human-readable violations
 */
export function auditSource(source, file) {
  const problems = [];
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    if (!line.includes("<PageProse")) return;
    const lineNo = index + 1;

    // Walk back over blank lines to the nearest opening tag.
    let prev = index - 1;
    while (prev >= 0 && lines[prev].trim() === "") prev -= 1;
    const before = prev >= 0 ? lines[prev].trim() : "";

    if (!before.startsWith(`<${CONTAINER}`)) {
      problems.push(
        `${file}:${lineNo} — <PageProse> must be a direct child of <${CONTAINER}>, found: ${
          before || "(start of file)"
        }`,
      );
      return;
    }

    let next = index + 1;
    while (next < lines.length && lines[next].trim() === "") next += 1;
    const after = next < lines.length ? lines[next].trim() : "";
    if (after !== `</${CONTAINER}>`) {
      problems.push(
        `${file}:${lineNo} — <${CONTAINER}> must close immediately after <PageProse>, found: ${after}`,
      );
    }
  });

  // Rule 2: no bespoke re-implementation of the shared container around prose.
  const bespoke = /className="[^"]*\bmax-w-3xl\b[^"]*"[^>]*>\s*\n\s*<PageProse/g;
  if (bespoke.test(source)) {
    problems.push(`${file} — hand-rolled prose container detected; use <${CONTAINER}> instead`);
  }

  if (source.includes("<PageProse") && !source.includes("components/prose-container")) {
    problems.push(`${file} — imports PageProse but not ${CONTAINER}`);
  }

  return problems;
}

function main() {
  const files = collect(ROUTES_DIR);
  const problems = [];
  let checked = 0;

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (!source.includes("<PageProse")) continue;
    checked += 1;
    problems.push(...auditSource(source, file));
  }

  if (problems.length) {
    console.error("Long-form prose container violations:\n");
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    console.error(
      `\n${problems.length} violation(s). Wrap the block in <ProseContainer> from ` +
        "@/components/prose-container so every long-form page shares one measure and gutter.",
    );
    process.exit(1);
  }

  console.log(`✓ ${checked} route(s) render long-form copy inside <ProseContainer>`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
