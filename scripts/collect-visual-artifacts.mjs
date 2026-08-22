#!/usr/bin/env node
/**
 * Packs the visual evidence of a Playwright run into one uploadable folder so
 * baselines and diffs can be reviewed straight from the Actions artifact list,
 * without checking out the PR or rerunning anything locally.
 *
 * Unlike collect-landscape-diffs.mjs (failures of one suite), this runs on
 * EVERY job, pass or fail, and collects:
 *   - baselines/  every committed snapshot PNG for the projects that ran
 *                 (e2e/<spec>-snapshots/**), so you can see the contract
 *   - diffs/      expected/actual/diff triplets Playwright wrote this run
 *   - report/     the HTML report (playwright-report/) when present
 *   - index.html  a gallery linking all of the above
 *
 * Size control (upload budget), all lossless — the gallery stays browsable:
 *   - identical PNGs are stored once and linked from every place they appear
 *     (expected images are usually byte-identical to their baseline)
 *   - every PNG is re-deflated at max effort with metadata chunks stripped
 *   - the HTML report drops trace zips / videos / raw attachments, which are
 *     the bulk of its weight and are re-obtainable from the run
 * Pass --no-compress to keep the raw byte-for-byte copies.
 *
 * Usage:
 *   node scripts/collect-visual-artifacts.mjs \
 *     [--out visual-artifacts] [--projects chromium,firefox] [--label "phone-390 webkit"]
 *
 * Filtering by --projects keeps a per-viewport job's artifact small: baselines
 * are named <snapshot>-<project>-<platform>.png.
 */
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { humanBytes, recompressPng } from "./optimize-media.mjs";

const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const OUT_DIR = argOf("--out", "visual-artifacts");
const RESULTS_DIR = argOf("--results", "test-results");
const REPORT_DIR = argOf("--report", "playwright-report");
const E2E_DIR = argOf("--e2e", "e2e");
const LABEL = argOf("--label", process.env.GITHUB_JOB || "local");
const COMPRESS = !argv.includes("--no-compress");
const projectFilter = (argOf("--projects", "") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

/** Recursively list files under dir (returns paths relative to dir). */
const walk = (dir, base = dir) => {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full));
  }
  return out;
};

const matchesProject = (file) =>
  projectFilter.length === 0 ||
  projectFilter.some(
    (p) => file.includes(`-${p}-`) || file.includes(`--${p}`) || file.includes(`${p}/`),
  );

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

// ------------------------------------------------------- deduped png writer
/** hash -> href already written inside OUT_DIR (so repeats cost nothing). */
const byHash = new Map();
const stats = { pngs: 0, deduped: 0, rawBytes: 0, outBytes: 0 };

/**
 * Copies a PNG into the bundle, recompressing and de-duplicating it.
 * @returns {string} href to use from index.html
 */
const addPng = (src, destRel) => {
  const raw = readFileSync(src);
  stats.pngs += 1;
  stats.rawBytes += raw.length;

  const body = COMPRESS ? recompressPng(raw) : raw;
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
  const existing = byHash.get(hash);
  if (existing) {
    stats.deduped += 1;
    return existing;
  }

  const dest = join(OUT_DIR, destRel);
  mkdirSync(join(dest, ".."), { recursive: true });
  writeFileSync(dest, body);
  stats.outBytes += body.length;
  byHash.set(hash, destRel.split("\\").join("/"));
  return destRel.split("\\").join("/");
};

// ---------------------------------------------------------------- baselines
const baselineDirs = existsSync(E2E_DIR)
  ? readdirSync(E2E_DIR).filter(
      (d) => d.endsWith("-snapshots") && statSync(join(E2E_DIR, d)).isDirectory(),
    )
  : [];

const baselines = [];
for (const dir of baselineDirs.sort()) {
  const suite = dir.replace(/\.spec\.ts-snapshots$/, "").replace(/-snapshots$/, "");
  for (const file of walk(join(E2E_DIR, dir)).sort()) {
    if (!file.endsWith(".png") || !matchesProject(file)) continue;
    const href = addPng(join(E2E_DIR, dir, file), join("baselines", suite, file));
    baselines.push({ suite, file, href });
  }
}

// -------------------------------------------------------------------- diffs
/** Snapshot comparisons Playwright wrote this run, grouped per test dir. */
const diffCases = [];
if (existsSync(RESULTS_DIR)) {
  for (const dir of readdirSync(RESULTS_DIR).sort()) {
    const src = join(RESULTS_DIR, dir);
    if (!statSync(src).isDirectory()) continue;
    const files = readdirSync(src).filter((f) => /-(actual|expected|diff)\.png$/.test(f));
    if (files.length === 0) continue;

    const groups = new Map();
    for (const f of files) {
      const [, name, kind] = f.match(/^(.*)-(actual|expected|diff)\.png$/) ?? [];
      if (!name) continue;
      const href = addPng(join(src, f), join("diffs", dir, f));
      const entry = groups.get(name) ?? { name, expected: null, actual: null, diff: null };
      entry[kind] = href;
      groups.set(name, entry);
    }
    if (existsSync(join(src, "error-context.md"))) {
      mkdirSync(join(OUT_DIR, "diffs", dir), { recursive: true });
      cpSync(join(src, "error-context.md"), join(OUT_DIR, "diffs", dir, "error-context.md"));
    }
    diffCases.push({
      dir,
      shots: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)),
    });
  }
}

// ------------------------------------------------------------------- report
/** Heavy, re-obtainable payloads inside playwright-report/. */
const REPORT_DROP = /\.(zip|webm|mp4|map)$/i;
let hasReport = false;
let reportDropped = 0;
if (existsSync(REPORT_DIR) && readdirSync(REPORT_DIR).length > 0) {
  for (const file of walk(REPORT_DIR)) {
    const src = join(REPORT_DIR, file);
    if (COMPRESS && REPORT_DROP.test(file)) {
      reportDropped += statSync(src).size;
      continue;
    }
    const dest = join(OUT_DIR, "report", file);
    mkdirSync(join(dest, ".."), { recursive: true });
    if (COMPRESS && file.endsWith(".png")) {
      const body = recompressPng(readFileSync(src));
      writeFileSync(dest, body);
    } else {
      cpSync(src, dest);
    }
  }
  hasReport = existsSync(join(OUT_DIR, "report", "index.html"));
}

// ------------------------------------------------------------------ gallery
const cell = (href, caption) =>
  href
    ? `<figure><img loading="lazy" src="${esc(href)}" alt="${esc(caption)}"><figcaption>${esc(caption)}</figcaption></figure>`
    : `<figure class="empty"><div>no ${esc(caption)}</div><figcaption>${esc(caption)}</figcaption></figure>`;

const bySuite = new Map();
for (const b of baselines) {
  if (!bySuite.has(b.suite)) bySuite.set(b.suite, []);
  bySuite.get(b.suite).push(b);
}

const saved = Math.max(0, stats.rawBytes - stats.outBytes);
const savedPct = stats.rawBytes ? Math.round((saved / stats.rawBytes) * 100) : 0;

const html = `<!doctype html>
<meta charset="utf-8">
<title>Visual artifacts — ${esc(LABEL)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; margin: 24px; }
  h1 { font-size: 20px; }
  h2 { font-size: 16px; margin-top: 28px; }
  .meta { color: #8a8a8a; }
  section { border: 1px solid #8884; border-radius: 10px; padding: 16px; margin: 16px 0; }
  .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
  figure { margin: 0; max-width: 360px; }
  figure img { max-width: 100%; border: 1px solid #8884; border-radius: 6px; background: #fff; }
  figure.empty div { display: grid; place-items: center; height: 110px; width: 190px; border: 1px dashed #8886; border-radius: 6px; color: #8a8a8a; }
  figcaption { font-size: 12px; color: #8a8a8a; margin-top: 4px; word-break: break-all; }
  a.report { display: inline-block; margin: 8px 0; font-weight: 600; }
</style>
<h1>Visual artifacts — ${esc(LABEL)}</h1>
<p class="meta">${baselines.length} baseline image(s), ${diffCases.length} test(s) with snapshot comparisons${projectFilter.length ? `, projects: ${esc(projectFilter.join(", "))}` : ""}.</p>
<p class="meta">${COMPRESS ? `Compressed: ${humanBytes(stats.rawBytes)} → ${humanBytes(stats.outBytes)} (−${savedPct}%), ${stats.deduped} duplicate image(s) linked instead of copied${reportDropped ? `, ${humanBytes(reportDropped)} of traces/videos omitted from the report` : ""}. Pixels are unchanged.` : "Compression disabled (--no-compress)."}</p>
${hasReport ? `<p><a class="report" href="report/index.html">Open the full Playwright HTML report →</a></p>` : `<p class="meta">No HTML report in this job.</p>`}

<h2>Snapshot comparisons from this run</h2>
${
  diffCases.length
    ? diffCases
        .map(
          (c) => `<section>
  <div class="meta">${esc(c.dir)}</div>
  ${c.shots
    .map(
      (s) => `<h3>${esc(s.name)}</h3>
  <div class="row">
    ${cell(s.expected, "expected")}
    ${cell(s.actual, "actual")}
    ${cell(s.diff, "diff")}
  </div>`,
    )
    .join("\n")}
</section>`,
        )
        .join("\n")
    : `<p class="meta">Every snapshot matched its baseline — Playwright wrote no expected/actual/diff images.</p>`
}

<h2>Committed baselines</h2>
${[...bySuite.entries()]
  .map(
    ([suite, items]) => `<section>
  <h3>${esc(suite)} <span class="meta">(${items.length})</span></h3>
  <div class="row">
    ${items.map((b) => cell(b.href, b.file)).join("\n    ")}
  </div>
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
      projects: projectFilter,
      compressed: COMPRESS,
      bytes: {
        rawImages: stats.rawBytes,
        storedImages: stats.outBytes,
        savedImages: saved,
        reportOmitted: reportDropped,
      },
      images: { total: stats.pngs, unique: stats.pngs - stats.deduped, deduped: stats.deduped },
      baselines: baselines.map((b) => b.href),
      comparisons: diffCases.map((c) => ({ dir: c.dir, snapshots: c.shots.map((s) => s.name) })),
      report: hasReport,
    },
    null,
    2,
  ),
);

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  appendFileSync(
    summaryPath,
    `\n### Visual artifacts — ${LABEL}\n\n` +
      `- baselines: **${baselines.length}**\n` +
      `- tests with snapshot comparisons: **${diffCases.length}**\n` +
      `- HTML report: **${hasReport ? "yes" : "no"}**\n` +
      `- image payload: **${humanBytes(stats.rawBytes)} → ${humanBytes(stats.outBytes)}** (−${savedPct}%, ${stats.deduped} deduped)\n` +
      (reportDropped ? `- report traces/videos omitted: **${humanBytes(reportDropped)}**\n` : "") +
      `\nDownload the \`visual-artifacts-*\` artifact and open \`index.html\`.\n`,
  );
}

console.log(
  `[visual-artifacts] ${baselines.length} baseline(s), ${diffCases.length} comparison dir(s), report=${hasReport} → ${OUT_DIR}/ ` +
    `(images ${humanBytes(stats.rawBytes)} → ${humanBytes(stats.outBytes)}, −${savedPct}%, ${stats.deduped} deduped)`,
);
