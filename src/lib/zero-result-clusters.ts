// Zero-result analyzer.
//
// Takes the raw "search returned nothing" terms and turns them into a short
// list of clusters an editor can act on: which near-duplicate phrasings belong
// together, and what tag/alias/filter should be added to the catalog so the
// next person searching that phrase actually finds something.
//
// Pure functions only — no DB, no React — so this is unit-testable and can run
// on either side of the wire.

export type ZeroResultTerm = {
  term: string;
  /** How many zero-result searches used this exact term. */
  searches: number;
};

export type CatalogEntry = {
  slug: string;
  name: string;
  aliases?: string[] | null;
  category?: string | null;
  goalTags?: string[] | null;
};

export type ProposalKind = "alias" | "goal_tag" | "category_filter" | "new_entry";

export type Proposal = {
  kind: ProposalKind;
  /** The tag/alias/filter value to add. */
  value: string;
  /** Catalog entry the change lands on, when there is one. */
  targetSlug: string | null;
  targetName: string | null;
  /** 0–1 confidence that this is the right fix. */
  confidence: number;
  reason: string;
};

export type ZeroResultCluster = {
  /** Stable key for React lists. */
  id: string;
  /** Human label for the cluster (the highest-volume term, cleaned up). */
  label: string;
  terms: ZeroResultTerm[];
  /** Sum of `searches` across the cluster. */
  searches: number;
  /** Tokens shared by the cluster, most significant first. */
  keywords: string[];
  /** Intent words stripped from the terms (e.g. "dosage", "calculator"). */
  intents: string[];
  proposals: Proposal[];
};

/**
 * Words that describe *what the user wanted to do*, not *what they searched
 * for*. Stripped before clustering, but kept so we can propose a filter.
 */
export const INTENT_WORDS: Record<string, string> = {
  dose: "dosage",
  dosage: "dosage",
  dosing: "dosage",
  doses: "dosage",
  mg: "dosage",
  protocol: "protocol",
  protocols: "protocol",
  cycle: "protocol",
  cycles: "protocol",
  calculator: "calculator",
  calc: "calculator",
  convert: "calculator",
  conversion: "calculator",
  reconstitution: "reconstitution",
  reconstitute: "reconstitution",
  interaction: "interactions",
  interactions: "interactions",
  stack: "stacking",
  stacking: "stacking",
  side: "side effects",
  effects: "side effects",
  benefits: "benefits",
  timing: "timing",
  schedule: "timing",
  review: "reviews",
  reviews: "reviews",
  results: "results",
  before: "results",
  after: "results",
  safe: "safety",
  safety: "safety",
};

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "best",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "should",
  "take",
  "taking",
  "the",
  "to",
  "use",
  "using",
  "vs",
  "versus",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "you",
  "your",
]);

/** Goal vocabulary we can propose as a catalog goal tag / filter chip. */
export const GOAL_VOCAB: Record<string, string> = {
  sleep: "sleep",
  insomnia: "sleep",
  energy: "energy",
  fatigue: "energy",
  focus: "focus",
  cognition: "focus",
  nootropic: "focus",
  muscle: "muscle",
  strength: "muscle",
  bulking: "muscle",
  hypertrophy: "muscle",
  fat: "fat loss",
  weight: "fat loss",
  cutting: "fat loss",
  "fat-loss": "fat loss",
  loss: "fat loss",
  recovery: "recovery",
  healing: "recovery",
  injury: "recovery",
  joint: "joints",
  joints: "joints",
  tendon: "joints",
  skin: "skin",
  hair: "hair",
  libido: "libido",
  testosterone: "hormones",
  hormone: "hormones",
  hormones: "hormones",
  longevity: "longevity",
  aging: "longevity",
  "anti-aging": "longevity",
  immune: "immunity",
  immunity: "immunity",
  gut: "gut health",
  digestion: "gut health",
  anxiety: "mood",
  mood: "mood",
  stress: "mood",
  depression: "mood",
};

function singular(token: string): string {
  if (token.length > 3 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("ses")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

/** Split a term into comparable tokens (lowercase, punctuation-free). */
export function tokenize(term: string): string[] {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export type ParsedTerm = {
  term: string;
  /** Meaningful tokens: intent words and stopwords removed. */
  tokens: string[];
  intents: string[];
  goals: string[];
};

export function parseTerm(term: string): ParsedTerm {
  const intents: string[] = [];
  const goals: string[] = [];
  const tokens: string[] = [];

  for (const raw of tokenize(term)) {
    const t = singular(raw);
    const intent = INTENT_WORDS[raw] ?? INTENT_WORDS[t];
    if (intent) {
      if (!intents.includes(intent)) intents.push(intent);
      continue;
    }
    const goal = GOAL_VOCAB[raw] ?? GOAL_VOCAB[t];
    if (goal && !goals.includes(goal)) goals.push(goal);
    if (STOPWORDS.has(raw) || STOPWORDS.has(t)) continue;
    if (t.length < 2) continue;
    tokens.push(t);
  }

  return { term, tokens, intents, goals };
}

/** Character-trigram Jaccard similarity, 0–1. Cheap and typo-tolerant. */
export function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const p = ` ${s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()} `;
    const set = new Set<string>();
    for (let i = 0; i < p.length - 2; i += 1) set.add(p.slice(i, i + 3));
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared += 1;
  return shared / (A.size + B.size - shared);
}

type CatalogMatch = {
  entry: CatalogEntry;
  score: number;
  /** Which catalog string produced the match. */
  matched: string;
};

/** Best fuzzy catalog match for a phrase, or null when nothing is close. */
export function matchCatalog(
  phrase: string,
  catalog: readonly CatalogEntry[],
  threshold = 0.45,
): CatalogMatch | null {
  let best: CatalogMatch | null = null;
  for (const entry of catalog) {
    const candidates = [entry.name, ...(entry.aliases ?? []).filter(Boolean)];
    for (const c of candidates) {
      const score = similarity(phrase, c);
      if (score > (best?.score ?? 0)) best = { entry, score, matched: c };
    }
  }
  return best && best.score >= threshold ? best : null;
}

function clusterKey(parsed: ParsedTerm, catalog: readonly CatalogEntry[]): string {
  const phrase = parsed.tokens.join(" ");
  if (phrase) {
    const m = matchCatalog(phrase, catalog, 0.5);
    if (m) return `compound:${m.entry.slug}`;
    // Longest token wins: "tesamorelin peptide" and "peptide tesamorelin"
    // land in the same bucket.
    const head = parsed.tokens.slice().sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
    if (head) return `token:${head}`;
  }
  if (parsed.goals[0]) return `goal:${parsed.goals[0]}`;
  if (parsed.intents[0]) return `intent:${parsed.intents[0]}`;
  return `term:${parsed.term}`;
}

function isKnownAlias(entry: CatalogEntry, phrase: string): boolean {
  const p = phrase.toLowerCase();
  if (entry.name.toLowerCase() === p) return true;
  return (entry.aliases ?? []).some((a) => (a ?? "").toLowerCase() === p);
}

function buildProposals(
  key: string,
  terms: ZeroResultTerm[],
  parsed: ParsedTerm[],
  catalog: readonly CatalogEntry[],
): Proposal[] {
  const proposals: Proposal[] = [];
  const topPhrase = parsed[0]?.tokens.join(" ") ?? terms[0]?.term ?? "";
  const goals = Array.from(new Set(parsed.flatMap((p) => p.goals)));
  const intents = Array.from(new Set(parsed.flatMap((p) => p.intents)));

  const match = topPhrase ? matchCatalog(topPhrase, catalog, 0.45) : null;

  // Propose an alias for every phrasing in the cluster that resolves to a
  // catalog entry but isn't already its name or one of its aliases.
  for (const p of parsed) {
    const phrase = p.tokens.join(" ");
    if (!phrase) continue;
    const m = matchCatalog(phrase, catalog, 0.45);
    if (!m || isKnownAlias(m.entry, phrase)) continue;
    proposals.push({
      kind: "alias",
      value: phrase,
      targetSlug: m.entry.slug,
      targetName: m.entry.name,
      confidence: Math.min(0.95, 0.4 + m.score * 0.6),
      reason: `Looks like a misspelling or variant of “${m.matched}” (${Math.round(
        m.score * 100,
      )}% similar). Adding it as an alias makes the search resolve.`,
    });
  }

  for (const goal of goals) {
    const known = catalog.some((c) =>
      (c.goalTags ?? []).some((g) => (g ?? "").toLowerCase() === goal),
    );
    proposals.push({
      kind: "goal_tag",
      value: goal,
      targetSlug: match?.entry.slug ?? null,
      targetName: match?.entry.name ?? null,
      confidence: known ? 0.6 : 0.45,
      reason: known
        ? `“${goal}” already exists as a goal tag — tag more entries with it so this search returns results.`
        : `Searchers use “${goal}” as a goal. Add it as a goal tag and a filter chip.`,
    });
  }

  for (const intent of intents) {
    proposals.push({
      kind: "category_filter",
      value: intent,
      targetSlug: match?.entry.slug ?? null,
      targetName: match?.entry.name ?? null,
      confidence: 0.4,
      reason: `People append “${intent}” to their query. Surface a ${intent} filter (or route them to the ${intent} page) instead of returning nothing.`,
    });
  }

  if (!match && topPhrase && key.startsWith("token:")) {
    proposals.push({
      kind: "new_entry",
      value: topPhrase,
      targetSlug: null,
      targetName: null,
      confidence: 0.5,
      reason: `Nothing in the catalog is close to “${topPhrase}”. This is a content gap — add a library entry.`,
    });
  }

  return proposals
    .sort((a, b) => b.confidence - a.confidence)
    .filter((p, i, arr) => arr.findIndex((o) => o.kind === p.kind && o.value === p.value) === i)
    .slice(0, 4);
}

export type ClusterOptions = {
  /** Drop clusters below this total search volume. Default 1. */
  minSearches?: number;
  /** Max clusters returned. Default 12. */
  limit?: number;
};

/**
 * Group zero-result terms into actionable clusters with catalog proposals.
 * Sorted by search volume, highest first.
 */
export function clusterZeroResultTerms(
  terms: readonly ZeroResultTerm[],
  catalog: readonly CatalogEntry[] = [],
  options: ClusterOptions = {},
): ZeroResultCluster[] {
  const minSearches = options.minSearches ?? 1;
  const limit = options.limit ?? 12;

  const buckets = new Map<string, { terms: ZeroResultTerm[]; parsed: ParsedTerm[] }>();

  for (const t of terms) {
    const term = (t.term ?? "").trim();
    if (!term) continue;
    const searches = Number.isFinite(t.searches) && t.searches > 0 ? Math.floor(t.searches) : 1;
    const parsed = parseTerm(term);
    const key = clusterKey(parsed, catalog);
    let b = buckets.get(key);
    if (!b) {
      b = { terms: [], parsed: [] };
      buckets.set(key, b);
    }
    b.terms.push({ term, searches });
    b.parsed.push(parsed);
  }

  const clusters: ZeroResultCluster[] = [];

  for (const [key, b] of buckets) {
    // Highest-volume term first so the label and proposals use the dominant
    // phrasing rather than whichever term happened to arrive first.
    const order = b.terms
      .map((t, i) => i)
      .sort(
        (a, c) =>
          b.terms[c]!.searches - b.terms[a]!.searches ||
          b.terms[a]!.term.localeCompare(b.terms[c]!.term),
      );
    const sortedTerms = order.map((i) => b.terms[i]!);
    const sortedParsed = order.map((i) => b.parsed[i]!);

    const searches = sortedTerms.reduce((s, t) => s + t.searches, 0);
    if (searches < minSearches) continue;

    const keywordCounts = new Map<string, number>();
    for (const p of sortedParsed) {
      for (const tok of p.tokens) keywordCounts.set(tok, (keywordCounts.get(tok) ?? 0) + 1);
    }

    clusters.push({
      id: key,
      label: sortedTerms[0]!.term,
      terms: sortedTerms,
      searches,
      keywords: Array.from(keywordCounts.entries())
        .sort((a, c) => c[1] - a[1] || a[0].localeCompare(c[0]))
        .slice(0, 5)
        .map(([k]) => k),
      intents: Array.from(new Set(sortedParsed.flatMap((p) => p.intents))),
      proposals: buildProposals(key, sortedTerms, sortedParsed, catalog),
    });
  }

  return clusters
    .sort((a, b) => b.searches - a.searches || a.label.localeCompare(b.label))
    .slice(0, limit);
}
