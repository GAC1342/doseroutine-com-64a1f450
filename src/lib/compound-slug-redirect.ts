/**
 * Legacy / alias compound slugs.
 *
 * Google discovered compound URLs that no longer exist (e.g. an alias name like
 * `creatine-monohydrate` when the canonical page is `/library/creatine`). Those
 * returned a hard 404, which Search Console reports as "Not found (404)".
 * Resolving the alias to its canonical slug lets the route 301 instead, so link
 * equity consolidates onto the real page.
 */

/** Lowercase, hyphenate, strip punctuation — same shape as stored slugs. */
export function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type CompoundLike = { slug: string; name: string; aliases?: string[] | null };

/**
 * Find the canonical slug for a requested slug that has no compound of its own.
 * Matches on slugified name and slugified aliases, then on a prefix match so
 * `creatine-monohydrate` still resolves to `creatine`.
 */
export function resolveCompoundSlug(
  requested: string,
  compounds: readonly CompoundLike[],
): string | null {
  const want = slugifyName(requested);
  if (!want) return null;

  for (const c of compounds) {
    if (c.slug === want) return null; // exists — no redirect
  }

  for (const c of compounds) {
    if (slugifyName(c.name) === want) return c.slug;
    for (const alias of c.aliases ?? []) {
      if (slugifyName(alias) === want) return c.slug;
    }
  }

  // `creatine-monohydrate` -> `creatine`: longest canonical slug that the
  // requested slug extends on a hyphen boundary.
  let best: string | null = null;
  for (const c of compounds) {
    if (!want.startsWith(`${c.slug}-`)) continue;
    if (!best || c.slug.length > best.length) best = c.slug;
  }
  return best;
}
