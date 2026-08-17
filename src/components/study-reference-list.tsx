import { ExternalLink } from "lucide-react";
import { pubmedUrl, type StudyReference } from "@/lib/authority-sources";

/**
 * Renders real PubMed records as a numbered study list. Every entry links to
 * the PubMed record for its PMID, so any claim on the page can be traced to
 * primary literature. Anchor ids match the inline citation markers.
 */
export function StudyReferenceList({
  studies,
  className = "",
  idPrefix = "study",
}: {
  studies: readonly StudyReference[];
  className?: string;
  idPrefix?: string;
}) {
  if (studies.length === 0) return null;
  return (
    <ol className={`space-y-2 text-sm ${className}`}>
      {studies.map((s, i) => (
        <li key={s.pmid} id={`${idPrefix}-${i + 1}`} className="flex gap-2">
          <span className="shrink-0 tabular-nums text-muted-foreground">{i + 1}.</span>
          <span className="min-w-0">
            <a
              href={pubmedUrl(s.pmid)}
              target="_blank"
              rel="nofollow noopener"
              className="inline-flex min-w-0 items-baseline gap-1 text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
            >
              <span className="min-w-0 break-words">{s.title}</span>
              <ExternalLink className="h-3 w-3 shrink-0 self-center" aria-hidden="true" />
              <span className="sr-only">(opens PubMed in a new tab)</span>
            </a>
            <span className="block break-words text-xs text-muted-foreground">
              {[s.journal, s.year].filter(Boolean).join(" · ")}
              {s.journal || s.year ? " · " : ""}PMID {s.pmid} · {pubmedUrl(s.pmid)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
