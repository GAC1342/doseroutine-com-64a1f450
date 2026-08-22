# Peptide education cluster: capture the high-volume, low-competition keywords

## What we already have

- Compound reference pages exist for BPC-157, TB-500, Semax, and Collagen Peptides (`/library/bpc-157`, `/library/tb-500`, `/library/semax`, `/library/collagen`), plus BPC-157 Arginate, TB-500 Fragment, N-Acetyl Semax Amidate.
- Calculators exist: `/peptide-dosage-calculator`, `/peptide-reconstitution-calculator`, `/calculator`.
- A BPC-157 vs TB-500 comparison exists.
- Nothing exists for the *educational* head terms: "what are peptides", "peptide bonds", "cell-penetrating peptides", "collagen peptides supplements / for skin health", or a single "peptides calculator" landing page.
- Nothing targets the vendor-brand searches (apex peptides, glow peptides, simply peptides, lab 34) — and we should not build fake pages about other companies.

## How to use each keyword group

**Group 1 — Definition/science terms (highest volume, lowest competition).** These are the ones worth building from scratch. New pages:

1. `/peptides` — "What are peptides?" pillar page. Definition, how they differ from proteins, natural vs synthetic, main categories (healing, growth hormone secretagogues, GLP-1, cosmetic, nootropic), safety and legal status, how they're dosed and tracked. This is the hub everything else links to.
2. `/peptides/peptide-bond` — what a peptide bond is, how it forms, why it matters for stability, storage, and why most peptides are injected rather than swallowed.
3. `/peptides/cell-penetrating-peptides` — what CPPs are, mechanisms, examples (TAT, penetratin), research uses, honest "not a consumer product" framing.
4. `/peptides/collagen-peptides` — collagen peptides supplements: types I/II/III, hydrolysed vs gelatin, evidence for skin, joints, hair, dosing (typically 2.5–15 g/day), timing, what the studies actually show. Absorbs "collagen peptides supplements", "collagen peptides for skin health".

**Group 2 — Calculator intent.** Build `/peptides-calculator` as a single hub that explains reconstitution math with a worked example and routes to the two existing calculators. Captures "peptides calculator" without duplicating the tools.

**Group 3 — Compound-name variants** (bpc 157 peptides, bpc-157 peptides, tb500 peptides, peptides tb 500, peptides tb-500, peptides semax, what is a peptides). These do **not** need new pages — they are spelling/word-order variants of pages we already have. Instead: add natural-language variant phrasing into the existing compound pages' headings, FAQ questions, and meta descriptions, and add the variants to the internal-link anchor text from the new pillar page.

**Group 4 — Vendor brands** (apex peptides, ape x peptides, glow peptides, simply peptides, simple peptides, lab 34 peptides and proteins). We will not write pages impersonating or reviewing those vendors. Instead, one page: `/peptides/how-to-vet-a-peptide-supplier` — third-party testing, certificates of analysis, purity, storage, red flags, what a research-use-only label means. It legitimately intercepts that intent without making unverifiable claims about named companies.

## Quality bar every new page must meet

- One H1 containing the exact keyword; a 40–60 word answer-first paragraph directly beneath it in `.dr-speakable-answer` (the block our Article schema points answer engines at).
- H2s phrased as the questions people actually search; at least one table or numbered list with concrete numbers.
- Inline citations to PubMed / NIH / peer-reviewed sources through the existing `EvidenceReferences` component — no invented studies or statistics.
- 4–6 question FAQ with self-contained 40–60 word answers, wired to FAQPage schema.
- Medical-information disclaimer, "Last reviewed" date, and editorial-policy link.
- Head metadata: unique title under 60 chars, description under 155, canonical, og/twitter, and Article + FAQPage nodes added to the existing single `@graph` (respects the 60-node head budget).
- Interlinking: pillar links to all spokes, every compound page (BPC-157, TB-500, Semax, Collagen) links up to the pillar, spokes link to the relevant calculator and to `/best-dose-tracking-apps`.
- Each page ends with a specific, non-generic note on how DoseRoutine tracks that exact thing, plus a signup link.

## Technical notes

- New routes reuse `PageProse` / `ProseContainer` / `EvidenceReferences` and the existing head pattern from `library.guides.*`, so canonical/og/schema stay consistent.
- All new URLs get added to `sitemap.xml` with appropriate priority, and to the long-form route lists used by the a11y, perf, micromarkup, and head-budget CI gates.
- Keyword→page mapping goes into `src/lib/keyword-page-map.ts` so the variants in Group 3 are tracked rather than orphaned.
- Semrush check before build: validate volume and difficulty for the six new page targets so we build the ones with real demand first, rather than all seven blind.

## Delivery order

1. Semrush validation of the six candidate targets.
2. `/peptides` pillar.
3. `/peptides/collagen-peptides` and `/peptides-calculator` (highest commercial intent).
4. `/peptides/peptide-bond` and `/peptides/cell-penetrating-peptides`.
5. `/peptides/how-to-vet-a-peptide-supplier`.
6. Variant phrasing + interlinking pass on the existing compound pages, sitemap and CI gate updates.
