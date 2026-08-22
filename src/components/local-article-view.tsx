import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { relatedArticles, ARTICLES_PREFIX_PATH } from "@/lib/article-cluster";
import { RelatedPages } from "@/components/related-pages";
import { RelatedArticles } from "@/components/related-articles";

import { articleNeighbors } from "@/lib/article-navigation";
import { ARTICLE_HERO_HEIGHT, ARTICLE_HERO_WIDTH, resolveArticleHero } from "@/lib/article-hero";
import { resizedImageUrl } from "@/lib/remote-image";
import { MEDICAL_DISCLAIMER, type UnifiedArticle } from "@/lib/local-articles";

/**
 * The CMS writes in-page anchors (`<a id="section"></a>`) that its table of
 * contents links to. The default sanitize schema drops `id`, which breaks
 * those jump links, so allow it on anchors and headings.
 */
const ARTICLE_SANITIZE_SCHEMA = {
  ...defaultSchema,
  // Keep ids verbatim; the default "user-content-" prefix breaks #hash links.
  clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.["a"] ?? []), "id"],
    h2: [...(defaultSchema.attributes?.["h2"] ?? []), "id"],
    h3: [...(defaultSchema.attributes?.["h3"] ?? []), "id"],
  },
};

/** Renders a first-party /articles post (markdown body + speakable answer + FAQs). */
export function LocalArticleView({ article }: { article: UnifiedArticle }) {
  const related = relatedArticles(article.slug);
  const neighbors = articleNeighbors(article.slug);
  const hero = resolveArticleHero(article.slug, article.heroSet, article.featuredImageUrl);

  return (
    // Microdata mirror of the Article JSON-LD. Attribute names are written in
    // lowercase literals (not React's camelCase itemScope/itemType) because
    // React 19 emits the camelCase spelling verbatim and several audit crawlers
    // regex the raw HTML case-sensitively.

    <article
      className="pb-8"
      lang={article.lang}
      {...{ itemscope: "" }}
      {...{ itemtype: "https://schema.org/Article" }}
      {...{ itemprop: "mainEntity" }}
    >
      <link
        {...{ itemprop: "mainEntityOfPage" }}
        href={`https://doseroutine.com/articles/${article.slug}`}
      />
      <span
        {...{ itemprop: "author", itemscope: "", itemtype: "https://schema.org/Organization" }}
        hidden
      >
        <span {...{ itemprop: "name" }}>DoseRoutine Editorial Team</span>
      </span>
      <h1
        {...{ itemprop: "headline" }}
        className="text-2xl font-bold leading-tight text-foreground"
      >
        {article.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <time {...{ itemprop: "datePublished" }} dateTime={article.firstPublishedAt}>
          {new Date(article.firstPublishedAt).toLocaleDateString()}
        </time>
        {" · DoseRoutine Editorial Team"}
      </p>

      {hero && (
        // LCP element: eager + high priority, with itemprop="image" so the
        // microdata mirrors the Article JSON-LD image.
        <img
          {...{ itemprop: "image" }}
          src={hero.src}
          srcSet={hero.srcSet}
          alt={hero.alt}
          title={article.title}
          width={ARTICLE_HERO_WIDTH}
          height={ARTICLE_HERO_HEIGHT}
          sizes={hero.sizes}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="mt-4 h-auto w-full rounded-xl"
        />
      )}

      <p
        {...{ itemprop: "description" }}
        className="dr-speakable-answer mt-4 rounded-xl bg-card p-4 text-base leading-relaxed text-foreground"
      >
        {article.answer}
      </p>

      <div className="prose prose-sm mt-6 max-w-none text-foreground dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          // CMS bodies contain raw anchor/img HTML even in markdown mode; without
          // rehypeRaw those tags print as literal text in the article.
          rehypePlugins={[rehypeRaw, [rehypeSanitize, ARTICLE_SANITIZE_SCHEMA]]}
          components={{
            h2: ({ children }) => (
              <h2 className="mt-6 text-lg font-semibold text-foreground">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-4 text-base font-semibold text-foreground">{children}</h3>
            ),
            p: ({ children }) => <p className="mt-3 leading-relaxed text-foreground">{children}</p>,
            ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5">{children}</ul>,
            ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5">{children}</ol>,
            a: ({ href, children, id }) => (
              // `id` matters: CMS bodies use empty <a id="..."> targets that
              // the article's table of contents links to.
              <a href={href} id={id} className={href ? "text-primary underline" : undefined}>
                {children}
              </a>
            ),
            img: ({ src, alt }) => (
              // Markdown can't express dimensions, so every inline article
              // image gets the same optimized defaults the lint enforces.
              <img
                src={typeof src === "string" ? resizedImageUrl(src, 1200) : ""}
                alt={alt ?? ""}
                title={alt || article.title}
                width={1200}
                height={630}
                sizes="(max-width: 768px) 100vw, 768px"
                loading="lazy"
                decoding="async"
                className="my-4 h-auto w-full rounded-xl"
              />
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
          }}
        >
          {article.body}
        </ReactMarkdown>
      </div>

      {article.faqs.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">FAQs</h2>
          <dl className="mt-3 space-y-4">
            {article.faqs.map((faq) => (
              <div key={faq.question}>
                <dt className="text-sm font-medium text-foreground">{faq.question}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {related.length > 0 && (
        <nav aria-labelledby="related-articles-heading" className="mt-8">
          <h2 id="related-articles-heading" className="text-lg font-semibold text-foreground">
            Related articles
          </h2>
          <ul className="mt-3 space-y-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  to={item.href}
                  className="block rounded-xl bg-card p-4 transition-colors hover:bg-muted"
                >
                  <span className="block text-sm font-medium text-primary underline">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {item.metaDescription}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Topic-cluster links for the snapshotted CMS posts; renders nothing
       * for slugs that already have a cluster entry above. */}
      <RelatedArticles slug={article.slug} />

      <RelatedPages
        path={`${ARTICLES_PREFIX_PATH}/${article.slug}`}
        exclude={related.map((item) => item.href)}
      />

      {(neighbors.previous || neighbors.next) && (
        <nav
          aria-label="Article navigation"
          className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-2"
        >
          {neighbors.previous ? (
            <Link
              to={neighbors.previous.href}
              rel="prev"
              data-testid="article-prev"
              className="flex items-start gap-2 rounded-xl bg-card p-4 transition-colors hover:bg-muted"
            >
              <ArrowLeft className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                  Previous article
                </span>
                <span className="mt-1 block text-sm font-medium text-primary">
                  {neighbors.previous.title}
                </span>
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}

          {neighbors.next && (
            <Link
              to={neighbors.next.href}
              rel="next"
              data-testid="article-next"
              className="flex items-start justify-end gap-2 rounded-xl bg-card p-4 text-right transition-colors hover:bg-muted sm:col-start-2"
            >
              <span>
                <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                  Next article
                </span>
                <span className="mt-1 block text-sm font-medium text-primary">
                  {neighbors.next.title}
                </span>
              </span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            </Link>
          )}
        </nav>
      )}

      <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
        {MEDICAL_DISCLAIMER}
      </p>
    </article>
  );
}
