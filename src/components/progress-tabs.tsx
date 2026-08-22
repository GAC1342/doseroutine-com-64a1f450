import { Link } from "@tanstack/react-router";

/**
 * Sub-navigation for the Progress hub.
 *
 * Every "is it working?" surface (body trends, photos, labs, check-ins,
 * side effects, adherence) used to be a separate destination buried in the
 * More list. They keep their own URLs — this bar makes them feel like one
 * section instead of seven unrelated pages.
 */
const PROGRESS_TABS = [
  { to: "/progress", label: "Overview" },
  { to: "/insights", label: "Charts" },
  { to: "/body-metrics", label: "Body" },
  { to: "/progress-photos", label: "Photos" },
  { to: "/labs", label: "Labs" },
  { to: "/checkins", label: "Check-ins" },
  { to: "/side-effects", label: "Side effects" },
  { to: "/adherence", label: "Adherence" },
] as const;

export function ProgressTabs() {
  return (
    <nav aria-label="Progress sections" className="-mx-1 mt-4 overflow-x-auto pb-1">
      <ul className="flex min-w-max items-center gap-1.5 px-1">
        {PROGRESS_TABS.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              activeOptions={{ exact: true }}
              // Base holds layout only. Color classes live in active/inactive
              // props: TanStack concatenates className + activeProps.className,
              // so putting `bg-card` and `bg-primary` in one string leaves the
              // winner up to stylesheet order — which is what made the selected
              // tab unreadable in dark mode.
              className="tap-target inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
              activeProps={{
                className: "border-primary bg-primary text-primary-foreground shadow-sm",
                "aria-current": "page",
              }}
              inactiveProps={{
                className:
                  "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground",
              }}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
