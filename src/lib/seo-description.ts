export const DOSEROUTINE_DESCRIPTION_SUFFIX =
  "Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

const OLD_SHORT_SUFFIX_RE = /\s*Check with DoseRoutine\.\s*$/i;
const TARGET_SUFFIX_RE = new RegExp(
  `\\s*${DOSEROUTINE_DESCRIPTION_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
  "i",
);

function normalizeDescription(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function trimLead(text: string, maxLength: number): string {
  const clean = normalizeDescription(text).replace(/[\s,;:.-]+$/, "");
  if (clean.length <= maxLength) return clean;
  if (maxLength <= 1) return "";
  return `${clean.slice(0, maxLength - 1).replace(/[\s,;:.-]+$/, "")}…`;
}

/**
 * Minimum length a page-specific description must reach on its own before we
 * stop padding it. Below this the shared brand sentence is appended to keep the
 * description long enough for audits; above it the unique copy is kept intact.
 *
 * Padding every description truncated the unique lead and made ~80 identical
 * characters the tail of every page — a duplicate-content signal. Keep unique
 * copy whole whenever it already stands on its own.
 */
const MIN_UNIQUE_DESCRIPTION_LENGTH = 110;

export function withDoseRoutineDescriptionSuffix(text: string, maxLength = 160): string {
  const normalized = normalizeDescription(text);
  const withoutOldSuffix = normalized
    .replace(TARGET_SUFFIX_RE, "")
    .replace(OLD_SHORT_SUFFIX_RE, "")
    .replace(/[\s.]*…\s*$/, "")
    .trim();

  // Long enough to be descriptive on its own: keep it unique, no boilerplate.
  if (withoutOldSuffix.length >= MIN_UNIQUE_DESCRIPTION_LENGTH) {
    // Keep the copy exactly as written when it fits — trimLead would strip the
    // closing period, and descriptions must end in sentence punctuation.
    if (withoutOldSuffix.length < maxLength) {
      return /[.!?…]$/.test(withoutOldSuffix) ? withoutOldSuffix : `${withoutOldSuffix}.`;
    }
    return trimLead(withoutOldSuffix, maxLength);
  }

  const separator = /[.!?]$/.test(withoutOldSuffix) ? " " : ". ";
  const leadMax = Math.max(0, maxLength - DOSEROUTINE_DESCRIPTION_SUFFIX.length - separator.length);
  const lead = trimLead(withoutOldSuffix, leadMax);
  return lead
    ? `${lead}${separator}${DOSEROUTINE_DESCRIPTION_SUFFIX}`
    : DOSEROUTINE_DESCRIPTION_SUFFIX;
}
