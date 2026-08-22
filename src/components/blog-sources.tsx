import { Link } from "@tanstack/react-router";
import { sourceHost, sourceKind } from "@/lib/editorial-author";

export type BlogSourceRef = { cite: string; url: string };

/**
 * Clearly labeled sources list for a blog post. Each entry shows what kind
 * of document it is, the citation, and a direct link to the primary source.
 * Renders nothing when a post has no references — never a placeholder.
 */
export function BlogSources({
  refs,
  updated,
}: {
  refs: readonly BlogSourceRef[];
  updated: string;
}) {
  if (!refs || refs.length === 0) return null;

  return (
    <section id="sources" className="scroll-mt-24 space-y-3" aria-labelledby="sources-heading">
      <h2 id="sources-heading" className="text-2xl font-bold">
        Sources &amp; references
      </h2>
      <p className="text-xs text-muted-foreground">
        {refs.length} source{refs.length === 1 ? "" : "s"} — primary literature, regulatory
        documents and company announcements, each linked to the original document. Last reviewed{" "}
        <time dateTime={updated}>{updated}</time>.{" "}
        <Link to="/sources" className="text-primary hover:underline">
          How we select and review sources
        </Link>
        .
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-xs text-muted-foreground">
        {refs.map((r, i) => (
          <li key={r.url} id={`source-${i + 1}`} className="scroll-mt-24">
            <span className="mr-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">
              {sourceKind(r.url)}
            </span>
            {r.cite}{" "}
            <a
              href={r.url}
              target="_blank"
              rel="nofollow noopener"
              aria-label={`Open the source ${r.cite} on ${sourceHost(r.url)} (opens in a new tab)`}
              className="text-primary hover:underline"
            >
              View source on {sourceHost(r.url)}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
