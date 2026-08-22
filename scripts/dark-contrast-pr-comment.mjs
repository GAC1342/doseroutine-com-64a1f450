#!/usr/bin/env node
/**
 * Renders the dark-contrast lint JSON report as a PR comment body.
 * Usage: node scripts/dark-contrast-pr-comment.mjs dark-contrast-report.json
 */
import { readFileSync } from "node:fs";

const file = process.argv[2] || "dark-contrast-report.json";

let report;
try {
  report = JSON.parse(readFileSync(file, "utf8"));
} catch {
  console.log("## 🌗 Dark-mode contrast lint\n\nNo report produced — the lint did not run.");
  process.exit(0);
}

const failures = report.failures ?? [];
const allowlisted = (report.violations ?? []).length - failures.length;

if (!failures.length) {
  console.log(
    `## 🌗 Dark-mode contrast lint\n\n✅ No new issues. (${allowlisted} allowlisted legacy usages.)`,
  );
  process.exit(0);
}

const RULE_LABEL = {
  palette: "Severity / chip colour",
  state: "Hover / focus state",
  link: "Link colour",
  muted: "Muted helper text",
  skeleton: "Skeleton placeholder",
  malformed: "Malformed token",
};

const byRule = new Map();
for (const f of failures) {
  const list = byRule.get(f.rule) ?? [];
  list.push(f);
  byRule.set(f.rule, list);
}

const lines = [
  "## 🌗 Dark-mode contrast lint",
  "",
  `❌ **${failures.length}** issue(s) would be unreadable in dark mode. Each one is annotated inline on the changed files.`,
  "",
  "Run `bun run lint:dark-contrast:fix` to apply the suggested tokens automatically.",
  "",
];

for (const [rule, items] of byRule) {
  lines.push(`### ${RULE_LABEL[rule] ?? rule} (${items.length})`, "");
  lines.push("| File | Line | Found | Suggested replacement | Why |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const f of items.slice(0, 25)) {
    lines.push(
      `| \`${f.file}\` | ${f.line} | \`${f.offending}\` | ${f.suggestion ? `\`${f.suggestion}\`` : "—"} | ${f.reason} |`,
    );
  }
  if (items.length > 25) lines.push(`\n<sub>…and ${items.length - 25} more.</sub>`);
  lines.push("");
}

console.log(lines.join("\n"));
