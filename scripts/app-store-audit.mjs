#!/usr/bin/env node
/**
 * App Store pre-submission audit suite.
 *
 * Re-runs every regression test that encodes a Critical or High finding from
 * the manual Apple review audits, so a fix can never silently regress. Each
 * entry maps to the finding it protects; a failure prints the finding and the
 * pipeline stops.
 *
 * Usage: node scripts/app-store-audit.mjs
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";

/** @typedef {{ id: string; severity: "critical" | "high"; title: string; files: string[] }} AuditCheck */

/** @type {AuditCheck[]} */
const CHECKS = [
  {
    id: "C1",
    severity: "critical",
    title: "Crash reporting always resolves a Sentry DSN in native production builds",
    files: ["src/lib/__tests__/sentry-dsn.test.ts"],
  },
  {
    id: "C2",
    severity: "critical",
    title: "App shell boots without a network, cached publishable key survives cold start",
    files: [
      "src/lib/__tests__/publishable-key-cache.test.ts",
      "src/lib/__tests__/native-launch-safety.test.ts",
    ],
  },
  {
    id: "C3",
    severity: "critical",
    title: "Fresh install degrades gracefully without notification permission or connectivity",
    files: ["src/lib/__tests__/fresh-install-error-paths.test.ts"],
  },
  {
    id: "H1",
    severity: "high",
    title: "Guideline 3.1.1 — native shell cannot reach Stripe checkout",
    files: [
      "src/lib/__tests__/native-checkout-guard.test.ts",
      "src/lib/__tests__/revenuecat-guards.test.ts",
    ],
  },
  {
    id: "H2",
    severity: "high",
    title: "Privacy manifest parity, Health scope purpose strings, calculator disclaimers",
    files: ["src/lib/__tests__/ios-store-compliance.test.ts"],
  },
  {
    id: "H3",
    severity: "high",
    title: "No dead controls; external links leave the webview correctly",
    files: [
      "src/lib/__tests__/external-link-capture.test.ts",
      "src/lib/__tests__/external-link.test.ts",
      "src/components/__tests__/talk-to-pharmacist-checklist.test.tsx",
    ],
  },
  {
    id: "H4",
    severity: "high",
    title: "Native route policy and deep-link handling stay intact",
    files: ["src/lib/__tests__/native-route-policy.test.ts", "src/lib/__tests__/deep-link.test.ts"],
  },
  {
    id: "H5",
    severity: "high",
    title: "Logs never leak raw ids, sessions, or error objects",
    files: ["src/lib/__tests__/log-redact.test.ts"],
  },
  {
    id: "C4",
    severity: "critical",
    title: "Every installed Capacitor plugin is registered in the checked-in native projects",
    files: ["src/lib/__tests__/native-plugin-parity.test.ts"],
  },
];

const missing = CHECKS.flatMap((c) => c.files).filter((f) => !existsSync(f));
if (missing.length > 0) {
  console.error(
    `Audit suite references test files that no longer exist:\n  ${missing.join("\n  ")}\n` +
      "Update scripts/app-store-audit.mjs when renaming or removing an audit regression test.",
  );
  process.exit(1);
}

/** @type {AuditCheck[]} */
const failed = [];

for (const check of CHECKS) {
  const label = `${check.id} [${check.severity.toUpperCase()}] ${check.title}`;
  console.log(`\n=== ${label} ===`);
  const run = spawnSync("npx", ["vitest", "run", ...check.files, "--reporter=dot"], {
    stdio: "inherit",
    env: { ...process.env, CI: "true" },
  });
  if (run.status !== 0) failed.push(check);
}

const summaryLines = [
  "# App Store pre-submission audit",
  "",
  ...CHECKS.map(
    (c) =>
      `- ${failed.includes(c) ? "❌" : "✅"} **${c.id}** (${c.severity.toUpperCase()}) — ${c.title}`,
  ),
  "",
  failed.length === 0
    ? "No Critical or High issues reappeared."
    : `${failed.length} audit check(s) regressed. Fix before shipping a build.`,
];
const summary = summaryLines.join("\n");
console.log(`\n${summary}\n`);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

process.exit(failed.length === 0 ? 0 : 1);
