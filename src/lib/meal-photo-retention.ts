// Meal photos exist only to capture macros at the moment a meal is logged.
// The numbers are kept forever; the image itself expires after the retention
// window the user picks (7, 30 or 90 days) so their storage doesn't fill with
// hundreds of old plate photos.

/** Default window when a profile hasn't picked one. */
export const MEAL_PHOTO_RETENTION_DAYS = 30;
/** Windows a user can choose between. */
export const MEAL_PHOTO_RETENTION_OPTIONS = [7, 30, 90] as const;
export type MealPhotoRetentionDays = (typeof MEAL_PHOTO_RETENTION_OPTIONS)[number];
/** How far ahead we warn the user so they can download before deletion. */
export const MEAL_PHOTO_WARNING_DAYS = 7;

/** Coerce anything stored on the profile to a supported window. */
export function normalizeRetentionDays(value: unknown): MealPhotoRetentionDays {
  const n = Number(value);
  return (MEAL_PHOTO_RETENTION_OPTIONS as readonly number[]).includes(n)
    ? (n as MealPhotoRetentionDays)
    : MEAL_PHOTO_RETENTION_DAYS;
}

/** A week's notice makes no sense on a 7-day window, so scale the warning. */
export function warningDaysFor(days: number = MEAL_PHOTO_RETENTION_DAYS): number {
  if (days <= 7) return 2;
  if (days <= 30) return MEAL_PHOTO_WARNING_DAYS;
  return 14;
}
/** Storage delete/list batch size — keeps a single sweep request small. */
export const MEAL_PHOTO_BATCH_SIZE = 100;

export function retentionCutoff(
  now: Date = new Date(),
  days: number = MEAL_PHOTO_RETENTION_DAYS,
): Date {
  return new Date(now.getTime() - days * 86_400_000);
}

/** Photos logged before this moment are already inside the warning window. */
export function warningCutoff(
  now: Date = new Date(),
  days: number = MEAL_PHOTO_RETENTION_DAYS,
): Date {
  return new Date(now.getTime() - (days - warningDaysFor(days)) * 86_400_000);
}

export function isExpired(
  loggedAt: string | Date,
  now: Date = new Date(),
  days: number = MEAL_PHOTO_RETENTION_DAYS,
): boolean {
  const at = loggedAt instanceof Date ? loggedAt : new Date(loggedAt);
  return at.getTime() < retentionCutoff(now, days).getTime();
}

/** Whole days left before this photo is swept (0 = due on the next sweep). */
export function daysUntilExpiry(
  loggedAt: string | Date,
  now: Date = new Date(),
  days: number = MEAL_PHOTO_RETENTION_DAYS,
): number {
  const at = loggedAt instanceof Date ? loggedAt : new Date(loggedAt);
  const expiresAt = at.getTime() + days * 86_400_000;
  return Math.max(0, Math.ceil((expiresAt - now.getTime()) / 86_400_000));
}

export function batched<T>(items: T[], size: number = MEAL_PHOTO_BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Human-friendly filename for a photo saved out of the zip export. */
export function photoFileName(loggedAt: string, label: string | null, index: number): string {
  const date = new Date(loggedAt);
  const stamp = Number.isNaN(date.getTime())
    ? `photo-${index + 1}`
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}_${String(date.getHours()).padStart(2, "0")}${String(
        date.getMinutes(),
      ).padStart(2, "0")}`;
  const slug =
    (label ?? "meal")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "meal";
  return `${stamp}_${slug}.jpg`;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / 1_048_576;
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}
