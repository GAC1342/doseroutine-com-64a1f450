import type { NumberedSource } from "@/lib/authority-sources";

/**
 * Inline per-claim citation marker.
 *
 * Renders a superscript number that links straight to the *specific* document
 * backing the claim (a PubMed record, a DailyMed label, a stored URL or DOI) —
 * never a publisher homepage or a search endpoint. The number matches the
 * entry in the page's Sources section.
 *
 * If no document-level source exists for the claim, nothing renders. We never
 * emit a placeholder marker.
 */
export function CiteMarker({
  sources,
  className = "",
}: {
  sources: readonly NumberedSource[];
  className?: string;
}) {
  const linkable = sources.filter((s) => s.url);
  if (linkable.length === 0) return null;
  return (
    <sup className={`ml-0.5 inline-flex gap-0.5 align-super ${className}`}>
      {linkable.map((s) => (
        <a
          key={s.n}
          href={s.url as string}
          target="_blank"
          rel="nofollow noopener"
          id={`cite-ref-${s.n}`}
          title={`${s.publisher}${s.title ? ` — ${s.title}` : ""}`}
          aria-label={`Source ${s.n}: ${s.title ?? s.label} (${s.publisher}), opens in a new tab`}
          className="rounded px-0.5 text-[10px] font-semibold leading-none text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
        >
          [{s.n}]
        </a>
      ))}
    </sup>
  );
}
