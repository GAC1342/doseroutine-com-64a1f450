/**
 * Canonical compounds for interaction rendering.
 *
 * The compound table contains alias rows for the same substance (for example
 * "Levothyroxine" and "Levothyroxine Sodium"), and interaction rules were
 * generated against both. Left alone this renders the same clinical fact twice
 * — as two pages, two checker rows and two sitemap URLs.
 *
 * This module folds alias rows onto one canonical slug for *display* only. No
 * database row is deleted or rewritten, so anything a user already logged
 * against an alias compound keeps working.
 */

/** alias slug -> canonical slug. */
export const CANONICAL_COMPOUND_SLUG: Record<string, string> = {
  "levothyroxine-sodium": "levothyroxine",
};

/** Canonical display name for a canonical slug, when the alias row's name won. */
export const CANONICAL_COMPOUND_NAME: Record<string, string> = {
  levothyroxine: "Levothyroxine",
};

export function canonicalSlug(slug: string): string {
  return CANONICAL_COMPOUND_SLUG[slug] ?? slug;
}

export function canonicalName(slug: string, fallback: string): string {
  return CANONICAL_COMPOUND_NAME[canonicalSlug(slug)] ?? fallback;
}

export function isAliasSlug(slug: string): boolean {
  return slug in CANONICAL_COMPOUND_SLUG;
}
