import { assetUrl } from "@/lib/asset-url";
import { BrandLogo } from "@/components/brand-logo";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { NotificationBell } from "@/components/notification-bell";
import {
  Home,
  Layers,
  Dumbbell,
  UtensilsCrossed,
  ShieldCheck,
  Clock,
  LineChart,
  MoreHorizontal,
  Sparkles,
  Bell,
  BookOpen,
  Shield,
  X,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import {
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type ComponentType,
  type SVGProps,
  type TouchEvent,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OfflineBanner } from "@/components/offline-banner";
import { RebrandReinstallBanner } from "@/components/rebrand-reinstall-banner";
import { PageHelpFab } from "@/components/page-help-fab";
import { ManualRouteLinks } from "@/components/manual-route-links";
import { WelcomeTour } from "@/components/welcome-tour";
import { LanguageSwitcher } from "@/components/language-switcher";
import { supabase } from "@/integrations/supabase/client";
import { prefetchTab, prefetchAllTabs, onConnectionChange } from "@/lib/tab-prefetch";
import { trackEvent } from "@/lib/analytics";

type NavItem = {
  to: string;
  label: string;
  /** Descriptive accessible name when the visible label is short or generic. */
  a11yLabel?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const TABS: readonly NavItem[] = [
  { to: "/today", label: "Today", icon: Home },
  { to: "/stack", label: "Stack", icon: Layers },
  { to: "/progress", label: "Progress", a11yLabel: "Progress and results", icon: LineChart },
  { to: "/food", label: "Food", a11yLabel: "Food diary and macros", icon: UtensilsCrossed },
  { to: "/more", label: "More", a11yLabel: "More tools and settings", icon: MoreHorizontal },
] as const;

const SECONDARY: readonly NavItem[] = [
  { to: "/fitness", label: "Fitness", a11yLabel: "Fitness and body", icon: Dumbbell },
  { to: "/safety", label: "Safety", a11yLabel: "Safety and interactions", icon: ShieldCheck },
  { to: "/timeline", label: "Timeline", icon: Clock },
  { to: "/chat", label: "Ask AI", icon: Sparkles },
  { to: "/plan", label: "Plan", icon: Sparkles },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/library", label: "Library", icon: BookOpen },
] as const;

const SWIPE_HINT_KEY = "doseroutine_swipe_hint_seen";
const SWIPE_HINT_COUNT_KEY = "doseroutine_swipe_hint_count";

function SwipeHint({ onDismiss }: { onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Track prefers-reduced-motion live so a system-level toggle mid-session
  // is respected. Mobile Safari 14+ fires 'change' on MediaQueryList.
  useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    // Safari <14 lacks addEventListener on MediaQueryList; fall back to
    // the deprecated addListener so the hint still updates.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
    } else {
      (
        mql as MediaQueryList & { addListener: (cb: (e: MediaQueryListEvent) => void) => void }
      ).addListener(onChange);
    }
    const t = setTimeout(() => onDismiss(), 4000);
    return () => {
      clearTimeout(t);
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onChange);
      } else {
        (
          mql as MediaQueryList & { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }
        ).removeListener(onChange);
      }
    };
  }, [onDismiss]);

  if (!mounted) return null;

  return (
    <div
      className={
        "keyboard-hide fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:hidden " +
        (reducedMotion ? "" : "animate-fade-in")
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
        <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span>Swipe left/right to switch tabs</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <button
          type="button"
          onClick={onDismiss}
          className={
            "ml-1 -mr-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground " +
            (reducedMotion ? "" : "transition-colors")
          }
          aria-label="Dismiss swipe hint"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onPrefetch,
}: {
  item: NavItem;
  active: boolean;
  onPrefetch?: (to: string) => void;
}) {
  const Icon = item.icon;
  const prefetch = () => onPrefetch?.(item.to);
  return (
    <Link
      to={item.to}
      aria-label={item.a11yLabel}
      preload="intent"
      viewTransition
      onPointerEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      onClick={() => trackEvent("primary_nav_click", { section: item.label, destination: item.to })}
      className={
        "tap-target flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors " +
        (active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-card hover:text-foreground")
      }
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const doPrefetch = (to: string) => prefetchTab(qc, to);

  // Warm every primary tab's data once the shell is idle, so the first swipe
  // or tap into any tab reads from cache.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const run = () => prefetchAllTabs(qc);
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(run, { timeout: 2000 });
    } else {
      const id = window.setTimeout(run, 800);
      return () => window.clearTimeout(id);
    }
  }, [qc]);

  // Re-warm all tabs if the network flips from slow to fast mid-session
  // (e.g. user rejoins Wi-Fi). shouldPrefetch() gates each call, so no work
  // happens while the connection stays slow.
  useEffect(() => {
    let firstFire = true;
    return onConnectionChange((fast) => {
      // Skip the immediate initial callback — the idle-warm effect above
      // already handles the mount case.
      if (firstFire) {
        firstFire = false;
        return;
      }
      if (fast) prefetchAllTabs(qc);
    });
  }, [qc]);

  // Whenever the user lands on a primary tab, immediately warm the previous
  // and next tabs so the first swipe in either direction is instant. This
  // runs *before* touchstart fires, so users don't pay the fetch on the
  // very first swipe of the session (idle prefetch may not have completed
  // yet on slow connections).
  useEffect(() => {
    const idx = TABS.findIndex((t) => pathname === t.to || pathname.startsWith(t.to + "/"));
    if (idx < 0) return;
    const neighbors: string[] = [];
    if (idx - 1 >= 0) neighbors.push(TABS[idx - 1].to);
    if (idx + 1 < TABS.length) neighbors.push(TABS[idx + 1].to);
    for (const to of neighbors) prefetchTab(qc, to);
  }, [pathname, qc]);
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    },
    // Admin membership doesn't change during a session — cache for the tab
    // lifetime so we don't hit the RPC on every navigation.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const [showSwipeHint, setShowSwipeHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only show on the Today tab.
    if (pathname !== "/today") {
      setShowSwipeHint(false);
      return;
    }
    // Only show for signed-in users, on the first 2 visits.
    void supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          setShowSwipeHint(false);
          return;
        }
        const raw = localStorage.getItem(SWIPE_HINT_COUNT_KEY);
        const count = raw ? parseInt(raw, 10) : 0;
        if (Number.isNaN(count)) {
          setShowSwipeHint(false);
          return;
        }
        if (count < 2) {
          setShowSwipeHint(true);
          localStorage.setItem(SWIPE_HINT_COUNT_KEY, String(count + 1));
        }
      })
      .catch(() => setShowSwipeHint(false));
  }, [pathname]);

  const dismissSwipeHint = () => {
    setShowSwipeHint(false);
    localStorage.setItem(SWIPE_HINT_KEY, "1");
  };

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  // Swipe-to-navigate between primary tabs on mobile.
  // We compute swipe-eligibility ONCE on touchstart (walking the DOM to check
  // for horizontally-scrollable ancestors is expensive; doing it on every
  // touchend caused jank on scroll-heavy pages like Today's dose ribbon).
  const touchStart = useRef<{ x: number; y: number; t: number; allow: boolean } | null>(null);

  function swipeAllowedFrom(target: HTMLElement | null): boolean {
    if (!target) return true;
    if (
      target.closest(
        "input, textarea, select, button, a, [role='slider'], [role='dialog'], [role='tablist'], [data-no-swipe]",
      )
    ) {
      return false;
    }
    // Cap the walk at 8 ancestors — deep trees don't matter here and
    // getComputedStyle is the hot cost.
    let node: HTMLElement | null = target;
    for (let i = 0; i < 8 && node && node !== document.body; i++) {
      if (node.scrollWidth > node.clientWidth + 1) {
        const ox = getComputedStyle(node).overflowX;
        if (ox === "auto" || ox === "scroll") return false;
      }
      node = node.parentElement;
    }
    return true;
  }

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    const allow = swipeAllowedFrom(e.target as HTMLElement | null);
    touchStart.current = {
      x: t.clientX,
      y: t.clientY,
      t: Date.now(),
      allow,
    };
    // Warm both neighbors as soon as a swipe *could* be starting — direction
    // isn't known yet, and prefetching is cheap.
    if (allow) {
      const idx = TABS.findIndex((tab) => isActive(tab.to));
      if (idx >= 0) {
        if (idx - 1 >= 0) doPrefetch(TABS[idx - 1].to);
        if (idx + 1 < TABS.length) doPrefetch(TABS[idx + 1].to);
      }
    }
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !start.allow) return;
    const end = e.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    const dt = Date.now() - start.t;
    if (dt > 600) return;
    if (Math.abs(dx) < 70) return;
    if (Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const idx = TABS.findIndex((t) => isActive(t.to));
    if (idx < 0) return;
    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next < 0 || next >= TABS.length) return;
    navigate({ to: TABS[next].to });
  };

  return (
    <div className="min-h-dvh bg-background text-foreground md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-background md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:h-dvh md:flex-col md:overflow-y-auto">
        <div className="flex items-center gap-2 px-6 py-6">
          <BrandLogo size={32} alt="DoseRoutine app logo" className="h-8 w-8 rounded-lg" priority />
          <span className="font-display text-lg font-semibold tracking-tight">DoseRoutine</span>
          <NotificationBell className="ml-auto -mr-2" />
        </div>
        <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
          {TABS.map((tab) => (
            <NavLink key={tab.to} item={tab} active={isActive(tab.to)} onPrefetch={doPrefetch} />
          ))}
        </nav>

        <div className="mt-6 px-3">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick access
          </div>
          <nav className="flex flex-col gap-1" aria-label="Secondary">
            {SECONDARY.map((item) => (
              <NavLink
                key={item.to}
                item={item}
                active={isActive(item.to)}
                onPrefetch={doPrefetch}
              />
            ))}
            {isAdmin && (
              <NavLink
                item={{ to: "/admin", label: "Admin", icon: Shield }}
                active={isActive("/admin")}
                onPrefetch={doPrefetch}
              />
            )}
          </nav>
        </div>

        <div className="mt-auto border-t border-border p-4">
          <LanguageSwitcher variant="select" className="w-full" />
        </div>
      </aside>

      {/* Main content */}
      <main
        id="main-content"
        tabIndex={-1}
        className="min-w-0 flex-1 pb-24 focus:outline-none md:ml-60 md:pb-6"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <OfflineBanner />
        <RebrandReinstallBanner />
        <div className="flex justify-end px-3 pt-2 md:hidden">
          <NotificationBell />
        </div>
        <Breadcrumbs />
        {children}
        <ManualRouteLinks />
      </main>

      {showSwipeHint && <SwipeHint onDismiss={dismissSwipeHint} />}
      <PageHelpFab />
      <WelcomeTour />

      {/* Mobile bottom tab bar */}
      <nav
        className="keyboard-hide fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
          {TABS.map((tab) => {
            const active = isActive(tab.to);
            const Icon = tab.icon;
            return (
              <li key={tab.to} className="flex-1">
                <Link
                  to={tab.to}
                  aria-label={tab.a11yLabel}
                  preload="viewport"
                  viewTransition
                  onPointerEnter={() => doPrefetch(tab.to)}
                  onTouchStart={() => doPrefetch(tab.to)}
                  onFocus={() => doPrefetch(tab.to)}
                  onClick={() =>
                    trackEvent("primary_nav_click", { section: tab.label, destination: tab.to })
                  }
                  className={
                    "tap-target flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors " +
                    (active ? "text-primary" : "text-muted-foreground")
                  }
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
