import { Link } from "@tanstack/react-router";

import { internalLinksFor, type LinkKind } from "@/lib/internal-linking";

const KIND_LABEL: Record<LinkKind, string> = {
  hub: "Guide",
  sibling: "Related guide",
  "related-cluster": "Next step",
  comparison: "Comparison",
  tool: "Tool",
  faq: "Answers",
};

/**
 * "Keep reading" module for a content page: the internal-linking plan for this
 * route, rendered as real navigation. Paths already surfaced by the related
 * articles module are excluded so the two blocks never duplicate each other.
 */
export function RelatedPages({
  path,
  exclude = [],
  limit = 5,
  heading = "Related pages and answers",
}: {
  path: string;
  exclude?: string[];
  limit?: number;
  heading?: string;
}) {
  const skip = new Set(exclude);
  const links = internalLinksFor(path)
    .filter((l) => !skip.has(l.path))
    .slice(0, limit);
  if (links.length === 0) return null;

  return (
    <nav aria-labelledby="related-pages-heading" className="mt-8" data-testid="related-pages">
      <h2 id="related-pages-heading" className="text-lg font-semibold text-foreground">
        {heading}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              to={link.path}
              className="flex h-full flex-col rounded-xl bg-card p-4 transition-colors hover:bg-muted"
            >
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {KIND_LABEL[link.kind]}
              </span>
              <span className="mt-1 text-sm font-medium text-primary underline">{link.anchor}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
