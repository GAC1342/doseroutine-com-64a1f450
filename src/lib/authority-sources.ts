/**
 * Authority source resolution.
 *
 * Library compound pages store `compound_content.sources_md` as plain-text
 * organisation names ("NIH Office of Dietary Supplements (ODS)", "MedlinePlus",
 * "PubChem", "FDA label information …"). Text-only sourcing is worth very
 * little for E-E-A-T or answer engines — nothing is clickable and nothing is
 * verifiable.
 *
 * This module deterministically turns those names into real, verifiable URLs on
 * the publisher's own site, scoped to the compound where the publisher exposes
 * a stable search endpoint. Nothing here is invented: every URL either
 *   - resolves an ID we already verified (PubChem CID, Wikipedia article), or
 *   - is the publisher's own search/browse endpoint for the compound name.
 *
 * We never fabricate a PMID, DOI or article URL.
 */

import { COMPOUND_ENTITY_IDS } from "@/lib/compound-entity-ids";
import { parseSourceRef, type ParsedSource } from "@/lib/source-refs";

export interface AuthoritySource {
  /** Human label shown to readers, e.g. "NIH Office of Dietary Supplements". */
  label: string;
  /** Publisher name used in citation JSON-LD. */
  publisher: string;
  /** Document title when the underlying record has one (e.g. a PubMed article). */
  title?: string | null;
  /** Absolute URL, or null when the reference cannot be resolved. */
  url: string | null;
  /** True when the URL points at a publisher search result rather than a fixed document. */
  isSearch: boolean;
}

const q = (s: string) => encodeURIComponent(s.trim());

type Resolver = (
  name: string,
  slug?: string,
) => Omit<AuthoritySource, "isSearch"> & {
  isSearch?: boolean;
};

/**
 * Ordered match table. The first entry whose `test` matches the stored source
 * text wins, so put more specific publishers above generic ones.
 */
const PUBLISHERS: Array<{ test: RegExp; resolve: Resolver }> = [
  {
    test: /office of dietary supplements|\bods\b|dietary supplement fact sheet/i,
    resolve: (name) => ({
      label: "NIH Office of Dietary Supplements",
      publisher: "National Institutes of Health",
      url: `https://ods.od.nih.gov/Search/Results.aspx?query=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /medlineplus/i,
    resolve: (name) => ({
      label: "MedlinePlus",
      publisher: "U.S. National Library of Medicine",
      url: `https://medlineplus.gov/search/?query=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /pubchem/i,
    resolve: (name, slug) => {
      const cid = slug ? COMPOUND_ENTITY_IDS[slug]?.cid : undefined;
      return {
        label: cid ? `PubChem CID ${cid}` : "PubChem",
        publisher: "National Center for Biotechnology Information",
        url: cid
          ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`
          : `https://pubchem.ncbi.nlm.nih.gov/#query=${q(name)}`,
        isSearch: !cid,
      };
    },
  },
  {
    test: /cochrane/i,
    resolve: (name) => ({
      label: "Cochrane Library",
      publisher: "Cochrane",
      url: `https://www.cochranelibrary.com/search?searchBy=1&searchText=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /drugbank/i,
    resolve: (name) => ({
      label: "DrugBank",
      publisher: "DrugBank Online",
      url: `https://go.drugbank.com/unearth/q?searcher=drugs&query=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /dailymed/i,
    resolve: (name) => ({
      label: "DailyMed prescribing information",
      publisher: "U.S. National Library of Medicine",
      url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /\bfda\b|food and drug administration|prescribing information|package insert|manufacturer label/i,
    resolve: (name) => ({
      label: "FDA-approved labeling (DailyMed)",
      publisher: "U.S. Food and Drug Administration",
      url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /european medicines agency|\bema\b|smpc/i,
    resolve: (name) => ({
      label: "European Medicines Agency",
      publisher: "European Medicines Agency",
      url: `https://www.ema.europa.eu/en/search?search_api_fulltext=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /livertox/i,
    resolve: (name) => ({
      label: "LiverTox",
      publisher: "National Institute of Diabetes and Digestive and Kidney Diseases",
      url: `https://www.ncbi.nlm.nih.gov/books/NBK547852/?term=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /pubmed|national library of medicine|meta-?analys|systematic review|randomi[sz]ed|clinical trial literature|peer-?reviewed|journal/i,
    resolve: (name) => ({
      label: "PubMed literature search",
      publisher: "National Library of Medicine",
      url: `https://pubmed.ncbi.nlm.nih.gov/?term=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /clinicaltrials\.gov|clinical trials registry/i,
    resolve: (name) => ({
      label: "ClinicalTrials.gov",
      publisher: "U.S. National Library of Medicine",
      url: `https://clinicaltrials.gov/search?term=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /mayo clinic/i,
    resolve: (name) => ({
      label: "Mayo Clinic",
      publisher: "Mayo Clinic",
      url: `https://www.mayoclinic.org/search/search-results?q=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /cleveland clinic/i,
    resolve: (name) => ({
      label: "Cleveland Clinic",
      publisher: "Cleveland Clinic",
      url: `https://my.clevelandclinic.org/search?q=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /\bnhs\b/i,
    resolve: (name) => ({
      label: "NHS",
      publisher: "National Health Service (UK)",
      url: `https://www.nhs.uk/search/results?q=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /world health organi[sz]ation|\bwho\b/i,
    resolve: (name) => ({
      label: "World Health Organization",
      publisher: "World Health Organization",
      url: `https://www.who.int/home/search-results?indexCatalogue=genericsearchindex1&searchQuery=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /centers for disease control|\bcdc\b/i,
    resolve: (name) => ({
      label: "CDC",
      publisher: "Centers for Disease Control and Prevention",
      url: `https://search.cdc.gov/search/?query=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /examine\.com|examine/i,
    resolve: (name) => ({
      label: "Examine.com",
      publisher: "Examine.com",
      url: `https://examine.com/search/?q=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /\bwada\b|world anti-?doping|\busada\b/i,
    resolve: () => ({
      label: "WADA Prohibited List",
      publisher: "World Anti-Doping Agency",
      url: "https://www.wada-ama.org/en/prohibited-list",
      isSearch: false,
    }),
  },
  {
    test: /linus pauling|micronutrient information center/i,
    resolve: (name) => ({
      label: "Linus Pauling Institute",
      publisher: "Oregon State University",
      url: `https://lpi.oregonstate.edu/search/node?keys=${q(name)}`,
      isSearch: true,
    }),
  },
  {
    test: /endocrine society|american (heart|diabetes|college|academy)|clinical practice guideline/i,
    resolve: (name) => ({
      label: "Clinical practice guidelines (PubMed)",
      publisher: "National Library of Medicine",
      url: `https://pubmed.ncbi.nlm.nih.gov/?term=${q(`${name} guideline`)}`,
      isSearch: true,
    }),
  },
];

/**
 * Parse a stored `sources_md` value. Rows are stored either as a JSON array of
 * strings or as markdown bullets / newline-separated lines.
 */
export function parseSourcesList(raw: string | null | undefined): string[] {
  const text = (raw ?? "").trim();
  if (!text) return [];

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      /* fall through to line parsing */
    }
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0 && !/^#{1,6}\s/.test(line));
}

/**
 * Resolve one stored source entry into a linkable authority source.
 * `compoundName` / `slug` scope publisher search endpoints to this compound.
 */
export function resolveAuthoritySource(
  entry: string,
  compoundName: string,
  slug?: string,
): AuthoritySource | null {
  const text = (entry ?? "").trim();
  if (!text) return null;

  // Already a URL / PMID / DOI — use it verbatim.
  const direct: ParsedSource | null = parseSourceRef(text);
  if (direct?.url) {
    return {
      label: direct.label,
      publisher: direct.label,
      url: direct.url,
      isSearch: false,
    };
  }

  for (const p of PUBLISHERS) {
    if (p.test.test(text)) {
      const r = p.resolve(compoundName, slug);
      return { ...r, isSearch: r.isSearch ?? true };
    }
  }

  // Unknown publisher — keep the original wording, unlinked.
  return { label: text, publisher: text, url: null, isSearch: false };
}

/** Resolve a whole stored `sources_md` value, de-duplicated by URL/label. */
export function resolveCompoundSources(
  sourcesMd: string | null | undefined,
  compoundName: string,
  slug?: string,
): AuthoritySource[] {
  const out: AuthoritySource[] = [];
  const seen = new Set<string>();
  for (const entry of parseSourcesList(sourcesMd)) {
    const resolved = resolveAuthoritySource(entry, compoundName, slug);
    if (!resolved) continue;
    const key = (resolved.url ?? resolved.label).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(resolved);
  }
  return out;
}

/**
 * Baseline primary references every compound page should offer, even when the
 * stored source list is thin: the substance record, the label archive and the
 * literature search for that exact substance.
 */
export function baselineCompoundSources(compoundName: string, slug?: string): AuthoritySource[] {
  const ids = slug ? COMPOUND_ENTITY_IDS[slug] : undefined;
  const list: AuthoritySource[] = [
    {
      label: ids?.cid ? `PubChem CID ${ids.cid}` : "PubChem",
      publisher: "National Center for Biotechnology Information",
      url: ids?.cid
        ? `https://pubchem.ncbi.nlm.nih.gov/compound/${ids.cid}`
        : `https://pubchem.ncbi.nlm.nih.gov/#query=${q(compoundName)}`,
      isSearch: !ids?.cid,
    },
    {
      label: "PubMed literature search",
      publisher: "National Library of Medicine",
      url: `https://pubmed.ncbi.nlm.nih.gov/?term=${q(compoundName)}`,
      isSearch: true,
    },
    {
      label: "DailyMed labeling archive",
      publisher: "U.S. National Library of Medicine",
      url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${q(compoundName)}`,
      isSearch: true,
    },
  ];
  if (ids?.wikipedia) {
    list.push({
      label: "Wikipedia entry",
      publisher: "Wikipedia",
      url: ids.wikipedia,
      isSearch: false,
    });
  }
  return list;
}

/**
 * Verification references for an interaction rule. Interaction rules are
 * mechanism-derived, so instead of inventing citations we link the exact
 * primary-literature and labeling searches a reader (or an answer engine) can
 * run to check the claim for that specific pair.
 */
export function interactionVerificationSources(aName: string, bName: string): AuthoritySource[] {
  const pair = `${aName} ${bName}`;
  return [
    {
      label: `PubMed: ${aName} + ${bName}`,
      publisher: "National Library of Medicine",
      url: `https://pubmed.ncbi.nlm.nih.gov/?term=${q(`${aName} AND ${bName}`)}`,
      isSearch: true,
    },
    {
      label: `DailyMed label: ${aName}`,
      publisher: "U.S. National Library of Medicine",
      url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${q(aName)}`,
      isSearch: true,
    },
    {
      label: `DailyMed label: ${bName}`,
      publisher: "U.S. National Library of Medicine",
      url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${q(bName)}`,
      isSearch: true,
    },
    {
      label: "Cochrane Library",
      publisher: "Cochrane",
      url: `https://www.cochranelibrary.com/search?searchBy=1&searchText=${q(pair)}`,
      isSearch: true,
    },
  ];
}

/** Stored interaction refs resolved to links, with pair-scoped fallbacks appended. */
export function resolveInteractionSources(
  refs: readonly string[] | null | undefined,
  aName: string,
  bName: string,
): AuthoritySource[] {
  const out: AuthoritySource[] = [];
  const seen = new Set<string>();
  const push = (s: AuthoritySource | null) => {
    if (!s) return;
    const key = (s.url ?? s.label).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  for (const raw of refs ?? []) {
    push(resolveAuthoritySource(raw, `${aName} ${bName}`));
  }
  for (const s of interactionVerificationSources(aName, bName)) push(s);
  return out;
}

/**
 * schema.org `citation` nodes for a resolved source list.
 *
 * ONLY document-level sources are emitted. A publisher search endpoint is a
 * place to verify a claim, not a citation of it, so search links never appear
 * in `citation[]` and never receive a reference number. The emitted `position`
 * equals the visible number in the "Sources cited on this page" list and the
 * `@id` points at that entry's DOM anchor (`#source-3`), so an inline marker
 * "[3]", the third list entry and the third citation node always describe the
 * same document.
 */
export function citationJsonLd(
  sources: readonly AuthoritySource[],
  opts: { pageUrl?: string } = {},
) {
  return documentCitations(sources).map((s) => ({
    "@type": "WebPage",
    ...(opts.pageUrl ? { "@id": `${opts.pageUrl}#source-${s.n}` } : {}),
    position: s.n,
    name: s.title ?? s.label,
    url: s.url as string,
    publisher: { "@type": "Organization", name: s.publisher },
  }));
}

/**
 * A source is "document-level" when its URL points at one specific record
 * (a PubMed article, a DailyMed label, a stored URL or DOI) rather than at a
 * publisher's search results. Only document-level sources may be used as
 * inline per-claim citation markers — a search endpoint is not a citation.
 */
export function isDocumentSource(s: AuthoritySource): boolean {
  return Boolean(s.url) && !s.isSearch;
}

/** True when the entry is a publisher search endpoint (a "Verify at" link). */
export function isVerificationLink(s: AuthoritySource): boolean {
  return Boolean(s.url) && s.isSearch;
}

export type NumberedSource = AuthoritySource & { n: number };

/**
 * Number a rendered source list 1..n in display order. The same numbering is
 * shared by the inline markers and the Sources section, so the superscript a
 * reader taps always matches the entry below.
 */
export function numberSources(sources: readonly AuthoritySource[]): NumberedSource[] {
  return sources.map((s, i) => ({ ...s, n: i + 1 }));
}

/**
 * Numbered, document-level subset — the only sources eligible for markers and
 * for the numbered "Sources cited on this page" list. Numbering runs over the
 * document subset itself so the visible list is gapless (1..n) and a marker
 * number always equals a list position.
 */
export function documentCitations(sources: readonly AuthoritySource[]): NumberedSource[] {
  return numberSources(sources.filter(isDocumentSource));
}

/** Unnumbered publisher search links, rendered under "Verify at". */
export function verificationLinks(sources: readonly AuthoritySource[]): AuthoritySource[] {
  return sources.filter(isVerificationLink);
}

export interface StudyReference {
  pmid: string;
  title: string;
  journal?: string | null;
  year?: string | null;
}

/** Canonical PubMed record URL for a PMID. */
export const pubmedUrl = (pmid: string) => `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

/**
 * ScholarlyArticle citation nodes for real PubMed records. Only fields we
 * actually resolved from PubMed are emitted — nothing is invented.
 */
export function studyCitationJsonLd(studies: readonly StudyReference[]) {
  return studies.map((s) => ({
    "@type": "ScholarlyArticle",
    name: s.title,
    url: pubmedUrl(s.pmid),
    identifier: [{ "@type": "PropertyValue", propertyID: "PMID", value: s.pmid }],
    ...(s.journal ? { isPartOf: { "@type": "Periodical", name: s.journal } } : {}),
    ...(s.year ? { datePublished: s.year } : {}),
  }));
}

/**
 * A real PubMed record expressed as an authority source, so studies and
 * stored sources can share one numbering scheme and one renderer.
 */
export function studyAsSource(s: StudyReference): AuthoritySource {
  return {
    label: s.title,
    title: s.title,
    publisher: s.journal ?? "PubMed",
    url: pubmedUrl(s.pmid),
    isSearch: false,
  };
}
