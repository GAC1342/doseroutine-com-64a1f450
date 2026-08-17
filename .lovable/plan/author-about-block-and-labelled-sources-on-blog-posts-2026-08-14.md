# Author/about block and labelled sources on blog posts

Goal: strengthen trust signals (E-E-A-T) on `/blog/*` posts with a visible "About the author" block and a clearer, clearly labelled sources list — using only claims that are true today. No invented person, no invented credentials, no clinician review claim.

## 1. Author / about block

New component `src/components/editorial-byline.tsx`, rendered twice on each post:

- **Compact byline under the H1**: "By the DoseRoutine Editorial Team · Published <date> · Last reviewed <date>" with a link to the editorial policy.
- **Full "About the author" card near the end** (above References), containing:
  - Who: DoseRoutine Editorial Team — the team that maintains the 476-compound library and 308 interaction rules behind doseroutine.com.
  - What we do: summarise published trials, FDA/EMA regulatory documents and company announcements into plain-English updates; every factual claim carries a linked source.
  - Honest limits: written and reviewed by the editorial team, not by a licensed clinician; educational content, never a recommendation of what to take.
  - Links: `/sources` (methodology), `/editorial-policy` (corrections and AI disclosure), `/about`, and `mailto:support@doseroutine.com` for corrections.

Copy lives in one place (`src/lib/editorial-author.ts`) so the same wording feeds the visible block and structured data and can never drift.

## 2. Clearly labelled sources list

Upgrade the existing "References & sources" section on posts:

- Rename the heading to "Sources & references" and add a one-line label above the list: how many sources, that each links to the primary document, and the last-reviewed date.
- Each entry shows the publisher/type label (e.g. Peer-reviewed, Regulatory, Company announcement) derived from the URL host, followed by the citation and the direct link.
- External links get `rel="nofollow noopener"` (currently `noopener noreferrer`), consistent with the `/sources` page.
- The section carries a stable `id="sources"` so citation markers and other pages can deep-link to it. Renders nothing if a post has no refs.

## 3. Structured data

In `src/lib/blog-seo.ts`, keep the existing Organization `author`/`publisher` nodes and add to the Article node:

- `citation[]` built from the post's real refs (URL + citation text).
- `reviewedBy` pointing at the same Organization entity, plus `lastReviewed` from the post's updated date.

No Person node is added, so the Organization/Person JSON-LD lint keeps passing.

## Technical details

Files touched:

- `src/lib/editorial-author.ts` (new) — shared author copy and links.
- `src/components/editorial-byline.tsx` (new) — compact byline + about card variants.
- `src/components/blog-sources.tsx` (new) — labelled sources list with host-derived type labels.
- `src/routes/blog.$slug.tsx` — render byline under the header, about card and new sources section replacing the inline `<ol>`.
- `src/lib/blog-seo.ts` — `citation[]`, `reviewedBy`, `lastReviewed` on the Article node.

Tests:

- Unit test that the sources list labels each ref, emits `rel="nofollow noopener"`, and renders nothing with zero refs.
- JSON-LD test asserting `citation[]` length matches the post refs and that entity lint still passes.
- Existing blog JSON-LD, FAQ anchor parity and anchor-text lint suites must stay green.

Scope note: blog posts only, per your answer. The same components would drop into library/guide pages later without change.
