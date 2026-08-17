# Health-and-fitness wording audit (avoid "medical app" classification)

## What I found

I searched every public page, the store listing files, the marketing copy strings, and the structured data. The wording risk is real but concentrated in a handful of places, not the whole site.

### 1. "Prescription / Rx" as a headline selling point (highest risk)

Google's Health Apps policy cares less about the word "prescription" appearing and more about an app appearing to *manage, recommend, or facilitate* prescription medicine. Right now prescriptions are used as the main differentiator in hero copy and comparison tables:

- Homepage hero and feature copy: "supplements, peptides, hormones & prescriptions", "prescription cross-checks and safe-guard rules for controlled items"
- Shared marketing strings in `src/lib/i18n.ts` (meta description, how-it-works, FAQ "Can I add prescription medications?", social proof line)
- Root site description
- All five competitor pages (`/vs/medisafe`, `/vs/mytherapy`, `/vs/round-health`, `/vs/pill-reminder`, `/vs/cronometer`) and `/vs-supplement-planner`
- Both store-listing documents

Fix: keep the capability honest, but reposition it as "anything else you already take" / "your other daily items", and stop leading with Rx. Change comparison-table rows from "Interaction checker (supplements + Rx + peptides)" to "Interaction checker across your whole routine". Keep one plain factual line ("you can log items a clinician has given you") rather than five pages of Rx marketing.

### 2. Dosage calculators presented as clinical tools

`/trt-dosage-calculator`, `/peptide-dosage-calculator`, `/reconstitution-calculator`, `/peptide-reconstitution-calculator` are the pages most likely to read as drug-dosage tools. They already carry disclaimers, but the framing ("Calculate your dose", "TRT dosage calculator") is dose-recommendation framing.

Fix: reframe every calculator as a **unit converter** — "mg to syringe units converter", "Convert your prescribed amount", "This does not tell you what to take" — placed above the fold, not only in small print at the bottom. No math changes.

### 3. Words that read as clinical claims

Scattered use of "treat", "therapy", "clinical", "patient", "doctor-ready", "medical". Also `interaction checker` copy that says it "flags dangerous combos" reads as clinical decision support.

Fix: soften to "educational reference", "informational", "flags combinations worth asking about", "shareable summary" instead of "doctor-ready report". Keep the legally required disclaimers exactly as they are — those are protective, not a trigger.

### 4. Structured data self-declaring as medical content

Compound pages emit `MedicalWebPage` and `MedicalSubstance` JSON-LD. That is a machine-readable statement that the site publishes medical content.

Fix: switch those to `Article` + `Product`/`DefinedTerm` on library pages. This affects Search only, not Play, and is low risk to rankings.

### 5. Store listing content rating

`store-listing.md` currently says the rating is "17+ (references to prescription medications and hormones)" — that phrasing invites a medical review. Reword to reflect adult supplement/fitness content.

## What I will NOT change

- The `/medical-disclaimer` page, legal pages, and the footer disclaimer text. Those must stay explicit — removing "medical advice" language would hurt, not help.
- Any actual functionality: the interaction data, calculators, library content and stack logic stay exactly as they are. This is a copy and metadata pass only.

## Verification

- Re-run the wording grep afterwards and report the remaining hits with a reason for each.
- Run the existing SEO route validation and the meta smoke tests so no title/description limits break.
- Give you a short before/after list of the exact store-listing text to paste into Play Console.

## Note on Google Search vs Google Play

Search will not "classify" the app — it just ranks the site. The classification risk is entirely on the **Play Console** side, and reviewers do open the website linked in the listing. So the fix covers both: site copy and the two store-listing documents.
