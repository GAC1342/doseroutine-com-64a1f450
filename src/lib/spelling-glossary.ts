/**
 * Brand, compound and domain-jargon vocabulary that generic dictionary-based
 * site audits ("Has Misspelling") flag as errors. These are proper nouns and
 * INN drug names, not typos.
 *
 * Two consumers:
 *  - `<Term>` / `<GlossaryText>` (src/components/term.tsx) mark the words up as
 *    `translate="no" spellcheck="false"` so browser + crawler spell checkers
 *    skip them.
 *  - The root route emits a schema.org DefinedTermSet built from
 *    `GLOSSARY_TERMS` so machines can resolve the vocabulary.
 */

export type GlossaryEntry = {
  term: string;
  /** Short machine-readable definition used in the DefinedTermSet node. */
  description: string;
  /** Extra spellings that should also be skipped (plurals, one/two word forms). */
  variants?: string[];
};

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    term: "DoseRoutine",
    description:
      "Brand name of the supplement, peptide and routine tracking app at doseroutine.com.",
    variants: ["Dose Routine", "doseroutine", "doseroutine.com"],
  },
  {
    term: "tirzepatide",
    description: "Dual GIP/GLP-1 receptor agonist medication.",
  },
  { term: "semaglutide", description: "GLP-1 receptor agonist medication." },
  { term: "retatrutide", description: "Investigational triple receptor agonist." },
  { term: "liraglutide", description: "GLP-1 receptor agonist medication." },
  { term: "dulaglutide", description: "GLP-1 receptor agonist medication." },
  { term: "ipamorelin", description: "Growth hormone secretagogue peptide." },
  { term: "sermorelin", description: "Growth hormone releasing hormone analogue peptide." },
  { term: "tesamorelin", description: "Growth hormone releasing hormone analogue peptide." },
  { term: "hexarelin", description: "Growth hormone secretagogue peptide." },
  { term: "ibutamoren", description: "Oral growth hormone secretagogue (MK-677)." },
  {
    term: "melanotan",
    description: "Melanocortin receptor agonist peptide.",
    variants: ["Melanotan II", "Melanotan 2"],
  },
  { term: "enclomiphene", description: "Selective estrogen receptor modulator." },
  { term: "clomiphene", description: "Selective estrogen receptor modulator." },
  { term: "anastrozole", description: "Aromatase inhibitor medication." },
  { term: "levothyroxine", description: "Synthetic thyroid hormone medication." },
  { term: "ashwagandha", description: "Adaptogenic herb (Withania somnifera)." },
  { term: "berberine", description: "Plant alkaloid used for glucose metabolism support." },
  {
    term: "tongkat",
    description: "Tongkat Ali (Eurycoma longifolia) herbal extract.",
    variants: ["Tongkat Ali"],
  },
  {
    term: "fadogia",
    description: "Fadogia agrestis herbal extract.",
    variants: ["Fadogia agrestis"],
  },
  { term: "apigenin", description: "Flavonoid found in chamomile and parsley." },
  { term: "aniracetam", description: "Racetam-class nootropic compound." },
  { term: "cerebrolysin", description: "Neuropeptide preparation." },
  { term: "glutathione", description: "Endogenous antioxidant tripeptide." },
  { term: "creatine", description: "Nitrogenous organic acid used for strength support." },
  {
    term: "nootropic",
    description: "Compound taken for cognitive support.",
    variants: ["nootropics"],
  },
  { term: "peptide", description: "Short chain of amino acids.", variants: ["peptides"] },
  {
    term: "biohacking",
    description: "Self-directed optimization of health metrics.",
    variants: ["biohacker", "biohackers"],
  },
  {
    term: "nutraceutical",
    description: "Food-derived product with health claims.",
    variants: ["nutraceuticals"],
  },
  { term: "microdosing", description: "Taking sub-standard doses on a schedule." },
  {
    term: "TRT",
    description: "Testosterone replacement therapy.",
    variants: ["TRT protocol"],
  },
  {
    term: "GLP-1",
    description: "Glucagon-like peptide-1, the hormone class GLP-1 receptor agonists act on.",
    variants: ["GLP", "GLP-1 receptor agonist"],
  },
  {
    term: "DailyMed",
    description: "US National Library of Medicine database of FDA drug labeling.",
  },
  {
    term: "PubChem",
    description: "NIH open chemistry database of compound records.",
  },
  {
    term: "EMA",
    description: "European Medicines Agency, the EU medicines regulator.",
  },
  {
    term: "barcode",
    description: "Printed product identifier (UPC/EAN/GTIN) scanned to look up a product.",
    variants: ["barcodes"],
  },
  { term: "MedlinePlus", description: "NIH consumer health information service." },
  {
    term: "International Unit",
    description: "Dosing unit (IU) used for vitamins, hormones and peptides.",
    variants: ["IU"],
  },
  {
    term: "glycinate",
    description: "Amino-acid chelate form of a mineral, e.g. magnesium glycinate.",
  },
  { term: "DHA", description: "Docosahexaenoic acid, an omega-3 fatty acid." },
  { term: "kcal", description: "Kilocalorie, the food energy unit shown on nutrition labels." },
  { term: "carb", description: "Carbohydrate.", variants: ["carbs"] },
  { term: "HRT", description: "Hormone replacement therapy." },
  { term: "NAD", description: "Nicotinamide adenine dinucleotide.", variants: ["NAD+"] },
  { term: "BPC", description: "Body protection compound, as in the peptide BPC-157." },
  { term: "rapamycin", description: "mTOR inhibitor medication, also called sirolimus." },
  { term: "BAC", description: "Bacteriostatic water, used to reconstitute peptide vials." },
  { term: "RPE", description: "Rate of perceived exertion, a training intensity scale." },
  { term: "sign-up", description: "Account creation step.", variants: ["sign-up"] },
  { term: "ics", description: "iCalendar (.ics) file format for calendar events." },
  { term: "rule set", description: "A named set of configurable rules.", variants: ["rulesets"] },
  { term: "mockup", description: "Simulated screen image.", variants: ["mock-ups"] },
  { term: "labeling", description: "Regulatory product labeling (British spelling)." },
  { term: "PMID", description: "PubMed identifier for a study.", variants: ["PMIDs"] },
  { term: "DOI", description: "Digital Object Identifier for a publication.", variants: ["DOIs"] },
  { term: "GDPR", description: "EU General Data Protection Regulation." },
  {
    term: "llms.txt",
    description: "Machine-readable AI crawler policy file served at /llms.txt.",
    variants: ["llms", "txt"],
  },
];

/** Flat list of every accepted spelling, longest first for greedy matching. */
export const GLOSSARY_TERMS: string[] = Array.from(
  new Set(
    GLOSSARY_ENTRIES.flatMap((entry) => [entry.term, ...(entry.variants ?? [])]).map((t) =>
      t.trim(),
    ),
  ),
).sort((a, b) => b.length - a.length);

const LOOKUP = new Set(GLOSSARY_TERMS.map((t) => t.toLowerCase()));

/** True when a word is known project vocabulary rather than a misspelling. */
export function isGlossaryTerm(word: string): boolean {
  const cleaned = word.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.]+$/gu, "");
  if (!cleaned) return false;
  if (LOOKUP.has(cleaned.toLowerCase())) return true;
  // Accept simple plurals of known singulars ("peptides" -> "peptide").
  return cleaned.length > 1 && LOOKUP.has(cleaned.toLowerCase().replace(/s$/, ""));
}

const ESCAPED = GLOSSARY_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

/** Case-insensitive matcher for any glossary spelling, with word boundaries. */
export function glossaryPattern(): RegExp {
  return new RegExp(`\\b(${ESCAPED.join("|")})\\b`, "gi");
}

/**
 * schema.org DefinedTermSet describing the vocabulary used across the site.
 *
 * By default only the *reference* node is emitted (no term list). Site audits
 * parse JSON-LD as page copy, so shipping 57 INN compound names in the head of
 * every page produced ~50 bogus "Has Misspelling" hits and hurt the
 * text-to-HTML ratio sitewide. The full vocabulary is published once, on the
 * library index, which is the page the term set actually describes.
 */
export function definedTermSetNode(options: { includeTerms?: boolean } = {}) {
  return {
    "@type": "DefinedTermSet",
    "@id": "https://doseroutine.com/#glossary",
    name: "DoseRoutine brand and compound glossary",
    description:
      "Proper nouns, brand names and INN compound names used across DoseRoutine. These spellings are intentional and are not misspellings.",
    url: "https://doseroutine.com/library",
    ...(options.includeTerms
      ? {
          hasDefinedTerm: GLOSSARY_ENTRIES.map((entry) => ({
            "@type": "DefinedTerm",
            name: entry.term,
            ...(entry.variants?.length ? { alternateName: entry.variants } : {}),
            description: entry.description,
            inDefinedTermSet: { "@id": "https://doseroutine.com/#glossary" },
          })),
        }
      : {}),
  };
}
