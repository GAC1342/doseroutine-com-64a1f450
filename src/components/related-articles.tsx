import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { articleTopicHub, relatedArticles } from "@/lib/cms-related-articles";

/**
 * Contextual internal links at the foot of an article: three topically
 * related posts plus one link into the matching DoseRoutine tool or guide.
 * Rendered as a real <nav> with a heading so crawlers and answer engines can
 * see the topical cluster rather than guessing at it.
 */
export function RelatedArticles({ slug }: { slug: string }) {
  const related = relatedArticles(slug);
  const hub = articleTopicHub(slug);
  if (related.length === 0 && !hub) return null;

  return (
    <nav aria-labelledby="related-articles-heading" className="mt-10 border-t border-border pt-6">
      <h2 id="related-articles-heading" className="text-lg font-semibold text-foreground">
        Related reading
      </h2>
      {related.length > 0 && (
        <ul className="mt-3 space-y-2">
          {related.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className="inline-flex items-start gap-2 text-sm font-medium text-primary underline underline-offset-2"
              >
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {hub && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <Link to={hub.href} className="text-sm font-semibold text-primary underline">
            {hub.title}
          </Link>
          {hub.description && (
            <p className="mt-1 text-sm text-muted-foreground">{hub.description}</p>
          )}
        </div>
      )}
    </nav>
  );
}
