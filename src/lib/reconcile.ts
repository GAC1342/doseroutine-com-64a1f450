/**
 * Reconciliation guard for optimistic list updates.
 *
 * When a mutation returns a server row, we must swap the optimistic/temp row
 * for it WITHOUT attaching the server row to an unrelated entry. Matching on
 * `id` alone is unsafe (the temp id was fabricated); matching on a single
 * business field is unsafe when the table's uniqueness spans multiple columns
 * (e.g. reminders are unique per `user_compound_id + channel`, not per id).
 *
 * `reconcileRow` picks the row whose identity fields ALL match the server
 * row, then replaces it and drops any other rows sharing the same identity
 * (duplicates from a racing insert). If the server row's identity fields do
 * not match the mutation's expected identity, the caller has almost certainly
 * wired the wrong keys — we throw so the bug surfaces in dev instead of
 * silently corrupting the cache.
 */
export function reconcileRow<T extends { id: string }>(
  list: readonly T[] | undefined,
  serverRow: T,
  identity: Partial<T>,
): T[] {
  const keys = Object.keys(identity) as (keyof T)[];
  if (keys.length === 0) {
    throw new Error("reconcileRow: identity must have at least one key");
  }

  // Guard: the server row's identity fields must match what we asked for.
  // If they don't, the mutation targeted a different row than the caller
  // believes — refuse to reconcile rather than overwrite the wrong entry.
  for (const k of keys) {
    if (serverRow[k] !== identity[k]) {
      throw new Error(
        `reconcileRow: server row identity mismatch on "${String(k)}" ` +
          `(expected ${JSON.stringify(identity[k])}, got ${JSON.stringify(serverRow[k])})`,
      );
    }
  }

  const source = list ?? [];
  const matches = (row: T) => keys.every((k) => row[k] === identity[k]);

  // Keep every non-matching row, then append the server row exactly once.
  // Order preservation: place the server row where the first match lived.
  const firstMatchIdx = source.findIndex(matches);
  const kept = source.filter((row) => !matches(row));
  if (firstMatchIdx === -1) {
    return [serverRow, ...kept];
  }
  const next = kept.slice();
  next.splice(firstMatchIdx, 0, serverRow);
  return next;
}
