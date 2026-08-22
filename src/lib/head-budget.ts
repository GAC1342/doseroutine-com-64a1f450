/**
 * Head budget — keeps `<head>` under the "node with more than 60 children"
 * threshold that SEO crawlers (and browser DOM-size audits) warn about.
 *
 * The bulk of the head on route-heavy pages is `<link rel="modulepreload">`,
 * one per route chunk. Preloading the entry + shared vendor chunks is what
 * actually moves hydration; the long tail of small leaf chunks is already
 * discovered through the module graph a few milliseconds later. Capping the
 * list keeps the useful hints and drops the noise.
 */

/** How many modulepreload hints a single document may emit. */
export const MODULE_PRELOAD_BUDGET = 8;

const MODULE_PRELOAD_TAG = /<link\b[^>]*\brel="modulepreload"[^>]*>/gi;

/**
 * Drops modulepreload hints beyond `max`, keeping the first ones (entry,
 * runtime and shared vendor chunks are emitted first).
 */
export function capModulePreloads(html: string, max: number = MODULE_PRELOAD_BUDGET): string {
  let seen = 0;
  return html.replace(MODULE_PRELOAD_TAG, (tag) => {
    seen += 1;
    return seen <= max ? tag : "";
  });
}

/** Counts direct element children of `<head>` — used by tests and audits. */
export function countHeadChildren(html: string): number {
  const head = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? "";
  return (head.match(/<(?!\/)[a-zA-Z][^>]*>/g) ?? []).filter((tag) => !/^<(?:\/|!)/.test(tag))
    .length;
}

const JSON_LD_TAG = /<script\b([^>]*\btype="application\/ld\+json"[^>]*)>([\s\S]*?)<\/script>/gi;

/**
 * Collapses every JSON-LD block into a single `@graph` script.
 *
 * Routes compose schema from several independent builders (Article, FAQPage,
 * Breadcrumbs, Organization…), which is fine semantically but emits up to nine
 * `<script>` children in `<head>`. Google reads one combined `@graph`
 * identically, and the head loses eight nodes.
 */
export function mergeJsonLd(html: string): string {
  const blocks: { attrs: string; nodes: unknown[] }[] = [];
  let parseFailed = false;

  html.replace(JSON_LD_TAG, (_m, attrs: string, body: string) => {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      const graph = Array.isArray(parsed["@graph"]) ? (parsed["@graph"] as unknown[]) : [parsed];
      blocks.push({ attrs, nodes: graph });
    } catch {
      parseFailed = true;
    }
    return "";
  });

  // Anything unparseable stays exactly as authored — never risk dropping schema.
  if (parseFailed || blocks.length < 2) return html;

  const merged = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": blocks.flatMap((b) => b.nodes),
  });

  let index = 0;
  return html.replace(JSON_LD_TAG, (_match, attrs: string) => {
    index += 1;
    return index === 1 ? `<script${attrs}>${merged}</script>` : "";
  });
}

/**
 * Full head slim-down applied to every server-rendered HTML response.
 *
 * Only the modulepreload cap runs here. JSON-LD is merged at the source (route
 * `head()` builders) instead: rewriting React-rendered head scripts in the
 * response body breaks hydration and forces a full client re-render.
 */
export function trimHead(html: string): string {
  return capModulePreloads(html);
}

type HeadScript = { type?: string; children?: string; [key: string]: unknown };

/**
 * Collapses a route's JSON-LD `<script>` entries into one `@graph` script.
 *
 * Search engines read a single `@graph` exactly like separate blocks, and the
 * head sheds one node per merged block — the difference between passing and
 * failing the crawler's "more than 60 children" check on schema-rich pages.
 * Non-JSON-LD scripts and anything unparseable are passed through untouched.
 */
export function mergeLdScripts<T extends HeadScript>(scripts: T[]): T[] {
  const nodes: unknown[] = [];
  const rest: T[] = [];
  let template: T | undefined;

  for (const script of scripts) {
    if (script.type !== "application/ld+json" || typeof script.children !== "string") {
      rest.push(script);
      continue;
    }
    try {
      const parsed = JSON.parse(script.children) as Record<string, unknown>;
      const graph = Array.isArray(parsed["@graph"]) ? (parsed["@graph"] as unknown[]) : [parsed];
      nodes.push(...graph);
      template ??= script;
    } catch {
      rest.push(script);
    }
  }

  if (!template || nodes.length === 0) return scripts;

  const merged = {
    ...template,
    children: JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }),
  } as T;
  return [...rest, merged];
}
