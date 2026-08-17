import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Tags } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { BLOG_TAG_ARCHIVES, BLOG_TAG_KIND_LABEL, type BlogTagKind } from "@/lib/blog-posts";
import { BLOG_SITE } from "@/lib/blog-seo";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { BlogBreadcrumbs } from "@/components/blog-breadcrumbs";
import { blogTagHubTrail, trailToSchemaCrumbs } from "@/lib/blog-breadcrumb-trail";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";

const TITLE = `Research topics by compound & trial phase | ${BLOG_SITE.name}`;
const DESCRIPTION =
  "Every compound, mechanism and trial phase we track, each with its own shareable archive of sourced peptide, GLP-1 and longevity research updates.";
const CANONICAL = `${BLOG_SITE.base}/blog/tag`;

export const Route = createFileRoute("/blog/tag/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: BLOG_SITE.name },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/blog/tag")],
    scripts: [breadcrumbScript(CANONICAL, trailToSchemaCrumbs(blogTagHubTrail()))],
  }),
  component: BlogTagIndexPage,
});

const KIND_ORDER: BlogTagKind[] = ["compound", "mechanism", "phase"];

function BlogTagIndexPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <BlogBreadcrumbs crumbs={blogTagHubTrail()} />

        <header className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Tags className="h-4 w-4" /> Research tags
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Browse updates by compound, mechanism and trial phase
          </h1>
          <p className="dr-speakable-intro text-lg text-muted-foreground">
            Each tag has its own clean, shareable archive page collecting every sourced update we've
            published on it.
          </p>
        </header>

        {KIND_ORDER.map((kind) => {
          const archives = BLOG_TAG_ARCHIVES.filter((a) => a.tag.kind === kind);
          if (archives.length === 0) return null;
          return (
            <section key={kind} id={kind} className="scroll-mt-24 space-y-3">
              <h2 className="text-2xl font-bold">{BLOG_TAG_KIND_LABEL[kind]}</h2>
              <Card className="p-4">
                <ul className="flex flex-wrap gap-2">
                  {archives.map((a) => (
                    <li key={a.path}>
                      <Link
                        to="/blog/tag/$kind/$slug"
                        params={{ kind: a.tag.kind, slug: a.slug }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm hover:border-primary hover:text-primary"
                      >
                        {a.tag.label}
                        <span className="text-xs text-muted-foreground">{a.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          );
        })}

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
