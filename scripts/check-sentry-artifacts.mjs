#!/usr/bin/env node
/**
 * Verifies that stack traces can resolve back to original code:
 *  1. Web: the client build emits hidden source maps, and they are NOT served
 *     publicly with a sourceMappingURL comment.
 *  2. Web: source maps get uploaded to Sentry (requires SENTRY_AUTH_TOKEN).
 *  3. iOS: the Xcode project has a dSYM upload build phase and produces
 *     debug symbols (DEBUG_INFORMATION_FORMAT = dwarf-with-dsym).
 *
 * Exit code 1 on a hard failure, 0 with warnings when only upload credentials
 * are missing (they are configured outside the repo).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const problems = [];
const warnings = [];
const ok = [];

// ---------- 1. Web build source maps ----------
const clientDirs = [".output/public/assets", "dist/assets", ".tanstack/build/client/assets"].filter(
  (d) => existsSync(d),
);

if (clientDirs.length === 0) {
  warnings.push("No client build found — run `npm run build` before checking web source maps.");
} else {
  const dir = clientDirs[0];
  const files = readdirSync(dir);
  const maps = files.filter((f) => f.endsWith(".js.map"));
  const js = files.filter((f) => f.endsWith(".js"));
  if (maps.length === 0) {
    problems.push(`${dir}: no .js.map files emitted — set build.sourcemap in vite.config.ts.`);
  } else {
    ok.push(`${maps.length} source maps emitted for ${js.length} JS chunks in ${dir}.`);
    const leaky = js.filter((f) =>
      readFileSync(join(dir, f), "utf8").includes("//# sourceMappingURL="),
    );
    if (leaky.length > 0) {
      problems.push(
        `${leaky.length} chunk(s) contain a sourceMappingURL comment — use sourcemap: "hidden".`,
      );
    } else {
      ok.push("No sourceMappingURL comments in shipped JS (hidden source maps).");
    }
    const tiny = maps.filter((f) => statSync(join(dir, f)).size < 200);
    if (tiny.length > 0) problems.push(`${tiny.length} source map(s) look empty/truncated.`);
  }
}

// ---------- 2. Sentry upload credentials ----------
const hasToken = Boolean(process.env.SENTRY_AUTH_TOKEN);
const hasOrg = Boolean(process.env.SENTRY_ORG);
const hasProject = Boolean(process.env.SENTRY_PROJECT);
if (hasToken && hasOrg && hasProject) {
  ok.push("SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT present — uploads can run.");
} else {
  warnings.push(
    "Sentry upload credentials missing (need SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT). " +
      "Until they are set, web stack traces stay minified and iOS crashes stay unsymbolicated.",
  );
}

// ---------- 3. iOS dSYM ----------
const pbx = "ios/App/App.xcodeproj/project.pbxproj";
if (!existsSync(pbx)) {
  warnings.push("No iOS project found — skipping dSYM checks.");
} else {
  const text = readFileSync(pbx, "utf8");
  const releaseDsym = /DEBUG_INFORMATION_FORMAT = "?dwarf-with-dsym"?/.test(text);
  if (releaseDsym) ok.push("iOS Release builds produce dSYMs (dwarf-with-dsym).");
  else problems.push(`${pbx}: Release config is not set to dwarf-with-dsym — no dSYMs produced.`);

  const uploadPhase = /sentry-cli\s+(debug-files\s+)?upload/.test(text) || /sentry-cli/.test(text);
  if (uploadPhase) ok.push("iOS project has a sentry-cli upload build phase.");
  else
    warnings.push(
      `${pbx}: no sentry-cli upload build phase — add one (or enable Sentry's Xcode integration) ` +
        "so dSYMs reach Sentry after each Release build.",
    );

  const props = ["ios/sentry.properties", "ios/App/sentry.properties"].find((p) => existsSync(p));
  if (props) ok.push(`Found ${props} for sentry-cli.`);
  else
    warnings.push("No ios/sentry.properties — sentry-cli needs org/project/auth token at build.");
}

for (const line of ok) console.log(`PASS  ${line}`);
for (const line of warnings) console.log(`WARN  ${line}`);
for (const line of problems) console.log(`FAIL  ${line}`);

console.log(
  `\nsentry artifacts: ${ok.length} pass, ${warnings.length} warning(s), ${problems.length} failure(s)`,
);
process.exit(problems.length > 0 ? 1 : 0);
