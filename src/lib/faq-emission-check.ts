/**
 * Lightweight production check: counts FAQPage JSON-LD blocks in a scripts
 * array (as passed to TanStack's head() `scripts` field) and logs a warning
 * when the count is not exactly 1. Zero = missing schema (SEO regression),
 * two+ = duplicate schema (Google penalises this).
 *
 * Logs surface in Cloudflare Worker logs via `stack_modern--server-function-logs`
 * on SSR, and in the browser console on client-side navigations.
 *
 * Safe to call from head(): pure, cheap (single regex per script), never throws.
 */

import { typeMatchesNormalized } from "./faq-normalize";

type ScriptEntry = { type?: string; children?: string } & Record<string, unknown>;

export function countFaqPageBlocks(scripts: ReadonlyArray<ScriptEntry>): number {
  let count = 0;
  for (const s of scripts) {
    if (s?.type !== "application/ld+json" || typeof s.children !== "string") continue;
    try {
      const parsed = JSON.parse(s.children);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (node && typeMatchesNormalized(node["@type"], "FAQPage")) count++;
      }
    } catch {
      // Ignore unparseable blocks — not our concern here.
    }
  }
  return count;
}

export function assertSingleFaqPage(
  scripts: ReadonlyArray<ScriptEntry>,
  context: { route: string; slug?: string },
): number {
  const count = countFaqPageBlocks(scripts);
  if (count === 1) return count;
  const where = context.slug ? `${context.route} (slug=${context.slug})` : context.route;
  if (count === 0) {
    console.warn(`[faq-emission-check] MISSING FAQPage JSON-LD on ${where}`);
  } else {
    console.warn(
      `[faq-emission-check] DUPLICATE FAQPage JSON-LD on ${where}: ${count} blocks emitted (expected 1)`,
    );
  }
  return count;
}
