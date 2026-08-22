/**
 * Saved (favourite) interval-timer presets.
 *
 * Kept in localStorage so a favourite is instantly available offline and on
 * the lock screen without a round-trip. Pure helpers here; the component owns
 * the rendering. Every mutation returns the new list so callers can set state
 * from the return value instead of re-reading storage.
 */
import { sanitizeConfig, type TimerConfig } from "@/lib/interval-timer";

export type FavoriteTimerPreset = {
  id: string;
  name: string;
  config: TimerConfig;
  /** Start in lock-screen friendly mode (screen awake + big view). */
  lockScreen: boolean;
  createdAt: string;
};

export const FAVORITES_KEY = "dr.workout-timer.favorites.v1";
export const MAX_FAVORITES = 20;

function newId(): string {
  return `fav-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeFavorite(raw: unknown): FavoriteTimerPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const name = typeof rec["name"] === "string" ? rec["name"].trim().slice(0, 40) : "";
  if (!name) return null;
  return {
    id: typeof rec["id"] === "string" && rec["id"] ? rec["id"] : newId(),
    name,
    config: sanitizeConfig((rec["config"] ?? {}) as Partial<TimerConfig>),
    lockScreen: rec["lockScreen"] !== false,
    createdAt: typeof rec["createdAt"] === "string" ? rec["createdAt"] : new Date().toISOString(),
  };
}

export function loadFavorites(): FavoriteTimerPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeFavorite)
      .filter((f): f is FavoriteTimerPreset => f !== null)
      .slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export function saveFavorites(list: FavoriteTimerPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(list.slice(0, MAX_FAVORITES)));
  } catch {
    /* private mode — favourites just won't persist */
  }
}

/** Adds a favourite; a repeated name overwrites the earlier entry in place. */
export function addFavorite(
  list: FavoriteTimerPreset[],
  input: { name: string; config: TimerConfig; lockScreen?: boolean },
): FavoriteTimerPreset[] {
  const name = input.name.trim().slice(0, 40);
  if (!name) return list;
  const entry: FavoriteTimerPreset = {
    id: newId(),
    name,
    config: sanitizeConfig(input.config),
    lockScreen: input.lockScreen !== false,
    createdAt: new Date().toISOString(),
  };
  const existing = list.findIndex((f) => f.name.toLowerCase() === name.toLowerCase());
  const next =
    existing >= 0
      ? list.map((f, i) => (i === existing ? { ...entry, id: f.id, createdAt: f.createdAt } : f))
      : [entry, ...list];
  const capped = next.slice(0, MAX_FAVORITES);
  saveFavorites(capped);
  return capped;
}

export function removeFavorite(list: FavoriteTimerPreset[], id: string): FavoriteTimerPreset[] {
  const next = list.filter((f) => f.id !== id);
  saveFavorites(next);
  return next;
}

export function setFavoriteLockScreen(
  list: FavoriteTimerPreset[],
  id: string,
  lockScreen: boolean,
): FavoriteTimerPreset[] {
  const next = list.map((f) => (f.id === id ? { ...f, lockScreen } : f));
  saveFavorites(next);
  return next;
}
