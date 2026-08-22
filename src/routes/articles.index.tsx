import { PageProse } from "@/components/page-prose";
import { canonicalLinks } from "@/lib/hreflang";
import { ProseContainer } from "@/components/prose-container";
import { type ChangeEvent, type ReactNode, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ArrowRight, Newspaper, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { getAllArticles } from "@/lib/articles.functions";
import { ARTICLE_OG_FALLBACK } from "@/lib/article-og-manifest";
import { resolveArticleHero } from "@/lib/article-hero";
import { ARTICLE_TOPICS, matchesTopic, topicLabel, topicsFor } from "@/lib/article-topics";
import { ARTICLES_PREFIX, SITE_URL } from "@/lib/article-config";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { ARTICLES_INDEX_FAQ } from "@/lib/aeo-faqs-index";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

export const CANONICAL = `${SITE_URL}${ARTICLES_PREFIX}`;
const TITLE = "Articles — Nutrition and Protocol Guides | DoseRoutine";
export const DESC =
  "Longer-form DoseRoutine articles on nutrition, training and protocol tracking — practical guides to help you get more out of the app.";

const searchSchema = z.object({
  cursor: fallback(z.string().max(512), "").default(""),
  // Backing param for the WebSite SearchAction entry point (?q=…).
  q: fallback(z.string().max(120), "").default(""),
});

function validateSearch(input: Record<string, unknown>): { cursor?: string; q?: string } {
  const parsed = searchSchema.parse(input ?? {});
  return {
    ...(input?.cursor !== undefined && parsed.cursor ? { cursor: parsed.cursor } : {}),
    ...(input?.q !== undefined && parsed.q ? { q: parsed.q } : {}),
  };
}

export const articlesQueryOptions = queryOptions({
  queryKey: ["articles", "all"],
  queryFn: () => getAllArticles(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/articles/")({
  validateSearch,
  staleTime: 60_000,
  loader: ({ context }) => context.queryClient.ensureQueryData(articlesQueryOptions),
  head: ({ loaderData }) => {
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
        { property: "og:type", content: "website" },
        { property: "og:url", content: CANONICAL },
        { property: "og:image", content: `${SITE_URL}${ARTICLE_OG_FALLBACK}` },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "DoseRoutine Articles" },
        { property: "og:site_name", content: "DoseRoutine" },
        { name: "robots", content: "index, follow" },
        { name: "twitter:image", content: `${SITE_URL}${ARTICLE_OG_FALLBACK}` },
        { name: "twitter:site", content: "@DoseRoutine" },
        { name: "twitter:image:alt", content: "DoseRoutine Articles" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESC },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        ...canonicalLinks(CANONICAL),
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "DoseRoutine Articles",
          href: `${CANONICAL}/feed.xml`,
        },
      ],
      scripts: [
        breadcrumbScript(CANONICAL, [{ name: "Articles", path: "/articles" }]),
        aeoFaqScript(CANONICAL, ARTICLES_INDEX_FAQ),
        {
          type: "application/ld+json",

          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "DoseRoutine Articles",
            description: DESC,
            url: CANONICAL,
            // An ItemList of links, not stub BlogPosting nodes: a listing page
            // cannot supply the author/publisher/image fields Google requires
            // on BlogPosting, and incomplete article nodes are reported as
            // errors. Each article page carries its own full Article schema.
            mainEntity: {
              "@type": "ItemList",
              // Loader data is an array; guard so a pending/empty match cannot throw.
              itemListElement: (Array.isArray(loaderData) ? loaderData : [])
                .slice(0, 50)
                .map((a) => ({
                  name: a.title,
                  url: `${CANONICAL}/${a.slug}`,
                }))
                .map((item, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: item.name,
                  url: item.url,
                })),
            },
          }),
        },
      ],
    };
  },
  errorComponent: ArticlesError,
  pendingComponent: ArticlesPending,
  component: ArticlesIndex,
});

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicBackHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Newspaper className="h-6 w-6 text-primary" aria-hidden="true" />
            Articles
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{DESC}</p>
        </header>
        {children}
        <AeoFaq pairs={ARTICLES_INDEX_FAQ} />
      </main>
      <ProseContainer>
        <ProseContainer>
          <PageProse id="articles-index" />
        </ProseContainer>
      </ProseContainer>
      <AttributionFooter />
    </div>
  );
}

function ArticlesPending() {
  return (
    <Shell>
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading articles…</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    </Shell>
  );
}

export function ArticlesError() {
  return (
    <Shell>
      <Card className="p-6 text-sm text-muted-foreground">
        <p>Articles are temporarily unavailable. Please try again shortly.</p>
      </Card>
    </Shell>
  );
}

function matchesQuery(fields: Array<string | undefined>, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return fields.some((f) => (f ?? "").toLowerCase().includes(needle));
}

function ArticlesIndex() {
  const { q = "" } = Route.useSearch();
  // Live client-side filter seeded from ?q= so the SearchAction entry point
  // and shared links still work without JavaScript-driven navigation.
  const [query, setQuery] = useState(q);
  const [topic, setTopic] = useState("");

  const { data: articles = [] } = useSuspenseQuery(articlesQueryOptions);

  // Slug and body text are searched too so a drug name ("guanfacine") finds a
  // post even when it isn't in the title.
  const localMatches = articles.filter(
    (a) =>
      matchesQuery([a.title, a.metaDescription, a.targetKeyword, a.slug, a.answer], query) &&
      matchesTopic([a.slug, a.title, a.metaDescription, a.targetKeyword], topic),
  );
  // Only offer chips that actually match something in the current library.
  const available = new Set<string>(
    articles.flatMap((a) => topicsFor([a.slug, a.title, a.metaDescription, a.targetKeyword])),
  );
  const topicChips = ARTICLE_TOPICS.filter((t) => available.has(t.id));

  const total = localMatches.length;
  const showEmpty = total === 0;

  return (
    <Shell>
      <div className="mb-5">
        <label htmlFor="article-search" className="sr-only">
          Search articles by title, topic or drug name
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="article-search"
            type="search"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Search by title, topic or drug name…"
            className="pl-9"
            autoComplete="off"
          />
        </div>

        {topicChips.length > 0 && (
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter articles by topic"
          >
            <Button
              type="button"
              size="sm"
              variant={topic === "" ? "default" : "outline"}
              aria-pressed={topic === ""}
              onClick={() => setTopic("")}
              className="h-9 rounded-full px-3 text-xs"
            >
              All topics
            </Button>
            {topicChips.map((t) => (
              <Button
                key={t.id}
                type="button"
                size="sm"
                variant={topic === t.id ? "default" : "outline"}
                aria-pressed={topic === t.id}
                onClick={() => setTopic(topic === t.id ? "" : t.id)}
                className="h-9 rounded-full px-3 text-xs"
              >
                {t.label}
              </Button>
            ))}
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          {`${total} article${total === 1 ? "" : "s"}`}
          {query ? ` matching “${query}”` : ""}
          {topic ? ` in ${topicLabel(topic)}` : ""}
        </p>
      </div>

      {showEmpty ? (
        <Card className="p-6 text-sm text-muted-foreground">
          <p>{query ? "No articles matched that search." : "No articles published yet."}</p>
          <Link
            to="/blog"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            Read the research blog
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {localMatches.map((article) => {
            const hero = resolveArticleHero(article.slug, article.heroSet);
            return (
              <li key={article.slug}>
                <Card className="h-full overflow-hidden">
                  <Link
                    to="/articles/$slug"
                    params={{ slug: article.slug }}
                    className="flex h-full gap-3 p-4 hover:bg-card/60"
                  >
                    {hero && (
                      <img
                        src={hero.thumb}
                        alt={hero.alt}
                        title={article.title}
                        width={96}
                        height={96}
                        loading="lazy"
                        decoding="async"
                        className="h-24 w-24 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex min-w-0 flex-col">
                      <h2 className="text-base font-semibold text-foreground">{article.title}</h2>
                      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                        {article.metaDescription}
                      </p>
                      <p className="mt-auto pt-2 text-xs text-muted-foreground">
                        {new Date(article.firstPublishedAt).toLocaleDateString()} · DoseRoutine
                        Editorial Team
                      </p>
                    </div>
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
