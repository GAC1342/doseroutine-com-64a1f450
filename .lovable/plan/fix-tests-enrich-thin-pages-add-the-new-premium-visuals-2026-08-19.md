# Fix tests, enrich thin pages, add the new premium visuals

Three pieces of work: clear the last four failing tests, bring every thin page above the audit's content threshold, and put your six new mockups to work in a way search engines and AI assistants can actually find.

## 1. Fix the remaining test failures

Four failures, two causes — both real gaps, not flaky tests.

- **Homepage attribution signal.** The guard requires every route to carry a machine-readable publisher signal. When sitewide JSON-LD was merged into a single graph block, the homepage stopped declaring its own publisher reference. Fix: re-add an explicit publisher/Organization reference to the homepage head so the signal is present on the page itself.
- **Missing internal-link plan for `/best-medication-reminder-app`.** That pillar page was added later and never got an entry in the marketing link plan, so the "related research" block renders empty. Fix: author a real link plan for it — at least five descriptive links spread across four or more research posts, including the retatrutide and orforglipron sections the guard checks for.

Then run the whole suite and confirm zero failures.

## 2. Enrich every thin page

Twelve marketing/legal pages already got unique editorial prose. The remaining pages still under the threshold get the same treatment — 300-500 words each of genuinely useful, page-specific copy (not filler, not keyword stuffing):

`/blog`, `/articles`, `/help`, `/for`, `/calculators`, `/closed-testing`, `/vs/medisafe` and the other comparison pages, `/best-peptide-tracking-app`, `/reconstitution-calculator`, plus any others still flagged.

Each block answers what a visitor to that specific page actually wants: what the page covers, how to use the tool, what the numbers mean, who it's for, and where to go next. Every block links onward to a relevant tool or article so the copy earns its place.

## 3. The new images

**Answer on quality: yes.** Those mockups are the premium 3D render tier, and I can generate that quality or better on demand. From here on, every new image uses that tier — no more generic flat output. Once these are in, I can regenerate the older assets to match on your word.

**Where the six go.** The homepage screenshot strip stays exactly as it is — it says "real screens, not mockups" and it should keep being true. The mockups go into a new visual feature showcase section on the homepage, below the real screenshots, each captioned with the feature it shows:

| Image | Feature | Also used on |
| --- | --- | --- |
| Meal scan | AI meal scanning and macros | Meal scan feature page, social card |
| Injection site rotation | Site rotation map | Injection tracking page, social card |
| Today timeline | Daily dose plan | Homepage hero area, social card |
| Blood work tracker | Lab trends and progress photos | Blood work page, social card |
| Notifications | Dose reminders | Reminders/pillar page, social card |
| Reconstitution calculator | Peptide calculator | Calculator pages, social card |

**Apple / Android / web friendly.** Each image ships as:
- WebP at 1200w, 800w and 400w, with the original as a JPEG fallback, served through `<picture>` + `srcSet` so phones download the small one.
- Correct intrinsic width/height so nothing shifts while loading (protects Core Web Vitals).
- Hosted on the CDN, not committed as binaries in the repo.

**Findable by search and AI.** Each image gets:
- A descriptive `alt` and `title` written for the feature, not the filename.
- Inclusion in the image sitemap with a caption and title, so Google Images and AI crawlers index them.
- `og:image` / `twitter:image` on the matching page, using the absolute URL, so link previews and AI summaries pick up a real product visual instead of a generic icon.
- `ImageObject` structured data attached to the relevant page schema, which is what AI answer engines read when citing a visual.

## Verification

- Full test suite green, including the image `alt`/`title` guard and the SEO regression guard.
- Re-measure word counts on every previously-thin page.
- Render the new section on mobile, tablet and desktop and confirm no layout shift and no oversized downloads.

## Technical notes

New images uploaded via the assets CLI as CDN pointers; responsive variants generated at build-prep time. Feature showcase built as a new component and mounted in `src/routes/index.tsx`. Image metadata flows through the existing `sitemap-images.ts` and per-route `head()` helpers. Link plan lives in `src/lib/marketing-blog-links.ts`; thin-page copy extends `src/content/page-prose.ts`.
