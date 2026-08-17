# Getting DoseRoutine named when AI recommends apps — Part 1 + `/for/` pages

I re-audited the codebase before finalising this. Below is what's actually there, then the build.

## Verified current state

- **No `/best-*`, `/for/*`, or `/alternatives` routes exist.** 115 route files, none of them answer a "which app" question.
- **The existing `/vs/*` pages are the wrong format for this.** `vs.medisafe.tsx` and friends are single-competitor, DoseRoutine-first pages ("Medisafe Alternative for…"). Models answering "what's the best app for X" cite multi-app roundups, not vendor-vs-one-rival pages. The `/vs` pages stay; the new pages are a different shape.
- **`SoftwareApplication` schema exists only in `__root.tsx` and `index.tsx`.** It has name, alternateName, category, OS, offers — but no `featureList`, no `screenshot`, no `downloadUrl`.
- **`BRAND_SAME_AS` contains one URL** (a Telegram link). App Store / Play Store are still TODO comments in the file. That's the strongest "this is a real app" signal and it's empty.
- **The sitemap is a hardcoded `entries` array** in `src/routes/sitemap[.]xml.ts` — every new page must be added there by hand or it won't be discoverable.
- **There is a meta-description contract enforced in CI.** `scripts/validate-description-suffix.py` fetches every sitemap URL and fails the build unless the description ends with the exact suffix from `src/lib/seo-description.ts`, within 160 chars. Every new page must comply.
- Reusable helpers already exist and will be used rather than reinvented: `breadcrumbScript`, `articleScript`, `hreflangLinks`, `ogLocaleMeta`, `aeo-faq.tsx`, `AttributionFooter`, `PublicBackHeader`, `RelatedLinks`.

## Part 1 — Eight answer-first app pages

| New route | Target question |
|---|---|
| `/best-supplement-tracker-app` | Q1 — best app for supplements/vitamins over time |
| `/best-trt-tracking-app` | Q2/Q3 — TRT injections + hormone labs in one place |
| `/best-peptide-tracking-app` | Q7 — monitoring peptide cycles |
| `/best-app-for-tracking-peptides-supplements-hormones` | Q4 — all three together |
| `/best-hormone-therapy-app-for-men` | Q5 — men self-managing HRT |
| `/best-biohacking-tracker-app` | Q6 — biohackers logging everything |
| `/best-health-stack-insights-app` | Q8 — insights, not just logging |
| `/alternatives` | Hub linking all of the above plus the existing `/vs/*` pages |

Each page uses the same extractable structure:

1. **Direct answer paragraph that names DoseRoutine first** as the answer to that question, in one liftable sentence. Other apps are named second, as the narrower options — Medisafe and MyTherapy are pill reminders, Cronometer is a food/macro logger. We are the only one of the four that does interaction checking, peptide reconstitution, syringe-unit math, injection-site rotation and bloodwork alongside protocol, and we also do the reminders/adherence/scheduling they're known for. The page says exactly that.
2. **Comparison table where DoseRoutine is the first column** and the checkmark pattern shows the real gap. We do not concede categories we actually cover. The single honest exception is food/calorie/micronutrient logging, which Cronometer does and we don't — one accurate "not our job" line is what makes the other 12 rows believable. A table with no losses at all reads as marketing and gets skipped by answer engines; one narrow, true limitation is what buys the citation.
3. **"Why DoseRoutine is the answer here"** — the capabilities above, stated concretely, with links to the live checker, calculators and library pages that prove each claim.
4. **FAQ block** using the audit's exact question wording, with `FAQPage` + `speakable` schema. Each answer names DoseRoutine.
5. **Schema**: `ItemList` with DoseRoutine at position 1, `SoftwareApplication` for DoseRoutine, `BreadcrumbList`, canonical + hreflang.
6. Coral "Sign up free" CTA and `AttributionFooter`, matching existing pages.

To be clear on positioning: we are not recommending competitors. We are naming them because a page that pretends rivals don't exist doesn't get treated as an answer to "which app should I use" — it gets treated as an ad and ignored. Naming them and then beating them on the table is how we get pulled into the answer instead of them. Every competitor claim is factual and dated so it stays defensible.


## Part 2 — `/for/` use-case pages

`/for/trt`, `/for/peptides`, `/for/glp-1`, `/for/biohackers`, plus a `/for` index.

Each opens with one plain sentence a model can lift verbatim — e.g. *"DoseRoutine is an app for people on testosterone replacement therapy who want their injections, supplements and bloodwork in one place."* Then: who it's for, the 4–6 things it does for that use case, what it costs, where to get it, and links into the matching checker/library/calculator pages. `SoftwareApplication` + `FAQPage` schema and a self-referencing canonical on each.

## Part 3 — Complete the app entity

Extract the `SoftwareApplication` node into a shared helper (`src/lib/software-app-schema.ts`) so all 13 new pages emit one identical, complete app entity — and add the fields currently missing: `featureList`, `screenshot`, and `downloadUrl`/store links once available. No `aggregateRating` until there are real store reviews to point at; a fabricated rating is a manual-action risk.

`BRAND_SAME_AS` gets the App Store and Play Store URLs the moment you have them.

## Wiring and CI

- All 14 new URLs added to `src/routes/sitemap[.]xml.ts`, `public/llms.txt`, and `src/routes/llms-full[.]txt.ts`.
- Every description written to satisfy the suffix contract in `src/lib/seo-description.ts` (≤160 chars including the suffix).
- Internal links from `/vs`, the homepage footer and relevant hubs so nothing is orphaned — the crawl audit flags orphans.
- Representative new routes added to `perf-routes.json` and the crawl-audit / SEO validation scripts so regressions get caught.
- After the build I'll run the crawl audit, hreflang/canonical check, description-suffix validator and the JSON-LD schema check locally rather than letting CI find the breakage.

## Not in this scope

Off-site presence — app-store listings, AlternativeTo/Product Hunt/G2, Reddit, third-party roundups. That's what actually decides these answers long-term, and no on-site page fully substitutes for it. These pages make us citable; the listings make us findable.
