import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { blogTagSlug, getBlogPost, relatedBlogPosts, type BlogPost } from "@/lib/blog-posts";
import { autoInternalLinks } from "@/lib/blog-internal-links";
import { BlogMarketingLinks } from "@/components/blog-marketing-links";
import { EditorialAboutCard, EditorialByline } from "@/components/editorial-byline";
import { BlogSources } from "@/components/blog-sources";


import { sectionAnchorId } from "@/lib/blog-section-anchors";
import { faqAnchorId } from "@/lib/faq-snippet";

import { blogPostHead, blogPostNotFoundHead, blogPostUrl } from "@/lib/blog-seo";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getBlogPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params }) => {
    const post = getBlogPost((params as { slug: string }).slug);
    if (!post) return blogPostNotFoundHead();
    const head = blogPostHead(post);
    // Emit the self-referential canonical here in the route file so the
    // attribution/SEO guard can see it without following the helper.
    const canonical = blogPostUrl(post.slug);
    return {
      ...head,
      links: [
        { rel: "canonical", href: canonical },
        ...(head.links ?? []).filter((link) => link.rel !== "canonical"),
      ],
    };
  },

  notFoundComponent: PostNotFound,
  component: BlogPostPage,
});

function PostNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <div className="mx-auto max-w-3xl px-4 py-16 space-y-4">
        <h1 className="text-2xl font-bold">That update doesn't exist</h1>
        <p className="text-muted-foreground">
          It may have been renamed. Browse everything we've published instead.
        </p>
        <Link to="/blog" className="inline-flex items-center gap-1 font-medium text-primary">
          Research &amp; Updates <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

function BlogPostPage() {
  const { post } = Route.useLoaderData() as { post: BlogPost };
  const autoLinks = autoInternalLinks(post);
  const related = relatedBlogPosts(post);

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link to="/blog" className="font-medium text-primary">
              Research &amp; Updates
            </Link>
            <span aria-hidden="true">/</span>
            <span>{post.category}</span>
            <span aria-hidden="true">/</span>
            <time dateTime={post.published}>Published {post.published}</time>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.heading}</h1>
          <EditorialByline published={post.published} updated={post.updated} />
          <p className="dr-speakable-intro text-lg text-muted-foreground">{post.intro}</p>

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
        </header>

        <Card className="p-5 space-y-2">
          <div className="text-sm font-semibold">Key points</div>
          <ul className="dr-speakable-answer list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {post.keyPoints.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </Card>

        {post.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 id={sectionAnchorId(section.heading)} className="scroll-mt-24 text-2xl font-bold">
              {section.heading}
            </h2>

            {section.body?.map((p) => (
              <p key={p.slice(0, 40)} className="text-sm text-muted-foreground">
                {p}
              </p>
            ))}
            {section.bullets ? (
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <Card className="p-5 space-y-2 border-l-4 border-l-warning">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-warning" /> Not medical advice
          </div>
          <p className="text-sm text-muted-foreground">
            This is a summary of published research for general information. Investigational drugs
            are not available outside clinical trials, and research chemicals sold online are not
            the same products. Talk to a clinician who knows your history and labs before changing
            anything you take.
          </p>
        </Card>

        <section className="space-y-3" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="scroll-mt-24 text-2xl font-bold">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {post.faqs.map((f) => (
              <div key={f.q} id={faqAnchorId(f.q)} className="scroll-mt-24">
                <h3 className="font-semibold">{f.q}</h3>
                <p className="dr-speakable-answer text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <BlogMarketingLinks post={post} />


        {(autoLinks.guides.length > 0 || autoLinks.calculators.length > 0) && (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">Related guides &amp; tools</h2>
            <p className="text-sm text-muted-foreground">
              Matched to the compounds and mechanisms covered in this update.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...autoLinks.guides, ...autoLinks.calculators].map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="block rounded-lg border bg-card p-4 hover:border-primary transition-colors"
                >
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {link.kind === "calculator" ? "Calculator" : "Guide"}
                  </span>
                  <span className="mt-1 flex items-center gap-1 font-semibold text-primary">
                    {link.label}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{link.blurb}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">Related updates</h2>
            <p className="text-sm text-muted-foreground">
              Other posts covering the same compounds, mechanisms and trial phases.
            </p>
            <div className="space-y-3">
              {related.map(({ post: r, shared }) => (
                <Link
                  key={r.slug}
                  to="/blog/$slug"
                  params={{ slug: r.slug }}
                  className="block rounded-lg border bg-card p-4 transition-colors hover:border-primary"
                >
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <time dateTime={r.published}>{r.published}</time>
                    <span aria-hidden="true">·</span>
                    <span>{r.category}</span>
                  </span>
                  <span className="mt-1 flex items-start gap-1 font-semibold text-primary">
                    {r.heading}
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{r.description}</span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {shared.map((t) => (
                      <span
                        key={`${t.kind}:${t.label}`}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                      >
                        {t.label}
                      </span>
                    ))}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-2xl font-bold">Keep reading</h2>
          <ul className="text-sm space-y-1">
            {post.related.map((r) => (
              <li key={r.href}>
                <a href={r.href} className="text-primary hover:underline">
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <EditorialAboutCard />

        <BlogSources refs={post.refs} updated={post.updated} />


        <AttributionFooter sourceUrl={blogPostUrl(post.slug)} editorial={false} />
      </article>
    </main>
  );
}
