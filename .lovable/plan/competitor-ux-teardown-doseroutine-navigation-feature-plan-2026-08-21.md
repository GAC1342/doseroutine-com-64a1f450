# Competitor UX teardown → DoseRoutine navigation & feature plan

## What I compared against

- **Regimen (helloregimen.com)** — the closest direct competitor (peptides, GLP-1, TRT, 4.8★, ~$4.99/mo). Four tabs only: **Today / My Stack / Progress / Settings**.
- **Medisafe / Carely-style medication apps** — dose-first home screen, "next dose" always above the fold, supply/refill warnings.
- **MyFitnessPal & Cronometer** — the cautionary tale: feature bloat pushed core logging behind menus; documented drop-off and 2026 churn to simpler alternatives.
- **Hevy / Strong (training)** — one clear primary action per screen, everything else in context.

## Where we stand today (verified in the code)

Our tab bar is Today / Stack / Safety / Food / More, plus a desktop secondary list (Fitness, Timeline, Ask AI, Plan, Reminders, Library).

**The single biggest problem:** `/more` is a flat, ungrouped list of ~35 destinations — Insights, Check-ins, Reminders, Health sync, Labs, Templates, Injection sites, Doctor report, Cycles, Costs, Side effects, Export, Scan, Progress photos, Safety, Timeline, plus marketing pages (Articles, Blog, Library, Calculators) mixed in with account/legal links. Competitors expose 4–5 destinations; we expose ~35 with no hierarchy. Everything is technically present but nothing is findable.

Second problem: **outcome data is scattered.** Insights, Progress photos, Body metrics, Labs, Check-ins, Side effects and Adherence are six separate destinations. Regimen collapses all of that into one **Progress** tab, which is what makes "is it working?" answerable in one tap.

Third: **feature gap.** We have no "in your system" / half-life curve anywhere in the app (only as marketing copy on public library pages). Regimen leads its entire pitch with it, and Reddit threads cite it as the reason people pay.

## The plan

### 1. Restructure to five real tabs

```text
Today      → what to do now (doses due, next dose, quick log, streak, refill warnings)
Stack      → what I'm running (compounds, cycles, vials/supply, templates, injection sites)
Progress   → is it working (insights, body metrics, photos, labs, check-ins, side effects, adherence)
Food       → nutrition (diary, scan, meal plan, macros)
More       → tools, learn, account (grouped, not a flat list)
```

Fitness/Training stays reachable from Today and gets a top slot in More → Tools; it is the one section that doesn't fit the medication spine, and it already has its own internal tabs.

### 2. Build a real Progress hub

New `/progress` route with sub-tabs: **Overview · Body · Photos · Labs · Check-ins · Side effects · Adherence**. Existing routes stay live (deep links and SEO keep working) but render inside the hub shell. Overview = current Insights grid plus an "at a glance" strip (weight trend, adherence %, latest lab flag, active side effects).

### 3. Group the More page

Five labelled sections with collapsible headers instead of one 35-item list:

- **Tools** — Fitness, Timer, Calculators, Interaction checker, Pill ID, Scan, Doctor report, Export
- **Protocol** — Cycles, Templates, Injection sites, Costs, Reminders, Health sync
- **Learn** — Library, Articles, Blog, Manual, Help
- **Account** — Plan/upgrade, Notifications, Legal, About, Install
- **Admin** — unchanged, admin-only

### 4. Global search / command palette

`cmdk` is already installed and unused. Add a search affordance in the header (and ⌘K on desktop) that finds compounds, foods, exercises, and app destinations. This is the safety net for 400+ routes and the cheapest single fix for findability.

### 5. Missing features worth adding, in order

1. **"In your system" half-life curve** — per-compound PK estimate on the Today card and the stack item detail. Biggest competitive gap; drives the whole "know when you're at peak" pitch.
2. **Supply / vial countdown on Today** — "Vial 3 of 5 · 8 doses left · reorder by Sep 4". We track vials, but the warning doesn't surface where the user is.
3. **Dose ↔ outcome signal cards** — "Side effect nausea fading 3 weeks in a row", "Weight down 8 lb since dose reached 10 mg". We hold every input already; we just never state the correlation in words.
4. **Log-anything FAB** — one persistent button that opens dose / food / weight / symptom, so logging never depends on being on the right tab.

### 6. Things placed in the wrong area (fix as part of the above)

- **Scan** sits in More but belongs inside Food (and on the log sheet).
- **Reminders** and **Health sync** are settings, not destinations — move into Account/Protocol groups.
- **Safety** occupies a top-level tab but is consulted occasionally; it moves into Stack (contextual, next to what you're actually taking) and frees the tab slot for Progress.
- **Library / Articles / Blog / Calculators** are public marketing surfaces living in the signed-in menu — they go under a single "Learn" group.
- **Timeline** duplicates history that belongs on Progress → Overview.

## Technical notes

- New routes: `src/routes/_authenticated/progress.tsx` (layout with sub-tabs) plus index; existing metric routes re-parented, with the old paths kept as redirects so nothing indexed or bookmarked breaks.
- `src/components/app-shell.tsx`: `TABS` becomes Today / Stack / Progress / Food / More; secondary desktop list trimmed.
- `src/routes/_authenticated/more.tsx`: rewritten as grouped sections; no destinations removed.
- Half-life curve: pure client calc from compound half-life + dose history, rendered with the existing chart stack; needs a `half_life_hours` field on the compounds table (check/populate before the UI work).
- Command palette: `src/components/ui/command.tsx` already exists; add a search index built from routes + compound/exercise/food lookups.
- Existing e2e/nav and breadcrumb tests will need their route expectations updated in the same pass.

## Suggested sequencing

Phase 1 — tab restructure + grouped More + Scan/Safety relocation (pure IA, no new data).
Phase 2 — Progress hub.
Phase 3 — half-life curve + supply countdown + signal cards.
Phase 4 — command palette + log-anything FAB.
