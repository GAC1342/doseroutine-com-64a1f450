/**
 * Organization / Person structured-data lint.
 *
 * Google builds the knowledge-panel entity for a site from the Organization
 * node (name + logo + sameAs) and attributes content through the author node
 * (Person or Organization). A publisher without a logo, or an entity whose
 * `sameAs` holds a relative path, is silently dropped — the page keeps
 * validating while the entity never gets built.
 *
 * This module is pure and offline: feed it the parsed JSON-LD blocks a page
 * emits (root + leaf route) and it reports every missing or malformed field.
 *
 * Merge semantics match a crawler's: nodes sharing an `@id` describe ONE
 * entity, so a thin `{"@id": org, "@type": "Organization", name}` author node
 * on an article is fine as long as the sitewide graph defines that same `@id`
 * with a logo. Nodes without an `@id` stand alone and must be complete.
 */

import { type JsonLdNode } from "./jsonld-duplicates";

/**
 * Collects every object in the block, including nodes nested under properties
 * such as `publisher`, `author`, or `@graph`. Entity nodes commonly live one
 * level down inside an Article, so a shallow flatten would miss them.
 */
function deepNodes(input: unknown): JsonLdNode[] {
  const out: JsonLdNode[] = [];
  const seen = new Set<unknown>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    const node = value as JsonLdNode;
    out.push(node);
    for (const key of Object.keys(node)) {
      if (key.startsWith("@") && key !== "@graph") continue;
      visit(node[key]);
    }
  };
  visit(input);
  return out;
}

export type EntityIssue = {
  /** The @id, or the name, of the entity the problem is about. */
  subject: string;
  entityType: "Organization" | "Person";
  field: string;
  message: string;
};

export type EntityLintOptions = {
  /**
   * The sitewide publisher entity. When present in the page graph it must
   * carry `sameAs` — that is the entity Google reconciles into a knowledge
   * panel, and profile links are the strongest proof it is real.
   */
  primaryOrgId?: string;
  /**
   * Origin of this site, e.g. "https://doseroutine.com". Organization nodes
   * pointing at it are treated as *our* publisher entity and held to the full
   * name + logo + consolidated @id contract.
   */
  siteOrigin?: string;
  /**
   * Names that identify our own Organization entity in nodes that carry no
   * url (e.g. `author: { "@type": "Organization", name: "DoseRoutine" }`).
   */
  brandNames?: string[];
};


const ORGANIZATION_TYPES = new Set([
  "Organization",
  "Corporation",
  "NGO",
  "EducationalOrganization",
  "MedicalOrganization",
  "OnlineBusiness",
  "LocalBusiness",
]);

function typesOf(node: JsonLdNode): string[] {
  const raw = node["@type"];
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === "string");
  return [];
}

function classify(node: JsonLdNode): "Organization" | "Person" | null {
  const types = typesOf(node);
  if (types.some((t) => ORGANIZATION_TYPES.has(t))) return "Organization";
  if (types.includes("Person")) return "Person";
  return null;
}

function isAbsoluteHttps(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/[^\s]+$/.test(value.trim());
}

/** Accepts a URL string, an ImageObject, or an array of either. */
function imageUrls(value: unknown): { urls: unknown[]; malformed: boolean } {
  const urls: unknown[] = [];
  let malformed = false;
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (typeof v === "string") {
      urls.push(v);
      return;
    }
    if (v && typeof v === "object") {
      const obj = v as JsonLdNode;
      const url = obj["url"] ?? obj["contentUrl"];
      if (url === undefined) {
        // An ImageObject that only references another node by @id is fine.
        if (typeof obj["@id"] === "string") return;
        malformed = true;
        return;
      }
      visit(url);
      return;
    }
    malformed = true;
  };
  visit(value);
  return { urls, malformed };
}

/**
 * Merges nodes that share an `@id` into one entity, exactly as a consumer of
 * the page's structured data would. Nodes without an `@id` stay separate.
 */
function mergeEntities(nodes: JsonLdNode[]): Array<{ key: string; node: JsonLdNode }> {
  const byId = new Map<string, JsonLdNode>();
  const standalone: Array<{ key: string; node: JsonLdNode }> = [];

  nodes.forEach((node, index) => {
    const id = node["@id"];
    if (typeof id === "string" && id.trim()) {
      const existing = byId.get(id);
      byId.set(id, existing ? { ...existing, ...node } : { ...node });
      return;
    }
    const name = typeof node["name"] === "string" ? node["name"] : `node #${index + 1}`;
    standalone.push({ key: name, node });
  });

  return [...[...byId.entries()].map(([key, node]) => ({ key, node })), ...standalone];
}

function checkSameAs(
  node: JsonLdNode,
  subject: string,
  entityType: "Organization" | "Person",
  issues: EntityIssue[],
): void {
  if (!("sameAs" in node)) return;
  const value = node["sameAs"];
  const push = (message: string) =>
    issues.push({ subject, entityType, field: "sameAs", message });

  if (typeof value === "string") {
    if (!isAbsoluteHttps(value)) push(`sameAs is not an absolute https URL: ${value}`);
    return;
  }
  if (!Array.isArray(value)) {
    push("sameAs must be a URL string or an array of URL strings");
    return;
  }
  if (value.length === 0) {
    push("sameAs is present but empty — omit it instead");
    return;
  }
  for (const entry of value) {
    if (!isAbsoluteHttps(entry)) {
      push(`sameAs entry is not an absolute https URL: ${JSON.stringify(entry)}`);
    }
  }
  const strings = value.filter((v): v is string => typeof v === "string");
  if (new Set(strings).size !== strings.length) push("sameAs has duplicate entries");
}

/**
 * True when the node describes *this* site's publisher entity, rather than a
 * third party (e.g. the journal that published a cited study). Only our own
 * entity is held to the full logo + consolidated-@id contract; an external
 * publisher legitimately appears as a name only.
 */
function isOwnOrganization(node: JsonLdNode, options: EntityLintOptions): boolean {
  const { primaryOrgId, siteOrigin, brandNames = [] } = options;
  const id = node["@id"];
  if (primaryOrgId && id === primaryOrgId) return true;
  if (siteOrigin) {
    if (typeof id === "string" && id.startsWith(siteOrigin)) return true;
    const url = node["url"];
    if (typeof url === "string" && url.startsWith(siteOrigin)) return true;
  }
  const name = node["name"];
  return typeof name === "string" && brandNames.includes(name.trim());
}

function checkOrganization(
  node: JsonLdNode,
  subject: string,
  issues: EntityIssue[],
  options: EntityLintOptions,
): void {
  const push = (field: string, message: string) =>
    issues.push({ subject, entityType: "Organization", field, message });

  const name = node["name"];
  if (typeof name !== "string" || !name.trim()) {
    push("name", "Organization is missing a non-empty name");
  }

  const own = isOwnOrganization(node, options);
  const logoValue = node["logo"] ?? node["image"];
  if (logoValue === undefined) {
    if (own) push("logo", "Organization has neither logo nor image");
  } else {
    const { urls, malformed } = imageUrls(logoValue);
    if (malformed) push("logo", "logo/image is not a URL string or ImageObject with a url");
    if (urls.length === 0 && !malformed) {
      push("logo", "logo/image resolves to no URL");
    }
    for (const url of urls) {
      if (!isAbsoluteHttps(url)) {
        push("logo", `logo/image is not an absolute https URL: ${JSON.stringify(url)}`);
      }
    }
  }

  if ("url" in node && !isAbsoluteHttps(node["url"])) {
    push("url", `url is not an absolute https URL: ${JSON.stringify(node["url"])}`);
  }

  checkSameAs(node, subject, "Organization", issues);

  if (options.primaryOrgId) {
    // A named sub-entity (e.g. the editorial team) legitimately keeps its own
    // @id as long as it links back to the sitewide Organization — that is how
    // the graph stays consolidated without redefining the primary entity.
    const parent = node["parentOrganization"];
    const parentId =
      typeof parent === "string"
        ? parent
        : parent && typeof parent === "object"
          ? (parent as JsonLdNode)["@id"]
          : undefined;
    const isSubOrg = parentId === options.primaryOrgId;

    if (own && !isSubOrg && node["@id"] !== options.primaryOrgId) {
      push(
        "@id",
        `our Organization must use the sitewide @id "${options.primaryOrgId}" so the entity consolidates`,
      );
    }

    if (node["@id"] === options.primaryOrgId && !("sameAs" in node)) {
      push("sameAs", "primary Organization entity must declare sameAs profile links");
    }
  }
}


function checkPerson(node: JsonLdNode, subject: string, issues: EntityIssue[]): void {
  const push = (field: string, message: string) =>
    issues.push({ subject, entityType: "Person", field, message });

  const name = node["name"];
  if (typeof name !== "string" || !name.trim()) {
    push("name", "Person is missing a non-empty name");
  }

  const hasId = typeof node["@id"] === "string" && node["@id"].trim() !== "";
  const hasUrl = "url" in node;
  if (!hasId && !hasUrl) {
    push("url", "Person needs a url or an @id so the author can be resolved");
  }
  if (hasUrl && !isAbsoluteHttps(node["url"])) {
    push("url", `url is not an absolute https URL: ${JSON.stringify(node["url"])}`);
  }

  if ("image" in node) {
    const { urls, malformed } = imageUrls(node["image"]);
    if (malformed) push("image", "image is not a URL string or ImageObject with a url");
    for (const url of urls) {
      if (!isAbsoluteHttps(url)) {
        push("image", `image is not an absolute https URL: ${JSON.stringify(url)}`);
      }
    }
  }

  checkSameAs(node, subject, "Person", issues);
}

/** True when a node only points at an entity defined elsewhere. */
function isBareReference(node: JsonLdNode): boolean {
  const keys = Object.keys(node).filter((k) => k !== "@type" && k !== "@context");
  return keys.length === 1 && keys[0] === "@id";
}

/**
 * Lints every Organization and Person entity across the given JSON-LD blocks.
 * Returns an empty array when the page's entity data is complete.
 */
export function findEntityIssues(
  blocks: unknown[],
  options: EntityLintOptions = {},
): EntityIssue[] {
  const all = blocks.flatMap((block) => deepNodes(block));

  const orgNodes: JsonLdNode[] = [];
  const personNodes: JsonLdNode[] = [];
  for (const node of all) {
    const kind = classify(node);
    if (!kind) continue;
    if (isBareReference(node)) continue;
    (kind === "Organization" ? orgNodes : personNodes).push(node);
  }

  const issues: EntityIssue[] = [];
  for (const { key, node } of mergeEntities(orgNodes)) {
    checkOrganization(node, key, issues, options);
  }
  for (const { key, node } of mergeEntities(personNodes)) {
    checkPerson(node, key, issues);
  }
  return issues;
}

export function formatEntityIssues(issues: EntityIssue[]): string {
  return issues
    .map((i) => `[${i.entityType}:${i.field}] ${i.subject} — ${i.message}`)
    .join("\n");
}
