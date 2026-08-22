# Closing the gaps the article highlights

The post positions DoseRoutine as the all-in-one protocol platform. Comparing its claims against what the app actually does today, four things stand out as real gaps competitors are winning on — and one is a credibility risk because the article implies we already do it.

## What we already have

Photo meal scanning, barcode + USDA-backed food catalog, dose/vial tracking, bloodwork, workouts, body metrics, calorie/protein/carb/fat targets on the profile. That covers most of the article's DoseRoutine section.

## What's missing (in priority order)

### 1. Fiber, sugar, sodium and saturated fat in meal logs
The food catalog already stores fiber, sugar, sodium and saturated fat per 100 g, but meal logs only carry calories/protein/carbs/fat, so none of it ever reaches the user. Cronometer and MyFitnessPal both show these. Surface them on the meal review sheet and the daily food summary — no new data sourcing needed, the numbers are already in the catalog.

### 2. Protein-first coaching for GLP-1 users
The article's strongest argument is that protein matters more when appetite is suppressed. Add a daily protein-priority card on the food page for users on a GLP-1 compound: progress toward the protein target, a plain warning when calories are very low but protein is under target, and a nudge to log protein first at the next meal.

### 3. Nutrition-in-context of the protocol
This is the differentiator the article names and nothing in the app draws the line yet. Add a "nutrition vs protocol" panel in Insights: weekly average calories/protein plotted against dose days and workout days, plus simple observations ("protein averaged 22% below target in the two days after each injection").

### 4. A lightweight weekly plan + grocery list
Mealime and AI Meal Planner win on decision reduction. Not a full recipe engine — a simple weekly slot planner where the user picks foods already in their catalog per meal slot, and a grocery list generated from those picks, grouped by store section and shareable/copyable.

### 5. Repeat-a-meal shortcut
Fastest consistency win available: one tap to re-log yesterday's or a frequently-logged meal from the food page, no scan or search. Directly supports the article's "consistency-enabling design" point.

## Suggested first step

Items 1 and 5 are small and immediately visible. Item 2 is the highest-value differentiator for our core GLP-1 audience. Items 3 and 4 are larger builds worth their own pass.

## Technical notes

- Meal macro columns: `meals` has est/adj calories, protein, carbs, fat only. Fiber/sugar/sodium/satfat need new nullable columns on `meals` (with GRANTs on the migration) populated from `foods.fiber_100g`, `sugar_100g`, `sodium_100mg`, `satfat_100g` scaled by portion at log time; older rows stay null and render as "—".
- Targets already exist on `profiles` (`target_calories`, `target_protein_g`, `target_carbs_g`, `target_fat_g`); protein coaching reads those, no schema change.
- GLP-1 detection: `user_compounds` joined to `compounds` where category is `glp1`.
- Insights panel goes under `src/routes/_authenticated/insights`, reusing existing chart components; correlations computed in a server function, not the client.
- Weekly plan needs a new `meal_plan_slots` table (user_id, date, slot, food_id, servings) with RLS scoped to `auth.uid()` and grants for `authenticated` plus `service_role`.
- No styling or design-token changes; all new UI uses existing card/chart patterns.
