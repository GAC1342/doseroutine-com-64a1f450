#!/usr/bin/env node
/**
 * Folds per-viewport geometry ledgers back into one file per browser (and per
 * density, for the DPR suite).
 *
 * The specs write `<project>__<viewport>.json` (and
 * `<project>-dpr<n>__<viewport>.json`) so parallel CI matrix jobs never
 * overwrite each other's results. After the artifacts from every matrix job
 * are downloaded into one directory, this merges them into the shape the gate
 * scripts expect: one ledger per project (per density), with every viewport
 * inside it.
 *
 * Usage: node scripts/merge-exercise-art-geometry.mjs <inputDir> <outputDir>
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [inputDir, outputDir] = process.argv.slice(2);
if (!inputDir || !outputDir) {
  console.error("Usage: node scripts/merge-exercise-art-geometry.mjs <inputDir> <outputDir>");
  process.exit(1);
}

/** Recursively collect .json files (artifact downloads nest one dir per job). */
function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collect(full));
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out;
}

if (!existsSync(inputDir)) {
  console.error(`Directory not found: ${inputDir}`);
  process.exit(1);
}

const files = collect(inputDir);
if (files.length === 0) {
  console.error(`No ledgers found under ${inputDir}`);
  process.exit(1);
}

/** key -> merged ledger */
const merged = new Map();
for (const file of files) {
  let ledger;
  try {
    ledger = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`Skipping unreadable ledger ${file}: ${err.message}`);
    continue;
  }
  if (!ledger?.project || !ledger?.viewports) continue;
  const key = ledger.dpr ? `${ledger.project}-dpr${ledger.dpr}` : ledger.project;
  const target = merged.get(key) ?? {
    project: ledger.project,
    ...(ledger.dpr ? { dpr: ledger.dpr } : {}),
    viewports: {},
  };
  Object.assign(target.viewports, ledger.viewports);
  merged.set(key, target);
}

if (merged.size === 0) {
  console.error(`No valid ledgers found under ${inputDir}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });
for (const [key, ledger] of merged) {
  const out = join(outputDir, `${key}.json`);
  writeFileSync(out, JSON.stringify(ledger, null, 2));
  console.log(
    `Merged ${Object.keys(ledger.viewports).length} viewport(s) into ${out}: ${Object.keys(
      ledger.viewports,
    ).join(", ")}`,
  );
}
