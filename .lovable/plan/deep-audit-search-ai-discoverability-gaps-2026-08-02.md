# Deep audit: search + AI discoverability gaps

## Where you stand today (verified)

Semrush (us database) currently shows **1,114 organic keywords, ~1,274 visits/mo estimated**. The single biggest pattern: your best pages are stuck at **positions 16-21** on enormous terms.

| Keyword | Volume | Your position |
|---|---|---|
| acetaminophen | 450,000/mo | 19 |
| lisdexamfetamine | 90,500/mo | 19 |
| lunesta | 49,500/mo | 16 |
| oral minoxidil | 27,100/mo | 28 |
| intuniv | 22,200/mo | 17 |
| what is amlodipine used for | 18,100/mo | 18 |
| tadalafil | 201,000/mo | 48 |
| diphenhydramine | 201,000/mo | 49 |

Position 16-19 means page 2 — almost nobody clicks. Moving a handful of these to page 1 is worth more than any number of new pages.

The AI/citation layer is already strong: llms.txt, llms-full.txt, tdm-policy.json, RSS feed, attribution headers, visible credit lines, and Article/FAQ/MedicalSubstance/Breadcrumb schema across the library. That is not where the gap is.

## Confirmed technical gaps

1. **`<html>` has no `lang` attribute.** Small, but it is a live accessibility + crawler signal failure and takes one line.
2. **Sitemap mismatch** — the `/p/$token` share route is in the code but absent from the sitemap. Needs an explicit decision: it is a private share link, so it should be excluded from the audit rather than added.
3. **No Survodutide page** — flagged as a rising dual-agonist peptide competitors already rank for; you cover retatrutide and tirzepatide but not this one.

## Proposed work, in priority order

### Phase 1 — Page-2 rescue for the eight giants above
This is the highest-value work available. For each of the eight pages, apply the treatment that already worked on retatrutide:
- Rewrite title and meta to exactly match the winning query shape (`acetaminophen`, `what is amlodipine used for`).
- Add an answer-first summary box in the first 100 words so it can win a featured snippet.
- Add a Quick Facts table (class, typical dose, half-life, key interactions).
- Add 5-6 real People-Also-Ask questions merged into FAQPage schema.
- Add internal links from related library, interaction-pair, and calculator pages so each target page gains internal authority.

### Phase 2 — Close the technical gaps
- Set `lang="en"` on the root document.
- Explicitly mark `/p/$token` as a private, non-indexed route so the sitemap check stops failing.
- Add `dateModified` to Article schema on every library page so crawlers and AI see freshness.
- Add an IndexNow ping (Bing/Yandex instant indexing) fired when the sitemap changes.

### Phase 3 — Entity + AI-citation depth
- Add `sameAs` links (App Store, Google Play, LinkedIn, X) to the Organization schema so search engines link the brand to a real entity.
- Add a `/faq` hub page collecting the highest-volume questions across the site into one FAQPage — this is the format AI assistants quote from most.
- Add Survodutide plus 3-4 sibling gap compounds as full library pages with interaction-pair coverage.
- Add `speakable` schema to the answer-first boxes so voice and AI assistants can lift them cleanly.

## Technical notes

- Page-2 rescue reuses the existing `src/lib/page2-rescue.ts` mechanism — the eight targets get added as curated entries, no new route files.
- `lang` goes on the html element in `src/routes/__root.tsx`.
- Sitemap changes go in `src/routes/sitemap[.]xml.ts`; `/p/$token` is excluded rather than enumerated because tokens are private.
- IndexNow needs a key file in `public/` and a fetch from the sitemap route.
- Existing test suites (`src/lib/page2-rescue.test.ts`, `faq-schema.test.ts`, attribution crawl) guard the changes; all should stay green.

## Out of scope unless you ask
Chasing brand-new high-volume drug pages you have no page for yet. Your existing pages are closer to the money.
