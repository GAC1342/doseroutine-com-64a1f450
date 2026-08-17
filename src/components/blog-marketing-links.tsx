import { Card, CardContent } from "@/components/ui/card";
import { resolveBlogMarketingLinks } from "@/lib/blog-marketing-links";
import type { BlogPost } from "@/lib/blog-posts";

/**
 * Automatic reverse links from a research post to the most relevant
 * /best-* and /for/* pages, closing the topical-authority loop.
 */
export function BlogMarketingLinks({ post }: { post: BlogPost }) {
  const links = resolveBlogMarketingLinks(post);
  if (links.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="track-this-heading">
      <h2 id="track-this-heading" className="scroll-mt-24 text-2xl font-bold">
        Where to track this
      </h2>
      <Card>
        <CardContent className="p-6">
          <ul className="space-y-3">
            {links.map((l) => (
              <li key={l.href} className="text-sm">
                <a href={l.href} className="font-medium text-primary underline">
                  {l.anchor}
                </a>
                <span className="text-muted-foreground"> — {l.blurb}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
