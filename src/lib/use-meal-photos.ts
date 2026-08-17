import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MEAL_PHOTO_RETENTION_DAYS,
  daysUntilExpiry,
  normalizeRetentionDays,
  retentionCutoff,
  warningCutoff,
  warningDaysFor,
  type MealPhotoRetentionDays,
} from "@/lib/meal-photo-retention";

export type MealPhotoRow = {
  id: string;
  label: string | null;
  logged_at: string;
  storage_path: string;
};

export type MealPhotoSummary = {
  photos: MealPhotoRow[];
  total: number;
  expiringSoon: MealPhotoRow[];
  /** Photos already past the window (removed on the next sweep). */
  dueNow: MealPhotoRow[];
  /** Days until the soonest expiry, or null when nothing is close. */
  nextExpiryInDays: number | null;
  approxBytes: number;
};

/** Downscaled meal JPEGs land around ~180 KB; good enough for a size hint. */
export const APPROX_BYTES_PER_PHOTO = 180_000;

export type PhotoWeekBucket = {
  /** Monday of the week, ISO date (yyyy-mm-dd). */
  weekStart: string;
  label: string;
  count: number;
  approxBytes: number;
  /** Running total across the returned range. */
  cumulativeBytes: number;
};

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const shift = (d.getDay() + 6) % 7; // Monday-based
  d.setDate(d.getDate() - shift);
  return d;
}

/** Photo count and approximate size grouped into the last `weeks` weeks. */
export function photoWeeklyBuckets(
  rows: MealPhotoRow[],
  now = new Date(),
  weeks = 8,
): PhotoWeekBucket[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = startOfWeek(new Date(row.logged_at)).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const current = startOfWeek(now);
  const buckets: PhotoWeekBucket[] = [];
  let cumulative = 0;
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(current);
    start.setDate(start.getDate() - i * 7);
    const key = start.toISOString().slice(0, 10);
    const count = counts.get(key) ?? 0;
    const approxBytes = count * APPROX_BYTES_PER_PHOTO;
    cumulative += approxBytes;
    buckets.push({
      weekStart: key,
      label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count,
      approxBytes,
      cumulativeBytes: cumulative,
    });
  }
  return buckets;
}


export function mealPhotoSummary(
  rows: MealPhotoRow[],
  now = new Date(),
  retentionDays: number = MEAL_PHOTO_RETENTION_DAYS,
): MealPhotoSummary {
  const cutoff = retentionCutoff(now, retentionDays).getTime();
  const warn = warningCutoff(now, retentionDays).getTime();
  const dueNow = rows.filter((r) => new Date(r.logged_at).getTime() < cutoff);
  const expiringSoon = rows.filter((r) => {
    const t = new Date(r.logged_at).getTime();
    return t < warn && t >= cutoff;
  });
  const pending = [...dueNow, ...expiringSoon];
  const nextExpiryInDays = pending.length
    ? Math.min(...pending.map((r) => daysUntilExpiry(r.logged_at, now, retentionDays)))
    : null;
  return {
    photos: rows,
    total: rows.length,
    expiringSoon,
    dueNow,
    nextExpiryInDays,
    approxBytes: rows.length * APPROX_BYTES_PER_PHOTO,
  };
}

/** The window this account keeps meal photos for (7, 30 or 90 days). */
export function useMealPhotoRetention() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["meal-photo-retention"],
    queryFn: async (): Promise<MealPhotoRetentionDays> => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return MEAL_PHOTO_RETENTION_DAYS;
      const { data, error } = await supabase
        .from("profiles")
        .select("meal_photo_retention_days")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return normalizeRetentionDays(data?.meal_photo_retention_days);
    },
    staleTime: 300_000,
  });

  const save = useMutation({
    mutationFn: async (days: MealPhotoRetentionDays) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("You need to be signed in.");
      const { error } = await supabase
        .from("profiles")
        .update({ meal_photo_retention_days: days })
        .eq("id", uid);
      if (error) throw error;
      return days;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meal-photo-retention"] });
      void queryClient.invalidateQueries({ queryKey: ["meal-photos"] });
    },
  });

  return {
    retentionDays: query.data ?? MEAL_PHOTO_RETENTION_DAYS,
    isPending: query.isPending,
    setRetentionDays: save.mutateAsync,
    isSaving: save.isPending,
  };
}

export function useMealPhotos(retentionDays: number = MEAL_PHOTO_RETENTION_DAYS) {
  return useQuery({
    queryKey: ["meal-photos", retentionDays],
    queryFn: async (): Promise<MealPhotoSummary> => {
      const { data, error } = await supabase
        .from("meals")
        .select("id,label,logged_at,storage_path")
        .not("storage_path", "is", null)
        .order("logged_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      const rows = (data ?? []).filter((r) => Boolean(r.storage_path)) as MealPhotoRow[];
      return mealPhotoSummary(rows, new Date(), retentionDays);
    },
    staleTime: 60_000,
  });
}

export function retentionCopy(days: number = MEAL_PHOTO_RETENTION_DAYS): string {
  return `Photos are removed ${days} days after the meal is logged. You get ${warningDaysFor(days)} days' notice — macros are always kept.`;
}

export type MealPhotoAction = "download" | "cleanup" | "delete";

export type MealPhotoEvent = {
  id: string;
  action: MealPhotoAction;
  item_count: number;
  note: string | null;
  created_at: string;
};

/** Last few export/cleanup actions, newest first. */
export function useMealPhotoEvents(limit = 8) {
  return useQuery({
    queryKey: ["meal-photo-events", limit],
    queryFn: async (): Promise<MealPhotoEvent[]> => {
      const { data, error } = await supabase
        .from("meal_photo_events")
        .select("id,action,item_count,note,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as MealPhotoEvent[];
    },
    staleTime: 30_000,
  });
}

/** Best-effort history entry — never blocks the action it describes. */
export async function recordMealPhotoEvent(
  action: MealPhotoAction,
  itemCount: number,
  note?: string,
): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    await supabase.from("meal_photo_events").insert({
      user_id: uid,
      action,
      item_count: itemCount,
      note: note ?? null,
    });
  } catch {
    // History is informational; failures shouldn't surface to the user.
  }
}

export function mealPhotoEventLabel(event: MealPhotoEvent): string {
  const n = `${event.item_count} photo${event.item_count === 1 ? "" : "s"}`;
  if (event.action === "download") return `Downloaded ${n}`;
  if (event.action === "cleanup") return `Cleaned up ${n}`;
  return `Deleted ${n}`;
}
