import { ExternalLink } from "lucide-react";
import type { AuthoritySource } from "@/lib/authority-sources";
import { trackCitationSourceOpen } from "@/lib/citation-analytics";

/**
 * "Verify at" links — publisher search endpoints for this substance or pair.
 *
 * These are deliberately UNNUMBERED and rendered separately from the cited
 * sources: a search results page does not document a specific claim, so
 * numbering it as a citation would overstate the evidence behind the page.
 */
export function VerifyAtList({
  sources,
  className = "",
}: {
  sources: readonly AuthoritySource[];
  className?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <ul className={`space-y-2 text-sm ${className}`}>
      {sources.map((s, i) => (
        <li key={`${s.label}-${i}`} className="min-w-0">
          <a
            href={s.url as string}
            target="_blank"
            rel="nofollow noopener"
            onClick={() =>
              trackCitationSourceOpen({
                n: 0,
                publisher: s.publisher,
                title: s.title ?? null,
                url: s.url!,
                isSearch: true,
              })
            }
            className="inline-flex min-w-0 items-baseline gap-1 text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
          >
            <span className="min-w-0 break-words">{s.label}</span>
            <ExternalLink className="h-3 w-3 shrink-0 self-center" aria-hidden="true" />
            <span className="sr-only">(publisher search, opens in a new tab)</span>
          </a>
          <span className="block break-words text-xs text-muted-foreground">
            {s.publisher} · publisher search
          </span>
        </li>
      ))}
    </ul>
  );
}
