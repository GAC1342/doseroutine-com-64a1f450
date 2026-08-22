#!/usr/bin/env node
/**
 * Turn `npm audit --json` output into an actionable summary.
 *
 * Usage:
 *   npm audit --json > audit.json || true
 *   node scripts/audit-summary.mjs audit.json [--level high]
 *
 * Prints a human-readable table plus, when running in GitHub Actions,
 * appends the same table to $GITHUB_STEP_SUMMARY so a failing workflow
 * shows exactly which packages are vulnerable and how to fix them.
 *
 * Exit 0 = nothing at or above the threshold, 1 = actionable findings.
 */
import fs from "node:fs";

const ORDER = ["info", "low", "moderate", "high", "critical"];

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) ?? "audit.json";
const levelArg = args.indexOf("--level");
const threshold = levelArg !== -1 ? (args[levelArg + 1] ?? "high") : "high";
const minRank = Math.max(0, ORDER.indexOf(threshold));

let raw;
try {
  raw = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (error) {
  console.error(`Could not read audit JSON at ${file}: ${error.message}`);
  process.exit(1);
}

const vulns = raw.vulnerabilities ?? {};
const rows = [];

for (const [name, v] of Object.entries(vulns)) {
  const rank = ORDER.indexOf(v.severity);
  if (rank < minRank) continue;

  const advisories = (v.via ?? [])
    .filter((entry) => typeof entry === "object")
    .map((entry) => ({
      title: entry.title ?? "unknown advisory",
      url: entry.url ?? "",
      range: entry.range ?? v.range ?? "",
    }));

  const viaPackages = (v.via ?? []).filter((entry) => typeof entry === "string");

  const fix = v.fixAvailable;
  let fixText = "no fix published yet";
  if (fix === true) fixText = "`npm audit fix`";
  else if (fix && typeof fix === "object") {
    fixText = `upgrade to ${fix.name}@${fix.version}${fix.isSemVerMajor ? " (breaking)" : ""}`;
  }

  rows.push({
    name,
    severity: v.severity,
    rank,
    range: v.range ?? "",
    direct: Boolean(v.isDirect),
    via: viaPackages,
    advisories,
    fixText,
  });
}

rows.sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name));

const counts = {};
for (const row of rows) counts[row.severity] = (counts[row.severity] ?? 0) + 1;

const lines = [];
lines.push("## Dependency vulnerability audit");
lines.push("");

if (rows.length === 0) {
  lines.push(`No vulnerabilities at or above **${threshold}** severity.`);
} else {
  const summary = ORDER.slice()
    .reverse()
    .filter((s) => counts[s])
    .map((s) => `${counts[s]} ${s}`)
    .join(" · ");
  lines.push(
    `**${rows.length} package(s) need attention** — ${summary} (threshold: ${threshold}).`,
  );
  lines.push("");
  lines.push("| Package | Severity | Affected | Type | Fix |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of rows) {
    lines.push(
      `| \`${row.name}\` | ${row.severity} | \`${row.range || "n/a"}\` | ${row.direct ? "direct" : "transitive"} | ${row.fixText} |`,
    );
  }
  lines.push("");
  lines.push("### Advisories");
  for (const row of rows) {
    const detail = row.advisories.length
      ? row.advisories.map((a) => (a.url ? `[${a.title}](${a.url})` : a.title)).join("; ")
      : row.via.length
        ? `pulled in via ${row.via.map((p) => `\`${p}\``).join(", ")}`
        : "no advisory metadata";
    lines.push(`- \`${row.name}\` (${row.severity}): ${detail}`);
  }
  lines.push("");
  lines.push("### How to fix");
  lines.push("1. `npm audit fix` for non-breaking upgrades.");
  lines.push("2. `npm audit fix --force` only after checking the breaking changes listed above.");
  lines.push(
    "3. Transitive-only issues with no fix: pin via an `overrides` entry in `package.json`.",
  );
}

const output = lines.join("\n");
console.log(output);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${output}\n`);
}

process.exit(rows.length === 0 ? 0 : 1);
