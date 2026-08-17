# Insights dashboard + homepage chart showcase

Your ad shows a grid of live-looking trend charts. Yes, this is buildable — the app already
has all the underlying data (doses, check-ins, workouts, vials, costs, cycles) and already
ships the Recharts charting library (currently only used on admin pages). Nothing in the ad
needs new data collection; it needs a page that puts the existing data on charts.

Charts will follow the app theme (teal accent, light/dark aware), not the ad's neon-green
dark panels.

## Part 1 — Real in-app Insights dashboard

New page at `/insights`, linked from the app's More menu and Today page.

A responsive card grid (1 column on phone, 2 on desktop) matching the ad's layout, with a
window selector at the top (30 / 90 / 365 days). Each card is a real chart from your data:

| Card | Chart | Source |
|---|---|---|
| Adherence | Daily taken-vs-scheduled line + current streak | existing adherence events |
| Body metrics | Weight / body fat / waist trend lines | body check-ins |
| Workout & cardio | Sessions per week bars + volume line | workout logs and sets |
| Injection site rotation | Sites used over time, flags overuse of one site | injection site logs |
| Vials & refills | Days-of-supply remaining bars per vial | vial inventory |
| Cost | Monthly spend line + running total | cost entries |
| Cycle / PCT | Timeline bar of current cycle week vs plan | cycles |

Each card:
- Shows a headline number and the change vs. the previous window (up/down/flat).
- Shows a friendly empty state with a "log your first…" link when there's no data yet,
  rather than a blank chart.
- Is tappable and deep-links to the full page for that area (e.g. body metrics card to
  `/body-metrics`).

The charts are loaded lazily so the rest of the app's bundle size and page speed are not
affected.

## Part 2 — Homepage showcase (matches the ad)

A new section on the public homepage: the same chart cards, rendered from realistic demo
data, in a compact 2x3 grid with the headline "Everything in one place" and the ad's
feature captions. Lines animate in on scroll once. Ends with the same two calls to action
your ad uses: "Start tracking free" and "See how each feature works".

Because the section reuses the real chart components, the marketing visuals can never drift
from what the product actually shows. It renders server-side for SEO, with motion disabled
for visitors who prefer reduced motion, and fixed card heights so the page doesn't jump
while loading.

## Technical notes

- New `src/components/insights/` folder: a shared `InsightCard` wrapper plus one chart
  component per metric, each taking plain data props so both the app page and the homepage
  demo section can render them.
- Data aggregation lives in pure helpers under `src/lib/insights/` (windowing, bucketing by
  day/week, delta vs. previous period) so it is unit-testable, following the existing
  `publish-impact.ts` pattern.
- Chart colours come from existing CSS tokens via the shadcn `ChartContainer` in
  `src/components/ui/chart.tsx` — no hardcoded colours.
- New route `src/routes/_authenticated/insights.tsx` with its own head metadata; homepage
  section added to `src/routes/index.tsx` behind a lazy boundary.
- Reads use the existing authenticated Supabase client patterns already used by
  `costs.tsx`, `fitness.tsx`, and `checkins.functions.ts`. No schema changes, no migrations.
- Tests: unit tests for the aggregation helpers, plus an added assertion in the existing
  landing overlay-collision Playwright spec so the new homepage section doesn't overlap on
  small screens.
