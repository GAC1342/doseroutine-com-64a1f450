/**
 * Shared JSON-LD shape validator.
 *
 * Used by the CI contract test (src/lib/__tests__/jsonld-schema-contract.test.ts)
 * so the same rules Google's Rich Results test enforces are checked on every
 * push, not only by the live-crawl script (scripts/validate-schema-sitemap.py).
 */

export type JsonLdNode = Record<string, unknown>;

/** Flatten @graph containers and arrays into a single list of nodes. */
export function flattenJsonLd(input: unknown): JsonLdNode[] {
  if (Array.isArray(input)) return input.flatMap(flattenJsonLd);
  if (input && typeof input === "object") {
    const node = input as JsonLdNode;
    const graph = node["@graph"];
    if (Array.isArray(graph)) return [node, ...graph.flatMap(flattenJsonLd)];
    return [node];
  }
  return [];
}

export function nodeTypes(node: JsonLdNode): string[] {
  const t = node["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

export function findByType(nodes: JsonLdNode[], type: string): JsonLdNode[] {
  return nodes.filter((n) => nodeTypes(n).includes(type));
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validateFaqPage(node: JsonLdNode, issues: string[]) {
  const items = node.mainEntity;
  if (!Array.isArray(items) || items.length === 0) {
    issues.push("FAQPage has no mainEntity");
    return;
  }
  items.forEach((raw, i) => {
    if (!raw || typeof raw !== "object") {
      issues.push(`FAQPage mainEntity[${i}] is not an object`);
      return;
    }
    const q = raw as JsonLdNode;
    if (q["@type"] !== "Question") issues.push(`FAQPage mainEntity[${i}] @type is not Question`);
    if (!isNonEmptyString(q.name)) issues.push(`FAQPage mainEntity[${i}] missing name`);
    const answer = q.acceptedAnswer as JsonLdNode | undefined;
    if (!answer || typeof answer !== "object") {
      issues.push(`FAQPage mainEntity[${i}] missing acceptedAnswer`);
      return;
    }
    if (answer["@type"] !== "Answer") {
      issues.push(`FAQPage mainEntity[${i}] acceptedAnswer @type is not Answer`);
    }
    if (!isNonEmptyString(answer.text)) {
      issues.push(`FAQPage mainEntity[${i}] acceptedAnswer missing text`);
    }
  });
}

function validateBreadcrumbList(node: JsonLdNode, issues: string[]) {
  const items = node.itemListElement;
  if (!Array.isArray(items) || items.length === 0) {
    issues.push("BreadcrumbList has no itemListElement");
    return;
  }
  items.forEach((raw, i) => {
    const item = raw as JsonLdNode;
    if (!item || typeof item !== "object") {
      issues.push(`BreadcrumbList itemListElement[${i}] is not an object`);
      return;
    }
    if (item["@type"] !== "ListItem") {
      issues.push(`BreadcrumbList itemListElement[${i}] @type is not ListItem`);
    }
    if (item.position !== i + 1) {
      issues.push(
        `BreadcrumbList itemListElement[${i}] position is ${String(item.position)}, expected ${i + 1}`,
      );
    }
    if (!isNonEmptyString(item.name)) {
      issues.push(`BreadcrumbList itemListElement[${i}] missing name`);
    }
    const target = item.item;
    if (target !== undefined && !isNonEmptyString(target)) {
      issues.push(`BreadcrumbList itemListElement[${i}] item is not a URL string`);
    }
  });
}

function validateArticle(node: JsonLdNode, type: string, issues: string[]) {
  if (!isNonEmptyString(node.headline)) issues.push(`${type} missing headline`);
  if (!node.author) issues.push(`${type} missing author`);
  if (!node.publisher) issues.push(`${type} missing publisher`);
  if (!isNonEmptyString(node.datePublished)) issues.push(`${type} missing datePublished`);
  for (const key of ["datePublished", "dateModified"]) {
    const value = node[key];
    if (isNonEmptyString(value) && Number.isNaN(Date.parse(value))) {
      issues.push(`${type} ${key} is not a parseable date: ${value}`);
    }
  }
  if (!isNonEmptyString(node.description)) issues.push(`${type} missing description`);
}

function validateSoftwareApplication(node: JsonLdNode, issues: string[]) {
  if (!isNonEmptyString(node.name)) issues.push("SoftwareApplication missing name");
  if (!isNonEmptyString(node.url)) issues.push("SoftwareApplication missing url");
  if (!isNonEmptyString(node.applicationCategory)) {
    issues.push("SoftwareApplication missing applicationCategory");
  }
  const offers = node.offers;
  if (!Array.isArray(offers) || offers.length === 0) {
    issues.push("SoftwareApplication missing offers");
    return;
  }
  offers.forEach((raw, i) => {
    const offer = raw as JsonLdNode;
    if (offer?.["@type"] !== "Offer") issues.push(`Offer[${i}] @type is not Offer`);
    if (offer?.price === undefined) issues.push(`Offer[${i}] missing price`);
    if (!isNonEmptyString(offer?.priceCurrency)) issues.push(`Offer[${i}] missing priceCurrency`);
  });
}

/**
 * Validate a set of JSON-LD nodes.
 * `requiredTypes` must each appear at least once; every recognised node is
 * shape-checked whether required or not.
 */
export function validateJsonLd(input: unknown, requiredTypes: string[] = []): string[] {
  const nodes = flattenJsonLd(input);
  const issues: string[] = [];

  for (const node of nodes) {
    const context = node["@context"];
    if (context !== undefined && !String(context).includes("schema.org")) {
      issues.push(`@context is not schema.org: ${String(context)}`);
    }
    for (const type of nodeTypes(node)) {
      if (type === "FAQPage") validateFaqPage(node, issues);
      else if (type === "BreadcrumbList") validateBreadcrumbList(node, issues);
      else if (type === "Article" || type === "BlogPosting" || type === "NewsArticle") {
        validateArticle(node, type, issues);
      } else if (type === "SoftwareApplication") validateSoftwareApplication(node, issues);
    }
  }

  for (const type of requiredTypes) {
    if (findByType(nodes, type).length === 0) issues.push(`missing JSON-LD @type=${type}`);
  }

  return issues;
}

/** Parse then validate a serialized JSON-LD string (as emitted in head scripts). */
export function validateJsonLdString(raw: string, requiredTypes: string[] = []): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return [`JSON-LD parse error: ${(error as Error).message}`];
  }
  return validateJsonLd(parsed, requiredTypes);
}
