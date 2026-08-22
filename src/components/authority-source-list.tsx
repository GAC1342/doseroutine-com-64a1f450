import { ExternalLink } from "lucide-react";
import type { AuthoritySource } from "@/lib/authority-sources";
import { trackCitationSourceOpen } from "@/lib/citation-analytics";

/**
 * Renders resolved authority sources as a numbered reference list with real
 * outbound links, showing publisher, title (when the record has one) and the
 * direct URL. Search-scoped links are labeled so readers know they land on
 * the publisher's results page for this substance rather than one document.
 *
 * External links use rel="nofollow noopener" and open in a new tab. Entries
 * with no resolvable URL render as plain text — we never fabricate a link.
 */
export function AuthoritySourceList({
  sources,
  className = "",
  idPrefix = "source",
}: {
  sources: readonly AuthoritySource[];
  className?: string;
  /** Anchor id prefix so inline citation markers can point at an entry. */
  idPrefix?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <ol className={`space-y-2 text-sm ${className}`}>
      {sources.map((s, i) => {
        const heading = s.title ?? s.label;
        return (
          <li
            key={`${s.label}-${i}`}
            id={`${idPrefix}-${i + 1}`}
            tabIndex={-1}
            aria-label={`Reference ${i + 1}: ${heading}, ${s.publisher}`}
            className="flex scroll-mt-24 gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background target:ring-2 target:ring-ring"
          >
            <span className="shrink-0 tabular-nums text-muted-foreground" aria-hidden="true">
              {i + 1}.
            </span>

            <span className="min-w-0">
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="nofollow noopener"
                  onClick={() =>
                    trackCitationSourceOpen({
                      n: i + 1,
                      publisher: s.publisher,
                      title: s.title ?? null,
                      url: s.url!,
                      isSearch: s.isSearch,
                    })
                  }
                  className="inline-flex min-w-0 items-baseline gap-1 text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
                >
                  <span className="min-w-0 break-words">{heading}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 self-center" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <span className="text-muted-foreground">{heading}</span>
              )}
              <span className="block break-words text-xs text-muted-foreground">
                {s.publisher}
                {s.url ? ` · ${displayUrl(s.url)}` : ""}
                {s.url && s.isSearch ? " · publisher search" : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}
