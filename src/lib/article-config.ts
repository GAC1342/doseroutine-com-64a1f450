/**
 * Shared constants for the /articles blog.
 *
 * Posts are first-party markdown in the repo (src/content/article-drafts and
 * src/content/cms-articles), so nothing here talks to an external CMS.
 */

/** Public site origin, used for canonical URLs and JSON-LD. */
export const SITE_URL = "https://doseroutine.com";

/** URL segment the blog is mounted at (kept off the existing /blog). */
export const ARTICLES_PREFIX = "/articles";

/** Canonical URL for an article on this site. */
export function articlePostUrl(slug: string): string {
  return `${SITE_URL}${ARTICLES_PREFIX}/${slug}`;
}
