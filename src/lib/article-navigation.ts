/**
 * Previous / next navigation for first-party /articles posts.
 *
 * Order is chronological (oldest -> newest) by publication date, with the slug
 * as a deterministic tie-breaker so the sequence never depends on file order.
 * When a neighbour is missing (first/last post) we fall back to the strongest
 * cluster relation from src/lib/article-cluster.ts so every post still offers a
 * forward path instead of a dead end.
 */

import { LOCAL_ARTICLES, type LocalArticle } from "@/lib/local-articles";
import { relatedArticles, ARTICLES_PREFIX_PATH } from "@/lib/article-cluster";

export type ArticleNeighbor = {
  slug: string;
  title: string;
  href: string;
  /** How the neighbour was chosen — chronological order or a cluster link. */
  source: "chronological" | "cluster";
};

export type ArticleNeighbors = {
  previous: ArticleNeighbor | null;
  next: ArticleNeighbor | null;
};

/** All first-party articles in stable chronological order (oldest first). */
export const ARTICLES_CHRONOLOGICAL: LocalArticle[] = [...LOCAL_ARTICLES].sort(
  (a, b) =>
    Date.parse(a.firstPublishedAt) - Date.parse(b.firstPublishedAt) || a.slug.localeCompare(b.slug),
);

function toNeighbor(
  article: LocalArticle | undefined,
  source: ArticleNeighbor["source"],
): ArticleNeighbor | null {
  if (!article) return null;
  return {
    slug: article.slug,
    title: article.title,
    href: `${ARTICLES_PREFIX_PATH}/${article.slug}`,
    source,
  };
}

function clusterFallback(slug: string, exclude: string | null): ArticleNeighbor | null {
  const candidate = relatedArticles(slug, 3).find((r) => r.slug !== exclude);
  if (!candidate) return null;
  return { slug: candidate.slug, title: candidate.title, href: candidate.href, source: "cluster" };
}

/**
 * Previous/next neighbours for a first-party article slug.
 * Returns nulls for unknown slugs (CMS posts have no local ordering).
 */
export function articleNeighbors(slug: string): ArticleNeighbors {
  const index = ARTICLES_CHRONOLOGICAL.findIndex((a) => a.slug === slug);
  if (index === -1) return { previous: null, next: null };

  const previous = toNeighbor(ARTICLES_CHRONOLOGICAL[index - 1], "chronological");
  const next = toNeighbor(ARTICLES_CHRONOLOGICAL[index + 1], "chronological");

  return {
    previous: previous ?? clusterFallback(slug, next?.slug ?? null),
    next: next ?? clusterFallback(slug, previous?.slug ?? null),
  };
}
