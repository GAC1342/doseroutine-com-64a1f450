# Image sitemap coverage for long-tail posts and key pages

## What I found (audit)

- The sitemap already supports Google Images: it declares the `image:` namespace and emits `<image:image>` children with title and caption (`src/routes/sitemap[.]xml.ts`).
- Only blog post URLs ever get an image, and only when a unique card exists. The site-wide fallback card is deliberately skipped.
- Unique branded cards exist for just 4 posts (`public/og/blog/`): retatrutide-triumph-phase-3-results, orforglipron-foundayo-oral-glp-1, glp-1-muscle-loss-myostatin-combinations, klotho-partial-reprogramming-first-human-trials.
- **All 10 long-tail posts have no card**, so they currently appear in the sitemap with zero image entries: bacteriostatic-water-for-10mg-retatrutide, when-will-orforglipron-be-available, missed-weekly-glp-1-dose, reconstituted-peptide-fridge-life, tirzepatide-mg-to-units, glp-1-injection-site-rotation, best-time-of-day-weekly-glp-1, metformin-and-glp-1-together, protein-while-on-a-glp-1, signs-a-peptide-vial-has-gone-bad.
- Cause: the card generator (`scripts/generate-blog-og.py`) parses only `src/lib/blog-posts.ts`, while the long-tail posts live in `src/lib/blog-posts-longtail.ts`.
- **No non-blog page carries an image entry** — the 8 `/best-*` roundups, 4 `/for/*` pages, calculators, guides and library hubs are all image-less in the sitemap, even where a card image already exists on disk (e.g. `public/og/guide-ed.jpg`, `public/og/hub-testosterone.jpg`).

## What I will build

### 1. Branded cards for the 10 long-tail posts
Extend the existing generator to read long-tail posts too, so it renders all posts in one pass. Cards keep the current DoseRoutine identity — teal gradient, coral accent, wordmark and logo, post category eyebrow, post headline — no stock or generic imagery.

### 2. Branded cards for key marketing and tool pages
Generate one unique card per page, using the page's own H1/short answer as the headline plus a page-type eyebrow ("App comparison", "Built for", "Calculator", "Guide"):
- 8 `/best-*` roundups
- 4 `/for/*` pages (TRT, peptides, GLP-1, biohackers)
- the calculator pages and the main guide/hub pages that already rank
Pages that already have a hand-made branded card on disk keep it — no regeneration, no visual change.

### 3. Wire images into the sitemap
Add a single source of truth mapping page path to `{ loc, title, caption }` and attach it to the matching sitemap entries, reusing the existing `imageTag` output. Titles use the page H1; captions use the page's meta description, so each image entry is descriptive rather than boilerplate. No layout or page rendering changes.

### 4. Guardrails so this cannot silently regress
- A test asserting every blog post URL in the sitemap has exactly one non-fallback `<image:image>`, and that every mapped marketing/tool page has one.
- Reuse the existing OG validators (file exists, 1200x630, correct MIME, reachable) over the newly generated set.
- Wire the check into the existing SEO CI workflow next to the other sitemap and blog checks.

## Technical notes

- `scripts/generate-blog-og.py` gains a second source file and regenerates `src/lib/blog-og-manifest.ts` (auto-generated) so `blogPostImageUrl` resolves the new cards with no route changes.
- New `scripts/generate-page-og.py` writes `public/og/pages/<slug>.png` for the marketing and tool pages, and a new `src/lib/sitemap-images.ts` maps path to image metadata for the sitemap.
- Sitemap edits stay inside `src/routes/sitemap[.]xml.ts`; the ETag/cache logic is untouched, and freshness-based `priority`/`changefreq` behaviour is unchanged.
- After merge, cards are served as static files from `public/`, so no runtime image generation.
