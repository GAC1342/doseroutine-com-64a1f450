# AI answer-engine visibility: fixes for the 5 points raised

## What I verified first (live, on doseroutine.com)

1. **Crawler access — you are NOT blocked.** The live `robots.txt` starts with `User-agent: *` / `Allow: /`, and there is no `Disallow` rule for GPTBot, ClaudeBot, PerplexityBot, Google-Extended or CCBot. So all five can crawl every public page today. The advice is still worth acting on for one reason only: some auditors and AI-visibility tools only credit *explicit* allow blocks, and a future CDN default could change things. Making it explicit is a 5-minute, zero-risk change.
2. **Schema is already strong** on library and calculator pages — Article, WebPage, BreadcrumbList, Organization, FAQPage, HowTo (calculators) and `speakable` blocks are all emitted. This point is already done; I'll re-verify with a validator rather than rebuild it.
3. **The real on-page gap is point 3.** Library pages only show the short "Quick answer" block on the subset of compounds that have a curated rescue answer. Every other compound page leads with the long "Educational reference — not medical advice" disclaimer before any definition. That is exactly the text an AI model lifts, and it says nothing about the compound.

## Plan

### 1. Explicit AI crawler allow-list in robots.txt
Add named blocks above the wildcard for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, CCBot, Applebot-Extended, Bytespider, meta-externalagent — each with `Allow: /` plus the same private-route disallows the wildcard has, so app screens stay out. Then confirm the published file live.

### 2. Lead every library page with a 1–2 sentence definition
- Add a short definitional lead paragraph rendered directly under the H1, **above** the disclaimer, on all ~450 compound pages.
- Source order: curated quick-answer text if present → the compound's existing summary/overview field → a generated one-liner from name + category + primary use already stored on the record. No invented facts.
- Mark it with the existing `.dr-speakable-intro` class so it's covered by the `speakable` schema already in the head.
- Move the long disclaimer below the definition and the quick facts (it stays on the page, just not first).
- Apply the same "definition first, disclaimer second" order to guide pages and comparison pages.

### 3. Schema verification pass (no rebuild)
Run the existing structured-data audit across a sample of library, calculator, guide, blog and roundup pages and confirm Article + FAQPage + Organization + Breadcrumb all parse clean. Fix only what fails.

### 4. Fact-consistency audit across the web
Build a single canonical facts sheet (compound count, price points, one-sentence company description, founding/contact details) and check it matches: homepage and /about, `llms.txt` and `llms-full.txt`, Organization JSON-LD, the Google Play listing text, the App Store listing text, and `/promo-kit` copy. Report every mismatch and fix the ones that live in the codebase; the store listings you'd paste in.

### 5. Third-party mentions — deliverable, not a code change
Your point 2 is correct and no code change moves it. I'll produce a short outreach kit: a ranked list of target roundups/directories that AI engines cite most for this category, plus ready-to-paste submission blurbs and a Reddit/forum participation guide (value-first, no spam). You decide whether to act on it.

## Technical notes

- `public/robots.txt` — add named user-agent blocks; wildcard block unchanged.
- `src/routes/library.$slug.tsx` — new lead paragraph component above the disclaimer `<aside>`; disclaimer moved after quick facts.
- No schema, canonical, sitemap or head() changes beyond verification.
- Tests: extend the existing SEO/attribution test suite with a guard that every library page renders a non-empty definition before the disclaimer, and a robots.txt test asserting the five named agents are allowed.

## Out of scope
No changes to conversion copy, pricing, navigation or app behaviour.
