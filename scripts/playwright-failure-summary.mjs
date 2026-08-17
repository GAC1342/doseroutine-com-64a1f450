#!/usr/bin/env node
// Parse a Playwright JSON report and emit a Markdown summary of failing tests.
// Usage: node scripts/playwright-failure-summary.mjs <report.json> <browser> <runUrl>
import { readFileSync, writeFileSync } from "node:fs";

const [, , reportPath, browser, runUrl] = process.argv;
if (!reportPath || !browser || !runUrl) {
  console.error("usage: playwright-failure-summary.mjs <report.json> <browser> <runUrl>");
  process.exit(2);
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));

/** @type {{title: string, file: string, line: number, error: string, duration: number}[]} */
const failures = [];
let passed = 0,
  skipped = 0,
  flaky = 0;

const walk = (suite, prefix = "") => {
  for (const s of suite.suites ?? []) walk(s, prefix ? `${prefix} › ${s.title}` : s.title);
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const results = test.results ?? [];
      const last = results[results.length - 1];
      if (!last) continue;
      const status = last.status;
      const anyPassed = results.some((r) => r.status === "passed");
      if (status === "passed") {
        passed++;
        if (results.length > 1) flaky++;
        continue;
      }
      if (status === "skipped") {
        skipped++;
        continue;
      }
      if (status === "failed" || status === "timedOut" || status === "interrupted") {
        if (anyPassed) {
          flaky++;
          continue;
        }
        const err = last.error?.message ?? last.errors?.[0]?.message ?? "(no error message)";
        failures.push({
          title: `${prefix ? prefix + " › " : ""}${spec.title}`,
          file: spec.file,
          line: spec.line ?? 0,
          error: String(err)
            .replace(/\u001b\[[0-9;]*m/g, "")
            .split("\n")
            .slice(0, 4)
            .join("\n"),
          duration: last.duration ?? 0,
        });
      }
    }
  }
};

for (const suite of report.suites ?? []) walk(suite);

const total = passed + skipped + failures.length + flaky;
const header = `### Playwright · \`${browser}\` — ${failures.length} failing`;
const stats = `**Totals:** ${passed} passed · ${failures.length} failed · ${flaky} flaky · ${skipped} skipped · ${total} total`;
const link = `[Full HTML report & traces →](${runUrl}) (see the \`playwright-report-${browser}-*\` artifact)`;

let body;
if (failures.length === 0) {
  body = `${header.replace(`${failures.length} failing`, "all green")}\n\n${stats}\n\n${link}\n`;
} else {
  const top = failures
    .slice(0, 10)
    .map((f, i) => {
      const loc = `${f.file}:${f.line}`;
      return `<details><summary><strong>${i + 1}. ${escapeMd(f.title)}</strong> — <code>${loc}</code></summary>\n\n\`\`\`\n${f.error}\n\`\`\`\n\n</details>`;
    })
    .join("\n");
  const more =
    failures.length > 10
      ? `\n\n_+${failures.length - 10} more failing tests — see the merged HTML report._`
      : "";
  body = `${header}\n\n${stats}\n\n${link}\n\n${top}${more}\n`;
}

// Sticky marker so PR comments update in place per browser.
const marker = `<!-- playwright-summary:${browser} -->`;
writeFileSync(process.env.SUMMARY_FILE ?? "summary.md", `${marker}\n${body}`);

// Emit machine-readable outputs for the workflow step.
if (process.env.GITHUB_OUTPUT) {
  writeFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `failures=${failures.length}`,
      `flaky=${flaky}`,
      `passed=${passed}`,
      `skipped=${skipped}`,
    ].join("\n") + "\n",
    { flag: "a" },
  );
}

function escapeMd(s) {
  return String(s).replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));
}
