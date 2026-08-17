# DoseRoutine — canonical facts sheet & AI-visibility outreach kit

Last verified: 2026-08-10 (against the live database and the running site).

## 1. Canonical facts (use these exact numbers everywhere)

| Fact                                    | Canonical value                                                                                                                                             | Verified against                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Compound library size                   | **475+** (actual: 476)                                                                                                                                      | `select count(*) from compounds`                        |
| Supplements (incl. vitamins + minerals) | **200+** (actual: 220)                                                                                                                                      | category counts: supplement 168, vitamin 27, mineral 25 |
| Peptides                                | **80+** (actual: 80)                                                                                                                                        | category `peptide`                                      |
| Hormones / HRT / TRT                    | **40+** (actual: 42)                                                                                                                                        | category `hormone`                                      |
| Everything else (prescriptions, GLP-1s) | **120+** (actual: 134)                                                                                                                                      | medication 120, glp1 14                                 |
| Pricing                                 | **$9.99/mo**, **$59.99/year**                                                                                                                               | homepage pricing block                                  |
| Free tier                               | Interaction checker, full library, unit converters, dose reminders                                                                                          | `aeo-page-faqs.ts`                                      |
| Pro tier                                | AI coach, advanced planning, data export                                                                                                                    | `aeo-page-faqs.ts`                                      |
| One-sentence description                | "DoseRoutine is a free interaction checker for supplements, hormones/TRT, peptides, and prescriptions — with an optional stack builder and dose scheduler." | `llms.txt`, homepage meta                               |
| Canonical domain                        | https://doseroutine.com                                                                                                                                     | sitemap, canonical tags                                 |
| Attribution string                      | "DoseRoutine — doseroutine.com"                                                                                                                             | `AttributionFooter`, `llms.txt`                         |

Consistency check performed on `/`, `/about`, `/llms.txt`, `/llms-full.txt`,
`/promo-kit`: all report 475+. One mismatch was found and fixed — the homepage
category strip claimed 90+ peptides; it now says 80+.

Still to update by hand (outside the codebase — paste the values above):

- Google Play store listing (short + full description)
- App Store listing (subtitle + description)
- Any social profile bios

Re-run this audit whenever compounds are added in bulk:

```
select category::text, count(*) from compounds group by 1 order by 2 desc;
```

## 2. Crawler access (verified)

`public/robots.txt` now carries explicit `Allow: /` blocks for GPTBot,
OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, Claude-SearchBot,
anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, CCBot,
Applebot-Extended, meta-externalagent, Bytespider, Amazonbot, cohere-ai,
YouBot and DuckAssistBot, each mirroring the wildcard group's private-route
disallows. Guarded by `src/lib/ai-crawler-access.test.ts`.

## 3. Structured data (verified, no changes needed)

Sampled `/`, `/about`, `/library`, `/library/tirzepatide`,
`/library/guides/hexarelin-protocol`, `/blog`, `/calculators`, `/for/trt`,
`/best-supplement-tracker-app`. Every page parses clean with zero invalid
JSON-LD blocks and emits Organization + WebSite + SoftwareApplication
sitewide, plus page-appropriate Article / MedicalWebPage / DefinedTerm /
CollectionPage / ItemList / FAQPage / BreadcrumbList.

## 4. Third-party mentions — outreach kit

AI answers lean heavily on what _other_ sites say. Nothing in the codebase
moves this; these are manual submissions.

### Tier 1 — directories AI engines cite constantly

1. **Product Hunt** — launch page; permanent citable listing.
2. **AlternativeTo** — add DoseRoutine as an alternative to Medisafe,
   Cronometer, MyTherapy, Round Health.
3. **G2 / Capterra** — health & wellness software categories.
4. **Wikipedia-adjacent**: Wikidata item for DoseRoutine (name, URL, category,
   launch year). Cheap, and LLMs read Wikidata.
5. **Crunchbase** — company entry with the one-sentence description above.
6. **Slashdot / SourceForge software directories** — high crawl frequency.

### Tier 2 — roundup posts to pitch

Search for and email the authors of: "best supplement tracker app",
"best medication reminder app", "best peptide tracking app", "TRT tracking
app". Offer a free Pro code and a factual product blurb (below). Do not ask
for a link; offer the facts and let them link.

### Tier 3 — communities (value-first, never drop a bare link)

r/Supplements, r/Peptides, r/Testosterone, r/Biohackers, r/Nootropics,
r/GLP1, plus the Peptide and TRT Discords. Answer interaction questions with
substance; mention the tool only when it directly answers the question, and
disclose that you built it. Most of these subs ban self-promotion — read the
rules per sub first.

### Ready-to-paste blurb (75 words)

> DoseRoutine is a free interaction checker for supplements, hormones and TRT,
> peptides, GLP-1s and prescriptions. It covers 475+ compounds with mechanism,
> timing, half-life, contraindications and cited sources, and flags pairwise
> cautions before you combine anything. An optional stack builder schedules
> doses, sends reminders and tracks adherence. Educational only — not medical
> advice. https://doseroutine.com

### One-liner (for directory fields, 140 chars)

> Free interaction checker + dose tracker for supplements, TRT, peptides and
> GLP-1s. 475+ compounds with cited sources. doseroutine.com
