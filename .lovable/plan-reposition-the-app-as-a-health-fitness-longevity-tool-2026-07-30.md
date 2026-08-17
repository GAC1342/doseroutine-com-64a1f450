# Reposition the app as a Health & Fitness / longevity tool

Scope: in-app screens only. The public website, SEO titles, and meta descriptions stay exactly as they are, so search rankings are untouched. All "not medical advice / talk to a clinician" disclaimers stay as-is — that language is protective and reviewers expect it.

## What changes

### 1. Doctor Report becomes My Report
- Page title: "Doctor Report" -> "My Report"
- Subtitle: "A one-page snapshot of your current routine, recent logs, and 30-day adherence."
- Export button label: "Export PDF"
- Menu entry on More: "Doctor Report" -> "My Report"
- Timeline card: "Share this with your doctor" -> "Save or share your report"
- Help article text referencing the doctor report updated to match
- The URL stays `/doctor-report` so no links, tests, or bookmarks break

### 2. Soften clinical wording on in-app screens
- Stack: "Prescription meds" category label -> "Prescribed items"; "Prescription in your stack — cross-check..." heading reworded to "Higher-risk item in your stack — cross-check with an official interaction checker"; high-risk banner reworded away from "medications" to "compounds"
- Upgrade / Trial: "Doctor-ready export" -> "Shareable report export"; "supplements, peptides, hormones & prescriptions" -> "supplements, peptides, hormones & more"
- AI Coach: sample question and intro reworded off "meds"/"prescriptions" to "your stack"
- Templates, Safety, Injection sites: keep the safety guidance, swap "physician"/"clinician" phrasing to "a qualified health professional" where it reads as a clinical instruction rather than a disclaimer
- Share with clinician button -> "Share summary"

### 3. Add the longevity / health & fitness positioning
- Onboarding and the in-app About block gain a one-line framing: "A health, fitness and longevity routine tracker."
- Welcome tour opening line updated to the same framing

## What does NOT change
- Route paths, database columns, the `medication` compound category value, and any internal identifiers — display labels only
- Website landing page, about page, pricing page, library and guide content
- All page titles, meta descriptions, and structured data
- Every existing disclaimer

## Technical notes
Purely presentation-layer string edits across `src/routes/_authenticated/*` and a handful of components (`share-with-clinician`, `about-doseroutine-block`, `welcome-tour`, `page-help-fab`, `help-articles`). No schema, routing, or logic changes. Existing tests that assert on route paths keep passing; any test asserting the literal string "Doctor Report" gets updated alongside the copy, then the full suite runs.
