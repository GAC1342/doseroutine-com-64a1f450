export type DoseEventStatus = "pending" | "taken" | "skipped" | "missed";

export const MISSED_AFTER_MINUTES = 60;

export function isDosePastMissedWindow(
  scheduledAt: string,
  now: Date = new Date(),
  missedAfterMinutes = MISSED_AFTER_MINUTES,
): boolean {
  const scheduledMs = new Date(scheduledAt).getTime();
  if (!Number.isFinite(scheduledMs)) return false;
  return scheduledMs <= now.getTime() - missedAfterMinutes * 60_000;
}

export function getEffectiveDoseStatus(
  status: DoseEventStatus | null | undefined,
  scheduledAt: string,
  now: Date = new Date(),
): DoseEventStatus {
  const base = status ?? "pending";
  if (base !== "pending") return base;
  return isDosePastMissedWindow(scheduledAt, now) ? "missed" : "pending";
}
