import { memo, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";

export type RelatedLink = {
  to: string;
  label: string;
  description: string;
};

/**
 * Canonical registry of every calculator and comparison URL in the app.
 * Kept in one place so `<RelatedLinks currentPath="/x" kind="..." />` can
 * automatically exclude the current page and surface the rest.
 *
 * Frozen so React treats the arrays as stable references across renders and
 * dev-tools won't accidentally mutate them.
 */
export const CALCULATOR_LINKS: readonly RelatedLink[] = Object.freeze([
  {
    to: "/calculators",
    label: "All calculators",
    description: "Index of every DoseRoutine calculator and dosing tool.",
  },
  {
    to: "/calculator",
    label: "Calculator hub",
    description: "Peptide & TRT calculator hub with FAQ and dosing glossary.",
  },
  {
    to: "/peptide-dosage-calculator",
    label: "Peptide dosage calculator",
    description: "Convert peptide doses into exact insulin-syringe units.",
  },
  {
    to: "/peptide-reconstitution-calculator",
    label: "Peptide reconstitution",
    description: "Plan BAC water, concentration and doses per vial.",
  },
  {
    to: "/reconstitution-calculator",
    label: "Reconstitution calculator",
    description: "Lightweight standalone reconstitution tool.",
  },
  {
    to: "/trt-dosage-calculator",
    label: "TRT dosage calculator",
    description: "Weekly testosterone → per-shot volume and syringe units.",
  },
  {
    to: "/dosage-units-guide",
    label: "Dosage units guide",
    description: "Reference for mg, mcg, IU, U-100 units and mL conversions.",
  },
]);

export const COMPARISON_LINKS: readonly RelatedLink[] = Object.freeze([
  {
    to: "/vs",
    label: "All comparisons",
    description: "Every side-by-side DoseRoutine comparison in one place.",
  },
  {
    to: "/vs/medisafe",
    label: "vs. Medisafe",
    description: "How DoseRoutine handles peptides, TRT and stacks Medisafe skips.",
  },
  {
    to: "/vs/mytherapy",
    label: "vs. MyTherapy",
    description: "Multi-time daily doses, injection sites and lab tracking compared.",
  },
  {
    to: "/vs/cronometer",
    label: "vs. Cronometer",
    description: "A Cronometer alternative for peptides, hormones and stacks.",
  },
  {
    to: "/vs/round-health",
    label: "vs. Round Health",
    description: "Where Round Health fits and where DoseRoutine takes over.",
  },
  {
    to: "/vs/pill-reminder",
    label: "vs. Pill Reminder",
    description: "Reminders vs. a full peptide + TRT routine tracker.",
  },
  {
    to: "/vs-supplement-planner",
    label: "vs. Supplement planners",
    description: "Why supplement-only planners fall short for peptides and hormones.",
  },
  {
    to: "/compare",
    label: "Compare compounds",
    description: "Side-by-side compound comparison tool.",
  },
]);

// Pre-concat the "both" pool once so we don't allocate a fresh array per
// render (this component often mounts on interactive calculator pages that
// re-render on every keystroke).
const BOTH_LINKS: readonly RelatedLink[] = Object.freeze([
  ...CALCULATOR_LINKS,
  ...COMPARISON_LINKS,
]);

type Kind = "calculators" | "comparisons" | "both";

const POOLS: Record<Kind, readonly RelatedLink[]> = {
  calculators: CALCULATOR_LINKS,
  comparisons: COMPARISON_LINKS,
  both: BOTH_LINKS,
};

const DEFAULT_HEADINGS: Record<Kind, string> = {
  calculators: "Related calculators",
  comparisons: "Related comparisons",
  both: "Related calculators & comparisons",
};

const DEFAULT_DESCRIPTIONS: Record<Kind, string> = {
  calculators: "More free DoseRoutine calculators and dosing references.",
  comparisons: "See how DoseRoutine stacks up against other tracker apps.",
  both: "More DoseRoutine calculators and side-by-side comparisons.",
};

interface RelatedLinksProps {
  /** Path to exclude (usually the current route). */
  currentPath?: string;
  /** Which registry to show. Defaults to "both". */
  kind?: Kind;
  /** Section heading text. */
  heading?: string;
  /** Optional supporting copy under the heading. */
  description?: string;
  /** Max cards to render. */
  limit?: number;
}

function RelatedLinksImpl({
  currentPath,
  kind = "both",
  heading,
  description,
  limit = 6,
}: RelatedLinksProps) {
  // Only recompute the visible slice when a filter input actually changes.
  // Parent state churn (calculator inputs, form typing) won't rebuild this.
  const items = useMemo(() => {
    const pool = POOLS[kind];
    const out: RelatedLink[] = [];
    for (const l of pool) {
      if (l.to === currentPath) continue;
      out.push(l);
      if (out.length >= limit) break;
    }
    return out;
  }, [currentPath, kind, limit]);

  const resolvedHeading = useMemo(() => heading ?? DEFAULT_HEADINGS[kind], [heading, kind]);

  const resolvedDescription = useMemo(
    () => description ?? DEFAULT_DESCRIPTIONS[kind],
    [description, kind],
  );

  const jsonLd = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: resolvedHeading,
        description: resolvedDescription,
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://doseroutine.com${item.to}`,
          name: item.label,
          description: item.description,
        })),
      }),
    [items, resolvedHeading, resolvedDescription],
  );

  // Bail out only after every hook has run — an early return above the
  // useMemo changed hook order between renders and could crash React.
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="related-links-heading"
      className="border-t border-border/40 bg-muted/30 px-4 py-12 sm:px-6 lg:px-8"
    >
      <script
        type="application/ld+json"
        // Structured data helps search engines understand these cross-links
        // as a curated list of related tools rather than incidental nav.
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <h2 id="related-links-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {resolvedHeading}
          </h2>
          <p className="mt-2 text-muted-foreground">{resolvedDescription}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <RelatedLinkCard
              key={item.to}
              item={item}
              index={index}
              total={items.length}
              kind={kind}
              currentPath={currentPath}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

interface RelatedLinkCardProps {
  item: RelatedLink;
  index: number;
  total: number;
  kind: Kind;
  currentPath?: string;
}

function RelatedLinkCard({ item, index, total, kind, currentPath }: RelatedLinkCardProps) {
  // Fire-and-forget: `trackEvent` never throws and never blocks navigation.
  // We capture destination + source so we can rank which cross-links convert.
  const handleClick = useCallback(() => {
    trackEvent("related_link_click", {
      kind,
      source_path: currentPath ?? (typeof window !== "undefined" ? window.location.pathname : null),
      destination_path: item.to,
      label: item.label,
      position: index + 1,
      total,
    });
  }, [item.to, item.label, index, total, kind, currentPath]);

  // Middle-click / cmd-click open in a new tab and don't fire onClick reliably
  // in every browser, so mirror the event on `onAuxClick` too.
  return (
    <li>
      <Link
        to={item.to}
        className="group block h-full"
        preload="intent"
        onClick={handleClick}
        onAuxClick={handleClick}
      >
        <Card className="h-full transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-lg">
              <span>{item.label}</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}

// Props are all primitives, so the default shallow-equality check does the
// right thing: the section is skipped entirely when a parent re-renders with
// the same props (typical on calculator pages that update state per keystroke).
export const RelatedLinks = memo(RelatedLinksImpl);
