#!/usr/bin/env node
/**
 * diff-deployed-markers.mjs — compare two deployed-markers reports so a run
 * shows exactly what changed since the previous run.
 *
 * Reports are produced by:
 *   node scripts/check-deployed-markers.mjs --json report.json
 *
 * Usage:
 *   node scripts/diff-deployed-markers.mjs <previous.json> <current.json> [--out diff.md]
 *
 * If <previous.json> is missing (first run, or the artifact could not be
 * downloaded) the diff degrades to a baseline summary instead of failing.
 *
 * Output: markdown to stdout, to --out, and to $GITHUB_STEP_SUMMARY.
 * Always exits 0 — this is a reporting tool, the check itself owns pass/fail.
 */
import fs from "node:fs";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const outIdx = args.indexOf("--out");
const outFile = outIdx !== -1 ? args[outIdx + 1] : undefined;

const [prevPath, currPath] = positional;

function read(path) {
  if (!path || !fs.existsSync(path)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`Could not parse ${path}: ${error.message}`);
    return undefined;
  }
}

const prev = read(prevPath);
const curr = read(currPath);

const lines = ["## Deployed-markers diff", ""];

if (!curr) {
  lines.push(`No current report found at \`${currPath ?? "(unset)"}\` — nothing to diff.`);
} else {
  const fmt = (r) => `${r.totals.passed}/${r.totals.checked} passing, ${r.totals.failed} failing`;
  const failMap = (r) => new Map((r.failures ?? []).map((f) => [f.path, f.reasons]));

  lines.push(`Target: \`${curr.base}\` · ${curr.generatedAt}`);
  lines.push("");

  if (!prev) {
    lines.push("_No previous report available — this run becomes the baseline._");
    lines.push("");
    lines.push(`- Current: ${fmt(curr)}`);
    if (curr.failures?.length) {
      lines.push("");
      lines.push("### Failing pages");
      for (const f of curr.failures) lines.push(`- \`${f.path}\` — ${f.reasons.join("; ")}`);
    }
  } else {
    const before = failMap(prev);
    const after = failMap(curr);

    const newlyFailing = [...after].filter(([p]) => !before.has(p));
    const fixed = [...before].filter(([p]) => !after.has(p));
    const stillFailing = [...after].filter(([p]) => before.has(p));
    const changedReasons = stillFailing.filter(
      ([p, reasons]) => JSON.stringify(reasons) !== JSON.stringify(before.get(p)),
    );

    const prevPaths = new Set(prev.paths ?? []);
    const currPaths = new Set(curr.paths ?? []);
    const addedPages = [...currPaths].filter((p) => !prevPaths.has(p));
    const removedPages = [...prevPaths].filter((p) => !currPaths.has(p));

    const delta = curr.totals.failed - prev.totals.failed;
    const arrow = delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "no change";

    lines.push(`- Previous (${prev.generatedAt}): ${fmt(prev)}`);
    lines.push(`- Current: ${fmt(curr)} — failures ${arrow}`);
    lines.push("");

    const section = (title, items, render) => {
      lines.push(`### ${title} (${items.length})`);
      if (items.length === 0) lines.push("_none_");
      else for (const item of items) lines.push(render(item));
      lines.push("");
    };

    section("Newly failing", newlyFailing, ([p, r]) => `- \`${p}\` — ${r.join("; ")}`);
    section("Newly fixed", fixed, ([p]) => `- \`${p}\``);
    section(
      "Still failing",
      stillFailing,
      ([p, r]) =>
        `- \`${p}\` — ${r.join("; ")}${changedReasons.some(([q]) => q === p) ? " _(reasons changed)_" : ""}`,
    );
    section("Pages added to the sweep", addedPages, (p) => `- \`${p}\``);
    section("Pages removed from the sweep", removedPages, (p) => `- \`${p}\``);

    const noChange =
      newlyFailing.length === 0 &&
      fixed.length === 0 &&
      changedReasons.length === 0 &&
      addedPages.length === 0 &&
      removedPages.length === 0;
    lines.push(noChange ? "**No change since the previous run.**" : "**Marker state changed since the previous run.**");
  }
}

const output = `${lines.join("\n")}\n`;
process.stdout.write(output);
if (outFile) fs.writeFileSync(outFile, output);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, output);
