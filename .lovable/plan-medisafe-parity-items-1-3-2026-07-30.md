# Medisafe parity: items 1–3

Three shipped in sequence, each independently verifiable.

---

## 1. Color theme picker

### Token layer
Add named palettes in `src/styles.css` scoped by attribute — `[data-theme="blue"]`, `"turquoise"`, `"indigo"`, `"green"`, `"violet"`, `"graphite"` — plus the existing teal as the default (no attribute). Each palette overrides only brand tokens:
`--primary`, `--primary-hover`, `--primary-tint`, `--ring`, `--sidebar-primary`, `--sidebar-ring` and the matching `-foreground` pairs. Every palette gets a matching `.dark[data-theme="x"]` block.

Deliberately **not** themed: `--synergy`, `--caution`, `--warning`, `--avoid`, `--missed`, `--success`, `--destructive`, `--cta`, `--pro`. Severity color carries clinical meaning and must never change with a cosmetic preference; `--cta`/`--pro` stay coral/amber so upgrade moments keep their identity.

Because every component already reads tokens (no hardcoded hex anywhere), zero component changes are needed for the recolor itself.

### Persistence
- `src/lib/theme-provider.tsx` — sets `data-theme` and the `dark` class on `<html>`, exposes `useTheme()`.
- localStorage for instant paint; a `theme` + `color_scheme` column on `profiles` so the choice syncs across devices. localStorage wins on first paint, profile reconciles after auth.
- Inline pre-hydration script in `src/routes/__root.tsx` so there's no color flash.

### UI
New **Appearance** section in `/more`: light / dark / system segmented control, plus a swatch grid. Teal (default) and blue are free; the rest are Pro — locked swatches show the Pro badge and open the existing paywall sheet.

### Guards
- Contrast test asserting AA for every palette's foreground pairs.
- Test asserting severity tokens are byte-identical across all palettes.

---

## 2. Today screen restructure

`src/routes/_authenticated/today.tsx` currently renders one flat event ribbon. Restructure into the pattern Medisafe uses:

- **Next-dose hero.** A single dominant card at the top: compound name, dose, time, and how far away it is. Big take/skip/snooze buttons. If everything's done for the day, it becomes a completion state instead.
- **Time-block grouping.** Remaining events grouped Morning / Afternoon / Evening / Night, derived from each event's local scheduled hour (using the existing tz-aware logic — no scheduling changes). Sections collapse; past blocks auto-collapse.
- **Inline actions.** Take / skip / snooze directly on each row, no drill-in. Reuses the existing mutation and optimistic-update path so `e2e/checkins-optimistic.spec.ts` behavior holds.
- Streak keeps its warm accent; the hero's primary action is the one warm pop on the screen (per the existing accent rule).

No changes to scheduling, dose status logic, or data loading — this is layout and interaction only.

---

## 3. Adherence score + monthly report

- Extend `src/lib/adherence.ts` with a single headline **adherence score** (rolling 30-day on-time percentage, with a documented rule for how skipped vs missed vs pending count).
- Render it as a **circular progress ring** anchoring the top of Today, next to the streak — one number, glanceable, the thing people screenshot.
- Add a **monthly report** view: score for the month, best/worst compounds by adherence, day-by-day heatmap, and trend vs the prior month. Reachable from Today and included in the existing doctor-report export.
- Unit tests for the score across edge cases (no doses, all pending, partial days, timezone boundary).

---

## Verification for all three
- Full test suite plus the axe/a11y and mobile-regression e2e specs.
- Playwright screenshots of Today in light + dark across at least three palettes.
- Contrast checks on any new colored surface.

## Technical notes
- Palettes: `src/styles.css` `[data-theme]` blocks. New files: `src/lib/theme-provider.tsx`, an Appearance section component, a monthly-report route under `_authenticated`.
- Migration: `theme` and `color_scheme` text columns on `profiles` (user-scoped, existing RLS covers it).
- No changes to scheduling, notifications, billing, or SEO surfaces.
