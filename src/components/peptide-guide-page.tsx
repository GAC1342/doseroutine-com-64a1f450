import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Info, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";

export type GuideTable = {
  caption?: string;
  head: string[];
  rows: string[][];
};

export type GuideSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  steps?: string[];
  table?: GuideTable;
};

export type GuideReference = { cite: string; url: string };

export type GuideRelatedLink = { to: string; label: string };

export type PeptideGuidePageProps = {
  /** Page H1 — must contain the exact target keyword. */
  heading: string;
  /**
   * 40–60 word answer-first paragraph rendered immediately under the H1.
   * This is the block the Article schema's speakable selector points at.
   */
  answer: string;
  /** Optional amber safety/scope callout under the answer. */
  callout?: { title: string; body: string };
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  references: GuideReference[];
  /** ISO date shown as "Last reviewed". */
  reviewed: string;
  /** Product tie-in: how DoseRoutine handles this exact thing. */
  productNote: { title: string; body: string };
  related: GuideRelatedLink[];
  /** Absolute canonical URL for the attribution footer. */
  canonical: string;
  /** Extra content rendered before the FAQ (tools, embeds). */
  children?: ReactNode;
};

function Table({ table }: { table: GuideTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        {table.caption ? (
          <caption className="pb-2 text-left text-xs text-muted-foreground">
            {table.caption}
          </caption>
        ) : null}
        <thead>
          <tr className="border-b text-left">
            {table.head.map((h) => (
              <th key={h} className="py-2 pr-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          {table.rows.map((row) => (
            <tr key={row.join("|")} className="border-b last:border-0">
              {row.map((cell, i) => (
                <td
                  key={`${row[0]}-${i}`}
                  className={i === 0 ? "py-2 pr-3 font-medium text-foreground" : "py-2 pr-3"}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Shared layout for the /peptides education cluster.
 *
 * Every page in the cluster renders the same structure — answer-first
 * paragraph, question-shaped H2s, at least one table or numbered list, a
 * visible FAQ that mirrors the FAQPage schema, cited references, and a
 * feature-specific product note — so the SEO/AEO quality bar is enforced by
 * the component rather than by remembering it per page.
 */
export function PeptideGuidePage({
  heading,
  answer,
  callout,
  sections,
  faq,
  references,
  reviewed,
  productNote,
  related,
  canonical,
  children,
}: PeptideGuidePageProps) {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1>
          <p className="dr-speakable-answer text-lg leading-relaxed text-foreground/90">{answer}</p>
        </header>

        {callout ? (
          <Card className="space-y-2 border-l-4 border-l-warning p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-warning" /> {callout.title}
            </div>
            <p className="text-sm text-muted-foreground">{callout.body}</p>
          </Card>
        ) : null}

        {sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-2xl font-bold">{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p.slice(0, 40)} className="text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
            {section.steps?.length ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {section.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            ) : null}
            {section.table ? <Table table={section.table} /> : null}
          </section>
        ))}

        {children}

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
          <dl className="space-y-4">
            {faq.map((f) => (
              <div key={f.q} className="space-y-1">
                <dt className="text-sm font-semibold text-foreground">{f.q}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">References &amp; evidence</h2>
          <p className="text-xs text-muted-foreground">
            Sources cited on this page. Last reviewed {reviewed}. Corrections:{" "}
            <Link to="/editorial-policy" className="text-primary hover:underline">
              editorial policy
            </Link>
            .
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-xs text-muted-foreground">
            {references.map((r) => (
              <li key={r.url}>
                {r.cite}{" "}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {r.url}
                </a>
              </li>
            ))}
          </ol>
        </section>

        <Card className="flex items-start gap-3 p-5">
          <Info className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">{productNote.title}</p>
            <p className="text-muted-foreground">{productNote.body}</p>
            <Link
              to="/auth"
              className="mt-2 inline-flex items-center gap-1 font-medium text-primary"
            >
              Start free in DoseRoutine <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        {related.length ? (
          <nav aria-label="Related pages" className="text-sm">
            See also:{" "}
            {related.map((r, i) => (
              <span key={r.to}>
                {i > 0 ? " · " : null}
                <Link to={r.to as "/library"} className="text-primary hover:underline">
                  {r.label}
                </Link>
              </span>
            ))}
          </nav>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Educational reference only, not medical advice. Talk to a qualified clinician before
          starting, stopping or combining any peptide, supplement or medication.
        </p>
        <AttributionFooter sourceUrl={canonical} />
      </article>
    </main>
  );
}
