# Merge Body Metrics into Fitness

Yes — they overlap. Fitness already tracks workouts and computes personal records for the core lifts, and Body Metrics separately stores bench/squat/deadlift/OHP alongside weight and measurements. Two menu entries for one topic is confusing.

## What changes

One destination: **Fitness**, with two tabs.

```text
/fitness
 ├── Workouts   (calendar, day list, streaks, PRs, log workout)
 └── Body       (weight, body fat, measurements, log measurement, history)
```

- The Fitness page gets a tab switcher at the top; the tab is remembered between visits and reflected in the URL (`/fitness?view=body`) so links can point straight at it.
- The Body tab shows the existing latest-stats grid, trend arrows, history list, and the "Log measurement" sheet — unchanged behaviour, new home.
- Personal records are shown once, in the Workouts tab, computed from logged workouts. The manual best-lift fields stay available in the measurement form for people who don't log every session.
- `/body-metrics` keeps working and redirects to `/fitness?view=body`, so existing links, the help article, and any bookmarks don't break.

## Navigation cleanup

- **More** menu: single "Fitness & Body" entry instead of two rows.
- **Today** quick actions: the Body Metrics button points to `/fitness?view=body` (same icon and label).
- Help content updated so the Body Metrics article points at the new location, and the Fitness article mentions both tabs.

## Technical notes

- `body-metrics.tsx` page body becomes a `BodyMetricsPanel` component under `src/components/`, rendered by the Fitness route; the route file itself becomes a redirect.
- Tab state uses the existing `useTabViewState` pattern plus a `view` search param on the Fitness route (`validateSearch` already exists there for `day`/`workout`).
- No database changes — `body_metrics` and `workout_logs` tables stay as they are.
- Sitemap and non-indexable lists updated to drop the retired `/body-metrics` entry.
