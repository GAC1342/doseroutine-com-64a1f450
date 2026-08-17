#!/usr/bin/env node
/**
 * Collects everything needed to *see* a landscape modal cutoff into one
 * uploadable folder, instead of leaving the evidence scattered across
 * test-results/<hashed-dir>/ where it is unreadable in a CI artifact listing.
 *
 * For every failing landscape test directory it gathers:
 *   - the visual diff triplet (expected / actual / diff) for each snapshot,
 *     pulling the committed baseline out of the -snapshots folder when
 *     Playwright only wrote an -actual (i.e. a brand-new or updated baseline),
 *   - the full-page failure screenshot (test-failed-*.png) — this is the frame
 *     that shows where the image is clipped relative to the viewport,
 *   - error-context.md (assertion text + ARIA snapshot),
 *   - trace.zip / video.webm when present,
 *   - the geometry ledger JSON (dialog/image boxes) for the same viewport.
 *
 * It then writes a static index.html gallery (expected | actual | diff side by
 * side, plus the failure frame and the failing assertion) so the artifact can
 * be opened directly in a browser, and appends a summary table to
 * $GITHUB_STEP_SUMMARY.
 *
 * Usage:
 *   node scripts/collect-landscape-diffs.mjs [--out <dir>] [--label <job label>]
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { basename, join } from "node:path";

const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const RESULTS_DIR = argOf("--results", "test-results");
const OUT_DIR = argOf("--out", join("landscape-diffs"));
const LABEL = argOf("--label", process.env.GITHUB_JOB || "local");
const SNAPSHOT_DIR = "e2e/exercise-art-landscape.spec.ts-snapshots";
const LEDGER_DIR = join(RESULTS_DIR, "exercise-art-landscape");

const isLandscapeDir = (name) =>
  name.startsWith("exercise-art-landscape") && name.includes("landscape-");

/** "…-mobile-safari" / "…-chromium" suffix on the result directory. */
const projectOf = (dir) => dir.split("--").pop() ?? "unknown";

/** Best-effort viewport name, e.g. phone-390-landscape. */
const viewportOf = (dir, files) => {
  for (const f of files) {
    const m = f.match(/yoga-(?:modal-figure|thumbnail-row)-(.*?)-(?:actual|expected|diff)\.png$/);
    if (m) return m[1];
  }
  const m = dir.match(/((?:phone|tablet|desktop)[\w x]*?-landscape)/i);
  return m ? m[1] : dir;
};

/** First assertion block out of error-context.md. */
const failureOf = (dirPath) => {
  const p = join(dirPath, "error-context.md");
  if (!existsSync(p)) return "";
  const md = readFileSync(p, "utf8");
  const err = md.split("# Error details")[1];
  if (!err) return "";
  const fenced = err.match(/```([\s\S]*?)```/);
  return (fenced ? fenced[1] : err).trim().split("\n").slice(0, 12).join("\n");
};

if (!existsSync(RESULTS_DIR)) {
  console.log(`[landscape-diffs] no ${RESULTS_DIR}/ — nothing to collect`);
  process.exit(0);
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const dirs = readdirSync(RESULTS_DIR)
  .filter((d) => isLandscapeDir(d))
  .filter((d) => statSync(join(RESULTS_DIR, d)).isDirectory())
  .sort();

const cases = [];

for (const dir of dirs) {
  const src = join(RESULTS_DIR, dir);
  const files = readdirSync(src);
  const project = projectOf(dir);
  const viewport = viewportOf(dir, files);
  const caseId = `${project}__${viewport}`;
  const destRel = caseId;
  const dest = join(OUT_DIR, destRel);
  mkdirSync(dest, { recursive: true });

  const shots = [];
  const snapNames = new Set(
    files
      .filter((f) => /-(actual|expected|diff)\.png$/.test(f))
      .map((f) => f.replace(/-(actual|expected|diff)\.png$/, "")),
  );

  for (const snap of [...snapNames].sort()) {
    const entry = { name: snap, expected: null, actual: null, diff: null };
    for (const kind of ["expected", "actual", "diff"]) {
      const file = `${snap}-${kind}.png`;
      if (files.includes(file)) {
        cpSync(join(src, file), join(dest, file));
        entry[kind] = file;
      }
    }
    // Playwright omits -expected when the baseline was merely missing; fall
    // back to the committed baseline so the gallery still shows both sides.
    if (!entry.expected) {
      for (const candidate of [
        `${snap}-${project}-linux.png`,
        `${snap}-${project}-darwin.png`,
        `${snap}.png`,
      ]) {
        const baseline = join(SNAPSHOT_DIR, candidate);
        if (existsSync(baseline)) {
          const file = `${snap}-expected.png`;
          cpSync(baseline, join(dest, file));
          entry.expected = file;
          break;
        }
      }
    }
    shots.push(entry);
  }

  const frames = files.filter((f) => /^test-(failed|finished)-\d+\.png$/.test(f)).sort();
  for (const f of frames) cpSync(join(src, f), join(dest, f));
  for (const f of ["error-context.md", "trace.zip", "video.webm"]) {
    if (files.includes(f)) cpSync(join(src, f), join(dest, f));
  }

  // Geometry ledger for the same project/viewport, when the test got far
  // enough to write one.
  const ledger = join(LEDGER_DIR, `${project}__${viewport}.json`);
  if (existsSync(ledger)) cpSync(ledger, join(dest, "geometry.json"));

  const failure = failureOf(src);
  if (!shots.length && !frames.length && !failure) {
    rmSync(dest, { recursive: true, force: true });
    continue;
  }

  cases.push({ caseId, dir: destRel, project, viewport, shots, frames, failure });
}

if (!cases.length) {
  console.log("[landscape-diffs] no failing landscape artifacts found");
  writeFileSync(
    join(OUT_DIR, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Landscape diffs — ${LABEL}</title><p>No failing landscape artifacts in this job.</p>`,
  );
  process.exit(0);
}

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

const cell = (dir, file, caption) =>
  file
    ? `<figure><img loading="lazy" src="${esc(dir)}/${esc(file)}" alt="${esc(caption)}"><figcaption>${esc(caption)}</figcaption></figure>`
    : `<figure class="empty"><div>no ${esc(caption)}</div><figcaption>${esc(caption)}</figcaption></figure>`;

const html = `<!doctype html>
<meta charset="utf-8">
<title>Landscape modal diffs — ${esc(LABEL)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; margin: 24px; }
  h1 { font-size: 20px; }
  section { border: 1px solid #8884; border-radius: 10px; padding: 16px; margin: 20px 0; }
  h2 { font-size: 16px; margin: 0 0 4px; }
  .meta { color: #8a8a8a; margin-bottom: 12px; }
  pre { background: #8881; padding: 10px; border-radius: 8px; overflow: auto; }
  .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
  figure { margin: 0; max-width: 420px; }
  figure img { max-width: 100%; border: 1px solid #8884; border-radius: 6px; background: #fff; }
  figure.empty div { display: grid; place-items: center; height: 120px; width: 200px; border: 1px dashed #8886; border-radius: 6px; color: #8a8a8a; }
  figcaption { font-size: 12px; color: #8a8a8a; margin-top: 4px; }
  a.file { font-size: 12px; margin-right: 10px; }
</style>
<h1>Landscape modal diffs — ${esc(LABEL)}</h1>
<p class="meta">${cases.length} failing case(s). Expected vs actual vs diff per snapshot, plus the full-page failure frame showing where the full-size image is clipped.</p>
${cases
  .map(
    (c) => `<section>
  <h2>${esc(c.viewport)} — ${esc(c.project)}</h2>
  <div class="meta">${esc(c.dir)}</div>
  ${c.failure ? `<pre>${esc(c.failure)}</pre>` : ""}
  ${c.shots
    .map(
      (s) => `<h3>${esc(s.name)}</h3>
  <div class="row">
    ${cell(c.dir, s.expected, "expected")}
    ${cell(c.dir, s.actual, "actual")}
    ${cell(c.dir, s.diff, "diff")}
  </div>`,
    )
    .join("\n")}
  ${
    c.frames.length
      ? `<h3>failure frame (full viewport)</h3><div class="row">${c.frames
          .map((f) => cell(c.dir, f, f))
          .join("")}</div>`
      : ""
  }
  <p>${["error-context.md", "geometry.json", "trace.zip", "video.webm"]
    .filter((f) => existsSync(join(OUT_DIR, c.dir, f)))
    .map((f) => `<a class="file" href="${esc(c.dir)}/${esc(f)}">${esc(f)}</a>`)
    .join("")}</p>
</section>`,
  )
  .join("\n")}
`;

writeFileSync(join(OUT_DIR, "index.html"), html);
writeFileSync(
  join(OUT_DIR, "summary.json"),
  JSON.stringify(
    {
      label: LABEL,
      cases: cases.map(({ caseId, project, viewport, failure, shots, frames }) => ({
        caseId,
        project,
        viewport,
        snapshots: shots.map((s) => s.name),
        frames,
        failure,
      })),
    },
    null,
    2,
  ),
);

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const rows = cases
    .map(
      (c) =>
        `| ${c.viewport} | ${c.project} | ${c.shots.length} | ${(c.failure.split("\n")[0] || "").slice(0, 90).replace(/\|/g, "\\|")} |`,
    )
    .join("\n");
  appendFileSync(
    summaryPath,
    `\n### Landscape modal diffs — ${LABEL}\n\n| viewport | project | snapshots | first assertion |\n| --- | --- | --- | --- |\n${rows}\n\nDownload the \`landscape-diffs-*\` artifact and open \`index.html\`.\n`,
  );
}

console.log(
  `[landscape-diffs] collected ${cases.length} case(s) into ${OUT_DIR}/ (${cases
    .map((c) => basename(c.dir))
    .join(", ")})`,
);
