import { describe, expect, it } from "vitest";
import {
  MEAL_PHOTO_RETENTION_DAYS,
  batched,
  daysUntilExpiry,
  formatBytes,
  isExpired,
  normalizeRetentionDays,
  photoFileName,
  retentionCutoff,
  warningDaysFor,
} from "@/lib/meal-photo-retention";
import { mealPhotoSummary, type MealPhotoRow } from "@/lib/use-meal-photos";

const NOW = new Date("2026-08-16T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function row(id: string, days: number): MealPhotoRow {
  return { id, label: "Chicken & rice", logged_at: daysAgo(days), storage_path: `u/${id}.jpg` };
}

describe("meal photo retention", () => {
  it("expires photos strictly older than the window", () => {
    expect(isExpired(daysAgo(MEAL_PHOTO_RETENTION_DAYS + 1), NOW)).toBe(true);
    expect(isExpired(daysAgo(MEAL_PHOTO_RETENTION_DAYS - 1), NOW)).toBe(false);
    expect(retentionCutoff(NOW).getTime()).toBe(
      NOW.getTime() - MEAL_PHOTO_RETENTION_DAYS * 86_400_000,
    );
  });

  it("counts whole days left, never negative", () => {
    expect(daysUntilExpiry(daysAgo(0), NOW)).toBe(MEAL_PHOTO_RETENTION_DAYS);
    expect(daysUntilExpiry(daysAgo(26), NOW)).toBe(4);
    expect(daysUntilExpiry(daysAgo(90), NOW)).toBe(0);
  });

  it("splits work into batches", () => {
    expect(batched([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(batched([], 10)).toEqual([]);
  });

  it("summarises due-now vs expiring-soon buckets", () => {
    const summary = mealPhotoSummary(
      [row("a", 40), row("b", 26), row("c", 2)],
      NOW,
    );
    expect(summary.total).toBe(3);
    expect(summary.dueNow.map((r) => r.id)).toEqual(["a"]);
    expect(summary.expiringSoon.map((r) => r.id)).toEqual(["b"]);
    expect(summary.nextExpiryInDays).toBe(0);
    expect(summary.approxBytes).toBeGreaterThan(0);
  });

  it("reports no upcoming expiry when everything is fresh", () => {
    const summary = mealPhotoSummary([row("c", 1)], NOW);
    expect(summary.nextExpiryInDays).toBeNull();
    expect(summary.dueNow).toHaveLength(0);
  });

  it("builds readable export filenames", () => {
    const name = photoFileName("2026-08-01T18:30:00.000Z", "Greek Yogurt Bowl!", 0);
    expect(name).toMatch(/^2026-08-01_\d{4}_greek-yogurt-bowl\.jpg$/);
    expect(photoFileName("not-a-date", null, 2)).toBe("photo-3_meal.jpg");
  });

  it("formats sizes for humans", () => {
    expect(formatBytes(0)).toBe("0 MB");
    expect(formatBytes(500_000)).toBe("488 KB");
    expect(formatBytes(2_500_000)).toBe("2.4 MB");

    expect(formatBytes(52_000_000)).toBe("50 MB");
  });
});

describe("configurable retention windows", () => {
  const now = new Date("2026-08-16T12:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it("expires photos against the chosen window", () => {
    expect(isExpired(daysAgo(10), now, 7)).toBe(true);
    expect(isExpired(daysAgo(10), now, 30)).toBe(false);
    expect(isExpired(daysAgo(60), now, 90)).toBe(false);
  });

  it("scales the warning notice to the window", () => {
    expect(warningDaysFor(7)).toBe(2);
    expect(warningDaysFor(30)).toBe(7);
    expect(warningDaysFor(90)).toBe(14);
  });

  it("falls back to 30 days for unsupported values", () => {
    expect(normalizeRetentionDays(45)).toBe(30);
    expect(normalizeRetentionDays("90")).toBe(90);
    expect(normalizeRetentionDays(null)).toBe(30);
  });

  it("counts days left using the window", () => {
    expect(daysUntilExpiry(daysAgo(5), now, 7)).toBe(2);
    expect(daysUntilExpiry(daysAgo(5), now, 90)).toBe(85);
  });
});
