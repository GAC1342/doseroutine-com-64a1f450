/**
 * /articles internal-link cluster graph.
 *
 * The graph is DERIVED from the links actually present in each draft's body
 * (see src/content/article-drafts/INTERNAL-LINKING-PLAN.md), not hand-copied,
 * so editing a draft's links automatically updates "Related articles" and the
 * automated checks catch any post that falls out of the cluster.
 */

import { LOCAL_ARTICLES, type LocalArticle } from "@/lib/local-articles";

export const ARTICLES_PREFIX_PATH = "/articles";

export type ClusterEdge = { from: string; to: string; anchor: string };

export type RelatedArticle = {
  slug: string;
  title: string;
  metaDescription: string;
  href: string;
  /** Why it surfaced: this post links to it, it links here, or both. */
  relation: "mutual" | "outbound" | "inbound";
};

const SLUGS = new Set(LOCAL_ARTICLES.map((a) => a.slug));

/** Markdown links in a body that point at another first-party article. */
function outboundEdges(article: LocalArticle): ClusterEdge[] {
  const edges: ClusterEdge[] = [];
  const seen = new Set<string>();
  const text = `${article.answer}\n${article.body}\n${article.faqs
    .map((f) => `${f.question} ${f.answer}`)
    .join("\n")}`;

  for (const match of text.matchAll(/\[([^\]]+)\]\((\/articles\/([a-z0-9-]+))\)/g)) {
    const [, anchor, , slug] = match;
    if (slug === article.slug || !SLUGS.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    edges.push({ from: article.slug, to: slug, anchor: anchor.trim() });
  }
  return edges;
}

/** Every article-to-article edge in the cluster, sorted for deterministic output. */
export const CLUSTER_EDGES: ClusterEdge[] = LOCAL_ARTICLES.flatMap(outboundEdges).sort(
  (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
);

function bySlug(slug: string): LocalArticle | undefined {
  return LOCAL_ARTICLES.find((a) => a.slug === slug);
}

/** Inbound link count — the hub of the cluster ranks first among ties. */
export function inboundCount(slug: string): number {
  return CLUSTER_EDGES.filter((e) => e.to === slug).length;
}

/**
 * Related posts for a slug: mutual links first, then outbound, then inbound,
 * each group ordered by how central the target is in the cluster. Stable.
 */
export function relatedArticles(slug: string, limit = 3): RelatedArticle[] {
  const out = new Set(CLUSTER_EDGES.filter((e) => e.from === slug).map((e) => e.to));
  const inn = new Set(CLUSTER_EDGES.filter((e) => e.to === slug).map((e) => e.from));

  const rank: Record<RelatedArticle["relation"], number> = { mutual: 0, outbound: 1, inbound: 2 };

  return [...new Set([...out, ...inn])]
    .filter((s) => s !== slug && SLUGS.has(s))
    .map((s): RelatedArticle | null => {
      const article = bySlug(s);
      if (!article) return null;
      const relation: RelatedArticle["relation"] =
        out.has(s) && inn.has(s) ? "mutual" : out.has(s) ? "outbound" : "inbound";
      return {
        slug: s,
        title: article.title,
        metaDescription: article.metaDescription,
        href: `${ARTICLES_PREFIX_PATH}/${s}`,
        relation,
      };
    })
    .filter((r): r is RelatedArticle => r !== null)
    .sort(
      (a, b) =>
        rank[a.relation] - rank[b.relation] ||
        inboundCount(b.slug) - inboundCount(a.slug) ||
        a.slug.localeCompare(b.slug),
    )
    .slice(0, limit);
}
