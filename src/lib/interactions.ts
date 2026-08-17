import type { Database } from "@/integrations/supabase/types";

export type Compound = Database["public"]["Tables"]["compounds"]["Row"];
export type UserCompound = Database["public"]["Tables"]["user_compounds"]["Row"];
export type Rule = Database["public"]["Tables"]["interaction_rules"]["Row"];
export type Severity = Database["public"]["Enums"]["severity_enum"];

export type UCWithCompound = UserCompound & { compound: Compound | null };

export type InteractionConfidence = Database["public"]["Enums"]["interaction_confidence"];

export type PairEvaluation = {
  a: Compound;
  b: Compound;
  severity: Severity;
  mechanism: string;
  recommendation: string;
  same_axis: boolean;
  matchedBy: "pair" | "category";
  source_refs: string[];
  /** established | plausible | theoretical | disputed — defaults to theoretical. */
  confidence: InteractionConfidence;
  /** Set when the warning text is a reused mechanism template, not pair-specific. */
  mechanism_shared_with: string | null;
  /** True when a source explicitly reports no documented interaction for the pair. */
  no_known_interaction: boolean;
};

const SEVERITY_ORDER: Record<Severity, number> = {
  avoid: 0,
  caution: 1,
  note: 2,
  synergy: 3,
};

/** Pick the best-matching rule for a pair: specific pair beats category pair;
 *  among ties, highest severity (lowest order number) wins. */
export function findRuleForPair(
  a: Compound,
  b: Compound,
  rules: Rule[],
): { rule: Rule; matchedBy: "pair" | "category" } | null {
  const pairMatches = rules.filter(
    (r) =>
      (r.compound_a_id === a.id && r.compound_b_id === b.id) ||
      (r.compound_a_id === b.id && r.compound_b_id === a.id),
  );
  if (pairMatches.length) {
    const best = pairMatches.reduce((p, c) =>
      SEVERITY_ORDER[c.severity] < SEVERITY_ORDER[p.severity] ? c : p,
    );
    return { rule: best, matchedBy: "pair" };
  }
  const catMatches = rules.filter(
    (r) =>
      (r.category_a === a.category && r.category_b === b.category) ||
      (r.category_a === b.category && r.category_b === a.category),
  );
  if (catMatches.length) {
    const best = catMatches.reduce((p, c) =>
      SEVERITY_ORDER[c.severity] < SEVERITY_ORDER[p.severity] ? c : p,
    );
    return { rule: best, matchedBy: "category" };
  }
  return null;
}

/** Evaluate all unordered pairs across active user compounds. */
export function evaluateInteractions(
  userCompounds: UCWithCompound[],
  rules: Rule[],
): PairEvaluation[] {
  const active = userCompounds.filter((u) => u.active && u.compound);
  const out: PairEvaluation[] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i].compound!;
      const b = active[j].compound!;
      const match = findRuleForPair(a, b, rules);
      if (!match) continue;
      out.push({
        a,
        b,
        severity: match.rule.severity,
        mechanism: match.rule.mechanism,
        recommendation: match.rule.recommendation,
        same_axis: !!match.rule.same_axis,
        matchedBy: match.matchedBy,
        source_refs: match.rule.source_refs ?? [],
        confidence: match.rule.confidence ?? "theoretical",
        mechanism_shared_with: match.rule.mechanism_shared_with ?? null,
        no_known_interaction: !!match.rule.no_known_interaction,
      });
    }
  }
  return out.sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity]);
}

/** Pairs with no rule at all — we say so honestly, never imply safe. */
export function unknownPairs(
  userCompounds: UCWithCompound[],
  rules: Rule[],
): { a: Compound; b: Compound }[] {
  const active = userCompounds.filter((u) => u.active && u.compound);
  const out: { a: Compound; b: Compound }[] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i].compound!;
      const b = active[j].compound!;
      if (!findRuleForPair(a, b, rules)) out.push({ a, b });
    }
  }
  return out;
}
