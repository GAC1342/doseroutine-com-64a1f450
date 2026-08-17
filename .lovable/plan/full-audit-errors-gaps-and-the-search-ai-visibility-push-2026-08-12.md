# Full audit: errors, gaps, and the search/AI visibility push

## What I verified first

Health of the codebase is genuinely good — this audit is not about broken code.

- All 98 unit test files pass; TypeScript typecheck is clean. No build errors, no failing suites.
- Google confirms the homepage is **Submitted and indexed**, canonical resolves to `https://doseroutine.com`, robots allows crawling, last crawl 2026-08-09. Nothing is blocked.
- The stale SEO scanner shows only passing/fixed findings — no open on-page defects.

So the problem is not errors. It is **position and click-through**.

## The one number that matters

Last 28 complete days (Jul 12 – Aug 8):

| Metric | Value |
|---|---|
| Impressions | 22,137 |
| Clicks | 22 |
| CTR | 0.10% |
| Average position | 62 |

Google is showing your pages 22,000 times a month and almost nobody clicks, because position 62 is page 6. Every top page is deep:

| Page | Impressions | Position |
|---|---|---|
| /library/cardarine | 277 | 42.7 |
| /library/boldenone-undecylenate | 123 | 38.6 |
| /library/dihexa | 54 | 55.3 |
| /library/d-ribose | 34 | 55.1 |
| /library/epithalon | 16 | 96 |
| /library/capromorelin | 9 | 23.4 |

These pages already earn impressions on real compound queries. Lifting them from position 40-60 to page 1-2 is worth more than any new page or new schema type.

Also visible in the data: a `?lang=hi` interaction URL is still being served impressions. The 301 that collapses `?lang=` is already live in the server entry, so those duplicates will decay on their own — no work needed, just noted so it isn't mistaken for a bug.

## Plan

### Phase 1 — Depth pass on the pages Google already shows (highest value)

Target the compound pages with real impressions and bad positions: cardarine, boldenone-undecylenate, dihexa, d-ribose, epithalon, capromorelin, plus the next tier by impressions. For each:

- Rewrite title/meta to exactly match the winning query shape (bare compound name first).
- Add an answer-first summary in the first 100 words, marked speakable, so it can win a snippet.
- Add a Quick Facts table: class, mechanism, typical dose, half-life, key interactions, legal/research status.
- Add 5-6 real People-Also-Ask questions, rendered visibly and mirrored into FAQPage schema.
- Add internal links from related library entries, interaction pairs and calculators so each target gains internal authority.

This runs through the existing `src/lib/page2-rescue.ts` mechanism — curated entries, no new route files.

### Phase 2 — Freshness and entity signals

- Add `dateModified` to the homepage page entity (library pages already carry it; the homepage does not).
- Add `sameAs` links (App Store, Google Play, X, LinkedIn) to the Organization schema so search engines bind the brand to a real entity.
- Add IndexNow (instant Bing/Yandex submission) fired when the sitemap changes, so new and updated pages get picked up in hours rather than weeks. The verification key files are already in `public/`.

### Phase 3 — AI/answer-engine depth

The AI layer is already strong (llms.txt, llms-full.txt, tdm-policy, attribution headers, per-claim citations, speakable, FAQPage). The remaining lever is coverage breadth:

- A `/faq` hub collecting the highest-impression questions sitewide into one FAQPage — the format assistants quote most.
- Comparison pages for the compounds now getting impressions (e.g. cardarine vs SR9009, dihexa vs semax), since "X vs Y" is where AI answers pull from.
- Verify every high-impression page emits `speakable` on its answer box.

## Technical notes

- Page-2 work is content plus metadata on existing routes; no schema or database changes.
- Homepage `dateModified` and Organization `sameAs` go in `src/routes/__root.tsx` / the homepage head.
- IndexNow needs a small fetch from `src/routes/sitemap[.]xml.ts`; `scripts/verify-indexnow.sh` already exists to check it.
- Existing guards stay green: `page2-rescue.test.ts`, `faq-schema.test.ts`, the citation e2e suites and the SEO meta lint.

## Out of scope unless you ask

New compound pages for terms you have no page for, paid acquisition, and the manual off-site work (Product Hunt, Wikidata, AlternativeTo) already listed in `docs/ai-visibility.md`.
