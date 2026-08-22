# Homepage audit cleanup + top-tier article artwork

Scope: the homepage (`doseroutine.com/`) audit items you pasted, plus a full
regeneration of the 14 article hero images at real production quality.

## What the audit is actually complaining about

I fetched the live homepage and measured it, so these are confirmed facts, not guesses:

| Audit item | What's really there |
|---|---|
| 6 images without `title` | All 6 `<img>` tags on the page have `alt` but no `title` |
| Node with more than 60 children | `<head>` has 82 child nodes (8 separate JSON-LD blocks, 22 JS preloads, 35 links) |
| No / has micromarkup | Only 2 microdata scopes in the whole body |
| Is http | 102 hits, every one of them the `xmlns="http://www.w3.org/2000/svg"` on inline icons |
| Has misspelling | The flagged words (glycinate, DHA, IU, llms, txt, https, doseroutine…) come from the 6.8 KB glossary structured-data block and the untranslated language switcher list |
| Low content rate | 2,650 visible words against 167 KB of HTML — roughly 10% text |
| SEO friendly URL length | The homepage URL is `/`; this one is a false positive with nothing to fix |

## The fixes

**1. Image title attributes**
Add a descriptive `title` to every image on the homepage: the three app
screenshots, the two testimonial photos, and the header logo. Titles will be
distinct from the alt text (alt describes, title labels) so both read well.
Testimonial photos stay exactly as they are — real people, not replaced.

**2. Shrink the head below 60 children**
- Merge the 8 separate structured-data blocks into a single `@graph` block (‑7 nodes).
- Bundle the 13 one-icon JS chunks the homepage preloads into a single icon chunk (‑12 nodes).
- Drop the duplicate `shortcut icon` link and any duplicated meta.
Target: ~60 head nodes, down from 82, which also speeds up first paint.

**3. Real microdata in the body**
Add schema.org microdata attributes to the actual visible homepage content —
the product block (`SoftwareApplication` with name, description, offers,
screenshots), the testimonials (`Review` with author and reviewBody), and the
FAQ block (`Question`/`Answer`). This is markup on real on-page content, not
hidden data, so the "no micromarkup" check passes on substance.

**4. Kill the "is http" flag**
Strip the `xmlns="http://www.w3.org/2000/svg"` attribute from inline icons.
Inline SVG in HTML doesn't need it — the namespace is implied — so all 102
`http://` strings disappear with no visual change.

**5. Fix the misspelling flags**
- Move the glossary structured-data block off the homepage to a single canonical
  location and reference it by ID, so the raw jargon list stops being scanned as
  homepage body vocabulary.
- Tag every language-switcher option with its own `lang` attribute and
  `translate="no"` so Español / Français / 日本語 etc. are read as foreign-language
  labels rather than English typos.
- Extend the existing spelling glossary so remaining legitimate terms are marked
  `spellcheck="false"`.

**6. Raise the content rate**
Two sides of the same ratio:
- Remove the markup bloat above (merged structured data, fewer preloads).
- Add one genuinely useful content section to the homepage: a short "What
  DoseRoutine does and who it's for" block covering the calculator, interaction
  checker, compound library and reminders in plain language, with internal links
  to those pages. Real copy a visitor benefits from, no keyword stuffing.

**7. Regenerate all 14 article hero images at top-tier quality**
The current heroes are 5–20 KB flat generic clip-art. Replacing them with:
- Premium-tier generation (the model tuned for polished, legible, on-brand visuals).
- A consistent DoseRoutine art direction: coral/teal palette, soft light
  background, real depth and material, one clear subject per image.
- 1200×630 at full quality, exported to WebP and AVIF with a PNG fallback,
  sized properly rather than crushed.
- Unique, descriptive alt plus a title attribute on each.
Each of the 14 posts gets its own distinct image, then the article list, `og:image`
and `Article` structured data all pick up the new artwork.

## Verification

- Re-fetch the homepage and confirm: 0 images without `title`, head under 60
  children, 0 `http://` strings, microdata scopes present on product/reviews/FAQ,
  and an improved text-to-HTML ratio.
- Run the SEO regression, schema snapshot and article tests.
- Open each new hero image and check it visually before shipping.

## Technical notes

Files involved: `src/components/app-screenshots.tsx`, `src/components/testimonials.tsx`,
`src/components/brand-logo.tsx`, `src/routes/index.tsx`, `src/routes/__root.tsx`
(structured-data merge), `src/components/language-switcher.tsx`,
`src/lib/spelling-glossary.ts`, `src/lib/article-hero.ts`, `public/articles/*`,
and the Vite manual-chunk config for the icon bundling.
