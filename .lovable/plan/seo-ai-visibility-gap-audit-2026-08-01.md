# SEO + AI-visibility gap audit

What's already strong: server-rendered pages, 601-URL sitemap, per-route titles/descriptions/canonicals, Article + FAQ + Breadcrumb + speakable schema on most content pages, robots.txt with private surfaces blocked, llms.txt with an attribution policy, IndexNow pings, and the brand-entity work just shipped (logo ImageObject, Brand node, "Dose Routine" alternate names).

Below are the real remaining gaps, ordered by impact.

## 1. No `sameAs` profile links on the Organization (highest impact)

`sameAs` is the single strongest signal Google and AI assistants use to confirm an entity is real and to merge "Dose Routine" with "DoseRoutine". Right now the sitewide Organization node has none.

Add a `sameAs` array to the Organization/Brand nodes in `src/routes/__root.tsx` with every profile that exists: App Store listing, Google Play listing, TikTok, Telegram, X/Twitter, LinkedIn, Reddit, Crunchbase, and a Wikidata/Wikipedia entry if one ever exists. Only real, live URLs go in — fake or 404 links hurt.

I need the list from you (see Questions).

## 2. No editorial / author entity (E-E-A-T gap)

477 Article pages now carry `author: DoseRoutine`, but "DoseRoutine" as an author has no page describing who reviews the content or on what basis. Health-adjacent content without a visible reviewer/editorial standard is exactly what Google's quality systems and AI answer engines discount.

- New route `/editorial-policy`: how compound data is sourced (PubMed/PMIDs, DailyMed, manufacturer labels), how often it's reviewed, correction process, the not-medical-advice stance.
- Give it `Organization` + `WebPage` schema and link it from every Article node via `publishingPrinciples` and from the footer.
- Link `author` on Article schema to a stable `#organization` `@id` rather than a bare string, so the entity graph connects.

## 3. No `/llms-full.txt`

`llms.txt` is the index; `llms-full.txt` is the convention for the full crawlable text corpus that AI assistants ingest in one fetch. Add a generated `src/routes/llms-full[.]txt.ts` server route that emits the full text of the interaction-checker landing pages, calculators, guides, and top library compounds with canonical URLs and the attribution line. Reference it from `llms.txt` and `robots.txt`.

## 4. No feed for new content

There's no RSS/Atom feed. Feeds are still consumed by aggregators, news/answer engines, and several AI crawler pipelines for freshness discovery. Add `src/routes/feed[.]xml.ts` covering guides, comparisons, and newest library pages, and link it with `<link rel="alternate" type="application/rss+xml">` in the root head.

## 5. Freshness signals are incomplete

Only 36 of ~98 top-level routes emit `dateModified`. Pages with no freshness date get re-crawled less often and get cited less by AI answers that prefer recent sources. Add `datePublished`/`dateModified` to the remaining content routes and surface a visible "Last reviewed" line on library and guide pages (visible dates matter as much as schema ones).

## 6. Brand-query landing page for the two-word spelling

Schema alternate names help, but there's no page that can actually rank for the query "dose routine". Add a short `/dose-routine` page (canonical, indexable) that explains DoseRoutine is also written as two words, what it does, and links to the checker/library. Wire it into the sitemap, llms.txt, and internal links.

## 7. Language signals

The site has multi-locale UI but no locale URLs, so there are no hreflang alternates to emit. Add a single `<link rel="alternate" hreflang="x-default">` self-reference on public routes so crawlers don't guess. (Full localized URLs would be a bigger project — not proposed here.)

## 8. Smaller items

- `WebPage` `mainEntity` / `about` links on hub pages so crawlers know each hub's topic entity.
- `ItemList` schema on `/library`, `/calculators`, `/vs` index pages (currently only 9 routes use it) — this is what drives list-style AI answers.
- `Sitemap:` + `llms-full.txt` reference block in `robots.txt`.
- Add `mainEntityOfPage` to Article nodes missing it.
- Ensure every hub page links down to its children with descriptive anchor text (not "learn more") — the biggest lever for internal-link relevance.

## Technical notes

All schema changes stay in the existing `head()` JSON-LD pattern; the shared `BRAND_ALTERNATE_NAMES` / `BRAND_LOGO` constants in `src/routes/__root.tsx` get a `BRAND_SAME_AS` sibling. New text routes follow the existing `sitemap[.]xml.ts` server-route pattern. New pages get added to `src/routes/sitemap[.]xml.ts`, `public/llms.txt`, and the SEO validation scripts so CI catches regressions.

## Questions before I build

I need the `sameAs` URLs from you (item 1) — App Store, Google Play, TikTok, Telegram, and any other official profiles. Everything else I can build without input.
