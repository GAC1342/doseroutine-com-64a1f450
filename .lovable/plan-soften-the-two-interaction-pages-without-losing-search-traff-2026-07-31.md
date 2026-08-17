# Soften the two interaction pages without losing search traffic

## The short answer

Yes, this can be done with essentially no traffic risk — because the words that make these pages read "medical" are **not** the words that earn the traffic.

What I checked:

- Neither `/trt-supplement-interactions` nor `/peptide-interaction-checker` currently has tracked organic traffic. Today they are a bet on future traffic, not an existing traffic source, so changes now are cheap.
- The search demand around them is in **long-tail entity and question queries**, not in clinical phrasing: "bpc 157 and tb 500 together" (50/mo), "semaglutide and testosterone together" (90/mo), "supplement interaction checker" (590/mo), "peptide interaction checker" (20/mo), "testosterone stack supplements" (20/mo).
- Those queries are answered by the compound lists and the FAQ blocks — which this plan keeps 100% intact.
- The site's actual traffic today comes from library compound pages (acetaminophen, lunesta, tadalafil, etc.), which this plan does not touch.

So the rule is: **keep every entity, question and answer; change only the framing around them.**

## What changes (the framing layer — near-zero traffic value)

Reword clinician-facing vocabulary into consumer health-and-fitness vocabulary. Same meaning, same accuracy, same disclaimers, less "clinical tool" signal.

| Now | Change to |
|---|---|
| "a patient shows symptomatic high estradiol" | "someone shows symptoms of high estradiol" |
| "TRT is a prescription therapy" | "TRT is prescriber-managed" |
| "supplements, ancillaries, and prescriptions people stack" | "supplements, hormones and medications people stack" |
| "contraindications" | "when to avoid it" |
| "co-prescribed with TRT" | "commonly used alongside TRT" |
| "dosing" (as a verb about the reader) | "dose amounts" / "your routine" |
| "clinician oversight" (x10) | keep some, vary to "your prescriber" / "your doctor" so it reads like consumer guidance, not a clinical protocol |

Also:

- **Titles and H1s** get a tracker framing rather than a reference-manual framing:
  - "TRT & Supplement Interactions — Free Checker" becomes "TRT & Supplement Stack Checker — What Mixes Safely"
  - "Peptide Interaction Checker — BPC-157, TB-500, GLP-1s" becomes "Peptide Stack Checker — BPC-157, TB-500 & GLP-1 Combinations"
  - Both keep the head keywords ("TRT", "supplement", "peptide", "interaction/stack", "BPC-157", "TB-500", "GLP-1") so nothing is lost on relevance.
- **Structured data**: `applicationCategory` moves from `HealthApplication` to `LifestyleApplication`. `HealthApplication` is a machine-readable claim that this is a health/medical tool — exactly the signal to drop. Article and FAQPage schema stay as-is (FAQPage is what can win rich results).
- **Disclaimer boxes** get reworded from "Educational reference — not medical advice" to a tracking-tool framing: "DoseRoutine is a tracking and organisation tool. This page is general information, not advice — talk to your prescriber before changing anything."
- Add a one-line "what this page is" statement near the top of each: this is a reference for organising a routine, not a recommendation to use anything.

## Bug found while reading these pages

Both meta descriptions are **truncated mid-word** and currently shipping to Google:

- TRT: "...HCG, anastrozol Check it against your full supplement..."
- Peptide: "...GLP-1s, growth-hormone p Check it against your full supplement..."

These are live in the page `<head>`, in Open Graph and in Twitter cards, and they are hurting click-through on every impression. Both get rewritten as complete, keyword-carrying sentences.

## What stays exactly as-is (the traffic layer)

- All 19 TRT compounds and all 15 peptides, with their links to library pages.
- All 7 TRT FAQs and all 6 peptide FAQs — the questions and the substance of every answer. These are the pages' ranking assets.
- Canonical URLs, hreflang, breadcrumbs, internal links, FAQPage and Article JSON-LD.
- The keywords in titles and descriptions.

No URL changes, no redirects, no content removal — so there is no ranking reset.

## Technical notes

- Files: `src/routes/trt-supplement-interactions.tsx`, `src/routes/peptide-interaction-checker.tsx`.
- `TITLE`, `DESC`, `CANONICAL` and `FAQ` are exported from the TRT route; check for importers before renaming anything, and keep the export names.
- `applicationCategory: "HealthApplication"` also appears in seven other files (`__root.tsx`, `index.tsx`, `interaction-checker.tsx`, `calculator.tsx`, `compare.tsx`, `reconstitution-calculator.tsx`, `peptide-dosage-calculator.tsx`). For consistency of signal, switch all of them in the same pass — a single mismatched page undoes the point.
- Run the existing route metadata and JSON-LD tests plus the full suite afterwards; verify the rendered server HTML still contains the FAQPage block on both pages.

## Worth saying plainly

Google Play judges the app listing and the app itself, not this website directly — but the site is linked from the listing and a reviewer can and does open it. Softening these two pages is cheap insurance. The one thing that would genuinely cost traffic is deleting the compound and FAQ content, and this plan does not do that.
