// Pure logic for the compound-page sitemap audit.
//
// Given the site's sitemap (index or urlset) it isolates the compound library
// URLs (/library/<slug>, excluding guides / comparisons / hubs) and, for each
// fetched page, checks that the required JSON-LD fields are present and
// well-formed. Network I/O is injected so this module is unit-testable offline
// and reusable by the live sitemap audit test.

import { parseSitemapXml } from "./sitemap-url-health";

/**
 * Segments under /library that are editorial routes, not compound entries
 * served by /library/$slug. Keep in sync with the static `library.*.tsx`
 * route files — the unit test asserts this list matches the filesystem.
 */
export const NON_COMPOUND_SEGMENTS = [
  "guides",
  "compare",
  "womens-health",
  "mens-health",
  "prostate-health",
  "testosterone-support",
  "peptide-stacks",
  "peptide-stacks-for-muscle-growth",
  "cjc-1295-ipamorelin",
  "retatrutide-dosage",
  // Compounds that ship as their own static route rather than the dynamic
  // /library/$slug page — audited separately.
  "clomiphene",
  "melanotan-2",
  "testosterone",
];

/** True when the URL is a single-slug compound page such as /library/bpc-157. */
export function isCompoundUrl(url: string): boolean {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return false;
  }
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "library") return false;
  return !NON_COMPOUND_SEGMENTS.includes(parts[1]);
}

export function compoundUrlsFromSitemap(xml: string): string[] {
  return Array.from(new Set(parseSitemapXml(xml).locs.filter(isCompoundUrl)));
}

type Node = Record<string, unknown>;

export function extractJsonLd(html: string): { nodes: Node[]; parseErrors: string[] } {
  const nodes: Node[] = [];
  const parseErrors: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) {
      parseErrors.push("empty JSON-LD block");
      continue;
    }
    try {
      nodes.push(...flatten(JSON.parse(raw)));
    } catch (e) {
      parseErrors.push(e instanceof Error ? e.message : String(e));
    }
  }
  return { nodes, parseErrors };
}

function flatten(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && typeof value === "object") {
    const obj = value as Node;
    if (Array.isArray(obj["@graph"])) return (obj["@graph"] as unknown[]).flatMap(flatten);
    return [obj];
  }
  return [];
}

export function typeList(t: unknown): string[] {
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

function hasType(node: Node, type: string): boolean {
  return typeList(node["@type"]).some((t) => t.toLowerCase() === type.toLowerCase());
}

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isAbsoluteHttp(v: unknown): v is string {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export interface CompoundPageAudit {
  url: string;
  status: number | null;
  errors: string[];
}

/** Required-field checks for the JSON-LD published by a compound page. */
export function auditCompoundJsonLd(html: string): string[] {
  const errors: string[] = [];
  const { nodes, parseErrors } = extractJsonLd(html);
  for (const e of parseErrors) errors.push(`invalid JSON-LD: ${e}`);
  if (nodes.length === 0) {
    errors.push("no JSON-LD blocks found");
    return errors;
  }

  for (const n of nodes) {
    const ctx = n["@context"];
    if (ctx !== undefined && !JSON.stringify(ctx).includes("schema.org")) {
      errors.push(`@context is not schema.org (${JSON.stringify(ctx)})`);
    }
    if (typeList(n["@type"]).length === 0 && !("@id" in n)) {
      errors.push("JSON-LD node missing @type");
    }
  }

  const crumb = nodes.find((n) => hasType(n, "BreadcrumbList"));
  if (!crumb) {
    errors.push("missing BreadcrumbList");
  } else {
    const items = crumb.itemListElement;
    if (!Array.isArray(items) || items.length === 0) {
      errors.push("BreadcrumbList has no itemListElement");
    } else {
      items.forEach((raw, i) => {
        const li = raw as Node;
        if (!li || typeof li !== "object") {
          errors.push(`breadcrumb item ${i} is not an object`);
          return;
        }
        if (li.position !== i + 1) errors.push(`breadcrumb item ${i} position must be ${i + 1}`);
        if (!nonEmpty(li.name)) errors.push(`breadcrumb item ${i} missing name`);
        const item = li.item;
        const href =
          typeof item === "string" ? item : ((item as Node)?.["@id"] ?? (item as Node)?.url);
        if (!isAbsoluteHttp(href)) errors.push(`breadcrumb item ${i} missing absolute item URL`);
      });
    }
  }

  const article = nodes.find((n) => hasType(n, "Article"));
  if (!article) {
    errors.push("missing Article");
  } else {
    if (!nonEmpty(article.headline)) errors.push("Article missing headline");
    if (!nonEmpty(article.description)) errors.push("Article missing description");
    const author = article.author as Node | undefined;
    if (!author || !nonEmpty(author.name)) errors.push("Article missing author.name");
    const publisher = article.publisher as Node | undefined;
    if (!publisher || !nonEmpty(publisher.name)) errors.push("Article missing publisher.name");
    const logo = publisher?.logo as Node | undefined;
    if (!logo || !isAbsoluteHttp(logo.url)) errors.push("Article missing publisher.logo.url");
    if (!nonEmpty(article.datePublished) || Number.isNaN(Date.parse(String(article.datePublished))))
      errors.push("Article datePublished is not a valid date");
  }

  const substance = nodes.find((n) => String(n["@id"] ?? "").endsWith("#substance"));
  if (!substance) {
    errors.push("missing substance node (#substance)");
  } else {
    if (!nonEmpty(substance.name)) errors.push("substance missing name");
    if (!isAbsoluteHttp(substance.url)) errors.push("substance missing absolute url");
    const sameAs = substance.sameAs;
    if (sameAs !== undefined) {
      if (!Array.isArray(sameAs) || sameAs.length === 0) {
        errors.push("substance sameAs present but empty");
      } else {
        for (const u of sameAs) {
          if (!isAbsoluteHttp(u))
            errors.push(`substance sameAs entry is not absolute: ${String(u)}`);
        }
        if (new Set(sameAs).size !== sameAs.length) errors.push("substance sameAs has duplicates");
      }
    }
  }

  return errors;
}

export interface PageFetchResult {
  status: number;
  text: string;
  finalUrl?: string;
}

export type PageFetcher = (url: string) => Promise<PageFetchResult>;

export async function auditCompoundPage(
  url: string,
  fetcher: PageFetcher,
): Promise<CompoundPageAudit> {
  let res: PageFetchResult;
  try {
    res = await fetcher(url);
  } catch (e) {
    return {
      url,
      status: null,
      errors: [`fetch failed: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
  if (res.status !== 200) {
    return { url, status: res.status, errors: [`expected HTTP 200, got ${res.status}`] };
  }
  return { url, status: 200, errors: auditCompoundJsonLd(res.text) };
}
