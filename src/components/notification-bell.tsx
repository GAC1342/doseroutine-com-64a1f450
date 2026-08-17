import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { fetchUnreadCount } from "@/lib/notifications";

/**
 * Bell with an unread badge. Links to the in-app notification center where
 * reminders can be read, dismissed, or opened straight to the workout/dose
 * they refer to.
 */
export function NotificationBell({ className = "" }: { className?: string }) {
  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <Link
      to="/notifications"
      aria-label={label}
      title={label}
      className={
        "tap-target relative inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground " +
        className
      }
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute right-0.5 top-0.5 min-w-[1.05rem] rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
