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

export function withDoseRoutineDescriptionSuffix(text: string, maxLength = 160): string {
  const normalized = normalizeDescription(text);
  const withoutOldSuffix = normalized
    .replace(TARGET_SUFFIX_RE, "")
    .replace(OLD_SHORT_SUFFIX_RE, "")
    .replace(/[\s.]*…\s*$/, "")
    .trim();
  const separator = /[.!?]$/.test(withoutOldSuffix) ? " " : ". ";
  const leadMax = Math.max(0, maxLength - DOSEROUTINE_DESCRIPTION_SUFFIX.length - separator.length);
  const lead = trimLead(withoutOldSuffix, leadMax);
  return lead
    ? `${lead}${separator}${DOSEROUTINE_DESCRIPTION_SUFFIX}`
    : DOSEROUTINE_DESCRIPTION_SUFFIX;
}
