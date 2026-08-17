// Ranking for the library search auto-suggest dropdown.
//
// Kept out of the route component so it can be unit-tested and so the
// (hot) keystroke path does not pull the whole route module into scope.
//
// Rank order, best first:
//   0  exact name match
//   1  name starts with the query
//   2  an alias starts with the query
//   3  name contains the query
//   4  an alias contains the query
// Ties break alphabetically, so results are stable between keystrokes.

export type SuggestCompound = {
  slug: string;
  name: string;
  category: string;
  aliases?: string[] | null;
};

export type Suggestion<T extends SuggestCompound = SuggestCompound> = {
  compound: T;
  /** The alias that produced the match, when the name itself didn't match. */
  matchedAlias: string | null;
};

export const SUGGEST_LIMIT = 7;

function rank(c: SuggestCompound, q: string): { score: number; alias: string | null } | null {
  const name = c.name.toLowerCase();
  if (name === q) return { score: 0, alias: null };
  if (name.startsWith(q)) return { score: 1, alias: null };

  const aliases = (c.aliases ?? []).filter(Boolean);
  const aliasStart = aliases.find((a) => a.toLowerCase().startsWith(q));
  if (aliasStart) return { score: 2, alias: aliasStart };

  if (name.includes(q)) return { score: 3, alias: null };

  const aliasIncludes = aliases.find((a) => a.toLowerCase().includes(q));
  if (aliasIncludes) return { score: 4, alias: aliasIncludes };

  return null;
}

/**
 * Build the suggestion list for a raw query string.
 * Returns [] for queries shorter than 2 characters so the dropdown does not
 * flash open on the first keystroke.
 */
export function buildSuggestions<T extends SuggestCompound>(
  compounds: readonly T[],
  query: string,
  limit: number = SUGGEST_LIMIT,
): Suggestion<T>[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const scored: { s: number; alias: string | null; c: T }[] = [];
  for (const c of compounds) {
    const r = rank(c, q);
    if (r) scored.push({ s: r.score, alias: r.alias, c });
  }

  scored.sort((a, b) => (a.s !== b.s ? a.s - b.s : a.c.name.localeCompare(b.c.name)));

  return scored.slice(0, limit).map((x) => ({ compound: x.c, matchedAlias: x.alias }));
}

/** Wrap-around index movement for ArrowUp / ArrowDown in the listbox. */
export function moveActiveIndex(current: number, delta: number, count: number): number {
  if (count === 0) return -1;
  if (current === -1) return delta > 0 ? 0 : count - 1;
  return (current + delta + count) % count;
}

/**
 * True when the keyboard event should focus the search field.
 * Supports "/" (like GitHub) and Cmd/Ctrl+K, and never steals a keystroke
 * that the user is typing into another field.
 */
export function isSearchShortcut(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  defaultPrevented?: boolean;
}): boolean {
  if (e.defaultPrevented) return false;
  if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !e.altKey) return true;
  if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) return true;
  return false;
}

/** True when the event target is a field the user is already typing into. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true;
}
