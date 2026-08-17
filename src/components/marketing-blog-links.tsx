import { Card, CardContent } from "@/components/ui/card";
import { groupMarketingBlogLinks } from "@/lib/marketing-blog-links";

/**
 * "Related research" block for /best-* and /for/* pages.
 *
 * Links are grouped by source post and point at a specific anchored section of
 * a long-tail research post, using descriptive anchor text that states what the
 * destination section answers (never "read more").
 */
export function MarketingBlogLinks({ pageKey }: { pageKey: string }) {
  const groups = groupMarketingBlogLinks(pageKey);
  if (groups.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="related-research-heading">
      <h2 id="related-research-heading" className="text-2xl font-bold">
        Related research
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The sections of our research write-ups that go deeper on what this page covers.
      </p>
      <Card className="mt-4">
        <CardContent className="space-y-5 p-6">
          {groups.map((g) => (
            <div key={g.post}>
              <h3 className="text-sm font-semibold">
                <a href={g.postHref} className="underline">
                  {g.postTitle}
                </a>
              </h3>
              <ul className="mt-2 space-y-2">
                {g.links.map((l) => (
                  <li key={l.href} className="text-sm">
                    <a href={l.href} className="font-medium text-primary underline">
                      {l.anchor}
                    </a>
                    <span className="text-muted-foreground"> — {l.blurb}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
