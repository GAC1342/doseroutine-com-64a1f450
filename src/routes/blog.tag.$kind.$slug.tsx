import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { BlogBreadcrumbs } from "@/components/blog-breadcrumbs";
import { blogTagArchiveTrail, trailToSchemaCrumbs } from "@/lib/blog-breadcrumb-trail";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import {
  BLOG_TAG_ARCHIVES,
  BLOG_TAG_KIND_LABEL,
  blogPostsForTag,
  blogTagSlug,
  findBlogTagArchive,
  type BlogPost,
  type BlogTagArchive,
} from "@/lib/blog-posts";
import { BLOG_SITE, clampMeta } from "@/lib/blog-seo";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";

export const Route = createFileRoute("/blog/tag/$kind/$slug")({
  loader: ({ params }) => {
    const archive = findBlogTagArchive(params.kind, params.slug);
    if (!archive) throw notFound();
    return { archive, posts: blogPostsForTag(archive.tag) };
  },
  head: ({ params }) => {
    const p = params as { kind: string; slug: string };
    const archive = findBlogTagArchive(p.kind, p.slug);
    if (!archive) {
      return {
        meta: [
          { title: `Tag not found | ${BLOG_SITE.name}` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const posts = blogPostsForTag(archive.tag);
    const kindLabel = BLOG_TAG_KIND_LABEL[archive.tag.kind];
    const title = clampMeta(`${archive.tag.label} research updates | ${BLOG_SITE.name}`, 60);
    const description = clampMeta(
      `Every DoseRoutine research update tagged ${archive.tag.label} (${kindLabel}) — ${posts.length} sourced write-up${posts.length === 1 ? "" : "s"} on what changed and what it means for your protocol.`,
    );
    const canonical = `${BLOG_SITE.base}${archive.path}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { property: "og:site_name", content: BLOG_SITE.name },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...ogLocaleMeta("en"),
      ],
      links: [{ rel: "canonical", href: canonical }, ...hreflangLinks(archive.path)],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: title,
            description,
            url: canonical,
            inLanguage: "en",
            isPartOf: {
              "@type": "Blog",
              name: `${BLOG_SITE.name} Research & Updates`,
              url: `${BLOG_SITE.base}/blog`,
            },
            about: { "@type": "Thing", name: archive.tag.label },
            mainEntity: {
              "@type": "ItemList",
              itemListElement: posts.map((post, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${BLOG_SITE.base}/blog/${post.slug}`,
                name: post.heading,
              })),
            },
          }),
        },
        breadcrumbScript(
          canonical,
          trailToSchemaCrumbs(
            blogTagArchiveTrail(archive.tag.kind, archive.tag.label, archive.slug),
          ),
        ),
      ],
    };
  },
  notFoundComponent: TagNotFound,
  component: BlogTagArchivePage,
});

function TagNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <div className="mx-auto max-w-3xl px-4 py-16 space-y-4">
        <h1 className="text-2xl font-bold">That tag doesn't exist</h1>
        <p className="text-muted-foreground">
          Browse all compounds, mechanisms and trial phases we track instead.
        </p>
        <Link to="/blog/tag" className="inline-flex items-center gap-1 font-medium text-primary">
          All tags <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

function BlogTagArchivePage() {
  const { archive, posts } = Route.useLoaderData() as {
    archive: BlogTagArchive;
    posts: BlogPost[];
  };
  const kindLabel = BLOG_TAG_KIND_LABEL[archive.tag.kind];
  // Sideways navigation: other tags of the same kind, most-covered first.
  const siblings = BLOG_TAG_ARCHIVES.filter(
    (a) => a.tag.kind === archive.tag.kind && a.slug !== archive.slug,
  )
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <BlogBreadcrumbs
          crumbs={blogTagArchiveTrail(archive.tag.kind, archive.tag.label, archive.slug)}
        />

        <header className="space-y-3">
          <div className="text-sm font-medium text-primary">{kindLabel}</div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{archive.tag.label}</h1>
          <p className="dr-speakable-intro text-lg text-muted-foreground">
            {posts.length} sourced research update{posts.length === 1 ? "" : "s"} tagged{" "}
            {archive.tag.label}, newest first — what changed, what the evidence shows and what it
            means for how people run a protocol.
          </p>
        </header>

        {siblings.length > 0 && (
          <nav
            aria-label={`Other ${kindLabel.toLowerCase()} tags`}
            className="flex flex-wrap items-center gap-1.5"
          >
            <span className="mr-1 text-xs text-muted-foreground">
              Jump to another {kindLabel.toLowerCase()}:
            </span>
            {siblings.map((a) => (
              <Link
                key={a.path}
                to="/blog/tag/$kind/$slug"
                params={{ kind: a.tag.kind, slug: a.slug }}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                {a.tag.label}
              </Link>
            ))}
            <Link
              to="/blog/tag"
              hash={archive.tag.kind}
              className="px-1 text-xs font-medium text-primary hover:underline"
            >
              All tags
            </Link>
          </nav>
        )}

        <section className="space-y-4" aria-label={`Updates tagged ${archive.tag.label}`}>
          {posts.map((post) => (
            <Card key={post.slug} className="p-5 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{post.category}</span>
                <span aria-hidden="true">/</span>
                <time dateTime={post.published}>{post.published}</time>
              </div>
              <h2 className="text-xl font-semibold">
                <Link to="/blog/$slug" params={{ slug: post.slug }} className="hover:text-primary">
                  {post.heading}
                </Link>
              </h2>
              <p className="text-sm text-muted-foreground">{clampMeta(post.intro, 200)}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {post.tags.map((tag) => (
                  <Link
                    key={`${tag.kind}:${tag.label}`}
                    to="/blog/tag/$kind/$slug"
                    params={{ kind: tag.kind, slug: blogTagSlug(tag.label) }}
                    className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    {tag.label}
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </section>

        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          All research updates <ArrowRight className="h-4 w-4" />
        </Link>

        <AttributionFooter />
      </div>
    </main>
  );
}
