import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export type RelatedCompound = {
  slug: string;
  name: string;
  blurb: string;
};

interface RelatedCompoundsProps {
  compounds?: RelatedCompound[];
  heading?: string;
  description?: string;
}

/**
 * Internal-link block that surfaces compound pages from a hub or another
 * compound page. Kept intentionally simple so hubs can hand in a curated list
 * without a full compound-registry lookup.
 *
 * Empty-state: returns null when the list is undefined or empty so callers
 * don't need their own guard and no blank spacing is left behind.
 */
export function RelatedCompounds({
  compounds,
  heading = "Related compounds",
  description,
}: RelatedCompoundsProps) {
  if (!compounds?.length) return null;

  return (
    <section className="space-y-3" aria-labelledby="related-compounds-heading">
      <div>
        <h2 id="related-compounds-heading" className="text-2xl font-bold">
          {heading}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {compounds.map((c) => (
          <li key={c.slug}>
            <Link to="/library/$slug" params={{ slug: c.slug }} className="block h-full">
              <Card className="h-full p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{c.name}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
