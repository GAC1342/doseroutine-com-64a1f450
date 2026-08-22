/**
 * Favourites and recents for food logging.
 *
 * People eat the same handful of things. Making them re-search "Chobani
 * vanilla yogurt" every morning is the friction that stops food logging, so
 * we keep two small local lists:
 *
 *  - starred food labels (products picked from search), and
 *  - starred meals (whole logged meals, keyed by their label)
 *
 * plus the recent search terms typed into the product search. Everything is
 * stored in localStorage so it works offline and needs no round-trip; the
 * lists are small and device-local by design.
 */
import type { FoodLabelMatch } from "@/lib/meal-nutrition";

const FOOD_KEY = "doseroutine.favorite-foods.v1";
const MEAL_KEY = "doseroutine.favorite-meals.v1";
const SEARCH_KEY = "doseroutine.recent-food-searches.v1";

const MAX_FOODS = 40;
const MAX_MEALS = 40;
const MAX_SEARCHES = 8;

export type FavoriteFood = FoodLabelMatch & { savedAt: string };

/** Stable identity for a product: barcode when we have one, else brand+name. */
export function foodFavoriteKey(match: Pick<FoodLabelMatch, "barcode" | "brand" | "name">) {
  const code = (match.barcode ?? "").trim();
  if (code) return `code:${code}`;
  return `name:${(match.brand ?? "").trim().toLowerCase()}|${match.name.trim().toLowerCase()}`;
}

/** Stable identity for a meal: its label, case- and space-insensitive. */
export function mealFavoriteKey(label: string | null | undefined) {
  return (label ?? "Meal").trim().toLowerCase();
}

const listeners = new Set<() => void>();

/** Subscribe to favourite changes so every mounted list stays in sync. */
export function onFavoritesChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function announce() {
  for (const fn of listeners) fn();
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, rows: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* storage full or blocked — favourites are a convenience, never a blocker */
  }
  announce();
}

/* ---------------------------------- foods --------------------------------- */

export function listFavoriteFoods(): FavoriteFood[] {
  return read<FavoriteFood>(FOOD_KEY);
}

export function isFavoriteFood(match: Pick<FoodLabelMatch, "barcode" | "brand" | "name">) {
  const key = foodFavoriteKey(match);
  return listFavoriteFoods().some((row) => foodFavoriteKey(row) === key);
}

/** Star/unstar a product. Returns true when it is now a favourite. */
export function toggleFavoriteFood(match: FoodLabelMatch): boolean {
  const key = foodFavoriteKey(match);
  const rows = listFavoriteFoods();
  const next = rows.filter((row) => foodFavoriteKey(row) !== key);
  if (next.length !== rows.length) {
    write(FOOD_KEY, next);
    return false;
  }
  write(FOOD_KEY, [{ ...match, savedAt: new Date().toISOString() }, ...rows].slice(0, MAX_FOODS));
  return true;
}

export function removeFavoriteFood(key: string) {
  write(
    FOOD_KEY,
    listFavoriteFoods().filter((row) => foodFavoriteKey(row) !== key),
  );
}

/* ---------------------------------- meals --------------------------------- */

export function listFavoriteMeals(): string[] {
  return read<string>(MEAL_KEY);
}

export function isFavoriteMeal(label: string | null | undefined) {
  return listFavoriteMeals().includes(mealFavoriteKey(label));
}

/** Star/unstar a meal by label. Returns true when it is now a favourite. */
export function toggleFavoriteMeal(label: string | null | undefined): boolean {
  const key = mealFavoriteKey(label);
  const rows = listFavoriteMeals();
  if (rows.includes(key)) {
    write(
      MEAL_KEY,
      rows.filter((row) => row !== key),
    );
    return false;
  }
  write(MEAL_KEY, [key, ...rows].slice(0, MAX_MEALS));
  return true;
}

/* ------------------------------ recent searches ---------------------------- */

export function listRecentFoodSearches(): string[] {
  return read<string>(SEARCH_KEY);
}

export function rememberFoodSearch(term: string) {
  const clean = term.trim();
  if (clean.length < 2) return;
  const rows = listRecentFoodSearches().filter((row) => row.toLowerCase() !== clean.toLowerCase());
  write(SEARCH_KEY, [clean, ...rows].slice(0, MAX_SEARCHES));
}

export function clearRecentFoodSearches() {
  write<string>(SEARCH_KEY, []);
}
