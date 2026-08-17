#!/usr/bin/env node
// Append the DoseRoutine attribution suffix to every public route's
// description / og:description / twitter:description meta entry.
// Idempotent: skips only content that already carries the exact product suffix.
// Keeps result <= 160 chars by trimming the original lead while preserving the suffix.
import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";
import { execSync } from "node:child_process";

const SUFFIX = " Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";
const MAX = 160;
const TARGET_SUFFIX = SUFFIX.trim();

// Exclude: auth/private, library.$slug (already done), __root, and templates
// that don't render user-visible SEO descriptions.
const EXCLUDE = new Set([
  "src/routes/__root.tsx",
  "src/routes/auth.tsx",
  "src/routes/onboarding.tsx",
  "src/routes/reset-password.tsx",
  "src/routes/library.$slug.tsx",
]);

const files = execSync("ls src/routes/*.tsx", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter((f) => !EXCLUDE.has(f) && !f.includes("/_"));

function clamp(s) {
  if (s.length <= MAX) return s;
  // Trim the original lead, keep the suffix intact. Always cut on a word
  // boundary and keep the ellipsis — slicing mid-word is what produced
  // broken fragments like "…and pep Check it against…" in production.
  const originalMax = MAX - SUFFIX.length;
  const original = s.slice(0, s.length - SUFFIX.length).trimEnd();
  let lead = original.slice(0, Math.max(0, originalMax - 1));
  const lastSpace = lead.lastIndexOf(" ");
  if (lastSpace > 20) lead = lead.slice(0, lastSpace);
  const trimmed = lead.trimEnd().replace(/[.,;:…]+$/, "") + "…";
  return trimmed + SUFFIX;
}

function appendSuffix(body) {
  const hasTarget = body.toLowerCase().includes(TARGET_SUFFIX.toLowerCase());
  const clean = body
    .replace(/\s*Check with DoseRoutine\.\s*$/i, "")
    .replace(
      /\s*Check it against your full supplement, TRT, or peptide routine with DoseRoutine\.\s*$/i,
      "",
    )
    .replace(/[\s.]*…\s*$/, "")
    .trimEnd();
  const clamped = clamp(clean + SUFFIX);
  return hasTarget && clamped === body ? null : clamped;
}

function processStringLiteral(quote, body) {
  // body is the raw string between quotes (may contain escapes)
  const clamped = appendSuffix(body);
  return clamped ? quote + clamped + quote : null;
}

let touched = 0;

for (const file of files) {
  let src = readFileSync(file, "utf8");
  const orig = src;

  // Match top-level constants that clearly hold a description string:
  //   const DESC = "..."; | const pageDescription = "..."; | const desc = "...";
  // Only single-line plain string literals (no template/interpolation).
  const constRe =
    /(const\s+(?:DESC|desc|pageDescription|description)\s*=\s*)(["'])((?:\\.|(?!\2).)*)\2(\s*;?)/g;

  src = src.replace(constRe, (m, prefix, q, body, semi) => {
    const clamped = appendSuffix(body);
    return clamped ? prefix + q + clamped + q + semi : m;
  });

  // Also handle direct-in-meta string literals (already-covered pattern).
  const inlinePatterns = [
    /(name:\s*"description",\s*content:\s*)(["'])((?:\\.|(?!\2).)*)\2/g,
    /(property:\s*"og:description",\s*content:\s*)(["'])((?:\\.|(?!\2).)*)\2/g,
    /(name:\s*"twitter:description",\s*content:\s*)(["'])((?:\\.|(?!\2).)*)\2/g,
  ];
  for (const re of inlinePatterns) {
    src = src.replace(re, (m, prefix, q, body) => {
      const clamped = appendSuffix(body);
      return clamped ? prefix + q + clamped + q : m;
    });
  }

  if (src !== orig) {
    writeFileSync(file, src);
    touched++;
    console.log("edited", file);
  }
}

console.log(`\n${touched} files edited.`);
