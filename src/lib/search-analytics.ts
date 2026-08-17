// Search analytics: which typed terms and filter chips actually lead to a
// useful search (a suggestion opened, or results found).
//
// Everything here is fire-and-forget on top of `trackEvent`, so nothing in the
// keystroke path can block or throw.

import { trackEvent } from "@/lib/analytics";

export const SEARCH_EVENTS = {
  committed: "search_committed",
  suggestShown: "search_suggest_shown",
  suggestSelected: "search_suggest_selected",
  filterChip: "search_filter_chip",
  cleared: "search_cleared",
} as const;

export type SearchSurface = "library" | "blog";

export const TERM_MAX_LENGTH = 80;

/** Lowercase, collapse whitespace, cap length. Keeps reports groupable. */
export function normalizeTerm(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase().slice(0, TERM_MAX_LENGTH);
}

/** Milliseconds of quiet typing before a "suggestions shown" event fires. */
export const SUGGEST_SHOWN_DEBOUNCE_MS = 400;

/**
 * Dedupe guard for the suggest-shown event: only report when the settled term
 * (or its result count) actually changed since the last report.
 */
export function makeSuggestShownGuard() {
  let last = "";
  return (term: string, count: number): boolean => {
    const key = `${term}|${count}`;
    if (!term || key === last) return false;
    last = key;
    return true;
  };
}

export function trackSearchCommitted(
  surface: SearchSurface,
  term: string,
  resultCount: number,
): void {
  const t = normalizeTerm(term);
  if (!t) return;
  trackEvent(SEARCH_EVENTS.committed, {
    surface,
    term: t,
    term_length: t.length,
    result_count: resultCount,
    zero_results: resultCount === 0,
  });
}

export function trackSuggestShown(
  surface: SearchSurface,
  term: string,
  suggestionCount: number,
): void {
  const t = normalizeTerm(term);
  if (!t) return;
  trackEvent(SEARCH_EVENTS.suggestShown, {
    surface,
    term: t,
    suggestion_count: suggestionCount,
  });
}

export function trackSuggestSelected(
  surface: SearchSurface,
  opts: {
    term: string;
    value: string;
    index: number;
    matchedAlias?: string | null;
    suggestionCount: number;
  },
): void {
  trackEvent(SEARCH_EVENTS.suggestSelected, {
    surface,
    term: normalizeTerm(opts.term),
    value: opts.value,
    index: opts.index,
    match_type: opts.matchedAlias ? "alias" : "name",
    matched_alias: opts.matchedAlias ? normalizeTerm(opts.matchedAlias) : null,
    suggestion_count: opts.suggestionCount,
  });
}

export function trackFilterChip(
  surface: SearchSurface,
  opts: {
    /** Chip group: category, goal, sort, page_size, all_goals, tag. */
    group: string;
    value: string;
    active: boolean;
    resultCount?: number;
    term?: string;
  },
): void {
  trackEvent(SEARCH_EVENTS.filterChip, {
    surface,
    group: opts.group,
    value: opts.value,
    active: opts.active,
    result_count: opts.resultCount ?? null,
    term: opts.term ? normalizeTerm(opts.term) : null,
  });
}

export function trackSearchCleared(
  surface: SearchSurface,
  opts: { term?: string; from?: string } = {},
): void {
  trackEvent(SEARCH_EVENTS.cleared, {
    surface,
    term: opts.term ? normalizeTerm(opts.term) : null,
    from: opts.from ?? "filters",
  });
}
