# Interaction accuracy audit — template warnings, sources, numeric claims

Generated 2026-08-12 from a full read of `interaction_rules` (308 rows).
**Report only. No medical claim, severity, mechanism or source was changed.**

Baseline counts:

| Metric                                                  | Count |
| ------------------------------------------------------- | ----- |
| Interaction rules total                                 | 308   |
| Rules with no `source_refs` at all                      | 269   |
| Rules with a document-level source (URL, PMID or DOI)   | **0** |
| Rules whose warning text is reused by 2+ other rules    | 251   |
| Rules stating a numeric effect size or fixed separation | 54    |

---

## 1. Warnings generated from a shared mechanism template

Every mechanism string below is stored verbatim on multiple rules. None of them
carries a compound-specific source; the source column is listed for each group.

### 1a. "divalent cation" / "chelate" / "reduce absorption by up to 30%"

**Warning text:** _"Divalent cations chelate levothyroxine in the gut and reduce
absorption by up to 30%."_
**Recommendation:** _"Take levothyroxine on empty stomach; separate mineral
supplements by at least 4 hours."_ (`separation_hours = 4`)
**Rules using it:** 32 (16 distinct pairs; each duplicated across the
`levothyroxine` and `levothyroxine-sodium` alias rows)
**Cited source:** none — `source_refs` is empty on all 32.

Pairs: Levothyroxine (and Levothyroxine Sodium) + Calcium, Iron (ferrous
bisglycinate), Magnesium Citrate, Magnesium Glycinate, Magnesium Oxide, Zinc,
Zinc Bisglycinate, Zinc Picolinate.

Related chelation templates:

| Warning text                                                                        | Rules | Pairs                                                            | Source                        |
| ----------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------- | ----------------------------- |
| "Calcium reduces absorption of thyroid medication when taken together." (`4h`)      | 8     | Calcium/Iron/Magnesium Glycinate + Levothyroxine or Liothyronine | none                          |
| "Minerals chelate T3 and reduce absorption."                                        | 6     | mineral + Liothyronine variants                                  | none                          |
| "Calcium competes with iron for absorption, so taking large doses together…" (`2h`) | 4     | Calcium + Iron, Calcium + Zinc                                   | "general nutrition reference" |
| "Calcium competes with iron for absorption."                                        | 2     | Calcium + Iron                                                   | "general nutrition reference" |
| "Polyphenols in coffee/tea inhibit non-heme iron absorption by up to 60%." (`2h`)   | 2     | Iron (ferrous bisglycinate) + Caffeine                           | none                          |
| "Reduced gastric acid impairs levothyroxine absorption."                            | 5     | PPI/H2 blockers + Levothyroxine                                  | none                          |

### 1b. Every other reused warning string (2+ rules)

| Warning text                                                                                            | Rules | Distinct pairs | Cited source                                          |
| ------------------------------------------------------------------------------------------------------- | ----- | -------------- | ----------------------------------------------------- |
| "Additive antiplatelet/antithrombotic effect increases bleeding risk."                                  | 48    | 48             | none                                                  |
| "Combining SSRIs/SNRIs with MAOIs can cause life-threatening serotonin syndrome."                       | 32    | 32             | none                                                  |
| "MAOI blocks catecholamine breakdown; combining with sympathomimetics can trigger hypertensive crisis." | 21    | 21             | none                                                  |
| "PDE5 inhibitors add to the blood-pressure-lowering effect of antihypertensives."                       | 18    | 18             | none                                                  |
| "Berberine inhibits CYP3A4 and P-glycoprotein, raising statin levels and myopathy risk."                | 10    | 10             | none                                                  |
| "GLP-1 plus basal insulin increases hypoglycemia risk."                                                 | 8     | 8              | none                                                  |
| "Combining a GLP-1 with rapid insulin increases hypoglycemia risk."                                     | 8     | 8              | none                                                  |
| "Additive sedation possible."                                                                           | 7     | 7              | none                                                  |
| "Vitamin K reverses vitamin K antagonist activity and shifts INR."                                      | 6     | 6              | none                                                  |
| "Vitamin K2 can shift INR on warfarin."                                                                 | 6     | 6              | "illustrative — confirm via licensed source" (1 of 6) |
| "St John's Wort has serotonergic activity and induces CYP3A4, altering SSRI levels."                    | 5     | 5              | none                                                  |
| "5-HTP raises serotonin and layered onto an SSRI/SNRI risks serotonin syndrome."                        | 5     | 5              | none                                                  |
| "Additional serotonin precursor with an SSRI/SNRI can push serotonin too high."                         | 5     | 5              | none                                                  |
| "Statins block CoQ10 biosynthesis via the mevalonate pathway…"                                          | 5     | 5              | none                                                  |
| "Statins deplete CoQ10; ubiquinol replenishes it."                                                      | 5     | 5              | none                                                  |
| "Additive cardiovascular stimulation (heart rate, blood pressure)."                                     | 3     | 3              | none                                                  |
| "PDE5 inhibitors lower blood pressure; amantadine can add orthostatic hypotension."                     | 3     | 3              | "FDA label: PDE5 inhibitors"                          |
| "Yohimbine + stimulants sharply increases sympathetic tone and can trigger arrhythmia."                 | 3     | 3              | none                                                  |
| "5-alpha-reductase inhibitors block DHT conversion…"                                                    | 3     | 3              | none                                                  |

Total: **251 of 308 rules (81%) carry a warning string shared with at least one
other compound pair.** All are now flagged in data via `mechanism_shared_with`.

---

## 2. Sources that are general compound records, not interaction documents

No row stores a PubChem CID or any other URL/identifier in `source_refs`, so
there is no record-level PubChem citation to strip. The PubChem CID 151910 that
previously appeared next to the Zinc Bisglycinate + Levothyroxine claim came from
the _page_ falling back to the compound-level source list; that fallback is
removed (`src/lib/section-citations.ts`).

What is stored instead, and why each fails to document the pair:

| Stored source                                   | Rules | Pairs                                                                                                                                                                                               | Problem                                                   |
| ----------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| "illustrative — confirm via licensed source"    | 9     | ALA+Metformin, Berberine+Metformin, Calcium+Levothyroxine, CoQ10+Warfarin, Curcumin+Warfarin, Iron+Levothyroxine, Omega-3+Warfarin, Potassium+Lisinopril, **Vitamin K2+Warfarin (severity: avoid)** | Self-declared placeholder, not a source                   |
| "general nutrition reference"                   | 7     | Calcium+Iron, Calcium+Magnesium Glycinate, Calcium+Zinc, Vitamin C+Iron, Vitamin D3+Magnesium, Vitamin D3+Vitamin K2, Zinc+Copper                                                                   | No document named                                         |
| "general reference"                             | 2     | Caffeine+L-Theanine, CoQ10+PQQ                                                                                                                                                                      | No document named                                         |
| "FDA label: Amantadine (Gocovri)"               | 3     | Amantadine + Amlodipine / Lisinopril / Metoprolol                                                                                                                                                   | Publisher named, no label section or SPL id               |
| "FDA label: PDE5 inhibitors"                    | 3     | Sildenafil / Tadalafil / Vardenafil + Amantadine                                                                                                                                                    | Label is for one compound only; may not document the pair |
| "FDA label: Wellbutrin"                         | 1     | Amantadine + Bupropion                                                                                                                                                                              | Label is for the other compound                           |
| "LiverTox / FDA label"                          | 1     | Amantadine + Caffeine                                                                                                                                                                               | Two publishers, no record id                              |
| "FDA MedWatch case reports"                     | 1     | Amantadine + Sertraline                                                                                                                                                                             | No case report identifier                                 |
| "NIH NCCIH"                                     | 1     | Amantadine + St John's Wort                                                                                                                                                                         | Publisher only                                            |
| "mechanistic…" (5 variants)                     | 5     | CJC-1295+Ipamorelin, CJC-1295+Sermorelin, IGF-1 LR3+CJC-1295/Sermorelin/Tesamorelin, NAC+Glutathione, NMN+NR                                                                                        | Reasoning note stored in the citation field               |
| "general safety default" / "category fallback…" | 4     | category-level rules                                                                                                                                                                                | Not a source                                              |
| (empty)                                         | 269   | —                                                                                                                                                                                                   | No source at all                                          |

---

## 3. Numeric effect sizes and fixed separations — verification status

54 rules state a number. Because **zero** rules carry a document-level source,
**no number in the dataset can be verified against its own citation.** All are
marked UNVERIFIED.

| Claim                                                      | Rules | Cited source                  | Status         |
| ---------------------------------------------------------- | ----- | ----------------------------- | -------------- |
| "reduce absorption by up to **30%**" (levothyroxine)       | 32    | none                          | **UNVERIFIED** |
| "**4 hour**" separation, levothyroxine + minerals          | 32    | none                          | **UNVERIFIED** |
| "**4 hour**" separation, calcium/iron + thyroid meds       | 8     | none                          | **UNVERIFIED** |
| "Reduce basal insulin dose **10–20%** at GLP-1 initiation" | 8     | none                          | **UNVERIFIED** |
| "inhibit non-heme iron absorption by up to **60%**"        | 2     | none                          | **UNVERIFIED** |
| "**2 hour**" separation, calcium + iron / calcium + zinc   | 4     | "general nutrition reference" | **UNVERIFIED** |
| "**2 hour**" separation, iron + caffeine                   | 2     | none                          | **UNVERIFIED** |

No fold-change claims exist in the dataset.

### Suggested review order (highest risk first)

1. Vitamin K2 + Warfarin — verdict "avoid" backed by a placeholder string.
2. The 10–20% insulin dose-reduction instruction — an actionable dosing number.
3. The 30% and 60% absorption figures — quoted precisely, sourced nowhere.
4. The 48 anticoagulant + supplement rules — one template, 48 pairs, no source.

---

## Data model support added (steps 4–6)

- `interaction_rules.confidence` — `established | plausible | theoretical | disputed`,
  every existing row defaulted to `theoretical` pending review.
- `interaction_rules.mechanism_shared_with` — set to the template text wherever a
  warning is reused across rules (251 rows), so the UI can say the warning is
  inferred rather than pair-specific.
- `interaction_rules.no_known_interaction` — supports rendering
  "No documented interaction reported by [source]" instead of omitting a pair.
