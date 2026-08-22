/**
 * Unified article fetchers that merge first-party markdown articles with
 * outrank.so articles stored in the database.
 *
 * These are public server functions (no auth required) so they can be used in
 * public route loaders and the sitemap/feed.
 */
import { createServerFn } from "@tanstack/react-start";
import { LOCAL_ARTICLES, outrankArticleToUnified, type UnifiedArticle } from "./local-articles";
import { getOutrankArticle, getOutrankArticles } from "./outrank-articles.server";

/** All published articles, newest first. Local articles win on slug collision. */
export const getAllArticles = createServerFn({ method: "GET" }).handler(
  async (): Promise<UnifiedArticle[]> => {
    const [outrank] = await Promise.all([
      getOutrankArticles().catch((e) => {
        console.error("Failed to load outrank articles:", e);
        return [];
      }),
    ]);

    const bySlug = new Map<string, UnifiedArticle>();

    for (const row of outrank) {
      bySlug.set(row.slug, outrankArticleToUnified(row));
    }

    for (const local of LOCAL_ARTICLES) {
      bySlug.set(local.slug, {
        ...local,
        source: "local",
        bodyFormat: "markdown",
      });
    }

    return [...bySlug.values()].sort(
      (a, b) =>
        Date.parse(b.firstPublishedAt) - Date.parse(a.firstPublishedAt) ||
        a.slug.localeCompare(b.slug),
    );
  },
);

/** Single article by slug. Local articles take precedence. */
export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<UnifiedArticle | null> => {
    const local = LOCAL_ARTICLES.find((a) => a.slug === data.slug);
    if (local) {
      return { ...local, source: "local", bodyFormat: "markdown" };
    }

    const outrank = await getOutrankArticle(data.slug).catch((e) => {
      console.error("Failed to load outrank article:", e);
      return null;
    });

    if (outrank) return outrankArticleToUnified(outrank);
    return null;
  });
