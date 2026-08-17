/**
 * Section-level citation mapping.
 *
 * The library page renders a numbered "Sources and references" list. This
 * module decides WHICH of those numbered entries backs each content section,
 * so a reader sees an inline marker (e.g. "[2]") next to a claim block instead
 * of only a site-wide source list.
 *
 * Rules:
 *  - Only real document sources are eligible (never a publisher search page).
 *  - Nothing is invented: we only ever point at sources already resolved for
 *    the page, so a marker can never link to a fabricated citation.
 *  - When no publisher on the page matches the section's evidence type we
 *    render NOTHING. We never fall back to "the first source on the page":
 *    that produced source-claim mismatches (e.g. a zinc/levothyroxine
 *    absorption claim pointing at a PubChem substance record that documents
 *    no such interaction).
 */

import type { NumberedSource } from "@/lib/authority-sources";

/** Ordered publisher preferences per section id. First match wins. */
const SECTION_PREFERENCES: Record<string, RegExp[]> = {
  overview: [/pubchem/i, /medlineplus|national library of medicine/i, /drugbank|wikipedia/i],
  mechanism: [/pubchem/i, /pubmed|national library of medicine/i, /drugbank/i],
  benefits: [
    /pubmed/i,
    /office of dietary supplements|national institutes of health/i,
    /cochrane/i,
  ],
  evidence: [/pubmed/i, /cochrane/i, /national institutes of health/i],
  "side-effects": [/dailymed|food and drug administration|fda/i, /medlineplus/i, /pubmed/i],
  warnings: [/dailymed|food and drug administration|fda/i, /medlineplus/i, /pubmed/i],
  contra: [/dailymed|food and drug administration|fda/i, /medlineplus/i],
  "do-not-mix": [/dailymed|food and drug administration|fda/i, /pubmed/i, /medlineplus/i],
  timing: [/dailymed|food and drug administration|fda/i, /pubchem/i, /pubmed/i],
  interactions: [/dailymed|food and drug administration|fda/i, /pubmed/i, /medlineplus/i],
};

const haystack = (s: NumberedSource) => `${s.publisher} ${s.label} ${s.title ?? ""} ${s.url ?? ""}`;

/**
 * Pick up to `limit` numbered sources that best back a section.
 * Returns [] when the page has no linkable document sources.
 */
export function sectionCitations(
  sectionId: string,
  documents: readonly NumberedSource[],
  limit = 2,
): NumberedSource[] {
  if (documents.length === 0) return [];
  const prefs = SECTION_PREFERENCES[sectionId] ?? [];
  const picked: NumberedSource[] = [];
  for (const re of prefs) {
    for (const doc of documents) {
      if (picked.length >= limit) break;
      if (picked.some((p) => p.n === doc.n)) continue;
      if (re.test(haystack(doc))) picked.push(doc);
    }
    if (picked.length >= limit) break;
  }
  return picked.sort((a, b) => a.n - b.n);
}
