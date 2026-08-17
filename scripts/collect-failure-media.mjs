#!/usr/bin/env node
/**
 * Collects the *visual* evidence for failing Playwright tests — failure
 * screenshots and the short recorded videos — into one uploadable folder with
 * a browsable index.html, so an overflow or alignment regression can be
 * inspected straight from the CI artifact instead of downloading traces and
 * hunting through hashed test-results/ directories.
 *
 * Deduplication (keeps artifact storage flat across reruns):
 *   - Media is content-addressed: every file is stored once as
 *     media/<sha256-12>-<name>, so the same screenshot referenced by several
 *     tests (or several retries of one test) is copied a single time.
 *   - A ledger of hashes already uploaded by earlier runs (--seen, normally
 *     restored from the CI cache) suppresses re-uploading unchanged failures.
 *     Those cases still appear in the gallery, flagged as "unchanged", with a
 *     pointer to the run that first uploaded them.
 *   - When every failure is unchanged the script sets has_new_media=false on
 *     $GITHUB_OUTPUT so the workflow can skip the upload entirely.
 *
 * For every test-results/<test-dir> that contains failure media it gathers:
 *   - test-failed-*.png       (the frame at the moment of failure)
 *   - *-actual.png / *-diff.png / *-expected.png (snapshot mismatches)
 *   - video.webm              (the short recording of that test)
 *   - error-context.md        (assertion text + ARIA snapshot)
 *
 * Writes:
 *   <out>/media/…                      the deduplicated media
 *   <out>/index.html                   gallery: video + screenshots + assertion
 *   <out>/manifest.json                machine-readable listing + hashes
 *   <seen>                             updated hash ledger
 *   $GITHUB_STEP_SUMMARY               one row per failing test
 *
 * Usage:
 *   node scripts/collect-failure-media.mjs [--results test-results]
 *                                          [--out failure-media]
 *                                          [--seen .cache/failure-media-seen.json]
 *                                          [--label "stability phone-390 iOS Safari"]
 *                                          [--no-dedup-across-runs]
 */
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join } from "node:path";

const argv = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const RESULTS_DIR = argOf("--results", "test-results");
const OUT_DIR = argOf("--out", "failure-media");
const SEEN_PATH = argOf("--seen", ".cache/failure-media-seen.json");
const LABEL = argOf("--label", process.env.GITHUB_JOB || "local");
const DEDUP_ACROSS_RUNS = !argv.includes("--no-dedup-across-runs");
const RUN_ID = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_RUN_ID}#${process.env.GITHUB_RUN_ATTEMPT || "1"}`
  : "local";

const isMedia = (f) => f.endsWith(".png") || f.endsWith(".webm");

/** Recursively list files under a directory (Playwright nests retry folders). */
const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
};

const sha12 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 12);

/** First assertion block out of error-context.md, trimmed for the gallery. */
const failureText = (dirPath) => {
  const p = join(dirPath, "error-context.md");
  if (!existsSync(p)) return "";
  const md = readFileSync(p, "utf8");
  const err = md.split("# Error details")[1];
  if (!err) return "";
  const fenced = err.match(/```([\s\S]*?)```/);
  return (fenced ? fenced[1] : err).trim().split("\n").slice(0, 14).join("\n");
};

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const setOutput = (key, value) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
};

if (!existsSync(RESULTS_DIR)) {
  console.log(`[failure-media] no ${RESULTS_DIR}/ — nothing to collect`);
  setOutput("has_new_media", "false");
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(join(OUT_DIR, "media"), { recursive: true });

/** Ledger of hashes uploaded by previous runs: { [hash]: { run, at, name } }. */
let seen = {};
if (DEDUP_ACROSS_RUNS && existsSync(SEEN_PATH)) {
  try {
    const parsed = JSON.parse(readFileSync(SEEN_PATH, "utf8"));
    if (parsed && typeof parsed === "object" && parsed.hashes) seen = parsed.hashes;
  } catch {
    console.warn(`[failure-media] ignoring unreadable ledger at ${SEEN_PATH}`);
  }
}

const cases = [];
const copied = new Map(); // hash -> relative path inside OUT_DIR
let bytesCopied = 0;
let bytesSkippedDuplicate = 0;
let bytesSkippedUnchanged = 0;
let newHashes = 0;

for (const entry of readdirSync(RESULTS_DIR)) {
  const dirPath = join(RESULTS_DIR, entry);
  if (!statSync(dirPath).isDirectory()) continue;

  const files = walk(dirPath).filter(isMedia);
  if (files.length === 0) continue;

  const media = { videos: [], screenshots: [], diffs: [] };
  let caseHasNew = false;

  for (const src of files) {
    const name = basename(src);
    const hash = sha12(src);
    const size = statSync(src).size;
    const rel = `media/${hash}-${name}`;
    const previously = seen[hash];
    const unchanged = DEDUP_ACROSS_RUNS && Boolean(previously);

    if (copied.has(hash)) {
      bytesSkippedDuplicate += size;
    } else if (unchanged) {
      bytesSkippedUnchanged += size;
      copied.set(hash, null);
    } else {
      copyFileSync(src, join(OUT_DIR, rel));
      copied.set(hash, rel);
      bytesCopied += size;
      newHashes += 1;
      seen[hash] = { run: RUN_ID, at: new Date().toISOString(), name };
    }

    if (!unchanged) caseHasNew = true;

    const item = {
      name,
      hash,
      size,
      // Unchanged media is not shipped again; point at the run that has it.
      path: unchanged ? null : rel,
      firstSeenRun: unchanged ? previously.run : RUN_ID,
      unchanged,
    };
    if (name.endsWith(".webm")) media.videos.push(item);
    else if (/-(actual|expected|diff)\.png$/.test(name)) media.diffs.push(item);
    else media.screenshots.push(item);
  }

  const ctx = join(dirPath, "error-context.md");
  let contextPath = null;
  if (existsSync(ctx) && caseHasNew) {
    contextPath = `${entry}/error-context.md`;
    mkdirSync(dirname(join(OUT_DIR, contextPath)), { recursive: true });
    copyFileSync(ctx, join(OUT_DIR, contextPath));
  }

  cases.push({
    test: entry,
    ...media,
    contextPath,
    unchanged: !caseHasNew,
    failure: failureText(dirPath),
  });
}

const hasNewMedia = newHashes > 0;

if (cases.length === 0) {
  console.log("[failure-media] no failure screenshots or videos found");
}

const dedup = {
  newFiles: newHashes,
  bytesCopied,
  bytesSkippedDuplicate,
  bytesSkippedUnchanged,
  ledger: SEEN_PATH,
  dedupAcrossRuns: DEDUP_ACROSS_RUNS,
};

writeFileSync(
  join(OUT_DIR, "manifest.json"),
  JSON.stringify(
    { label: LABEL, run: RUN_ID, generatedAt: new Date().toISOString(), dedup, cases },
    null,
    2,
  ),
);

if (DEDUP_ACROSS_RUNS) {
  mkdirSync(dirname(SEEN_PATH), { recursive: true });
  writeFileSync(
    SEEN_PATH,
    JSON.stringify({ updatedAt: new Date().toISOString(), hashes: seen }, null, 2),
  );
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

const tile = (item, render) =>
  item.unchanged
    ? `<figure class="skipped"><div class="ph">unchanged — already uploaded in run ${esc(item.firstSeenRun)}</div><figcaption>${esc(item.name)} · ${esc(item.hash)}</figcaption></figure>`
    : render(item);

const section = (title, items, render) =>
  items.length
    ? `<h4>${title}</h4><div class="row">${items.map((i) => tile(i, render)).join("")}</div>`
    : "";

const html = `<!doctype html>
<meta charset="utf-8">
<title>Failure media — ${esc(LABEL)}</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; margin: 24px; background: #0f1115; color: #e6e8ec; }
  h1 { font-size: 18px; }
  .case { border: 1px solid #2a2f3a; border-radius: 10px; padding: 16px; margin: 16px 0; background: #161a21; }
  .row { display: flex; flex-wrap: wrap; gap: 12px; }
  figure { margin: 0; max-width: 380px; }
  figcaption { font-size: 12px; color: #9aa3b2; word-break: break-all; }
  img, video { max-width: 380px; border: 1px solid #2a2f3a; border-radius: 6px; background: #000; }
  .ph { width: 380px; padding: 24px 12px; text-align: center; font-size: 12px; color: #9aa3b2;
        border: 1px dashed #2a2f3a; border-radius: 6px; background: #0b0d11; }
  pre { white-space: pre-wrap; background: #0b0d11; border: 1px solid #2a2f3a; padding: 10px; border-radius: 6px; color: #ffb4a8; }
  .empty { color: #9aa3b2; }
  .tag { font-size: 11px; border: 1px solid #2a2f3a; border-radius: 999px; padding: 1px 8px; color: #9aa3b2; margin-left: 8px; }
</style>
<h1>Failure media — ${esc(LABEL)}</h1>
<p class="empty">${cases.length} failing test${cases.length === 1 ? "" : "s"} with screenshots or video.
Uploaded ${dedup.newFiles} new file${dedup.newFiles === 1 ? "" : "s"} (${kb(bytesCopied)});
skipped ${kb(bytesSkippedDuplicate)} duplicate and ${kb(bytesSkippedUnchanged)} unchanged-since-last-run media.</p>
${
  cases.length === 0
    ? `<p class="empty">No failure media in this run.</p>`
    : cases
        .map(
          (c) => `<div class="case">
  <h3>${esc(c.test)}${c.unchanged ? `<span class="tag">unchanged</span>` : ""}</h3>
  ${c.failure ? `<pre>${esc(c.failure)}</pre>` : ""}
  ${section("Video", c.videos, (v) => `<figure><video src="${esc(v.path)}" controls muted playsinline loop></video><figcaption>${esc(v.name)}</figcaption></figure>`)}
  ${section("Failure screenshots", c.screenshots, (s) => `<figure><a href="${esc(s.path)}"><img src="${esc(s.path)}" loading="lazy"></a><figcaption>${esc(s.name)}</figcaption></figure>`)}
  ${section("Snapshot diffs", c.diffs, (s) => `<figure><a href="${esc(s.path)}"><img src="${esc(s.path)}" loading="lazy"></a><figcaption>${esc(s.name)}</figcaption></figure>`)}
</div>`,
        )
        .join("\n")
}
`;

writeFileSync(join(OUT_DIR, "index.html"), html);

setOutput("has_new_media", hasNewMedia ? "true" : "false");
setOutput("failing_tests", String(cases.length));

if (process.env.GITHUB_STEP_SUMMARY && cases.length > 0) {
  const lines = [
    `### Failure media — ${LABEL}`,
    "",
    "| test | video | screenshots | diffs | status |",
    "| --- | --- | --- | --- | --- |",
    ...cases.map(
      (c) =>
        `| \`${c.test}\` | ${c.videos.length} | ${c.screenshots.length} | ${c.diffs.length} | ${c.unchanged ? "unchanged (not re-uploaded)" : "new"} |`,
    ),
    "",
    `Deduplicated: ${dedup.newFiles} new file(s) ${kb(bytesCopied)} uploaded, ${kb(bytesSkippedDuplicate)} duplicate + ${kb(bytesSkippedUnchanged)} unchanged skipped.`,
    hasNewMedia
      ? "Download the `failure-media-*` artifact and open `index.html`."
      : "No new media this run — see the earlier run's `failure-media-*` artifact.",
    "",
  ];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
}

console.log(
  `[failure-media] ${cases.length} failing tests · ${dedup.newFiles} new files (${kb(bytesCopied)}) · ` +
    `skipped ${kb(bytesSkippedDuplicate)} duplicate + ${kb(bytesSkippedUnchanged)} unchanged`,
);
