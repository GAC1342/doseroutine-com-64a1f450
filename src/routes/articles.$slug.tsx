import type { ReactNode } from "react";
import { canonicalLinks } from "@/lib/hreflang";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { LocalArticleView } from "@/components/local-article-view";
import { getArticle } from "@/lib/articles.functions";
import { type UnifiedArticle } from "@/lib/local-articles";
import { articleNeighbors } from "@/lib/article-navigation";
import { ARTICLES_PREFIX, SITE_URL, articlePostUrl } from "@/lib/article-config";
import { ARTICLE_OG_HEIGHT, ARTICLE_OG_WIDTH, articleOgPath } from "@/lib/article-og-manifest";
import { resolveArticleHero } from "@/lib/article-hero";
import { articleLocale } from "@/lib/article-locale";
import { mergeLdScripts } from "@/lib/head-budget";

/** Absolute social-card URL for an /articles slug (crawlers require absolute). */
function articleCardUrl(slug: string): string {
  return `${SITE_URL}${articleOgPath(slug)}`;
}

/** og:image + twitter:image tag set shared by every article. */
function socialImageMeta(
  image: string,
  alt: string,
  width = ARTICLE_OG_WIDTH,
  height = ARTICLE_OG_HEIGHT,
) {
  return [
    { property: "og:image", content: image },
    { property: "og:image:width", content: String(width) },
    { property: "og:image:height", content: String(height) },
    { property: "og:image:alt", content: alt },
    { property: "og:site_name", content: "DoseRoutine" },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: alt },
    { name: "twitter:site", content: "@DoseRoutine" },
  ];
}

type ArticleLoaderData = { article: UnifiedArticle };

export const Route = createFileRoute("/articles/$slug")({
  // Articles can come from local markdown or from outrank.so via webhook.
  // The loader runs on the server during SSR and uses a public server function
  // so it can read both sources without a user session.
  loader: async ({ params }): Promise<ArticleLoaderData> => {
    const article = await getArticle({ data: { slug: params.slug } });
    if (!article) throw notFound();
    return { article };
  },

  staleTime: 60_000,
  head: ({ params, loaderData }) => {
    const canonical = articlePostUrl(params.slug);
    if (!loaderData) {
      return {
        meta: [{ title: "Unavailable | DoseRoutine" }, { name: "robots", content: "noindex" }],
      };
    }

    const a = loaderData.article;
    const title = a.metaTitle;
    const description = a.metaDescription;
    const hero = resolveArticleHero(a.slug, a.heroSet, a.featuredImageUrl);
    const locale = articleLocale(a.slug);
    // Share previews keep using the branded 1200x630 social card; the unique
    // in-article illustration is what structured data points at.
    const card = articleCardUrl(a.slug);
    const imageAlt = `${a.title} — DoseRoutine`;
    const schemaImage = hero ? `${SITE_URL}${hero.src}` : card;
    const schemaImageAlt = hero ? `${hero.alt} — DoseRoutine` : imageAlt;
    const neighbors = articleNeighbors(a.slug);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonical },
        { property: "og:locale", content: locale.ogLocale },
        ...socialImageMeta(card, imageAlt),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        ...canonicalLinks(canonical),
        // Preload the LCP hero so it starts downloading with the HTML
        // instead of after the article renders. Guarded by e2e/asset-audit.
        ...(hero
          ? [
              {
                rel: "preload",
                as: "image",
                href: hero.preloadHref,
                imagesrcset: hero.srcSet,
                imagesizes: hero.sizes,
                fetchpriority: "high",
              },
            ]
          : []),
        ...(neighbors.previous
          ? [{ rel: "prev", href: `${SITE_URL}${neighbors.previous.href}` }]
          : []),
        ...(neighbors.next ? [{ rel: "next", href: `${SITE_URL}${neighbors.next.href}` }] : []),
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "DoseRoutine Articles",
          href: `${SITE_URL}${ARTICLES_PREFIX}/feed.xml`,
        },
      ],
      scripts: mergeLdScripts([
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: a.title,
            description,
            url: canonical,
            mainEntityOfPage: canonical,
            inLanguage: locale.lang,
            isAccessibleForFree: true,
            image: {
              "@type": "ImageObject",
              url: schemaImage,
              width: ARTICLE_OG_WIDTH,
              height: ARTICLE_OG_HEIGHT,
              caption: schemaImageAlt,
            },
            datePublished: a.firstPublishedAt,
            dateModified: a.modifiedAt,
            author: {
              "@type": "Organization",
              "@id": `${SITE_URL}/#editorial-team`,
              name: "DoseRoutine Editorial Team",
              url: `${SITE_URL}/editorial-policy`,
              sameAs: [SITE_URL],
              logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` },
              parentOrganization: { "@id": `${SITE_URL}/#organization` },
            },
            publisher: {
              "@type": "Organization",
              name: "DoseRoutine",
              url: SITE_URL,
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/icon-512.png`,
                width: 512,
                height: 512,
              },
            },
            speakable: {
              "@type": "SpeakableSpecification",
              cssSelector: [".dr-speakable-answer"],
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { name: "Home", url: SITE_URL },
              { name: "Articles", url: `${SITE_URL}${ARTICLES_PREFIX}` },
              { name: a.title, url: canonical },
            ].map((crumb, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: crumb.name,
              item: crumb.url,
            })),
          }),
        },
        ...(a.faqs.length > 0
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: a.faqs.map((f) => ({
                    "@type": "Question",
                    name: f.question,
                    acceptedAnswer: { "@type": "Answer", text: f.answer },
                  })),
                }),
              },
            ]
          : []),
      ]),
    };
  },
  notFoundComponent: ArticleNotFound,
  errorComponent: ArticleError,
  pendingComponent: ArticlePending,
  component: ArticleDetail,
});

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicBackHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <Link
          to="/articles"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All articles
        </Link>
        {children}
      </main>
      <AttributionFooter />
    </div>
  );
}

function ArticlePending() {
  return (
    <Shell>
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading article…</span>
        <div className="h-8 w-2/3 animate-pulse rounded bg-card" />
        <div className="h-64 animate-pulse rounded-xl bg-card" />
      </div>
    </Shell>
  );
}

function ArticleNotFound() {
  return (
    <Shell>
      <Card className="p-6">
        <h1 className="text-lg font-semibold text-foreground">Article not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This article may have been moved or unpublished.
        </p>
      </Card>
    </Shell>
  );
}

function ArticleError() {
  return (
    <Shell>
      <Card className="p-6">
        <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This article could not be loaded. Please try again shortly.
        </p>
      </Card>
    </Shell>
  );
}

function ArticleDetail() {
  const { article } = Route.useLoaderData();
  return (
    <Shell>
      <LocalArticleView article={article} />
    </Shell>
  );
}
