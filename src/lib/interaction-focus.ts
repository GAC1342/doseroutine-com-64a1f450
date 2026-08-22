/**
 * Hand-off from a scan to the interactions checker.
 *
 * Safety keeps its filters in per-tab view state rather than the URL, so
 * "preselecting" a compound means priming that stored state before we
 * navigate: search on the ingredient, and clear any severity/tag filters that
 * would otherwise hide the very pair the user came to look at.
 */

import { getTabViewState, setTabViewState } from "@/lib/tab-view-state";

export const SAFETY_TAB_PATH = "/safety";

type SafetyView = {
  severity: string | null;
  notesExpanded: boolean;
  expandedNotes: string[];
  query: string;
  tags: string[];
  tagMode: "any" | "all";
};

const DEFAULT_VIEW: SafetyView = {
  severity: null,
  notesExpanded: false,
  expandedNotes: [],
  query: "",
  tags: [],
  tagMode: "any",
};

/**
 * Strip strength, form and dose noise so "Metformin hydrochloride 500 mg ER"
 * searches as "metformin hydrochloride" — the part the rules actually match.
 */
export function normalizeIngredientQuery(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|units?|%)\b/g, " ")
    .replace(
      /\b(tablet|tablets|capsule|capsules|extended|release|er|xr|sr|oral|solution|injection|film|coated|hcl)\b/g,
      " ",
    )
    .replace(/[^a-z0-9+\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Prime the Safety tab so it opens focused on this ingredient. */
export function focusSafetyOnIngredient(rawName: string | null | undefined): string {
  const query = normalizeIngredientQuery(rawName);
  const current = getTabViewState<SafetyView>(SAFETY_TAB_PATH, DEFAULT_VIEW);
  setTabViewState<SafetyView>(SAFETY_TAB_PATH, {
    ...current,
    query,
    severity: null,
    tags: [],
    tagMode: "any",
  });
  return query;
}
