#!/usr/bin/env node
/**
 * Cross-browser geometry gate for the workout-type illustration.
 *
 * Playwright compares pixels per project, so a snapshot can never tell you
 * "WebKit renders the modal 8px narrower than Chromium". This script reads the
 * geometry ledgers written by e2e/exercise-art-visual.spec.ts
 * (test-results/exercise-art-geometry/<project>.json) and fails when the
 * thumbnail, dialog or image boxes disagree between engines beyond tolerance.
 *
 * Usage: node scripts/check-exercise-art-geometry.mjs [dir]
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = process.argv[2] ?? join("test-results", "exercise-art-geometry");
/** Sub-pixel rounding and scrollbar-free engines still differ slightly. */
const TOLERANCE_PX = 2;
const KEYS = ["thumb", "dialog", "image"];
const DIMS = ["x", "y", "width", "height"];

if (!existsSync(DIR)) {
  console.error(`No geometry ledgers found at ${DIR}. Run the visual regression spec first.`);
  process.exit(1);
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
if (files.length < 2) {
  console.error(
    `Need ledgers from at least 2 browsers to compare, found ${files.length} in ${DIR}.`,
  );
  process.exit(1);
}

const ledgers = files.map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")));
const viewports = [...new Set(ledgers.flatMap((l) => Object.keys(l.viewports ?? {})))];

const failures = [];
for (const viewport of viewports) {
  const present = ledgers.filter((l) => l.viewports?.[viewport]);
  if (present.length !== ledgers.length) {
    failures.push(
      `${viewport}: missing from ${ledgers
        .filter((l) => !l.viewports?.[viewport])
        .map((l) => l.project)
        .join(", ")}`,
    );
    continue;
  }
  for (const key of KEYS) {
    for (const dim of DIMS) {
      const values = present.map((l) => ({
        project: l.project,
        value: l.viewports[viewport][key]?.[dim],
      }));
      if (values.some((v) => typeof v.value !== "number")) {
        failures.push(`${viewport}/${key}.${dim}: missing value in one or more ledgers`);
        continue;
      }
      const min = Math.min(...values.map((v) => v.value));
      const max = Math.max(...values.map((v) => v.value));
      if (max - min > TOLERANCE_PX) {
        failures.push(
          `${viewport}/${key}.${dim}: spread ${max - min}px > ${TOLERANCE_PX}px (` +
            values.map((v) => `${v.project}=${v.value}`).join(", ") +
            ")",
        );
      }
    }
  }
}

const summary = ledgers.map((l) => l.project).join(", ");
if (failures.length > 0) {
  console.error(`Cross-browser geometry drift detected (${summary}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Illustration geometry matches across ${summary} for: ${viewports.join(", ")}.`);
