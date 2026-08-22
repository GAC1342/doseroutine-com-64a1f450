/**
 * Small, local-only memory for the Fitness tabs.
 *
 * Two things are worth remembering between visits: whether the first-run guide
 * has served its purpose (so the numbered steps stop nagging experienced
 * users), and what the exercise library had staged last time (so a big batch
 * can be built across several trips to the modal).
 *
 * Everything is best-effort: storage can be unavailable (private mode, SSR),
 * and nothing here is important enough to fail a render over.
 */

const GUIDE_KEY = "doseroutine.fitness.guideDone";
const PICKS_KEY = "doseroutine.fitness.bulkPicks";
const DAYS_KEY = "doseroutine.fitness.targetDays";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Best-effort only.
  }
}

/** Has the user finished (or dismissed) the first-run workout guide? */
export function isGuideComplete(): boolean {
  return read(GUIDE_KEY) === "1";
}

export function markGuideComplete(): void {
  write(GUIDE_KEY, "1");
}

/** Exercises staged in the library, kept so a batch survives a modal close. */
export function loadBulkPicks(): string[] {
  const raw = read(PICKS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

export function saveBulkPicks(names: string[]): void {
  write(PICKS_KEY, JSON.stringify(names.slice(0, 200)));
}

/** Weekdays (0 = Sunday) the user last targeted in the add-to-workout sheet. */
export function loadTargetDays(): number[] {
  const raw = read(DAYS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter(
          (v): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 6,
        ),
      ),
    ].sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export function saveTargetDays(days: number[]): void {
  write(DAYS_KEY, JSON.stringify(days));
}
