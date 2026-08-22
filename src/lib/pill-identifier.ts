/**
 * Shared pill-identification helpers: candidate normalization/ranking and
 * refill-date math. Kept dependency-free so both the server handler and unit
 * tests can import it directly.
 */

export type PillCandidate = {
  /** Product / generic name, e.g. "Lisinopril 10 mg". */
  name: string;
  /** Imprint code read off the pill, e.g. "M L10". */
  imprint: string;
  shape: string;
  color: string;
  strength: string;
  dosageForm: string;
  /** 0-100, how sure the model is about this specific candidate. */
  confidence: number;
  /** One short safety caveat for this candidate. */
  caution: string;
};

export type PillIdentification = {
  candidates: PillCandidate[];
  /** True when the model could not confidently read the pill at all. */
  unclear: boolean;
  note: string;
};

function str(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function clampConfidence(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Turn whatever JSON the model returned into a clean, ranked candidate list.
 * Entries with no name and no imprint carry no identifying information and
 * are dropped rather than shown as a guess. Highest confidence first, capped
 * at 3 so the confirm screen never overwhelms the user.
 */
export function normalizePillCandidates(raw: unknown): PillCandidate[] {
  const list = Array.isArray((raw as { candidates?: unknown })?.candidates)
    ? (raw as { candidates: unknown[] }).candidates
    : Array.isArray(raw)
      ? raw
      : [];

  const candidates: PillCandidate[] = list
    .map((item): PillCandidate | null => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const name = str(rec["name"], 120);
      const imprint = str(rec["imprint"], 40);
      if (!name && !imprint) return null;
      return {
        name,
        imprint,
        shape: str(rec["shape"], 40),
        color: str(rec["color"], 40),
        strength: str(rec["strength"], 40),
        dosageForm: str(rec["dosage_form"] ?? rec["dosageForm"], 40),
        confidence: clampConfidence(rec["confidence"]),
        caution:
          str(rec["caution"], 240) ||
          "Verify with a pharmacist before taking — visual identification can be wrong.",
      };
    })
    .filter((c): c is PillCandidate => c !== null);

  return rankPillCandidates(candidates).slice(0, 3);
}

/** Highest confidence first; ties keep their original order. */
export function rankPillCandidates(candidates: PillCandidate[]): PillCandidate[] {
  return [...candidates]
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.confidence - a.c.confidence || a.i - b.i)
    .map(({ c }) => c);
}

export function normalizePillIdentification(raw: unknown): PillIdentification {
  const candidates = normalizePillCandidates(raw);
  const rec = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    candidates,
    unclear: candidates.length === 0,
    note:
      str(rec["note"], 300) ||
      (candidates.length === 0 ? "We couldn't confidently identify this pill from the photo." : ""),
  };
}

/* ---------------- Refill date math ---------------- */

/**
 * Days a supply will last, given how many pills are in the bottle and how
 * many are taken per day. Returns null when the inputs can't produce a
 * meaningful forecast (non-positive quantity or dose rate).
 */
export function computeDaysSupply(quantity: number, dosesPerDay: number): number | null {
  if (!Number.isFinite(quantity) || !Number.isFinite(dosesPerDay)) return null;
  if (quantity <= 0 || dosesPerDay <= 0) return null;
  return quantity / dosesPerDay;
}

/**
 * Projected run-out date. `from` defaults to now so callers can pass a fixed
 * date in tests. Returns null when a days-supply can't be computed.
 */
export function computeRefillDate(
  quantity: number,
  dosesPerDay: number,
  from: Date = new Date(),
): Date | null {
  const days = computeDaysSupply(quantity, dosesPerDay);
  if (days == null) return null;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
