// Shared normalization helpers for FAQPage JSON-LD validators.
//
// The live sweep (library-faq-jsonld.test.ts), the negative regression suite
// (library-faq-jsonld-negative.test.ts), and any future JS/TS validator MUST
// route through these helpers so "duplicate" and "trimmed" checks agree
// everywhere. If you change the rule, change it here — not inline.

/** Collapse internal whitespace, trim ends, lowercase. Used for equality. */
export function normalizeFaqText(input: unknown): string {
  return String(input ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** True when input is a string with no leading/trailing whitespace. */
export function isTrimmed(input: unknown): boolean {
  return typeof input === "string" && input === input.trim();
}

/** True when input has visible content after whitespace normalization. */
export function hasNormalizedContent(input: unknown): boolean {
  return normalizeFaqText(input).length > 0;
}

/**
 * True when two values compare equal after shared FAQ normalization
 * (whitespace collapse + trim + lowercase). Use for any FAQ JSON-LD
 * string field comparison (@type, @context, name, text, etc.) so tests
 * fail only on real semantic differences, not trivial formatting.
 */
export function equalsNormalized(a: unknown, b: unknown): boolean {
  return normalizeFaqText(a) === normalizeFaqText(b);
}

/**
 * JSON-LD `@type` can be a string OR an array of strings. Returns true
 * when any type entry matches `expected` under equalsNormalized.
 */
export function typeMatchesNormalized(typeField: unknown, expected: string): boolean {
  const list = Array.isArray(typeField) ? typeField : [typeField];
  return list.some((t) => equalsNormalized(t, expected));
}

/**
 * True when any @context entry (string or array) references schema.org
 * after normalization. Accepts http/https, trailing slashes, and mixed case.
 */
export function contextMatchesSchemaOrg(contextField: unknown): boolean {
  const list = Array.isArray(contextField) ? contextField : [contextField];
  return list.some((c) => {
    if (typeof c !== "string") return false;
    return normalizeFaqText(c).replace(/\/+$/, "").endsWith("schema.org");
  });
}

export interface DuplicateGroup {
  /** Normalized key that collided. */
  key: string;
  /** Indices in the original array that share this normalized key. */
  indices: number[];
}

/**
 * Group items by normalizeFaqText and return only groups with >=2 members.
 * Extractor picks the string field to compare (e.g. `e => e.name`).
 */
export function findDuplicateGroups<T>(
  items: readonly T[],
  extractor: (item: T, index: number) => unknown,
): DuplicateGroup[] {
  const buckets = new Map<string, number[]>();
  items.forEach((item, i) => {
    const key = normalizeFaqText(extractor(item, i));
    const bucket = buckets.get(key);
    if (bucket) bucket.push(i);
    else buckets.set(key, [i]);
  });
  const dupes: DuplicateGroup[] = [];
  for (const [key, indices] of buckets) {
    if (indices.length > 1) dupes.push({ key, indices });
  }
  return dupes;
}

/** Format a DuplicateGroup[] for test / report error messages. */
export function formatDuplicateGroups(
  groups: readonly DuplicateGroup[],
  keyLabel = "value",
): string[] {
  return groups.map(
    (g) => `"${g.key.slice(0, 80)}" at mainEntity[${g.indices.join(",")}] (${keyLabel})`,
  );
}
