#!/usr/bin/env node
/**
 * Cross-density geometry gate for the workout-type illustration.
 *
 * Reads the ledgers written by e2e/exercise-art-dpr.spec.ts
 * (test-results/exercise-art-dpr/<project>-dpr<n>.json) and fails when the
 * thumbnail, dialog or image CSS boxes differ between devicePixelRatio 1, 2
 * and 3 within the same browser + viewport.
 *
 * Usage: node scripts/check-exercise-art-dpr.mjs [dir]
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = process.argv[2] ?? join("test-results", "exercise-art-dpr");
/** Sub-pixel snapping legitimately differs by up to 1 CSS px across densities. */
const TOLERANCE_PX = 1;
const KEYS = ["thumb", "dialog", "image"];
const DIMS = ["x", "y", "width", "height"];

if (!existsSync(DIR)) {
  console.error(`No DPR ledgers found at ${DIR}. Run the DPR regression spec first.`);
  process.exit(1);
}

const ledgers = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")));

if (ledgers.length < 2) {
  console.error(`Need at least 2 density ledgers to compare, found ${ledgers.length} in ${DIR}.`);
  process.exit(1);
}

/** project -> dpr -> viewports */
const byProject = new Map();
for (const ledger of ledgers) {
  const bucket = byProject.get(ledger.project) ?? new Map();
  bucket.set(ledger.dpr, ledger.viewports ?? {});
  byProject.set(ledger.project, bucket);
}

const failures = [];
for (const [project, byDpr] of byProject) {
  const ratios = [...byDpr.keys()].sort((a, b) => a - b);
  if (ratios.length < 2) {
    failures.push(`${project}: only dpr ${ratios.join(", ")} recorded — nothing to compare`);
    continue;
  }
  const viewports = [...new Set(ratios.flatMap((r) => Object.keys(byDpr.get(r))))];
  for (const viewport of viewports) {
    const present = ratios.filter((r) => byDpr.get(r)[viewport]);
    if (present.length !== ratios.length) {
      failures.push(
        `${project}/${viewport}: missing at dpr ${ratios
          .filter((r) => !byDpr.get(r)[viewport])
          .join(", ")}`,
      );
      continue;
    }
    for (const key of KEYS) {
      for (const dim of DIMS) {
        const values = present.map((r) => ({ dpr: r, value: byDpr.get(r)[viewport][key]?.[dim] }));
        if (values.some((v) => typeof v.value !== "number")) {
          failures.push(`${project}/${viewport}/${key}.${dim}: missing value in a ledger`);
          continue;
        }
        const min = Math.min(...values.map((v) => v.value));
        const max = Math.max(...values.map((v) => v.value));
        if (max - min > TOLERANCE_PX) {
          failures.push(
            `${project}/${viewport}/${key}.${dim}: ${max - min}px spread across densities (` +
              values.map((v) => `${v.dpr}x=${v.value}`).join(", ") +
              `)`,
          );
        }
      }
    }
  }
}

if (failures.length) {
  console.error("Illustration sizing differs across devicePixelRatio:\n");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `Illustration geometry is density-stable across ${ledgers.length} ledgers (${[
    ...byProject.keys(),
  ].join(", ")}).`,
);
