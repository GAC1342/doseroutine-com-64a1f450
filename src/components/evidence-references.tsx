import type { NumberedSource } from "@/lib/authority-sources";

/**
 * Visible "References & Evidence" block rendered under the dosing / tracking
 * content on a compound page.
 *
 * Only sources already resolved for the page are shown (PubChem, DailyMed,
 * MedlinePlus, PubMed, NIH ODS, ...). Nothing is invented, and when the page
 * has no matching document source the block renders nothing rather than
 * padding itself with a weak match.
 */
export function EvidenceReferences({
  sources,
  heading = "References & Evidence",
  intro,
}: {
  sources: readonly NumberedSource[];
  heading?: string;
  intro?: string;
}) {
  if (sources.length === 0) return null;

  return (
    <section
      aria-label={heading}
      data-evidence-references=""
      className="mb-8 rounded-2xl border border-border/60 bg-card p-5"
    >
      <h2 className="font-display text-base font-semibold text-foreground">{heading}</h2>
      {intro ? <p className="mt-1 text-xs text-muted-foreground">{intro}</p> : null}
      <ol className="mt-3 space-y-2 text-sm">
        {sources.map((s) => (
          <li key={s.n} className="flex gap-2">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">[{s.n}]</span>
            <span className="min-w-0">
              <span className="font-medium text-foreground">{s.publisher}</span>
              {s.title ? <span className="text-foreground/90"> — {s.title}</span> : null}
              {s.url ? (
                <>
                  {" "}
                  <a
                    href={s.url}
                    target="_blank"
                    rel="nofollow noopener"
                    className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                  >
                    View source
                  </a>
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Educational information only — not medical advice. Dose ranges vary by person, indication
        and prescriber.
      </p>
    </section>
  );
}
