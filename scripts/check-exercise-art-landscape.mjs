#!/usr/bin/env node
/**
 * Landscape geometry regression gate for the workout-type illustration.
 *
 * The landscape spec asserts containment *inside* a single run. This script
 * runs after every project's ledger is merged (chromium / webkit /
 * mobile-safari) and turns those numbers into durable regression assertions:
 *
 *   1. Invariants — per project/viewport, the image must sit inside both the
 *      layout viewport and the visual viewport (the iOS Safari case), must not
 *      introduce page scroll, and must keep its natural aspect ratio
 *      (object-fit must never be `cover`).
 *   2. Cross-project drift — the same viewport must produce the same dialog
 *      and image boxes on every engine within tolerance, so a WebKit-only
 *      rounding change can't silently shrink the image.
 *   3. Baseline drift — boxes and aspect ratios are compared against the
 *      committed baseline in e2e/exercise-art-landscape-geometry.json, which
 *      catches slow drift that still technically "fits".
 *
 * mobile-safari (WebKit + iPhone UA/touch/DPR) is required by default because
 * it is the engine that reproduces field overflow; pass --require to change
 * the required project list.
 *
 * Usage:
 *   node scripts/check-exercise-art-landscape.mjs [dir]
 *       [--require mobile-safari]           comma-separated projects that must be present
 *       [--baseline <file>]                 default e2e/exercise-art-landscape-geometry.json
 *       [--update]                          rewrite the baseline from these ledgers
 *
 * Env: UPDATE_LANDSCAPE_GEOMETRY=1 behaves like --update.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const VALUE_FLAGS = new Set(["--require", "--baseline"]);
const positional = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));

const DIR = positional ?? join("test-results", "exercise-art-landscape");
const BASELINE = argOf("--baseline", join("e2e", "exercise-art-landscape-geometry.json"));
const REQUIRED = argOf("--require", "mobile-safari")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const UPDATE = argv.includes("--update") || process.env.UPDATE_LANDSCAPE_GEOMETRY === "1";

/** Sub-pixel layout rounding. Anything beyond this is a real cutoff. */
const SLACK_PX = 1;
/** Engines round sub-pixel geometry differently; this is the allowed spread. */
const CROSS_PROJECT_TOLERANCE_PX = 2;
/** Allowed movement versus the committed baseline before it counts as drift. */
const BASELINE_TOLERANCE_PX = 4;
/** Rendered vs natural aspect ratio, and vs the baseline ratio. */
const ASPECT_TOLERANCE = 0.02;

if (!existsSync(DIR)) {
  console.error(
    `No landscape ledgers found at ${DIR}. Run e2e/exercise-art-landscape.spec.ts first.`,
  );
  process.exit(1);
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
if (files.length === 0) {
  console.error(`No landscape ledgers (*.json) in ${DIR}.`);
  process.exit(1);
}

const ledgers = files
  .map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")))
  .filter((l) => l?.project && l?.viewports);

const projects = [...new Set(ledgers.map((l) => l.project))];
const failures = [];

for (const required of REQUIRED) {
  if (!projects.includes(required)) {
    failures.push(
      `missing ledger for required project "${required}" (have: ${projects.join(", ") || "none"})`,
    );
  }
}

// ---------------------------------------------------------------------------
// 1. Per-project invariants
// ---------------------------------------------------------------------------
for (const ledger of ledgers) {
  for (const [viewport, entry] of Object.entries(ledger.viewports)) {
    const where = `${ledger.project}/${viewport}`;
    const {
      dialog,
      image,
      viewport: vp,
      aspect,
      visualViewport: vv,
      bottomGap,
      pageOverflowX,
    } = entry;

    if (!dialog || !image || !vp) {
      failures.push(`${where}: ledger is missing dialog/image/viewport — regenerate the ledger`);
      continue;
    }

    // Vertical containment: the landscape-specific failure mode.
    if (image.y < -SLACK_PX) failures.push(`${where}: image top ${image.y}px above the viewport`);
    const imageBottom = image.y + image.height;
    if (imageBottom > vp.height + SLACK_PX) {
      failures.push(
        `${where}: image bottom ${imageBottom}px overflows the ${vp.height}px viewport by ${imageBottom - vp.height}px`,
      );
    }
    if (typeof bottomGap === "number" && bottomGap < -SLACK_PX) {
      failures.push(`${where}: bottomGap ${bottomGap}px (image is cut off at the bottom)`);
    }
    if (dialog.y < -SLACK_PX || dialog.y + dialog.height > vp.height + SLACK_PX) {
      failures.push(
        `${where}: dialog [${dialog.y}, ${dialog.y + dialog.height}] escapes the ${vp.height}px viewport`,
      );
    }

    // Horizontal containment + no page scroll.
    if (
      image.x < dialog.x - SLACK_PX ||
      image.x + image.width > dialog.x + dialog.width + SLACK_PX
    ) {
      failures.push(`${where}: image escapes the dialog horizontally`);
    }
    if (typeof pageOverflowX === "number" && pageOverflowX > SLACK_PX) {
      failures.push(`${where}: dialog introduced ${pageOverflowX}px of horizontal page scroll`);
    }

    // Visual viewport (iOS Safari collapsing toolbars).
    if (vv) {
      if (vv.top < -SLACK_PX)
        failures.push(`${where}: image top ${vv.top}px above the visual viewport`);
      if (vv.bottom > vv.height + SLACK_PX) {
        failures.push(
          `${where}: image bottom ${vv.bottom}px below the ${vv.height}px visual viewport by ${vv.bottom - vv.height}px`,
        );
      }
    }

    // Aspect-ratio fidelity.
    if (aspect) {
      if (aspect.objectFit === "cover") {
        failures.push(`${where}: object-fit: cover crops the illustration`);
      }
      if (typeof aspect.delta === "number" && aspect.delta > ASPECT_TOLERANCE) {
        failures.push(
          `${where}: aspect drift ${aspect.delta} > ${ASPECT_TOLERANCE} (natural ${aspect.natural}, rendered ${aspect.rendered})`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Cross-project drift
// ---------------------------------------------------------------------------
const allViewports = [...new Set(ledgers.flatMap((l) => Object.keys(l.viewports)))];
if (ledgers.length > 1) {
  for (const viewport of allViewports) {
    const present = ledgers.filter((l) => l.viewports[viewport]);
    if (present.length < 2) continue;
    for (const key of ["dialog", "image"]) {
      for (const dim of ["x", "y", "width", "height"]) {
        const values = present
          .map((l) => ({ project: l.project, value: l.viewports[viewport][key]?.[dim] }))
          .filter((v) => typeof v.value === "number");
        if (values.length < 2) continue;
        const min = Math.min(...values.map((v) => v.value));
        const max = Math.max(...values.map((v) => v.value));
        if (max - min > CROSS_PROJECT_TOLERANCE_PX) {
          failures.push(
            `${viewport}/${key}.${dim}: cross-project spread ${max - min}px > ${CROSS_PROJECT_TOLERANCE_PX}px (` +
              values.map((v) => `${v.project}=${v.value}`).join(", ") +
              ")",
          );
        }
      }
    }
    const ratios = present
      .map((l) => ({ project: l.project, value: l.viewports[viewport].aspect?.rendered }))
      .filter((v) => typeof v.value === "number");
    if (ratios.length > 1) {
      const spread =
        Math.max(...ratios.map((r) => r.value)) - Math.min(...ratios.map((r) => r.value));
      if (spread > ASPECT_TOLERANCE) {
        failures.push(
          `${viewport}/aspect: cross-project spread ${spread.toFixed(4)} > ${ASPECT_TOLERANCE} (` +
            ratios.map((r) => `${r.project}=${r.value}`).join(", ") +
            ")",
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Baseline drift
// ---------------------------------------------------------------------------
const snapshot = {
  updatedAt: new Date().toISOString(),
  tolerancePx: BASELINE_TOLERANCE_PX,
  projects: Object.fromEntries(
    ledgers.map((l) => [
      l.project,
      Object.fromEntries(
        Object.entries(l.viewports).map(([name, e]) => [
          name,
          {
            dialog: e.dialog,
            image: e.image,
            viewport: e.viewport,
            aspect: e.aspect
              ? { rendered: e.aspect.rendered, natural: e.aspect.natural }
              : undefined,
          },
        ]),
      ),
    ]),
  ),
};

if (UPDATE) {
  writeFileSync(BASELINE, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote landscape geometry baseline to ${BASELINE} (${projects.join(", ")}).`);
} else if (existsSync(BASELINE)) {
  const base = JSON.parse(readFileSync(BASELINE, "utf8"));
  for (const [project, viewports] of Object.entries(snapshot.projects)) {
    const baseProject = base.projects?.[project];
    if (!baseProject) continue; // new project: nothing to drift from yet
    for (const [viewport, entry] of Object.entries(viewports)) {
      const baseEntry = baseProject[viewport];
      if (!baseEntry) continue;
      for (const key of ["dialog", "image"]) {
        for (const dim of ["x", "y", "width", "height"]) {
          const now = entry[key]?.[dim];
          const then = baseEntry[key]?.[dim];
          if (typeof now !== "number" || typeof then !== "number") continue;
          if (Math.abs(now - then) > BASELINE_TOLERANCE_PX) {
            failures.push(
              `${project}/${viewport}/${key}.${dim}: drifted ${now - then}px from baseline (${then} -> ${now}); ` +
                `re-run with --update if intentional`,
            );
          }
        }
      }
      const now = entry.aspect?.rendered;
      const then = baseEntry.aspect?.rendered;
      if (
        typeof now === "number" &&
        typeof then === "number" &&
        Math.abs(now - then) > ASPECT_TOLERANCE
      ) {
        failures.push(
          `${project}/${viewport}/aspect: drifted ${(now - then).toFixed(4)} from baseline (${then} -> ${now})`,
        );
      }
    }
  }
} else {
  console.log(`No baseline at ${BASELINE} yet — run with --update to record one.`);
}

if (failures.length > 0) {
  console.error(`Landscape geometry regressions (${projects.join(", ")}):`);
  for (const f of failures) console.error(`  - ${f}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      ["### Landscape geometry gate — FAILED", "", ...failures.map((f) => `- ${f}`), ""].join("\n"),
    );
  }
  process.exit(1);
}

console.log(
  `Landscape geometry OK across ${projects.join(", ")} for: ${allViewports.join(", ")} ` +
    `(containment, visual viewport, aspect ratio, cross-project and baseline drift).`,
);
