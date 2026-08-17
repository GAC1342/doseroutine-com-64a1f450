# Per-claim sourcing, visible Sources sections, and a /sources methodology page

Goal: make every safety claim traceable to a specific document, not a publisher homepage — and never show a placeholder when a real source is missing.

Ground rule applied everywhere below: no invented or hardcoded citation URLs. A citation renders only when a stored source resolves to a real document URL. Empty source data renders nothing — no "source pending", no generic homepage link.

## 1. Inline citation markers on claims

Today interaction warnings carry `source_refs` (free-text strings) and compound pages carry `sources_md` (publisher names only). Publisher-name entries currently resolve to that publisher's *search* endpoint, which is exactly the "homepage of the source" problem.

- Add a shared `<CiteMarker>` component rendering a superscript numbered marker that links to the specific document URL.
- A marker renders only for sources classified as document-level (PubMed record, DailyMed/FDA SPL page, a stored absolute URL, a DOI). Search-endpoint results (`isSearch: true`) are excluded from markers — they stay in the Sources list only.
- Attach markers to:
  - Each interaction warning's recommendation/mechanism line on the safety page, the interaction detail drawer, the public interaction checker results, and the public pair pages.
  - Compound facts on library pages that have a resolvable document source (mechanism, evidence, warnings blocks).
- Markers anchor to the numbered entry in that page's Sources section, so the number a reader sees matches the list below.

## 2. Sources section on every library and compound page

- Extend the existing "Sources and references" section so every entry shows publisher, title, and the direct URL — not just a label.
- All external links get `target="_blank" rel="nofollow noopener"` (currently `noopener noreferrer` without `nofollow`).
- Add the same section to public interaction pair pages and to the public interaction checker results, which today only put citations in JSON-LD.
- Each Sources section ends with a link to `/sources`.
- Sections with zero resolvable sources are not rendered at all.

## 3. Visible "Last reviewed" line

- Add a `last_reviewed` date column to `compound_content` (migration, nullable, no backfill with fake dates).
- Render `Last reviewed: <date>` near the top of each library page, directly under the H1, driven by that field. When it is null, fall back to the existing `updated_at`; when both are missing, render nothing.
- Feed the same value into `dateModified` / `article:modified_time` so the visible date and the schema date can never disagree.

## 4. MedicalWebPage JSON-LD on library pages

- Add a `MedicalWebPage` node to the existing library page graph, keeping every current node (`Article`, `WebPage`, `BreadcrumbList`, `Organization`, `Product`/`DefinedTerm`, speakable) untouched.
- The node carries `citation[]` built from the same resolved document sources the page renders, plus `lastReviewed` from the field above, `reviewedBy`, and `about` for the compound entity.
- The node gets its own `@id` so the existing duplicate-JSON-LD lint keeps passing.

## 5. /sources methodology page

- New route `src/routes/sources.tsx` explaining: where the interaction rules come from (named publisher classes, not invented figures), how a rule is written and reviewed, the review cadence, how to report an error, and how citation links are resolved.
- Reuses the existing verified rule count rather than restating a number that could drift.
- Linked from the site footer link list and from every library / pair page Sources section.
- Added to the sitemap with its own head metadata and Article/WebPage JSON-LD, consistent with the other policy pages.

## Technical details

Files touched:

- `src/lib/authority-sources.ts` — add a document-vs-search classification and a `citationNumber` ordering shared by markers and the Sources list; extend `AuthoritySource` with `title` where the underlying record has one (PubMed rows already carry `title`, `journal`, `year`).
- `src/lib/source-refs.ts` — unchanged shape; used as the parse layer for `interaction_rules.source_refs`.
- `src/components/cite-marker.tsx` (new), `src/components/source-chips.tsx`, `src/components/study-reference-list.tsx` — `nofollow` on external links, numbering, anchor ids.
- `src/routes/library.$slug.tsx` — last-reviewed line, MedicalWebPage node, markers, upgraded Sources section, `/sources` link.
- `src/routes/interactions.$pair.tsx`, `src/routes/interaction-checker.tsx`, `src/routes/_authenticated/safety.tsx`, `src/components/interaction-detail-drawer.tsx` — visible sources + markers.
- `src/routes/sources.tsx` (new), footer link lists in `src/routes/index.tsx` and `src/routes/dose-routine.tsx`, `src/routes/sitemap[.]xml.ts`.
- One migration adding `compound_content.last_reviewed date`.

Tests:

- Unit tests that a search-endpoint source never produces an inline marker, that empty source data renders no Sources section, and that every rendered external source link carries `rel="nofollow noopener"`.
- JSON-LD tests asserting `MedicalWebPage` is emitted with `citation[]` and `lastReviewed`, and that the existing duplicate-schema lint still passes.
