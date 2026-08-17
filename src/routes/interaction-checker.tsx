import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ConfidenceBadge,
  NoKnownInteractionLine,
  SharedMechanismNote,
} from "@/components/interaction-confidence";
import { AuthoritySourceList } from "@/components/authority-source-list";
import { resolveInteractionSources } from "@/lib/authority-sources";

import { useMemo, useState } from "react";
import { isAliasSlug } from "@/lib/interaction-canonical";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Layers,
  Search,
  X,
  AlertTriangle,
  ShieldAlert,
  Info,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { findRuleForPair, type Rule } from "@/lib/interactions";
import { linkifyCompounds } from "@/lib/linkify-compounds";
import type { Database } from "@/integrations/supabase/types";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { PublicBackHeader } from "@/components/public-back-header";
import { SaveResultCta } from "@/components/save-result-cta";
import { TrustSafety } from "@/components/trust-safety";
import { Card } from "@/components/ui/card";
import { AttributionFooter } from "@/components/attribution-footer";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript, answerPageScript } from "@/lib/aeo";
import { INTERACTION_CHECKER_FAQ, LAST_REVIEWED } from "@/lib/aeo-page-faqs";

type Compound = Database["public"]["Tables"]["compounds"]["Row"];

const CANONICAL = "https://doseroutine.com/interaction-checker";

export const Route = createFileRoute("/interaction-checker")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: "Interaction Checker — Peptides, Hormones & Supplements" },
      {
        name: "description",
        content: withDoseRoutineDescriptionSuffix(
          "Free interaction checker for peptides, hormones, GLP-1s and supplements",
        ),
      },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { property: "og:title", content: "Interaction Checker — Peptides, Hormones, Supplements" },
      {
        property: "og:description",
        content: withDoseRoutineDescriptionSuffix(
          "Check interactions across 475+ peptides, hormones and supplements",
        ),
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Interaction Checker — DoseRoutine" },
      {
        name: "twitter:description",
        content: withDoseRoutineDescriptionSuffix(
          "Check peptide, hormone, GLP-1 and supplement interactions across 475+ compounds",
        ),
      },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/interaction-checker")],
    scripts: [
      breadcrumbScript("https://doseroutine.com/interaction-checker", [
        { name: "Interaction Checker", path: "/interaction-checker" },
      ]),
      answerPageScript({
        url: CANONICAL,
        name: "Interaction Checker — Peptides, Hormones & Supplements",
        description:
          "Free interaction checker covering 475+ supplements, peptides, hormones, TRT, GLP-1s and prescriptions.",
        dateModified: LAST_REVIEWED,
        datePublished: "2026-01-15",
        shortAnswer:
          "DoseRoutine's interaction checker is free and needs no account. Add any two or more supplements, peptides, hormones, GLP-1s or prescriptions and it returns the caution level, the mechanism, the recommended spacing, and the source.",
        about: [
          "Drug interaction",
          "Dietary supplement",
          "Peptide",
          "Testosterone replacement therapy",
          "GLP-1 receptor agonist",
        ],
      }),
      aeoFaqScript(CANONICAL, INTERACTION_CHECKER_FAQ),
      // Dataset node: describes the interaction ruleset itself so answer
      // engines and dataset crawlers can cite DoseRoutine as the data source,
      // not just the tool that displays it.
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          "@id": `${CANONICAL}#dataset`,
          name: "DoseRoutine Interaction Ruleset",
          description:
            "Curated interaction ruleset covering 475+ supplements, vitamins, minerals, herbs, peptides, hormones, TRT compounds, GLP-1s and common prescriptions. Each rule records a severity level (avoid, caution, note, synergy), the mechanism, the recommended separation window, and the source references it was compiled from.",
          url: CANONICAL,
          license: "https://doseroutine.com/legal",
          isAccessibleForFree: true,
          inLanguage: "en",
          keywords: [
            "drug interactions",
            "supplement interactions",
            "peptide interactions",
            "TRT interactions",
            "GLP-1 interactions",
            "interaction severity",
          ],
          variableMeasured: [
            "Interaction severity (avoid, caution, note, synergy)",
            "Interaction mechanism",
            "Recommended separation window in hours",
            "Source references",
          ],
          measurementTechnique:
            "Editorial compilation from published literature, product labeling and public substance records.",
          dateModified: LAST_REVIEWED,
          datePublished: "2026-01-15",
          creator: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine",
            url: "https://doseroutine.com",
          },
          publisher: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine",
            url: "https://doseroutine.com",
          },
          isPartOf: { "@id": "https://doseroutine.com/#website" },
          mainEntityOfPage: CANONICAL,
          distribution: {
            "@type": "DataDownload",
            encodingFormat: "text/html",
            contentUrl: CANONICAL,
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
          },
          name: "DoseRoutine Interaction Checker",
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Web",
          url: CANONICAL,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description:
            "Free interaction checker for peptides, hormones, GLP-1s and supplements across 475+ compounds.",
        }),
      },
    ],
  }),
  component: InteractionCheckerPage,
});

const SEVERITY_STYLES: Record<
  string,
  { label: string; ring: string; badge: string; icon: typeof AlertTriangle }
> = {
  avoid: {
    label: "Avoid",
    ring: "border-destructive/40 bg-destructive/5",
    badge: "bg-destructive text-destructive-foreground",
    icon: ShieldAlert,
  },
  caution: {
    label: "Caution",
    ring: "border-amber-500/40 bg-amber-500/5",
    badge: "bg-amber-500 text-white",
    icon: AlertTriangle,
  },
  note: {
    label: "Note",
    ring: "border-border bg-card/40",
    badge: "bg-muted text-foreground",
    icon: Info,
  },
  synergy: {
    label: "Synergy",
    ring: "border-primary/40 bg-primary/5",
    badge: "bg-primary text-primary-foreground",
    icon: Sparkles,
  },
};

function InteractionCheckerPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Compound[]>([]);

  const { data: compounds } = useQuery({
    queryKey: ["public", "compounds", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compounds").select("*").order("name");
      if (error) throw error;
      // Alias rows (e.g. "Levothyroxine Sodium") describe the same substance as
      // their canonical row; offering both would let one substance be selected
      // twice and report the same interaction twice.
      return ((data ?? []) as Compound[]).filter((c) => !isAliasSlug(c.slug));
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: rules } = useQuery({
    queryKey: ["public", "interaction_rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("interaction_rules").select("*");
      if (error) throw error;
      return (data ?? []) as Rule[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const selectedIds = useMemo(() => new Set(selected.map((c) => c.id)), [selected]);

  const suggestions = useMemo(() => {
    if (!compounds) return [];
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return compounds
      .filter((c) => !selectedIds.has(c.id))
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
          (c.category ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [compounds, selectedIds, query]);

  const evaluations = useMemo(() => {
    if (!rules || selected.length < 2) return [];
    const out: Array<{
      a: Compound;
      b: Compound;
      severity: string;
      mechanism: string;
      recommendation: string;
      sources: string[];
      matchedBy: "pair" | "category";
      confidence: "established" | "plausible" | "theoretical" | "disputed";
      mechanismSharedWith: string | null;
      noKnownInteraction: boolean;
    }> = [];
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const a = selected[i];
        const b = selected[j];
        const match = findRuleForPair(a, b, rules);
        if (match) {
          out.push({
            a,
            b,
            severity: match.rule.severity,
            mechanism: match.rule.mechanism,
            recommendation: match.rule.recommendation,
            sources: match.rule.source_refs ?? [],
            matchedBy: match.matchedBy,
            confidence: match.rule.confidence ?? "theoretical",
            mechanismSharedWith: match.rule.mechanism_shared_with ?? null,
            noKnownInteraction: !!match.rule.no_known_interaction,
          });
        } else {
          out.push({
            a,
            b,
            severity: "note",
            mechanism: "No documented interaction rule for this pair.",
            recommendation:
              "No rule doesn't mean safe — it means we don't have a curated entry yet. Ask your clinician before combining.",
            sources: [],
            matchedBy: "pair",
            confidence: "theoretical",
            mechanismSharedWith: null,
            noKnownInteraction: false,
          });
        }
      }
    }
    const order: Record<string, number> = { avoid: 0, caution: 1, synergy: 2, note: 3 };
    return out.sort((x, y) => (order[x.severity] ?? 9) - (order[y.severity] ?? 9));
  }, [rules, selected]);

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader hideSignup />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">DoseRoutine</span>
        </Link>
        <Link
          to="/auth"
          className="tap-target inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Sign up free <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Free tool</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Peptide, hormone & supplement interaction checker
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Search any two or more compounds across our library of 475+ peptides, hormones, GLP-1s,
          longevity meds and supplements. We surface documented cautions, mechanisms, and cited
          sources — the same engine that powers DoseRoutine plans.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pt-8">
        <h2 className="mb-3 font-display text-xl font-semibold">Search for interactions</h2>
        <Card className="rounded-2xl border-border p-4">
          <label htmlFor="ic-search" className="text-sm font-semibold">
            Add compounds
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-input bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              id="ic-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search e.g. BPC-157, testosterone, semaglutide, magnesium…"
              className="tap-target flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
          </div>

          {suggestions.length > 0 && (
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected((s) => [...s, c]);
                      setQuery("");
                    }}
                    className="tap-target flex w-full items-center justify-between gap-3 bg-background px-3 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="truncate">
                      <span className="font-medium">{c.name}</span>{" "}
                      <span className="text-muted-foreground">· {c.category}</span>
                    </span>
                    <span className="text-xs text-primary">Add</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background py-1 pl-3 pr-1 text-sm"
                >
                  {c.name}
                  <button
                    type="button"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => setSelected((s) => s.filter((x) => x.id !== c.id))}
                    className="tap-target grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-8" aria-labelledby="ic-results-heading">
        <h2 id="ic-results-heading" className="mb-3 font-display text-xl font-semibold">
          Interaction results
        </h2>
        {selected.length < 2 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Add at least two compounds to check for interactions.
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.map((ev, i) => {
              const style = SEVERITY_STYLES[ev.severity] ?? SEVERITY_STYLES.note;
              const Icon = style.icon;
              return (
                <article
                  key={`${ev.a.id}-${ev.b.id}-${i}`}
                  className={`rounded-2xl border p-4 ${style.ring}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">
                      <Link
                        to="/library/$slug"
                        params={{ slug: ev.a.slug }}
                        className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                      >
                        {ev.a.name}
                      </Link>{" "}
                      <span className="text-muted-foreground">+</span>{" "}
                      <Link
                        to="/library/$slug"
                        params={{ slug: ev.b.slug }}
                        className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                      >
                        {ev.b.name}
                      </Link>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}
                    >
                      <Icon className="h-3 w-3" />
                      {style.label}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ConfidenceBadge confidence={ev.confidence} />
                  </div>
                  <p className="mt-2 text-sm text-foreground">
                    {linkifyCompounds(ev.mechanism, compounds ?? [])}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {linkifyCompounds(ev.recommendation, compounds ?? [])}
                  </p>
                  {ev.noKnownInteraction ? (
                    <NoKnownInteractionLine source={ev.sources[0]} className="mt-2 text-xs" />
                  ) : (
                    <SharedMechanismNote sharedWith={ev.mechanismSharedWith} />
                  )}
                  {(() => {
                    // Resolve every stored ref to a real document URL (PubMed,
                    // DailyMed, publisher page) and render it as a numbered
                    // source list rather than an unlabelled chip row.
                    const sources = resolveInteractionSources(ev.sources, ev.a.name, ev.b.name);
                    if (sources.length === 0) return null;
                    return (
                      <div className="mt-3 border-t border-border/60 pt-3">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Sources
                        </h3>
                        <AuthoritySourceList
                          className="mt-2"
                          sources={sources}
                          idPrefix={`check-${i + 1}-source`}
                        />
                        <Link
                          to="/sources"
                          className="mt-2 inline-block text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        >
                          How these rules are sourced and reviewed
                        </Link>
                      </div>
                    );
                  })()}

                  {ev.matchedBy === "category" && (
                    <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Category-level rule
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <SaveResultCta
          tool="interaction_checker"
          hasResult={selected.length >= 2}
          title="Save this check to your stack"
          body="Add these compounds to DoseRoutine once and every new thing you take is re-checked automatically — plus timing reminders and a shareable summary for your doctor."
          action="Save this check"
        />

        <TrustSafety variant="safety-only" id="checker-safety" className="mt-6" />
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-display text-xl font-semibold">
            Track the whole protocol, not just the checks
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            DoseRoutine builds an AI plan around your real stack — dosing schedules, cycle windows,
            meal timing, injection sites, and reminders that sync to your phone. The interaction
            checker runs automatically as you add compounds.
          </p>
          <Link
            to="/auth"
            className="tap-target mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground"
          >
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-border p-6">
          <h2 className="font-display text-xl font-semibold">
            Looking for one specific combination?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every named pair in our rule set has its own plain-English answer page — the verdict,
            why the two interact, and how far apart to take them.
          </p>
          <Link
            to="/interactions"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Browse all interaction pairs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Educational tool. Not medical advice. Always consult a licensed clinician before starting,
          stopping, or combining compounds. See{" "}
          <Link to="/medical-disclaimer" className="underline">
            medical disclaimer
          </Link>
          .
        </p>
      </section>
      <section className="mx-auto w-full max-w-3xl px-4 pb-4">
        <AeoFaq pairs={INTERACTION_CHECKER_FAQ} heading="Interaction checker FAQ" />
      </section>
      <AttributionFooter sourceUrl={CANONICAL} />
    </main>
  );
}
