/**
 * Stack card write helpers.
 *
 * The stack card's delete/pause buttons used to await a raw Supabase promise
 * with no try/catch and no timeout. If the request rejected or never settled
 * (dropped connection, phone waking from sleep) the card's busy flag stayed
 * true forever: spinner spinning, every button on the card disabled, confirm
 * dialog stuck open — the "frozen, can't remove it" report.
 *
 * These helpers always settle, always with a describable outcome, so the UI
 * can guarantee it clears busy state and closes its dialog on every path.
 */

export type WriteOutcome =
  | { ok: true }
  | { ok: false; reason: "error" | "missing" | "timeout" | "crashed"; message: string };

/** Default ceiling for a single stack write before we give the UI back. */
export const STACK_WRITE_TIMEOUT_MS = 12_000;

type RowsResult = {
  data?: { id: string }[] | null;
  error?: { message?: string | null } | null;
};

/** Reject-proof await with a hard time limit. */
async function settleWithin<T>(
  work: PromiseLike<T>,
  timeoutMs: number,
): Promise<{ value: T } | { timedOut: true } | { thrown: unknown }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<{ timedOut: true }>((resolve) => {
      timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    });
    const settled = await Promise.race([
      Promise.resolve(work).then((value) => ({ value }) as const),
      timeout,
    ]);
    return settled;
  } catch (err) {
    return { thrown: err };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function describe(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return "Something went wrong. Please try again.";
}

const TIMEOUT_MESSAGE = "Couldn't reach the server — check your connection and try again.";

/**
 * Run a delete that returns the removed rows. A zero-row result means the row
 * was already gone or belongs to another account — not a silent success.
 */
export async function runStackDelete(
  request: () => PromiseLike<RowsResult>,
  timeoutMs: number = STACK_WRITE_TIMEOUT_MS,
): Promise<WriteOutcome> {
  let started: PromiseLike<RowsResult>;
  try {
    started = request();
  } catch (err) {
    return { ok: false, reason: "crashed", message: describe(err) };
  }

  const settled = await settleWithin(started, timeoutMs);
  if ("timedOut" in settled) return { ok: false, reason: "timeout", message: TIMEOUT_MESSAGE };
  if ("thrown" in settled)
    return { ok: false, reason: "crashed", message: describe(settled.thrown) };

  const { data, error } = settled.value ?? {};
  if (error) {
    return { ok: false, reason: "error", message: error.message || "Please try again." };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      reason: "missing",
      message: "It may already be deleted or belong to another account. Pull to refresh.",
    };
  }
  return { ok: true };
}

/** Same guarantees for a plain update (pause/resume) that returns no rows. */
export async function runStackUpdate(
  request: () => PromiseLike<{ error?: { message?: string | null } | null }>,
  timeoutMs: number = STACK_WRITE_TIMEOUT_MS,
): Promise<WriteOutcome> {
  let started: PromiseLike<{ error?: { message?: string | null } | null }>;
  try {
    started = request();
  } catch (err) {
    return { ok: false, reason: "crashed", message: describe(err) };
  }

  const settled = await settleWithin(started, timeoutMs);
  if ("timedOut" in settled) return { ok: false, reason: "timeout", message: TIMEOUT_MESSAGE };
  if ("thrown" in settled)
    return { ok: false, reason: "crashed", message: describe(settled.thrown) };

  const error = settled.value?.error;
  if (error) return { ok: false, reason: "error", message: error.message || "Please try again." };
  return { ok: true };
}

/**
 * Radix locks scrolling and pointer events on <body> while a dialog is open
 * and removes the lock on close. If a dialog unmounts mid-transition the lock
 * can survive, leaving the whole page unclickable. Clearing it is always safe:
 * when no dialog is open there is nothing to preserve.
 */
export function releaseStuckPointerLock(doc: Document | undefined = globalThis.document): void {
  if (!doc?.body) return;
  const openDialog = doc.querySelector("[role='alertdialog'],[role='dialog'][data-state='open']");
  if (openDialog) return;
  if (doc.body.style.pointerEvents === "none") doc.body.style.pointerEvents = "";
  if (doc.body.hasAttribute("data-scroll-locked")) doc.body.removeAttribute("data-scroll-locked");
  if (doc.body.style.overflow === "hidden") doc.body.style.overflow = "";
}

/* ------------------------------------------------------------------ *
 * Identity, duplicate and orphan validation
 *
 * A stack row is only usable if it can be identified: either it points at a
 * library compound, or it carries a non-empty custom name. Rows with neither
 * ("orphans") render as an unnamed card that the edit sheet could not fill in
 * — the old, undeletable Vitamin D3 shape. These helpers are the single place
 * the UI checks that before writing, and the DB enforces the same rule with a
 * CHECK constraint.
 * ------------------------------------------------------------------ */

export type StackIdentity = {
  compound_id?: string | null;
  custom_name?: string | null;
};

export type StackRowLike = StackIdentity & { id?: string | null; active?: boolean | null };

/** Normalized dedupe key, or null when the row has no usable identity. */
export function stackItemKey(row: StackIdentity): string | null {
  if (row.compound_id) return `compound:${row.compound_id}`;
  const name = (row.custom_name ?? "").trim().toLowerCase();
  return name ? `custom:${name}` : null;
}

export type ValidationResult = { ok: true } | { ok: false; message: string };

/** Reject orphan rows before they are written. */
export function validateStackIdentity(row: StackIdentity): ValidationResult {
  if (stackItemKey(row)) return { ok: true };
  return {
    ok: false,
    message: "Pick a compound from the library or give this item a name before saving.",
  };
}

/**
 * Find an existing row that is the same item as `candidate`. `ignoreId` is the
 * row being edited, which is never its own duplicate.
 */
export function findDuplicateStackItem<T extends StackRowLike>(
  rows: readonly T[],
  candidate: StackIdentity,
  ignoreId?: string | null,
): T | null {
  const key = stackItemKey(candidate);
  if (!key) return null;
  return rows.find((r) => (r.id ?? null) !== (ignoreId ?? null) && stackItemKey(r) === key) ?? null;
}

/** Combined pre-save gate: identity must be valid and not already in the stack. */
export function validateStackItemSave<T extends StackRowLike>(
  rows: readonly T[],
  candidate: StackIdentity & { displayName?: string },
  ignoreId?: string | null,
): ValidationResult {
  const identity = validateStackIdentity(candidate);
  if (!identity.ok) return identity;
  const dup = findDuplicateStackItem(rows, candidate, ignoreId);
  if (dup) {
    const label = candidate.displayName || candidate.custom_name || "That item";
    return {
      ok: false,
      message: `${label} is already in your stack. Edit the existing entry instead of adding a second one.`,
    };
  }
  return { ok: true };
}

/**
 * Build the `user_compounds` payload for a save. Library-backed rows clear the
 * custom fields; legacy custom rows keep their name so an edit can never blank
 * out the only thing identifying them.
 */
export function buildStackPayload<
  R extends Record<string, unknown>,
  C extends string | null = string | null,
>(input: {
  userId: string;
  compoundId: string | null;
  customName?: string | null;
  customCategory?: C | null;
  rest: R;
}): R & {
  user_id: string;
  compound_id: string | null;
  custom_name: string | null;
  custom_category: C | null;
} {
  const custom = (input.customName ?? "").trim();
  return {
    user_id: input.userId,
    compound_id: input.compoundId,
    custom_name: input.compoundId ? null : custom || null,
    custom_category: (input.compoundId ? null : (input.customCategory ?? null)) as C | null,
    ...input.rest,
  };
}
