# Brand visibility audit: "dose routine"

## What the live data actually says

Search Console, last 28 complete days (2026-07-11 → 2026-08-07):

- 22 clicks, 21,974 impressions, average position 62
- Homepage is **indexed**, Google picked `https://doseroutine.com` as canonical, crawl successful
- **No brand query appears in the reported top queries.** Every reported query is a compound term (dihexa, cardarine, epithalon, capromorelin, boldenone…). Search Console reports no data for "dose routine" or "doseroutine" in this window.

Semrush returns no SERP and no keyword data for "dose routine", "doseroutine", "dose routine app". That means the phrase has essentially no tracked search demand yet — it is not that competitors outrank you, it is that almost nobody is searching the brand name, so there is nothing for the brand page to win.

What already exists in the project: an indexable `/dose-routine` page (live, 200) explaining the two spellings, Organization/Brand schema with alternate names, and a logo ImageObject.

## The actual gap

Brand recognition — by Google and by AI assistants — comes from the entity being confirmed in places other than your own site. Right now the `sameAs` list in the site's brand schema contains exactly one link (a Telegram URL). No App Store listing, no Google Play listing, no social profiles, no directory listings. A brand with one off-site reference is not something an AI assistant can confidently name.

So: nothing is broken on the site. The brand is simply new and thinly referenced off-site.

## Plan

### 1. Complete the entity proof (`sameAs`)
Add every live official profile URL to `BRAND_SAME_AS` in `src/routes/__root.tsx` — App Store listing, Google Play listing, X, LinkedIn, TikTok, Reddit, plus the existing Telegram. Only live URLs; a 404 in `sameAs` hurts. I need the list from you.

### 2. Make the brand page rank-ready
Strengthen `/dose-routine` so it is the unambiguous answer for the brand query: add a short "What is Dose Routine?" answer block in speakable markup, an FAQPage covering "Is Dose Routine the same as DoseRoutine?", "Is Dose Routine free?", "What does Dose Routine do?", and prominent internal links from the homepage footer and `/about`.

### 3. Off-site brand corroboration
Add a checklist doc and the on-site pieces that support it: consistent name/description/logo everywhere (store listings, social bios, Crunchbase, Product Hunt, AlternativeTo, G2/Capterra-style directories). Same one-sentence description everywhere — inconsistent descriptions are what stops assistants from merging the entity.

### 4. AI-assistant surfaces
Extend `public/llms.txt` and the generated `llms-full.txt` with an explicit brand block: both spellings, one-line definition, what it does, the canonical URL, and the top entry points (checker, library, calculators).

### 5. Measurement
Add a brand-query check to the existing SEO CI scripts: verify `/dose-routine` stays indexable, canonical is self-referential, and `sameAs` contains no dead URLs. Then re-read Search Console in ~4 weeks to see whether brand impressions start appearing.

## Technical notes

Changes are confined to `src/routes/__root.tsx` (`BRAND_SAME_AS`), `src/routes/dose-routine.tsx` (FAQ + speakable + schema), `public/llms.txt`, `src/routes/llms-full[.]txt.ts`, footer/about internal links, and one new validation script wired into the existing SEO workflow set.

## What I need from you

The list of live official profile URLs (App Store, Google Play, X, LinkedIn, TikTok, Reddit, anything else). Everything else I can build without input.
