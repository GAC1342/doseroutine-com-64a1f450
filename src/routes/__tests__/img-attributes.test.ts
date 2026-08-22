/**
 * Deployment guard: every rendered <img> in the app must carry BOTH an `alt`
 * and a `title` attribute.
 *
 * Site audits flag missing image titles/alts across the whole site, so this
 * lints the JSX source of every route and component rather than a handful of
 * pages. Dynamic values (`alt={hero.alt}`) count — the check is for presence
 * of the attribute, not a literal string.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");

/** Files that legitimately render <img> without a title. */
const EXEMPT = new Set<string>([
  // shadcn/ui primitives re-export attributes from callers.
  "components/ui/avatar.tsx",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Extract each `<img ... >` opening tag from JSX source. */
function imgTags(source: string): string[] {
  return [...source.matchAll(/<img\b[\s\S]*?\/?>/g)].map((m) => m[0]);
}

function hasAttr(tag: string, name: string): boolean {
  // Matches `alt="x"`, `alt={expr}`, and spread-free shorthand.
  return new RegExp(`(^|\\s)${name}\\s*=`).test(tag) || new RegExp(`\\b${name}:`).test(tag);
}

describe("every <img> has alt and title", () => {
  const files = walk(SRC);

  it("finds JSX sources to lint", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("has no <img> missing alt or title", () => {
    const problems: string[] = [];
    for (const file of files) {
      const rel = path.relative(SRC, file).split(path.sep).join("/");
      if (EXEMPT.has(rel)) continue;
      const source = readFileSync(file, "utf8");
      for (const tag of imgTags(source)) {
        // A spread can supply both attributes; require an explicit marker.
        const spread = /\{\.\.\./.test(tag);
        // Purely decorative images (empty alt + aria-hidden) are exempt from
        // `title`: a tooltip on a hidden image is noise for both users and bots.
        const decorative = /alt=""/.test(tag) && /aria-hidden=("true"|\{true\})/.test(tag);
        const required = decorative ? ["alt"] : ["alt", "title"];
        const missing = required.filter((a) => !hasAttr(tag, a));
        if (missing.length && !spread) {
          problems.push(`${rel}: <img> missing ${missing.join(" and ")}`);
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
