# SEO & AI-crawlability verification pass

Most of the ten-point checklist is already built on DoseRoutine. Rather than rebuild it, this pass verifies each point across every public route with the audit tooling already in the project, fixes whatever genuinely fails, and adds clearly-labelled founder notes for originality.

## What is already confirmed in place

- Server-rendered routes (TanStack Start SSR) — no client-only content shell.
- Per-route `head()` on every public page; layout-only files (`library.tsx`, `calculators.tsx`, `library.womens-health.tsx`) intentionally have none, and `library.peptide-stacks.tsx` is a 301 alias.
- `public/robots.txt` explicitly allows Googlebot, Google-Extended and 20+ other agents, with private app routes disallowed.
- Dynamic `/sitemap.xml` server route.
- JSON-LD helpers for Organization/WebSite/Article/FAQ/Breadcrumb, plus a Rich Results validator script.
- Shared image component with WebP `<source>`, explicit width/height, lazy loading and alt text.
- Semantic shells (`<main>`, `<nav aria-label>`, skip link) in the app shell and content page components.

## Step 1 — Run the full audit sweep

Run the existing scripts across all public routes and collect a single pass/fail table:

- SEO meta lint (title length, description length, canonical, OG/Twitter, duplicate titles)
- Crawl audit (broken links, orphan pages, duplicate routes, redirect chains)
- Rich Results / JSON-LD validation
- axe accessibility scan (ARIA, keyboard, button/link semantics, heading order)
- Performance budget / route bundle checks (CLS, render-blocking, image weight)
- Sitemap vs. route-tree diff

Also trigger the platform SEO review so its findings are reconciled with the local results.

## Step 2 — Fix only what fails

Expected shape of the fixes, subject to what Step 1 reports:

- Any route with a missing, duplicate, over-length title/description, or a canonical that doesn't self-reference.
- Any heading hierarchy break (missing `h1`, skipped level) or missing semantic landmark on a content page.
- Any interactive element that isn't a real `<button>`/`<a>` or lacks a keyboard path and accessible name. One known candidate: the citation modal wrapper uses a `div` with `onClickCapture` — confirm the inner triggers are real buttons and keyboard-reachable.
- Any raw `<img>` bypassing the shared responsive image component (missing WebP, dimensions, lazy loading, or descriptive alt).
- Any sitemap entry that 404s or redirects, and any public route missing from the sitemap.
- Any JSON-LD warning from the validator; keep schema minimal — Organization + WebSite on the homepage, Article/FAQPage/Product only where the page genuinely is one.

## Step 3 — Founder first-hand notes

Add a reusable, clearly-labelled note block (e.g. "From my own tracking") and place drafted first-person notes on the highest-value pages first: the top library compound pages, the calculators, and the interaction checker. Each note is a short observation about tracking practice — schedule design, adherence, logging habits — never a medical claim or personal health outcome. Every note is marked as personal experience, attributed to the existing editorial author record, and dated. You review and edit the wording before publish.

Alongside this, the crawl audit output is used to flag thin or near-duplicate pages that need original input rather than being auto-filled.

## Not doing

Per your instruction: no `llms.txt`, no AI-specific markup, no hidden keyword text, no content chunking.

## Technical notes

- Audit scripts live under `scripts/` (`crawl-audit.mjs`, `axe-scan.mjs`, `validate-rich-results.py`, `check-perf-budget.mjs`, `check-route-bundles.mjs`, sitemap helpers) and already run in CI workflows.
- Canonical/OG tags on marketing and women's-health routes come from shared head helpers (`app-roundup-page.tsx`, `womens-compound-article.tsx`, `womens-hub-page.tsx`, `blog-seo.ts`) — fixes there apply across dozens of routes at once.
- The founder note component reuses `editorial-author.ts` and `attribution-footer.tsx` so authorship and review dates stay consistent with existing E-E-A-T markup.
