/**
 * Topical relevance filter for "Key studies".
 *
 * `compound_references` rows were resolved from PubMed searches, and a search
 * can return records that are not about the compound at all (e.g. a genistein
 * bioequivalence trial surfacing under a zinc query). Displaying those makes
 * the page look sourced when it isn't, so non-matching records are dropped
 * rather than shown.
 *
 * A record is relevant when the study title mentions the compound name, one of
 * its stored aliases, or the distinctive head word of the name (e.g. "zinc"
 * for "Zinc Bisglycinate"). Nothing is rewritten or invented — records either
 * match or are removed.
 */

import type { StudyReference } from "@/lib/authority-sources";

/** Words that carry no compound-identifying signal on their own. */
const GENERIC_TOKENS = new Set([
  "acid",
  "alpha",
  "beta",
  "acetate",
  "bisglycinate",
  "glycinate",
  "citrate",
  "oxide",
  "picolinate",
  "sulfate",
  "sulphate",
  "chloride",
  "sodium",
  "potassium",
  "hcl",
  "hydrochloride",
  "extract",
  "complex",
  "oil",
  "powder",
  "blend",
  "vitamin",
  "mineral",
  "capsule",
  "tablet",
  "with",
  "and",
  "the",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+\- ]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Distinctive lowercase terms that identify this compound in a study title. */
export function compoundMatchTerms(name: string, aliases?: readonly string[] | null): string[] {
  const terms = new Set<string>();
  const add = (value: string | null | undefined) => {
    const v = (value ?? "").trim().toLowerCase();
    if (v.length >= 3) terms.add(v);
  };

  add(name);
  for (const a of aliases ?? []) add(a);

  // Head word of the name ("zinc" from "Zinc Bisglycinate", "creatine" from
  // "Creatine Monohydrate") so formulation-specific rows still match the
  // literature about the substance itself.
  for (const source of [name, ...(aliases ?? [])]) {
    for (const token of tokenize(source)) {
      if (token.length >= 4 && !GENERIC_TOKENS.has(token)) terms.add(token);
    }
  }

  return [...terms];
}

/** True when the study title plausibly concerns this compound. */
export function isStudyRelevant(
  study: Pick<StudyReference, "title">,
  name: string,
  aliases?: readonly string[] | null,
): boolean {
  const title = (study.title ?? "").toLowerCase();
  if (!title) return false;
  return compoundMatchTerms(name, aliases).some((term) => title.includes(term));
}

/** Drop study records that are not topically about the compound. */
export function filterRelevantStudies<T extends Pick<StudyReference, "title">>(
  studies: readonly T[],
  name: string,
  aliases?: readonly string[] | null,
): T[] {
  return studies.filter((s) => isStudyRelevant(s, name, aliases));
}
