/**
 * Shared parsing for the head-size CI gate.
 *
 * Audit tools warn on "node with more than 60 children"; the head is the only
 * node on this site that ever gets close (modulepreloads + meta + JSON-LD).
 */

export const HEAD_CHILD_BUDGET = 60;

const VOID_OR_ANY_TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;

/** Extracts the raw innerHTML of `<head>`, or "" when there is none. */
export function headInner(html) {
  return /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? "";
}

/**
 * Counts DIRECT element children of `<head>`.
 *
 * `<script>` / `<style>` / `<title>` bodies can contain `<` characters, so the
 * scan tracks nesting depth and only counts tags opened at depth 0.
 */
export function countHeadChildren(html) {
  const inner = headInner(html);
  const selfClosing = new Set([
    "meta",
    "link",
    "base",
    "br",
    "hr",
    "img",
    "input",
    "source",
    "wbr",
  ]);
  let depth = 0;
  let count = 0;
  let skipUntil = null;

  for (const match of inner.matchAll(VOID_OR_ANY_TAG)) {
    const [, slash, rawName, attrs] = match;
    const name = rawName.toLowerCase();

    if (skipUntil) {
      if (slash === "/" && name === skipUntil) skipUntil = null;
      continue;
    }

    if (slash === "/") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth === 0) count += 1;

    if (selfClosing.has(name) || /\/\s*$/.test(attrs)) continue;
    if (name === "script" || name === "style" || name === "title") {
      // Their text content may contain markup-looking characters.
      if (depth === 0) skipUntil = name;
      continue;
    }
    depth += 1;
  }

  return count;
}

/** Per-page verdict used by the CI script and its unit tests. */
export function checkHeadBudget(path, html, budget = HEAD_CHILD_BUDGET) {
  const count = countHeadChildren(html);
  return {
    path,
    count,
    ok: count <= budget,
    message:
      count <= budget
        ? `${path}: ${count} head children`
        : `${path}: <head> has ${count} children (budget ${budget})`,
  };
}
