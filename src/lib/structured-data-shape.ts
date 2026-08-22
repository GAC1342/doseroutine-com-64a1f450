/**
 * Structured-data shape extraction.
 *
 * Rich results depend on the SHAPE of our markup — which schema.org types are
 * declared and which fields each one carries — far more than on the prose
 * inside them. Article headlines change every week; the fact that an Article
 * node still declares `headline`, `datePublished` and `author` must not.
 *
 * `structuredDataShape()` reduces a server-rendered HTML document to exactly
 * that: node types plus sorted field names, with volatile values normalised
 * away. Snapshotting the result turns any accidental schema change (a dropped
 * `publisher`, a renamed `@type`, a lost microdata itemprop) into a failing
 * build instead of a silent rich-result regression weeks later.
 */

export interface JsonLdShape {
  /** schema.org @type, joined with "+" when a node declares several. */
  type: string;
  /** Sorted field names present on the node (values deliberately excluded). */
  fields: string[];
  /** Stable identity values, normalised to paths so the host can't churn. */
  identity: Record<string, string>;
}

export interface MicrodataShape {
  itemtype: string;
  itemprops: string[];
}

export interface StructuredDataShape {
  jsonLd: JsonLdShape[];
  microdata: MicrodataShape[];
}

/** Fields whose VALUE is part of the contract, not just their presence. */
const IDENTITY_FIELDS = ["@id", "url", "name", "@context", "inLanguage", "isPartOf"] as const;

function decodeEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Absolute URLs collapse to their path so the snapshot is identical whether it
 * was captured against localhost, the preview host, or production.
 */
export function normalizeUrlValue(value: string): string {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === "schema.org" || url.hostname === "www.schema.org") return trimmed;
    return `{origin}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return trimmed;
  }
}

function identityValue(value: unknown): string | undefined {
  if (typeof value === "string") return normalizeUrlValue(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  if (value && typeof value === "object") {
    const nested = value as Record<string, unknown>;
    const id = nested["@id"] ?? nested["url"] ?? nested["name"];
    if (typeof id === "string") return normalizeUrlValue(id);
    return "{object}";
  }
  return undefined;
}

export function typeOfNode(node: Record<string, unknown>): string {
  const raw = node["@type"];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw))
    return raw
      .filter((t) => typeof t === "string")
      .sort()
      .join("+");
  return "(untyped)";
}

/** Every JSON-LD object in the document, flattened out of arrays and @graph. */
export function readJsonLdNodes(html: string): Record<string, unknown>[] {
  const blocks = Array.from(
    html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ).map((m) => m[1] ?? "");

  const nodes: Record<string, unknown>[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    if (!value || typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    nodes.push(obj);
    if (obj["@graph"]) push(obj["@graph"]);
  };

  for (const raw of blocks) {
    try {
      push(JSON.parse(decodeEntities(raw)));
    } catch {
      // A malformed block is a separate failure mode; the SSR spec asserts
      // parseability. Shape extraction stays resilient so the snapshot diff
      // still shows what survived.
    }
  }
  return nodes;
}

/**
 * Microdata blocks: every element carrying `itemtype`, with the itemprop names
 * that belong to it. Nesting is approximated by document order — a scope owns
 * the itemprops that appear after it and before the next scope, which matches
 * how our markup is authored (one flat block per entity).
 */
export function readMicrodata(html: string): MicrodataShape[] {
  const scopes: MicrodataShape[] = [];
  const tokens = Array.from(html.matchAll(/<[a-z][^>]*\b(itemtype|itemprop)="([^"]+)"[^>]*>/gi));

  for (const token of tokens) {
    const tag = token[0] ?? "";
    const itemtypeMatch = /\bitemtype="([^"]+)"/i.exec(tag);
    const itempropMatch = /\bitemprop="([^"]+)"/i.exec(tag);

    if (itemtypeMatch) {
      const itemtype = itemtypeMatch[1]!.trim();
      let scope = scopes.find((s) => s.itemtype === itemtype);
      if (!scope) {
        scope = { itemtype, itemprops: [] };
        scopes.push(scope);
      }
      // An element can open a scope AND be a property of its parent
      // (`itemprop="publisher" itemtype=".../Organization"`).
      if (itempropMatch) {
        const parent = scopes[scopes.length - 2] ?? scopes[0];
        if (parent && parent !== scope) addProp(parent, itempropMatch[1]!);
      }
      continue;
    }

    if (itempropMatch && scopes.length) {
      addProp(scopes[scopes.length - 1]!, itempropMatch[1]!);
    }
  }

  for (const scope of scopes) scope.itemprops.sort();
  return scopes.sort((a, b) => a.itemtype.localeCompare(b.itemtype));
}

function addProp(scope: MicrodataShape, value: string) {
  for (const prop of value.trim().split(/\s+/)) {
    if (prop && !scope.itemprops.includes(prop)) scope.itemprops.push(prop);
  }
}

export function structuredDataShape(html: string): StructuredDataShape {
  const jsonLd = readJsonLdNodes(html)
    .map((node): JsonLdShape => {
      const fields = Object.keys(node)
        .filter((key) => key !== "@graph")
        .sort();
      const identity: Record<string, string> = {};
      for (const key of IDENTITY_FIELDS) {
        if (!(key in node)) continue;
        const value = identityValue(node[key]);
        if (value !== undefined) identity[key] = value;
      }
      return { type: typeOfNode(node), fields, identity };
    })
    .sort((a, b) => a.type.localeCompare(b.type) || a.fields.join().localeCompare(b.fields.join()));

  return { jsonLd, microdata: readMicrodata(html) };
}

/** Deterministic, diff-friendly rendering of a shape for snapshot files. */
export function formatShape(shape: StructuredDataShape): string {
  const lines: string[] = ["microdata:"];
  for (const item of shape.microdata) {
    lines.push(`  ${item.itemtype}`);
    for (const prop of item.itemprops) lines.push(`    - ${prop}`);
  }
  lines.push("json-ld:");
  for (const node of shape.jsonLd) {
    lines.push(`  ${node.type}`);
    for (const [key, value] of Object.entries(node.identity)) {
      lines.push(`    ${key} = ${value}`);
    }
    for (const field of node.fields) lines.push(`    - ${field}`);
  }
  return lines.join("\n");
}
