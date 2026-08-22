#!/usr/bin/env node
/**
 * C1 guard — route code-splitting export safety.
 *
 * TanStack Start splits every route file into two chunks: the route *options*
 * (head/loader/beforeLoad/…) and the *component*. A module-scope constant that
 * is referenced from BOTH sides gets left in one chunk and imported by the
 * other. If that constant is not exported, the generated import resolves to
 * nothing and the route dies at load time with:
 *
 *   SyntaxError: The requested module '/src/routes/x.tsx' does not provide an
 *   export named 'FAQ'
 *
 * This has shipped twice (CANONICAL on 62 routes, FAQ on 8 comparison routes),
 * each time as a white-screen on direct navigation. This check fails the build
 * when a shared module-scope constant is not exported.
 *
 * Usage: node scripts/check-route-split-exports.mjs [--json]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = "src/routes";

/** Recursively collect .tsx route files. */
function routeFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...routeFiles(full));
      continue;
    }
    if (!entry.endsWith(".tsx")) continue;
    if (entry.endsWith(".test.tsx")) continue;
    out.push(full);
  }
  return out;
}

/**
 * Extract the `createFileRoute(...)({ ... })` options object source.
 * Returns null when the file has no route options (e.g. api handlers).
 */
export function extractRouteOptions(source) {
  const marker = source.match(/createFileRoute\([^)]*\)\s*\(/);
  if (!marker) return null;
  const start = source.indexOf("(", marker.index + marker[0].length - 1);
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(start + 1, i);
    }
  }
  return null;
}

/** Module-scope `const NAME =` declarations, with their export status + line. */
export function moduleScopeConsts(source) {
  const found = [];
  const lines = source.split("\n");
  lines.forEach((line, idx) => {
    const m = /^(export\s+)?(?:const|let|function)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (!m) return;
    found.push({ name: m[2], exported: Boolean(m[1]), line: idx + 1 });
  });
  return found;
}

/** Count identifier references in a chunk of source. */
function references(source, name) {
  const re = new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`, "g");
  return (source.match(re) ?? []).length;
}

export function analyzeRouteSource(source) {
  const options = extractRouteOptions(source);
  if (!options) return [];
  const rest = source.replace(options, "");
  const violations = [];
  for (const decl of moduleScopeConsts(source)) {
    if (decl.exported) continue;
    if (decl.name === "Route") continue;
    const inOptions = references(options, decl.name) > 0;
    if (!inOptions) continue;
    // Referenced outside the options object too (declaration line counts once).
    const outside = references(rest, decl.name) > 1;
    if (outside) violations.push(decl);
  }
  return violations;
}

function main() {
  const json = process.argv.includes("--json");
  const results = [];
  for (const file of routeFiles(ROUTES_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const v of analyzeRouteSource(source)) {
      results.push({
        file,
        line: v.line,
        name: v.name,
        message: `'${v.name}' is used by both the route options and the component but is not exported. Add 'export' so it survives route code-splitting.`,
      });
    }
  }

  if (json) {
    console.log(JSON.stringify({ ok: results.length === 0, violations: results }, null, 2));
  } else if (results.length === 0) {
    console.log("route-split exports: OK");
  } else {
    console.error(`route-split exports: ${results.length} problem(s)\n`);
    for (const r of results) console.error(`  ${r.file}:${r.line}  ${r.message}`);
  }
  process.exit(results.length === 0 ? 0 : 1);
}

if (process.argv[1] && process.argv[1].endsWith("check-route-split-exports.mjs")) main();
