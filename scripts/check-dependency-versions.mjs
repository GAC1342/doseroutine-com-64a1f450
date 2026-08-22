#!/usr/bin/env node
/**
 * Dependency/version audit.
 *
 * `npm audit` (see .github/workflows/dependency-audit.yml) only catches known
 * CVEs. This script catches the other half: key packages drifting behind their
 * latest release, which is how a project quietly ends up two majors behind on
 * Capacitor or React right before a store submission.
 *
 * Usage:
 *   node scripts/check-dependency-versions.mjs [--json outdated.json] [--warn-only]
 *
 * Without --json it shells out to `npm outdated --json` itself.
 * Exit 0 = nothing actionable, 1 = a `critical`-tier package breached policy.
 *
 * Policy lives in scripts/dependency-policy.json.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const args = process.argv.slice(2);
const warnOnly = args.includes("--warn-only");
const jsonIdx = args.indexOf("--json");
const jsonFile = jsonIdx !== -1 ? args[jsonIdx + 1] : null;
const planIdx = args.indexOf("--emit-plan");
const planFile = planIdx !== -1 ? args[planIdx + 1] : null;

export function parseVersion(value) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(value ?? "").trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/** Returns "major" | "minor" | "patch" | null (null = same or newer). */
export function driftLevel(current, latest) {
  const a = parseVersion(current);
  const b = parseVersion(latest);
  if (!a || !b) return null;
  if (b.major > a.major) return "major";
  if (b.major < a.major) return null;
  if (b.minor > a.minor) return "minor";
  if (b.minor < a.minor) return null;
  if (b.patch > a.patch) return "patch";
  return null;
}

const RANK = { patch: 1, minor: 2, major: 3 };

export function evaluate(outdated, policy) {
  const findings = [];
  const holds = policy.holds ?? {};
  for (const group of policy.groups) {
    for (const name of group.packages) {
      const entry = outdated[name];
      if (!entry) continue;
      const current = entry.current ?? entry.wanted;
      const latest = entry.latest;
      const drift = driftLevel(current, latest);
      if (!drift) continue;
      const hold = holds[name];
      const breaches = RANK[drift] >= RANK[group.failOn ?? "major"];
      findings.push({
        name,
        group: group.name,
        tier: group.tier,
        current,
        latest,
        drift,
        // A hold means the ecosystem can't take the upgrade yet, so it is
        // advisory only — never a blocking (auto-PR) finding.
        ...(hold ? { hold: hold.reason ?? true } : {}),
        severity: !hold && breaches && group.tier === "critical" ? "error" : "warn",
      });
    }
  }

  findings.sort(
    (x, y) =>
      (x.severity === y.severity ? 0 : x.severity === "error" ? -1 : 1) ||
      RANK[y.drift] - RANK[x.drift] ||
      x.name.localeCompare(y.name),
  );
  return findings;
}

function readOutdated() {
  if (jsonFile) return JSON.parse(fs.readFileSync(jsonFile, "utf8") || "{}");
  try {
    // npm outdated exits 1 when anything is outdated — that's expected.
    const out = execFileSync("npm", ["outdated", "--json"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    return JSON.parse(out || "{}");
  } catch (error) {
    const out = error.stdout?.toString?.() ?? "";
    if (out.trim()) return JSON.parse(out);
    console.error(`Could not run 'npm outdated': ${error.message}`);
    process.exit(1);
  }
}

function main() {
  const policy = JSON.parse(fs.readFileSync(path.join(here, "dependency-policy.json"), "utf8"));
  const findings = evaluate(readOutdated(), policy);
  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  const lines = [];
  lines.push("## Dependency / version audit", "");
  if (findings.length === 0) {
    lines.push("✅ All watched packages are on their latest release.");
  } else {
    lines.push(`| | Package | Group | Current | Latest | Drift |`, `|---|---|---|---|---|---|`);
    for (const f of findings) {
      lines.push(
        `| ${f.severity === "error" ? "❌" : "⚠️"} | \`${f.name}\` | ${f.group} | ${f.current} | ${f.latest} | ${f.drift} |`,
      );
    }
    lines.push("", `**${errors.length} blocking**, ${warns.length} advisory.`, "");
    if (errors.length) {
      lines.push(
        "Update with:",
        "",
        "```sh",
        `npm install ${errors.map((f) => `${f.name}@latest`).join(" ")}`,
        "```",
      );
    }
  }
  const report = lines.join("\n");
  console.log(report);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  }

  // Machine-readable plan so CI can open a PR with the exact install command.
  const installArgs = errors.map((f) => `${f.name}@${f.latest}`);
  const plan = {
    generatedAt: new Date().toISOString(),
    blocking: errors,
    advisory: warns,
    installCommand: installArgs.length ? `npm install ${installArgs.join(" ")}` : null,
    report,
  };
  if (planFile)
    fs.writeFileSync(path.resolve(root, planFile), `${JSON.stringify(plan, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `has_blocking=${errors.length ? "true" : "false"}\ninstall_command=${plan.installCommand ?? ""}\n`,
    );
  }

  if (errors.length && !warnOnly) process.exit(1);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}
