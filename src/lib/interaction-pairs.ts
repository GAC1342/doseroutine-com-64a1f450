/**
 * Programmatic "Can you take X with Y?" pair pages.
 *
 * Every specific compound-to-compound rule in `interaction_rules` (i.e. rows
 * with both compound_a_id and compound_b_id set) becomes one public page at
 * /interactions/<a-slug>-and-<b-slug>. The slug pair is always sorted
 * alphabetically so a pair has exactly ONE canonical URL — no duplicate
 * content from the reversed order.
 *
 * Category-level rules are deliberately excluded: they describe classes, not
 * a specific named pair, so they'd produce thin, near-duplicate pages.
 */

import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import { canonicalName, canonicalSlug } from "@/lib/interaction-canonical";

export type Severity = Database["public"]["Enums"]["severity_enum"];

export type PairCompound = {
  id: string;
  name: string;
  slug: string;
  category: string;
  aliases: string[] | null;
  typical_timing: string | null;
  food_rule: string | null;
  half_life_hours: number | null;
  is_injectable: boolean | null;
};

export type PairPage = {
  /** Canonical URL segment: "<a-slug>-and-<b-slug>", alphabetically ordered. */
  slug: string;
  a: PairCompound;
  b: PairCompound;
  severity: Severity;
  mechanism: string;
  recommendation: string;
  separationHours: number | null;
  sameAxis: boolean;
  sourceRefs: string[];
  /** established | plausible | theoretical | disputed — defaults to theoretical. */
  confidence: Database["public"]["Enums"]["interaction_confidence"];
  /** Set when the warning text is a reused mechanism template, not pair-specific. */
  mechanismSharedWith: string | null;
  /** True when a source explicitly reports no documented interaction. */
  noKnownInteraction: boolean;
};

/** Canonical, order-independent URL segment for a pair of compound slugs. */
export function pairSlug(slugA: string, slugB: string): string {
  const [first, second] = [slugA, slugB].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  return `${first}-and-${second}`;
}

/** Short verdict line used in the H1 answer block, meta description and FAQ. */
export const SEVERITY_VERDICT: Record<Severity, string> = {
  avoid: "Not together — this combination should be avoided",
  caution: "Yes, with care — this combination needs a precaution",
  note: "Yes — but there is one thing worth knowing",
  synergy: "Yes — these two work well together",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  avoid: "Avoid",
  caution: "Caution",
  note: "Note",
  synergy: "Synergy",
};

/** One-line answer used as the answer-first opening sentence. */
export function verdictSentence(page: PairPage): string {
  const { a, b, severity } = page;
  switch (severity) {
    case "avoid":
      return `${a.name} and ${b.name} should not be taken together without medical supervision.`;
    case "caution":
      return `${a.name} and ${b.name} can be taken together, but the combination needs a precaution.`;
    case "note":
      return `${a.name} and ${b.name} can be taken together — there is one detail worth knowing first.`;
    case "synergy":
      return `${a.name} and ${b.name} are commonly taken together and generally work well as a pair.`;
  }
}

/** Practical timing guidance derived from the rule's separation window. */
export function timingAdvice(page: PairPage): string {
  if (page.separationHours && page.separationHours > 0) {
    const h = page.separationHours;
    const unit = h === 1 ? "hour" : "hours";
    return `Separate ${page.a.name} and ${page.b.name} by at least ${h} ${unit}. Taking them in the same window is what causes the issue, not taking them on the same day.`;
  }
  if (page.severity === "avoid") {
    return `Separating the doses does not solve this one. The concern is the combined effect in the body, not absorption timing, so spacing them out is not a workaround.`;
  }
  if (page.severity === "synergy") {
    return `No separation needed — taking ${page.a.name} and ${page.b.name} in the same dose window is fine and is usually the point of pairing them.`;
  }
  return `No fixed separation window applies here. Keep the timing consistent day to day so any effect is easy to spot.`;
}

export type PairFaq = { q: string; a: string };

/**
 * FAQ pairs shown on the page AND emitted as FAQPage JSON-LD. Both consumers
 * must use this function so the visible Q&A matches the structured data,
 * which is what Google's FAQ rules require.
 */
export function buildPairFaq(page: PairPage): PairFaq[] {
  const { a, b } = page;
  const faq: PairFaq[] = [
    {
      q: `Can you take ${a.name} and ${b.name} together?`,
      a: `${verdictSentence(page)} ${page.mechanism}`,
    },
    {
      q: `How far apart should ${a.name} and ${b.name} be taken?`,
      a: timingAdvice(page),
    },
    {
      q: `What happens if you take ${a.name} with ${b.name}?`,
      a: `${page.mechanism} ${page.recommendation}`,
    },
    {
      q: `Is the ${a.name} and ${b.name} interaction serious?`,
      a:
        page.severity === "avoid"
          ? `DoseRoutine rates this pair "Avoid", the highest of its four severity levels. Talk to a prescriber before combining them.`
          : page.severity === "caution"
            ? `DoseRoutine rates this pair "Caution". It is manageable with the right timing or dose, not a reason to drop either item.`
            : page.severity === "note"
              ? `DoseRoutine rates this pair "Note" — the mildest flag. It is worth knowing about, but it rarely changes what people do.`
              : `DoseRoutine rates this pair "Synergy" — the two support each other rather than conflict.`,
    },
  ];
  return faq;
}

/** Fetches every specific compound-to-compound rule and its two compounds. */
export async function fetchPairPages(): Promise<PairPage[]> {
  const [rulesRes, compoundsRes] = await Promise.all([
    supabase
      .from("interaction_rules")
      .select(
        "compound_a_id,compound_b_id,severity,mechanism,recommendation,separation_hours,same_axis,source_refs,confidence,mechanism_shared_with,no_known_interaction",
      )
      .not("compound_a_id", "is", null)
      .not("compound_b_id", "is", null),
    supabase
      .from("compounds")
      .select(
        "id,name,slug,category,aliases,typical_timing,food_rule,half_life_hours,is_injectable",
      ),
  ]);

  if (rulesRes.error) throw rulesRes.error;
  if (compoundsRes.error) throw compoundsRes.error;

  const byId = new Map<string, PairCompound>();
  const bySlug = new Map<string, PairCompound>();
  for (const c of compoundsRes.data ?? []) {
    byId.set(c.id, c as PairCompound);
    bySlug.set(c.slug, c as PairCompound);
  }

  /**
   * Fold alias rows (e.g. "Levothyroxine Sodium") onto their canonical
   * compound so the same clinical fact does not render as two pages.
   */
  const canonical = (c: PairCompound): PairCompound => {
    const target = canonicalSlug(c.slug);
    if (target === c.slug) return c;
    const row = bySlug.get(target);
    const base = row ?? { ...c, slug: target };
    return { ...base, name: canonicalName(target, base.name) };
  };

  const seen = new Set<string>();
  const pages: PairPage[] = [];

  for (const r of rulesRes.data ?? []) {
    const rawA = r.compound_a_id ? byId.get(r.compound_a_id) : undefined;
    const rawB = r.compound_b_id ? byId.get(r.compound_b_id) : undefined;
    if (!rawA || !rawB) continue;
    const ca = canonical(rawA);
    const cb = canonical(rawB);
    if (ca.slug === cb.slug) continue;

    // Alphabetical order gives the pair one canonical URL and one stable
    // "A and B" reading order across the title, H1 and body copy.
    const [a, b] = ca.slug < cb.slug ? [ca, cb] : [cb, ca];
    const slug = pairSlug(a.slug, b.slug);
    // Duplicate rules for the same canonical pair (including alias-generated
    // duplicates) collapse to one page — the first rule wins.
    if (seen.has(slug)) continue;
    seen.add(slug);

    pages.push({
      slug,
      a,
      b,
      severity: r.severity,
      mechanism: (r.mechanism ?? "").trim(),
      recommendation: (r.recommendation ?? "").trim(),
      separationHours: r.separation_hours == null ? null : Number(r.separation_hours),
      sameAxis: !!r.same_axis,
      sourceRefs: (r.source_refs ?? []) as string[],
      confidence: r.confidence ?? "theoretical",
      mechanismSharedWith: r.mechanism_shared_with ?? null,
      noKnownInteraction: !!r.no_known_interaction,
    });
  }

  pages.sort((x, y) => x.slug.localeCompare(y.slug));
  return pages;
}

export const pairPagesQuery = queryOptions({
  queryKey: ["interaction-pairs", "all"],
  queryFn: fetchPairPages,
  staleTime: 60 * 60 * 1000,
  gcTime: 2 * 60 * 60 * 1000,
});

/** Other published pairs that share a compound with this one. */
export function relatedPairs(page: PairPage, all: PairPage[], limit = 8): PairPage[] {
  return all
    .filter(
      (p) =>
        p.slug !== page.slug &&
        (p.a.slug === page.a.slug ||
          p.b.slug === page.a.slug ||
          p.a.slug === page.b.slug ||
          p.b.slug === page.b.slug),
    )
    .slice(0, limit);
}
