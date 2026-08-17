/**
 * In-app notification center.
 *
 * Every reminder the server sends (dose or workout, email or push) also drops
 * a row in `notifications`, so the user has one place to review what was sent,
 * mark it read, and jump straight to the thing it is about.
 */

import { supabase } from "@/integrations/supabase/client";

export type NotificationKind = "workout-planned" | "workout-missed" | "dose" | "system" | string;

export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  url: string | null;
  workout_log_id: string | null;
  read_at: string | null;
  created_at: string;
};

const COLUMNS = "id,kind,title,body,url,workout_log_id,read_at,created_at";

export async function fetchNotifications(limit = 100): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string, read = true): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function clearReadNotifications(): Promise<void> {
  const { error } = await supabase.from("notifications").delete().not("read_at", "is", null);
  if (error) throw error;
}

/** "3 min ago" / "Yesterday, 7:05 PM" style label in the user's timezone. */
export function notificationTime(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH === 1 ? "" : "s"} ago`;
  return date.toLocaleString([], {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Splits the stored deep link into a router-friendly path + search object. */
export function parseNotificationLink(
  url: string | null,
): { path: string; search: Record<string, string> } | null {
  if (!url) return null;
  let raw = url.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      raw = `${parsed.pathname}${parsed.search}`;
    } catch {
      return null;
    }
  }
  if (!raw.startsWith("/")) return null;
  const [path, query = ""] = raw.split("?");
  const search: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(query)) search[k] = v;
  return { path, search };
}
