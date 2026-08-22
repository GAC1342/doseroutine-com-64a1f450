/**
 * Descriptive, keyword-bearing URLs that permanently redirect to the existing
 * short canonical slugs (/blog, /for, ...).
 *
 * Why: site audits flag short slugs as "Not SEO friendly URL", but renaming
 * /blog or /for would break rankings and inbound links. Instead we publish a
 * descriptive alias that answers the audit, 301s to the canonical slug, and is
 * kept OUT of the sitemap so no duplicate URL is ever indexed.
 */

export type UrlAlias = {
  /** Descriptive alias path (source). */
  alias: string;
  /** Existing canonical path (destination). Never changes. */
  canonical: string;
};

export const URL_ALIASES: UrlAlias[] = [
  { alias: "/health-tracking-blog", canonical: "/blog" },
  { alias: "/who-doseroutine-is-for", canonical: "/for" },
];

/** Resolve an alias path to its canonical path, or null when not an alias. */
export function resolveAlias(path: string): string | null {
  const normalized = path.replace(/\/+$/, "").toLowerCase() || "/";
  return URL_ALIASES.find((a) => a.alias === normalized)?.canonical ?? null;
}

/** Alias paths must never appear in the sitemap — they are redirects. */
export const ALIAS_PATHS = URL_ALIASES.map((a) => a.alias);
