/**
 * Duplicate / conflicting JSON-LD detection.
 *
 * A page's structured data is the union of every <script type="application/ld+json">
 * the root route and the matched leaf route emit. Because those two layers are
 * written independently, it is easy to ship the same entity twice — e.g. a leaf
 * route re-declaring WebSite with a thinner body under the same @id as the
 * sitewide node. Google then has two conflicting definitions for one entity and
 * silently picks one, so rich results become unpredictable.
 *
 * This module is pure and offline: feed it the parsed JSON-LD blocks for a page
 * and it reports every duplicate or conflict. Tests use it as a build-time lint.
 */

export type JsonLdNode = Record<string, unknown>;

/**
 * Types that describe the page or the site as a whole. Exactly one of each may
 * appear per page — two WebPage nodes or two FAQPage nodes are always a bug.
 * Types NOT listed here (Question, ListItem, ScholarlyArticle, DefinedTerm, …)
 * legitimately repeat as members of a collection.
 */
export const SINGLETON_TYPES = new Set<string>([
  "WebSite",
  "Organization",
  "SoftwareApplication",
  "WebPage",
  "CollectionPage",
  "ItemPage",
  "AboutPage",
  "ContactPage",
  "FAQPage",
  "BreadcrumbList",
  "Article",
  "BlogPosting",
  "MedicalWebPage",
]);

export type JsonLdConflict = {
  kind: "duplicate-id" | "conflicting-id" | "duplicate-type";
  /** @id or @type the problem is about. */
  subject: string;
  message: string;
};

function typesOf(node: JsonLdNode): string[] {
  const raw = node["@type"];
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === "string");
  return [];
}

/** Flattens @graph containers and arrays into a single list of nodes. */
export function flattenJsonLd(input: unknown): JsonLdNode[] {
  const out: JsonLdNode[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as JsonLdNode;
    if (Array.isArray(node["@graph"])) {
      visit(node["@graph"]);
      // A wrapper carrying only @context/@graph is not itself an entity.
      const ownKeys = Object.keys(node).filter((k) => k !== "@graph" && k !== "@context");
      if (ownKeys.length === 0) return;
    }
    out.push(node);
  };
  visit(input);
  return out;
}

/**
 * A node that only carries @id (plus @type) is a *reference* to an entity
 * declared elsewhere, not a second declaration. Those are correct and expected.
 */
function isReferenceOnly(node: JsonLdNode): boolean {
  const keys = Object.keys(node).filter((k) => k !== "@context");
  return keys.length <= 2 && keys.includes("@id");
}

/** Stable stringify so key order never registers as a conflict. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize(obj[key]);
        return acc;
      }, {});
  }
  return value;
}

/**
 * Returns every duplicate/conflict on a page. Empty array == clean.
 *
 * @param blocks Parsed contents of each ld+json script on the page, in DOM order.
 */
export function findJsonLdConflicts(blocks: unknown[]): JsonLdConflict[] {
  const nodes = blocks.flatMap((block) => flattenJsonLd(block));
  const conflicts: JsonLdConflict[] = [];

  // 1. Same @id declared more than once.
  const byId = new Map<string, JsonLdNode[]>();
  for (const node of nodes) {
    const id = node["@id"];
    if (typeof id !== "string" || isReferenceOnly(node)) continue;
    byId.set(id, [...(byId.get(id) ?? []), node]);
  }
  for (const [id, group] of byId) {
    if (group.length < 2) continue;
    const shapes = new Set(group.map((n) => JSON.stringify(canonicalize(n))));
    conflicts.push({
      kind: shapes.size > 1 ? "conflicting-id" : "duplicate-id",
      subject: id,
      message:
        shapes.size > 1
          ? `@id ${id} is declared ${group.length}× with different content — crawlers cannot tell which definition wins`
          : `@id ${id} is declared ${group.length}× (identical duplicates)`,
    });
  }

  // 2. Same page-level/site-level type declared more than once.
  const byType = new Map<string, JsonLdNode[]>();
  for (const node of nodes) {
    if (isReferenceOnly(node)) continue;
    for (const type of typesOf(node)) {
      if (!SINGLETON_TYPES.has(type)) continue;
      byType.set(type, [...(byType.get(type) ?? []), node]);
    }
  }
  for (const [type, group] of byType) {
    if (group.length < 2) continue;
    const ids = group.map((n) =>
      typeof n["@id"] === "string" ? (n["@id"] as string) : "(no @id)",
    );
    // Already reported as an @id clash — don't double-count the same defect.
    if (new Set(ids).size === 1 && ids[0] !== "(no @id)") continue;
    conflicts.push({
      kind: "duplicate-type",
      subject: type,
      message: `${group.length} ${type} nodes on one page (${ids.join(", ")}) — only one is allowed`,
    });
  }

  return conflicts.sort((a, b) => a.subject.localeCompare(b.subject));
}

/** Extracts and parses every ld+json block from an HTML string. */
export function parseJsonLdFromHtml(html: string): { blocks: unknown[]; parseErrors: string[] } {
  const blocks: unknown[] = [];
  const parseErrors: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = (match[1] ?? "").trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch (error) {
      parseErrors.push(`invalid JSON-LD: ${(error as Error).message}`);
    }
  }
  return { blocks, parseErrors };
}
