# Keyword gap plan, calculator hardening, and a JSON-LD build gate

Three pieces of work: a researched keyword-to-page inventory with the missing pages named, stricter input handling plus a cited "how to read this" block in the peptide calculator, and an automated test that validates the structured data on every `/peptides` page during CI.

## 1. What the keyword research found

Volumes and difficulty are US Semrush data pulled for this plan. The pattern is clear: DoseRoutine already owns the *compound* and *comparison* space (476 library pages, 14 calculator pages, 12 `/vs/` pages), but has almost nothing for the **procedural** searches — how to mix it, what water to use, where to inject, how to store it, is it safe/legal. Those are the highest-volume, lowest-difficulty terms still open, and they're exactly the questions AI assistants get asked and cite sources for.

### Already covered (no action)

| Term | Volume | Existing page |
|---|---|---|
| peptide calculator / peptides calculator | 201,000 | `/peptides-calculator`, `/calculators` |
| peptide reconstitution calculator | 9,900 | `/peptide-reconstitution-calculator` |
| peptide dosage calculator | 8,100 | `/peptide-dosage-calculator` |
| retatrutide / bpc 157 / tirzepatide dosage calculator | 4,400–5,400 each | `/calculators/{slug}` |
| what are peptides | 110,000 | `/peptides` |
| bpc-157 / tb-500 / semax peptides | — | `/peptides/bpc-157`, `/tb-500`, `/semax` |
| medication reminder app, pill reminder app | 1,600–1,900 | `/best-medication-reminder-app`, `/vs/*` |

### Missing — high volume, low difficulty (build these)

| Target term | Volume | Difficulty | Proposed page |
|---|---|---|---|
| bacteriostatic water, bac water for peptides, what is bac water | 49,500 head, 6,600 + 4,400 long-tail | 37 | `/peptides/bacteriostatic-water` |
| how to reconstitute peptides (+ "peptide reconstitution chart", "how much bac water") | 5,400 + ~4,000 tail | 23 (easy) | `/peptides/how-to-reconstitute-peptides` |
| how to inject peptides / where to inject peptides / subq injection sites | 1,600 + 1,600 + 6,600 | 21 (easy) | `/peptides/how-to-inject-peptides` |
| how to store peptides after reconstitution, does bac water expire, how long does it last | ~2,500 combined | low | `/peptides/storing-peptides` |
| are peptides safe / legal / steroids, peptide side effects | 14,800 + 6,600 + 9,900 + 2,400 | 47 | `/peptides/are-peptides-safe` |
| peptides for muscle growth, muscle building peptides | 33,100 + 14,800 | high but on-brand | `/peptides/peptides-for-muscle-growth` |
| peptide therapy, peptide injections | 14,800 + 18,100 | 57 | `/peptides/peptide-therapy` |
| ipamorelin dosage / cjc-1295 ipamorelin dosing / side effects | 3,600 + 5,400 + 2,900 | 57 | `/peptides/cjc-1295-ipamorelin` |
| peptide dosing chart / peptide dosage chart | 1,900 + 2,900 | 33 | `/peptides/peptide-dosage-chart` (data table page) |
| semaglutide/tirzepatide "how much bac water to mix with 10mg" | ~2,800 combined | very low | FAQ blocks added to the existing GLP-1 calculator pages |

Nine new guides plus FAQ additions to pages that already exist. Every one is a question a person asks *before* they need a tracking app, which is the point: they answer the query, then the page offers the log-it-properly next step.

### How these attract AI citations

Each page follows the pattern already proven on `/peptides/bpc-157`: a direct one-paragraph answer at the top, a numbered procedure, a comparison or conversion table, cited references, and FAQ schema. Assistants quote the short answer and cite the URL; the tables give them something to extract that prose doesn't. All nine link to the `/peptides` pillar and the calculator hub through the existing `clusterRelated` map, so authority concentrates instead of scattering.

## 2. Peptides calculator: strict input handling

The current calculator accepts whatever a number input gives it. Typing a letter or clearing a field produces `NaN`, negatives and zero pass through, and there is no cap — so a mistyped `50` mL of water silently returns a nonsense draw instead of flagging it.

Changes:

- Reject and explain, per field, instead of silently returning nothing: empty, non-numeric, zero, negative, and out-of-range values each get an inline message under the field.
- Sane bounds: vial 0.1–100 mg, diluent 0.1–30 mL, dose above zero and never more than the whole vial.
- Unit handling made explicit — a dose in mcg above 100,000 or in mg below 0.001 is almost certainly a mg/mcg mix-up, so the calculator says so rather than computing it.
- A dose larger than the vial contains, or a concentration that can't physically be drawn, is blocked with the reason.
- Results only render when every input is valid; no half-computed numbers.

## 3. "How to interpret your result" block

A short cited section appears under the output explaining what the numbers mean: that units are a volume marking on a U-100 syringe and not a quantity of peptide, why the 10–30 unit range is the readable one, what dead space costs you per injection, and that doses-per-vial is a ceiling that ignores waste and expiry. Two or three references (USP 797 beyond-use dating, an insulin-syringe accuracy source) with the same citation component used elsewhere on the site.

## 4. Automated JSON-LD validation for every /peptides page

A vitest suite that renders each `/peptides*` route in CI and asserts, per page:

- Every `application/ld+json` block parses as JSON.
- Exactly one `@graph`, with no duplicate `@type` entries across blocks.
- BreadcrumbList present, ending at the current page, with absolute HTTPS item URLs.
- The main entity (`Article` / `MedicalWebPage` / `TechArticle`) has `headline`, `description`, `datePublished`, `dateModified`, `author`, `publisher`, and a `mainEntityOfPage` matching the canonical.
- FAQPage present with at least three `Question` items, each with a non-empty `acceptedAnswer.text`.
- Canonical is absolute HTTPS on doseroutine.com and matches the route.
- Head node count stays under the existing 60-node budget.

The route list is derived from the filesystem, so a new `/peptides` guide is covered automatically and fails the build if it ships without complete schema. Wired into the existing micromarkup GitHub workflow alongside the head-budget test.

## Technical notes

- New guides reuse `PeptideGuidePage`, `peptideGuideHead`, and `clusterRelated`; the linking map and `PEPTIDE_CLUSTER_PATHS` get the nine new paths, which the existing linking tests then enforce.
- Validation logic goes in a pure module (`src/lib/recon-validation.ts`) with its own unit tests, consumed by `ReconCalculator` so all 14 `/calculators/{slug}` pages inherit it.
- `sitemap.xml.ts` gets the new routes; `home-site-nav.tsx` gets the pillar-level additions only.

## Scope

This plan covers the inventory, the nine pages, calculator validation, the interpretation block, and the schema gate. It does not change tracking, auth, or any signed-in feature.
