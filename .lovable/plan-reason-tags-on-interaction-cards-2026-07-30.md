# Reason tags on interaction cards

Add short, scannable tags (like "Absorption", "CYP metabolism", "Sedation") next to the severity badge on each interaction card, so you can tell *why* two items interact at a glance without expanding the card.

## What you'll see

- Each interaction card shows 1–2 small tag chips beside its severity badge (e.g. `Iron + Zinc` → `AVOID` `Absorption`).
- Tags are muted/neutral styling so they never compete with the severity colour.
- Note cards keep their collapsed layout — the tag stays visible even when collapsed, since that's the point.
- The Safety search box also matches tag names, so typing "absorption" finds all absorption-related cards.
- Cards with no recognisable reason simply show no tag (no filler labels).

## Tag vocabulary

Derived from the interaction's mechanism text: Absorption, CYP metabolism, Kidney clearance, Bleeding risk, Blood pressure, Blood sugar, Serotonin, Sedation, Hormonal, Liver strain, Electrolytes, Stimulant load, Same axis (only when not already shown as its own chip).

## Technical notes

- New `src/lib/reason-tags.ts`: pure function `reasonTags(mechanism, recommendation)` returning at most 2 tags, using an ordered keyword→tag map. No schema change, no AI call, no network — tags are computed from the existing `mechanism` string.
- `src/components/reason-tag.tsx`: tiny presentational chip matching the existing pill styling used for "Same axis".
- `src/routes/_authenticated/safety.tsx`: render tags in the badge row of `WarningCard` (and the user-note card where a mechanism exists); extend `cardMatchesQuery` to include tag labels.
- Tests: unit tests for `reasonTags` keyword mapping and a render test asserting tags appear on a card and are searchable.
