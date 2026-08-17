# Breadcrumbs on blog tag archive pages

Tag archive pages (e.g. Retatrutide, GLP-1 receptor agonist, Phase 3) already show a small
trail reading "Research & Updates / Tags / Compound", but it stops short: the current tag
itself is never shown, the kind step is dead text, and search engines get no breadcrumb data.
The tag hub at /blog/tag has no trail at all.

## What changes

**Full, clickable trail on each tag archive page**

```text
Home / Research & Updates / Tags / Compound / Retatrutide
```

- Every step before the last is a link; the last step is the current tag, shown as plain
  text and marked as the current page for screen readers.
- The kind step ("Compound", "Mechanism", "Trial phase") links to that section of the tag
  hub, so one tap jumps to the full list of sibling compounds, mechanisms, or phases.
- Long tag names stay on one tidy line on small screens and wrap rather than overflow.

**Tag hub gets its own trail**

`/blog/tag` shows `Home / Research & Updates / Tags`, and each kind section gets an anchor
target so the breadcrumb link from an archive page lands on the right group.

**Jump-to-sibling row on archive pages**

Under the heading, a compact row of the other tags in the same kind (capped, with an
"All tags" link at the end) so readers can move sideways between compounds without going
back to the hub.

**Search engine breadcrumbs**

Both routes emit BreadcrumbList structured data matching the visible trail, so Google can
show the DoseRoutine > Research > Tags > Retatrutide path in results.

## Technical notes

- New `src/components/blog-breadcrumbs.tsx`: a small presentational trail component taking
  a list of `{ label, to, params, hash }` crumbs, rendering `<nav aria-label="Breadcrumb">`
  with an ordered list, `aria-current="page"` on the last item, and TanStack `<Link>` for
  every linked crumb (no raw `<a href>` for dynamic segments).
- `src/routes/blog.tag.$kind.$slug.tsx`: replace the inline nav with the new component;
  add `breadcrumbScript` from `src/lib/breadcrumb-schema.ts` to the route `scripts` array
  alongside the existing CollectionPage JSON-LD; add the sibling-tag row built from
  `BLOG_TAG_ARCHIVES` filtered by `archive.tag.kind`.
- `src/routes/blog.tag.index.tsx`: add the same breadcrumb component and BreadcrumbList
  script; add `id={kind}` and `scroll-mt` to each kind section heading block.
- Kind link target: `/blog/tag` with `hash: kind` (values `compound`, `mechanism`, `phase`).
- Tests: extend the blog route tests with a unit test for crumb construction (labels,
  hrefs, last-crumb-not-linked) and a check that the BreadcrumbList JSON-LD item order
  matches the visible trail.

No data, schema, or backend changes.
