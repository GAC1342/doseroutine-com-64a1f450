# Interaction source-claim audit

Generated for manual review. **No source was auto-reassigned.** Every row below
is a claim whose stored citation does not document the claim, or a duplicate
that renders the same claim more than once.

Method: every row in `interaction_rules` was checked for (a) whether
`source_refs` contains a document-level reference (a URL, PMID or DOI), and
(b) whether the rendered page numbered a non-document link as a citation.

## Summary

| Metric                                                               | Count |
| -------------------------------------------------------------------- | ----- |
| Compound-to-compound rules                                           | 304   |
| Distinct canonical pairs                                             | 271   |
| Category-level rules                                                 | 4     |
| Rules with **no** `source_refs` at all                               | 269   |
| Rules whose `source_refs` contain **zero** document-level references | 304   |

**Not one interaction rule currently carries a document-level citation.** Every
stored ref is either a placeholder ("illustrative — confirm via licensed
source"), a reasoning note ("mechanistic: GH/IGF-1 axis"), or a publisher name
without a document ("FDA label: Wellbutrin").

## 1. Confirmed mismatch — Zinc Bisglycinate + Levothyroxine

- Rule ids `21f5b37c-4a43-4a85-abd7-bd491c70ac86` and (alias duplicate)
  `376e270c-2ae9-4e52-b76f-00a2c095374b`.
- `source_refs` is **empty**. The "PubChem CID 151910" reference the page showed
  came from the compound-level baseline source list being numbered as a page
  citation. PubChem CID 151910 is a substance record; it does not document a
  levothyroxine absorption interaction.
- Status (re-verified 2026-08-12): the rendered page no longer attaches any
  citation to this claim. Two defects were still live at the first audit and are
  now fixed: (a) `sectionCitations` fell back to "the first document source on
  the page" when no publisher matched a section, which is what pointed the
  interaction claim at PubChem CID 151910 — the fallback is removed, so a
  section with no matching publisher renders no marker at all; (b) the alias row
  rendered the pair four times (Levothyroxine x2, Levothyroxine Sodium x2) —
  rules are now folded onto one canonical pair for display.
- The rule still needs a real document reference (candidate: the levothyroxine
  FDA label drug-interaction section on DailyMed) added manually. Nothing was
  auto-assigned.

## 2. Placeholder refs presented as sources — remove or replace

These state in the data itself that they are not real citations.

| Pair                                        | Severity  | Stored ref                                 |
| ------------------------------------------- | --------- | ------------------------------------------ |
| Alpha-Lipoic Acid + Metformin               | note      | illustrative — confirm via licensed source |
| Berberine + Metformin                       | caution   | illustrative — confirm via licensed source |
| Calcium + Levothyroxine                     | caution   | illustrative — confirm via licensed source |
| CoQ10 (Ubiquinol) + Warfarin                | caution   | illustrative — confirm via licensed source |
| Curcumin + Warfarin                         | caution   | illustrative — confirm via licensed source |
| Iron (ferrous bisglycinate) + Levothyroxine | caution   | illustrative — confirm via licensed source |
| Omega-3 (Fish Oil) + Warfarin               | caution   | illustrative — confirm via licensed source |
| Potassium + Lisinopril                      | caution   | illustrative — confirm via licensed source |
| Vitamin K2 + Warfarin                       | **avoid** | illustrative — confirm via licensed source |

`Vitamin K2 + Warfarin` is the highest-risk row: an "avoid" verdict backed only
by a placeholder.

## 3. Reasoning notes stored in the citation field

These are mechanisms, not sources. They should live in `mechanism`, not
`source_refs`.

| Pair                                    | Stored ref                                                     |
| --------------------------------------- | -------------------------------------------------------------- |
| CJC-1295 + Ipamorelin                   | mechanistic: GHRH + ghrelin-receptor                           |
| CJC-1295 + Sermorelin                   | mechanistic: GHRH analogs                                      |
| IGF-1 LR3 + CJC-1295                    | mechanistic: GH/IGF-1 axis                                     |
| IGF-1 LR3 + Sermorelin                  | mechanistic: GH/IGF-1 axis                                     |
| IGF-1 LR3 + Tesamorelin                 | mechanistic: GHRH analog vs exogenous IGF-1; GH/IGF-1 feedback |
| NAC (N-Acetyl Cysteine) + Glutathione   | mechanistic                                                    |
| NMN + Nicotinamide Riboside (NR)        | mechanistic: NAD+ precursors                                   |
| Caffeine + L-Theanine                   | general reference                                              |
| CoQ10 (Ubiquinol) + PQQ                 | general reference                                              |
| Calcium + Iron (ferrous bisglycinate)   | general nutrition reference                                    |
| Calcium + Magnesium Glycinate           | general nutrition reference                                    |
| Calcium + Zinc                          | general nutrition reference                                    |
| Vitamin C + Iron (ferrous bisglycinate) | general nutrition reference                                    |
| Vitamin D3 + Magnesium Glycinate        | general nutrition reference                                    |
| Vitamin D3 + Vitamin K2                 | general nutrition reference                                    |
| Zinc + Copper                           | general nutrition reference                                    |
| (2 category-level rules)                | general safety default                                         |
| (2 category-level rules)                | category fallback; specifics from licensed source              |

## 4. Publisher named, document missing

The publisher is plausible but no specific label section, SPL id or PMID is
stored, so the claim cannot be traced to a document. Each needs the exact label
section or record identifier added.

| Pair                        | Stored ref                      |
| --------------------------- | ------------------------------- |
| Amantadine + Amlodipine     | FDA label: Amantadine (Gocovri) |
| Amantadine + Lisinopril     | FDA label: Amantadine (Gocovri) |
| Amantadine + Metoprolol     | FDA label: Amantadine (Gocovri) |
| Amantadine + Bupropion      | FDA label: Wellbutrin           |
| Amantadine + Caffeine       | LiverTox / FDA label            |
| Amantadine + Sertraline     | FDA MedWatch case reports       |
| Amantadine + St John's Wort | NIH NCCIH                       |
| Sildenafil + Amantadine     | FDA label: PDE5 inhibitors      |
| Tadalafil + Amantadine      | FDA label: PDE5 inhibitors      |
| Vardenafil + Amantadine     | FDA label: PDE5 inhibitors      |

Note on rows 4: "FDA label: Wellbutrin" is cited for an **Amantadine +
Bupropion** interaction, and "FDA label: PDE5 inhibitors" is cited for
amantadine pairs — in both cases the named label is for only one of the two
compounds, so it may not document the combination at all. Verify before reuse.

## 5. Duplicate rules

- **Alias duplication:** `levothyroxine-sodium` is an alias row of
  `levothyroxine`. Every levothyroxine chelation rule exists twice, once per
  slug. Fixed at render time by folding the alias onto the canonical compound
  (`src/lib/interaction-canonical.ts`); no rows were deleted, so existing user
  logs against the alias compound still work.
- **Exact duplicates:** 304 pair rules collapse to 271 distinct canonical pairs.
  The extras are repeated inserts of the same "divalent cations chelate
  levothyroxine" rule. Pages, sitemap entries and checker rows now render one
  entry per pair.
- Recommended follow-up (manual, destructive): delete the duplicate
  `interaction_rules` rows and merge the `levothyroxine-sodium` compound row
  after confirming no user stack references it.
