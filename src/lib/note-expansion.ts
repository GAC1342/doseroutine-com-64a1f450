/**
 * Per-card expansion memory for NOTE interaction cards on /safety.
 *
 * The Safety page collapses NOTE cards by default. Which individual notes the
 * user has opened is persisted (via useTabViewState) as an array of card keys,
 * so returning to the tab restores the exact same open/closed cards.
 *
 * Pure helpers so the behaviour can be tested without rendering the page.
 */

/** Stable identity for a NOTE card. Mirrors the keys used when rendering. */
export function ruleCardKey(aId: string, bId: string): string {
  return `rule-${aId}-${bId}`;
}

export function userNoteCardKey(noteId: string): string {
  return `note-${noteId}`;
}

export function isNoteExpanded(expanded: readonly string[] | undefined, key: string): boolean {
  return (expanded ?? []).includes(key);
}

/** Flip one card, keeping the stored list de-duplicated and order-stable. */
export function toggleNoteKey(expanded: readonly string[] | undefined, key: string): string[] {
  const list = expanded ?? [];
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

/**
 * Drop remembered keys for cards that no longer exist (pair removed from the
 * stack, note deleted) so the stored array can't grow without bound.
 *
 * Pruning is skipped while `knownKeys` is empty — that state is also what the
 * page looks like before data has loaded, and we must not wipe the memory then.
 */
export function pruneNoteKeys(
  expanded: readonly string[] | undefined,
  knownKeys: readonly string[],
): string[] {
  const list = [...(expanded ?? [])];
  if (knownKeys.length === 0) return list;
  const known = new Set(knownKeys);
  return list.filter((k) => known.has(k));
}

/** "Expand all notes" — remember every note currently known. */
export function expandAllNoteKeys(
  expanded: readonly string[] | undefined,
  knownKeys: readonly string[],
): string[] {
  const next = new Set(expanded ?? []);
  for (const k of knownKeys) next.add(k);
  return [...next];
}

/** "Collapse all notes" — forget the known notes, keep nothing stale behind. */
export function collapseAllNoteKeys(
  expanded: readonly string[] | undefined,
  knownKeys: readonly string[],
): string[] {
  const known = new Set(knownKeys);
  return (expanded ?? []).filter((k) => !known.has(k));
}
