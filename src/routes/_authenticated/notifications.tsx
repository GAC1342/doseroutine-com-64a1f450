import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, BellOff, CheckCheck, Dumbbell, Pill, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingStatus } from "@/components/skeletons";
import { routeErrorComponent } from "@/components/route-error-panel";
import {
  clearReadNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationTime,
  parseNotificationLink,
  type NotificationRow,
} from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  errorComponent: routeErrorComponent("notifications"),
  head: () => ({
    meta: [
      { title: "Notifications — DoseRoutine" },
      {
        name: "description",
        content: "Every dose and workout reminder DoseRoutine sent you, in one place.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificationsPage,
});

function iconFor(kind: string) {
  if (kind.startsWith("workout")) return Dumbbell;
  if (kind === "dose") return Pill;
  return Bell;
}

function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: timezone } = useQuery({
    queryKey: ["profile-timezone"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return undefined;
      const { data } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", userRes.user.id)
        .maybeSingle();
      return data?.timezone || undefined;
    },
    staleTime: 10 * 60_000,
  });

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => notifications.data ?? [], [notifications.data]);
  const unread = useMemo(() => rows.filter((n) => !n.read_at).length, [rows]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  const toggleRead = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => markNotificationRead(id, read),
    onSuccess: invalidate,
  });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteNotification, onSuccess: invalidate });
  const clearRead = useMutation({ mutationFn: clearReadNotifications, onSuccess: invalidate });

  function open(n: NotificationRow) {
    if (!n.read_at) toggleRead.mutate({ id: n.id, read: true });
    const link = parseNotificationLink(n.url);
    if (!link) return;
    navigate({ to: link.path, search: link.search as never });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        to="/more"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up."} · Reminders also arrive by
            email and push.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
            className="tap-target inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
          <button
            type="button"
            onClick={() => clearRead.mutate()}
            disabled={rows.length === unread || clearRead.isPending}
            className="tap-target inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear read
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {notifications.isLoading && (
          <div className="space-y-2" aria-busy="true">
            <LoadingStatus label="Loading your notifications…" />
            <Skeleton aria-hidden="true" className="h-20 w-full rounded-2xl" />
            <Skeleton aria-hidden="true" className="h-20 w-full rounded-2xl" />
          </div>
        )}

        {!notifications.isLoading && rows.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <BellOff className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-muted-foreground">
              Dose and workout reminders show up here as soon as they're sent. Set them up in{" "}
              <Link to="/reminders" className="text-primary underline">
                Reminders
              </Link>
              .
            </p>
          </Card>
        )}

        {rows.map((n) => {
          const Icon = iconFor(n.kind);
          const link = parseNotificationLink(n.url);
          return (
            <Card
              key={n.id}
              className={
                "flex items-start gap-3 p-4 " + (n.read_at ? "opacity-70" : "border-primary/40")
              }
            >
              <span
                className={
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
                  (n.read_at ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")
                }
              >
                <Icon className="h-4 w-4" />
              </span>
              <button
                type="button"
                onClick={() => open(n)}
                className="min-w-0 flex-1 text-left"
                aria-label={link ? `Open ${n.title}` : n.title}
              >
                <p className="text-sm font-medium">
                  {!n.read_at && (
                    <span
                      aria-hidden
                      className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary align-middle"
                    />
                  )}
                  {n.title}
                </p>
                {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {notificationTime(n.created_at, timezone)}
                  {link ? " · Tap to open" : ""}
                </p>
              </button>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  aria-label={n.read_at ? "Mark as unread" : "Mark as read"}
                  onClick={() => toggleRead.mutate({ id: n.id, read: !n.read_at })}
                  className="tap-target rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {n.read_at ? "Unread" : "Read"}
                </button>
                <button
                  type="button"
                  aria-label={`Delete notification ${n.title}`}
                  onClick={() => remove.mutate(n.id)}
                  className="tap-target rounded-lg border border-border px-2 py-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
