# DoseRoutine — App Store Optimization Plan

**Target queries:** `peptide reconstitution calculator`, `peptide dosage calculator`
**Goal:** Rank in the top 5 for both queries on Apple App Store and Google Play within 60 days.

---

## 1. Metadata changes (already applied in `scripts/export-store-listing.mjs`)

| Field                            | Old                                                                                                | New                                                                                                                    | Char limit |
| -------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| iOS Subtitle                     | Longevity Stack Manager                                                                            | **Peptide Reconstitution Tracker**                                                                                     | 30/30      |
| iOS Keywords                     | supplement,tracker,longevity,stack,peptide,hormone,dose,medication,reminder,biohacking,nad,trt,hrt | **reconstitution,calculator,dosage,bpc157,tb500,semaglutide,tirzepatide,ipamorelin,syringe,hrt,trt,nad**               | 100/100    |
| iOS Promo Text                   | New: AI-assisted stack planning…                                                                   | **Peptide reconstitution + dosage calculator built in. Track BPC-157, TB-500, semaglutide, tirzepatide & every dose.** | 114/170    |
| Play Short Desc                  | Track supplements, peptides, hormones & meds…                                                      | **Peptide reconstitution & dosage calculator + supplement/hormone tracker.**                                           | 72/80      |
| Full Description (line 1)        | Stop guessing…                                                                                     | **Peptide reconstitution calculator, dosage calculator, and full stack tracker in one app.**                           | —          |
| iOS Category (primary/secondary) | Health & Fitness / Medical                                                                         | **Medical / Health & Fitness**                                                                                         | —          |

### Why this ranks

- **Apple indexes:** app name (`DoseRoutine`) + subtitle + keyword field. Together they now contain every token in the target queries: _peptide, reconstitution, dose/dosage, calculator, tracker_. Apple auto-combines tokens across those three fields, so we never repeat a word (wastes characters).
- **Google Play indexes:** title, short description, and full description. Both target phrases appear verbatim in line 1 of the full description and in the short description — Play's algorithm weights these highest.
- **Category swap:** Medical (primary) is less competitive than Health & Fitness and is the category most peptide calculator apps sit in. Ranking #5 in Medical drives more installs than #40 in Health & Fitness.

---

## 2. Deep links from App Store listing → landing page

The landing page `/peptide-dosage-calculator` (already live) is the marketing URL. Set it as **Marketing URL** in App Store Connect (replace `doseroutine.com`) so Apple's ranking model sees relevance between web content and app metadata.

**Google Play → Website field:** `https://doseroutine.com/peptide-dosage-calculator`

---

## 3. Screenshots — reorder + reshoot

The first 3 screenshots are what App Store search shows. Put the calculator screens first.

| Slot | Screenshot                                                        | Caption overlay                     |
| ---- | ----------------------------------------------------------------- | ----------------------------------- |
| 1    | Peptide reconstitution calculator (BPC-157 preset, U-100 syringe) | "Peptide Reconstitution Calculator" |
| 2    | Dosage calculator result screen with syringe markings             | "Exact Syringe Units, Every Time"   |
| 3    | Interaction checker showing a peptide + prescription warning      | "Catch Dangerous Combinations"      |
| 4    | Daily calendar with alarms                                        | "Never Miss a Dose"                 |
| 5-10 | Existing screenshots                                              | (unchanged)                         |

Action: generate 2 new iPad screenshots at 2048×2732 for slots 1–2 pointing at `/peptide-dosage-calculator` and the in-app calculator. (Say the word and I'll build them.)

---

## 4. In-App Purchase names (also indexed by Apple)

Rename the two subscriptions so the display name carries a keyword:

- `DoseRoutine Pro` → **`DoseRoutine Pro — Peptide Calculator + Tracker`** (max 30 chars, use "Peptide Calc + Tracker Pro")
- Description: "Unlocks unlimited peptide reconstitution & dosage calculators, calendar alarms, interaction checker, and doctor exports."

Apple indexes IAP display names in search since iOS 17.

---

## 5. Reviews & install velocity

ASO ranking = relevance × install velocity × review score.

- **Ask for a review** on the calculator result screen after a user completes 3 successful reconstitution calculations. (Small code hook — I can add it: `StoreReview.requestReview()` in Capacitor.)
- **Reply to every review** mentioning "calculator" or "peptide" — Apple weights keyword-matched review text.
- Push the landing page URL in every peptide-forum answer, Reddit reply, and TRT/HRT community post. Web-driven installs to the App Store carry the referring URL as a ranking signal.

---

## 6. Post-launch tracking

Track weekly (Semrush + App Store Connect):

| Metric                                         | Baseline   | 30-day target | 60-day target |
| ---------------------------------------------- | ---------- | ------------- | ------------- |
| Rank: "peptide reconstitution calculator" (US) | not ranked | Top 20        | Top 5         |
| Rank: "peptide dosage calculator" (US)         | not ranked | Top 20        | Top 5         |
| Rank: "peptide calculator" (US)                | not ranked | Top 30        | Top 10        |
| App Store impressions/day                      | —          | +50%          | +150%         |
| Conversion rate (impression → install)         | —          | ≥ 3.5%        | ≥ 5%          |

If ranks stall at day 30, swap the least-performing keyword in the iOS keyword field (candidates to test: `mixing`, `stack`, `subq`, `injection`).

---

## 7. What to do now (checklist)

1. Run `node scripts/export-store-listing.mjs` → get the updated `/mnt/documents/store-listing-export.md`.
2. Paste new **Subtitle**, **Keywords**, **Promo Text**, **Description** into App Store Connect → _App Information_ + _Version_ (creates a metadata-only update; no build required).
3. Paste new **Short description** + **Full description** into Google Play Console → _Main store listing_.
4. Switch iOS category to **Medical (primary) / Health & Fitness (secondary)**.
5. Set Marketing URL to `https://doseroutine.com/peptide-dosage-calculator`.
6. Ask me to (a) reshoot screenshots 1–3, (b) wire up the `StoreReview` prompt, (c) rename the IAPs.
