#!/usr/bin/env node
/**
 * Generates the USDA edge-case fixtures from the declarative spec in
 * `scripts/usda-edge-fixture-spec.mjs`.
 *
 *   node scripts/generate-usda-edge-fixtures.mjs          # write files
 *   node scripts/generate-usda-edge-fixtures.mjs --check   # CI drift check
 *   node scripts/generate-usda-edge-fixtures.mjs --stale-only  # only missing/stale
 *
 * Writes `src/test/fixtures/usda/edge-cases/<key>.json` for every case plus a
 * generated `index.ts` barrel exporting the payloads, the `USDA_EDGE_CASES`
 * table and `USDA_MALFORMED_ENVELOPES`. Hand-editing those files is a mistake:
 * the next run overwrites them and `--check` fails the build.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EDGE_CASES, MALFORMED_ENVELOPES } from "./usda-edge-fixture-spec.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src/test/fixtures/usda/edge-cases");
const check = process.argv.includes("--check");
const staleOnly = process.argv.includes("--stale-only") || process.argv.includes("--repair");

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function renderIndex() {
  const all = [
    ...EDGE_CASES.map((c) => ({ export: c.export, file: c.key })),
    ...MALFORMED_ENVELOPES.map((c) => ({ export: c.export, file: c.file })),
  ];
  const imports = all.map((c) => `import ${c.export} from "./${c.file}.json";`).join("\n");
  const exports = all.map((c) => `  ${c.export},`).join("\n");
  const cases = EDGE_CASES.map(
    (c) => `  {
    key: ${JSON.stringify(c.key)},
    about: ${JSON.stringify(c.about)},
    payload: ${c.export} as Record<string, unknown>,
    expect: ${JSON.stringify(c.expect)},
  },`,
  ).join("\n");
  const envelopes = MALFORMED_ENVELOPES.map(
    (c) => `  { key: ${JSON.stringify(c.key)}, payload: ${c.export} },`,
  ).join("\n");

  return `/**
 * USDA edge-case fixtures.
 *
 * GENERATED FILE — do not edit by hand.
 * Source of truth: scripts/usda-edge-fixture-spec.mjs
 * Regenerate with: npm run fixtures:usda
 *
 * Realistic FoodData Central payloads that break the happy path: unparseable
 * nutrient values, missing identity fields, corrupt gram weights, macros that
 * are physically impossible, and malformed search envelopes. Tests import
 * these instead of hardcoding payload literals.
 */
${imports}

export {
${exports}
};

export type UsdaEdgeCaseFixture = {
  key: string;
  about: string;
  payload: Record<string, unknown>;
  /** What the importer must do with it. */
  expect: "accept" | "reject";
};

/** Single-food edge cases, each tagged with the expected importer outcome. */
export const USDA_EDGE_CASES: UsdaEdgeCaseFixture[] = [
${cases}
];

/** Search envelopes that are not usable food lists. */
export const USDA_MALFORMED_ENVELOPES: { key: string; payload: unknown }[] = [
${envelopes}
];
`;
}

const files = new Map();
for (const c of EDGE_CASES) files.set(`${c.key}.json`, json(c.payload));
for (const c of MALFORMED_ENVELOPES) files.set(`${c.file}.json`, json(c.payload));
files.set("index.ts", renderIndex());

mkdirSync(OUT_DIR, { recursive: true });

const drift = [];
const written = [];
const missing = [];
for (const [name, content] of files) {
  const path = join(OUT_DIR, name);
  const exists = existsSync(path);
  const current = exists ? readFileSync(path, "utf8") : null;
  if (current === content) continue;
  if (!exists) missing.push(name);
  if (check) {
    drift.push(name);
  } else {
    writeFileSync(path, content);
    written.push(name);
  }
}

// Orphans: files present on disk that the spec no longer produces.
const orphans = readdirSync(OUT_DIR).filter((f) => !files.has(f));

if (check) {
  if (drift.length || orphans.length) {
    console.error("USDA edge-case fixtures are out of date.");
    for (const f of drift) console.error(`  stale: ${f}`);
    for (const f of orphans) console.error(`  orphan (not in spec): ${f}`);
    console.error("Run: npm run fixtures:usda");
    process.exit(1);
  }
  console.log(`USDA edge-case fixtures up to date (${files.size} files).`);
} else if (staleOnly) {
  if (!written.length && !orphans.length) {
    console.log(`USDA edge-case fixtures already up to date (${files.size} files).`);
  } else {
    for (const f of written) console.log(`  ${missing.includes(f) ? "created" : "updated"}: ${f}`);
    for (const f of orphans) {
      rmSync(join(OUT_DIR, f));
      console.log(`  removed orphan: ${f}`);
    }
    console.log(`Regenerated ${written.length} stale/missing file(s) in ${OUT_DIR}`);
  }
} else {
  console.log(`Wrote ${files.size} USDA edge-case fixture files to ${OUT_DIR}`);
  for (const f of orphans) console.warn(`  warning: orphan file not in spec: ${f}`);
}
