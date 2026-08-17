import { ExternalLink, FileText } from "lucide-react";
import { parseSourceRefs } from "@/lib/source-refs";

/**
 * Renders interaction source references as links when they resolve to a URL
 * (direct links, PMIDs, DOIs) and as plain chips when they don't.
 */
export function SourceLinks({
  refs,
  label = "Sources",
  className = "",
}: {
  refs: readonly string[] | null | undefined;
  label?: string;
  className?: string;
}) {
  const sources = parseSourceRefs(refs);
  if (sources.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <FileText className="h-3 w-3" aria-hidden="true" />
        {label}
      </span>
      {sources.map((s, i) =>
        s.url ? (
          <a
            key={`${s.url}-${i}`}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            title={s.url}
            className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground underline-offset-2 hover:bg-background hover:underline"
          >
            <span className="truncate">{s.label}</span>
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <span
            key={`${s.label}-${i}`}
            className="inline-flex items-center rounded-full bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground"
          >
            {s.label}
          </span>
        ),
      )}
    </div>
  );
}
