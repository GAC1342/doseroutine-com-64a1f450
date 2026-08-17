import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trackEvent } from "@/lib/analytics";
import { compoundBySlugQuery } from "@/lib/library-data";
import { GOALS } from "@/lib/goals";

const LABELS: Record<string, string> = {
  today: "Today",
  stack: "Stack",
  safety: "Safety",
  timeline: "Timeline",
  more: "More",
  plan: "Plan",
  upgrade: "Upgrade",
  reminders: "Reminders",
  library: "Library",
  admin: "Admin",
  "schema-report": "Schema report",
  auth: "Sign in",
  onboarding: "Onboarding",
  goals: "Goals",
};

// Paths that correspond to a real route the user can navigate to.
// Intermediate segments not in this set render as plain text (no link).
const NAVIGABLE = new Set<string>([
  "/today",
  "/stack",
  "/safety",
  "/timeline",
  "/more",
  "/plan",
  "/upgrade",
  "/reminders",
  "/library",
  "/admin/schema-report",
]);

// Top-level tab routes — the back button hides on these.
const ROOT_PATHS = new Set<string>(["/today", "/stack", "/safety", "/timeline", "/more"]);

function titleCase(segment: string): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  })();
  const cleaned = decoded.replace(/[-_]+/g, " ").trim();
  if (!cleaned) return "Untitled";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(label: string, max = 32): string {
  return label.length > max ? label.slice(0, max - 1).trimEnd() + "…" : label;
}

function labelFor(segment: string): string {
  const known = LABELS[segment];
  if (known) return known;
  return truncate(titleCase(segment));
}

/**
 * Resolve a meaningful label for dynamic route params by matching the full
 * path pattern. Falls back to null so the caller uses title-cased slug.
 */
function useDynamicLabel(segments: string[], index: number): string | null {
  const segment = segments[index];
  const parent = segments[index - 1];
  const isLibrarySlug = index === 1 && segments[0] === "library" && !!segment;
  const isGoalSlug = index === 1 && segments[0] === "goals" && !!segment;

  const compoundQ = useQuery({
    ...compoundBySlugQuery(segment ?? ""),
    enabled: isLibrarySlug,
  });

  if (isGoalSlug) {
    const g = GOALS.find((x) => x.slug === segment);
    return g ? truncate(g.title) : null;
  }
  if (isLibrarySlug && compoundQ.data?.name) {
    return truncate(compoundQ.data.name);
  }
  // Reference parent to satisfy linter and enable future patterns.
  void parent;
  return null;
}

// Session-scoped memo of pathnames that have already fired a trail impression,
// so re-renders (theme toggles, query refetches, expand/collapse) don't
// double-count. Cleared on full page reload / new session.
const firedImpressions = new Set<string>();

/** Test-only: reset the per-session impression memo. */
export function __resetBreadcrumbImpressions() {
  firedImpressions.clear();
}

// Session-scoped memo of which pathnames the user has explicitly expanded.
// Keeps the trail open when re-visiting a route in the same session, and
// only collapses when navigating to a different route the user hasn't
// expanded yet.
//
// Bounded to MAX_EXPANDED_PATHS entries with LRU eviction so long-running
// sessions (SPAs that never full-reload) can't grow the Set indefinitely.
// A Set preserves insertion order, so the first key returned by its
// iterator is the oldest — deleting it evicts the LRU entry. Re-adding an
// existing key would keep its original position, so we delete-then-add on
// touch to move it to the "most recent" end.
const MAX_EXPANDED_PATHS = 50;
const expandedByPath = new Set<string>();

function rememberExpansion(pathname: string) {
  if (expandedByPath.has(pathname)) {
    // Refresh recency: move to the end of the insertion order.
    expandedByPath.delete(pathname);
  }
  expandedByPath.add(pathname);
  while (expandedByPath.size > MAX_EXPANDED_PATHS) {
    const oldest = expandedByPath.values().next().value;
    if (oldest === undefined) break;
    expandedByPath.delete(oldest);
  }
}

function touchExpansion(pathname: string) {
  // Read-side recency bump: if this pathname is currently marked expanded
  // and the user revisits it, promote it so it isn't evicted by newer
  // unrelated expansions.
  if (expandedByPath.has(pathname)) {
    expandedByPath.delete(pathname);
    expandedByPath.add(pathname);
  }
}

/** Test-only: reset the per-session expansion memo. */
export function __resetBreadcrumbExpansions() {
  expandedByPath.clear();
}

/** Test-only: inspect the current memo (size + ordered keys). */
export function __getBreadcrumbExpansionState() {
  return { size: expandedByPath.size, keys: Array.from(expandedByPath) };
}

/** Test-only: expose the eviction cap. */
export const __BREADCRUMB_EXPANSION_LIMIT = MAX_EXPANDED_PATHS;

/** Test-only: direct handles to the LRU write helpers. */
export const __rememberExpansion = rememberExpansion;
export const __touchExpansion = touchExpansion;

export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(() => expandedByPath.has(pathname));

  // Sync local state when the route changes: restore prior expansion for that
  // pathname (if any), otherwise start collapsed. Touch the memo so revisited
  // paths stay warm and aren't evicted by unrelated expansions elsewhere.
  useEffect(() => {
    touchExpansion(pathname);
    setExpanded(expandedByPath.has(pathname));
  }, [pathname]);

  // Compute segments up-front so we can call the dynamic-label hook
  // unconditionally (React rules of hooks — no early return before it).
  const safePath = typeof pathname === "string" ? pathname : "";
  const rawSegments = safePath.split("/").filter(Boolean);

  // Resolve dynamic labels (compound name for /library/$slug, goal title for
  // /goals/$goal). The hook internally no-ops for non-matching patterns.
  const dynamicAt1 = useDynamicLabel(rawSegments, 1);

  // Safe fallback for empty, root, or malformed paths: we still run every
  // hook below (React requires a stable hook order across renders) and only
  // skip rendering right before the JSX return.
  const isEmptyTrail = rawSegments.length === 0;

  // Collapse threshold — anything deeper than this shows a "More" pill in the
  // middle that expands the full trail inline on tap. Keeps the row short on
  // small screens without hiding the destination or the entry point.
  const COLLAPSE_AT = 4;
  const KEEP_TAIL = 2; // show last N alongside the first crumb when collapsed
  const shouldCollapse = !expanded && rawSegments.length > COLLAPSE_AT;

  type Crumb =
    | {
        kind: "link";
        key: string;
        href: string;
        label: string;
        isLast: boolean;
        navigable: boolean;
      }
    | { kind: "expander"; key: string; hiddenCount: number };

  const crumbs: Crumb[] = [];
  const pushLink = (absoluteIdx: number) => {
    const href = "/" + rawSegments.slice(0, absoluteIdx + 1).join("/");
    const dynamicLabel = absoluteIdx === 1 ? dynamicAt1 : null;
    crumbs.push({
      kind: "link",
      key: href,
      href,
      label: dynamicLabel ?? labelFor(rawSegments[absoluteIdx]),
      isLast: absoluteIdx === rawSegments.length - 1,
      navigable: NAVIGABLE.has(href),
    });
  };

  if (shouldCollapse) {
    pushLink(0);
    const tailStart = rawSegments.length - KEEP_TAIL;
    crumbs.push({
      kind: "expander",
      key: "expander",
      hiddenCount: tailStart - 1,
    });
    for (let i = tailStart; i < rawSegments.length; i++) pushLink(i);
  } else {
    for (let i = 0; i < rawSegments.length; i++) pushLink(i);
  }

  const trailKeys = crumbs
    .filter((c) => c.kind === "link")
    .map((c) => (c as { href: string }).href);
  const trailSignature = `${trailKeys.join(">")}::${shouldCollapse ? "c" : "f"}`;

  useEffect(() => {
    if (isEmptyTrail) return;
    if (!trailSignature) return;
    if (firedImpressions.has(pathname)) return;
    firedImpressions.add(pathname);
    trackEvent("breadcrumb_trail_impression", {
      pathname,
      depth: rawSegments.length,
      collapsed: shouldCollapse,
      trail: trailKeys,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleClick = (href: string, label: string, index: number, total: number) => {
    trackEvent("breadcrumb_click", {
      href,
      label,
      position: index,
      depth: total,
      from: pathname,
    });
  };

  const handleExpand = (hiddenCount: number) => {
    trackEvent("breadcrumb_expand_click", {
      pathname,
      depth: rawSegments.length,
      hidden_count: hiddenCount,
    });
    rememberExpansion(pathname);
    setExpanded(true);
    setAnnouncement(`Expanded breadcrumb trail. Showing ${rawSegments.length} steps.`);
  };

  const handleCollapse = () => {
    expandedByPath.delete(pathname);
    setExpanded(false);
    setAnnouncement("Collapsed breadcrumb trail.");
    // Return focus to the expander that reappears in place of the collapse
    // control, so keyboard users stay oriented.
    requestAnimationFrame(() => {
      expanderRef.current?.focus();
    });
  };

  const trailId = useId();
  const [announcement, setAnnouncement] = useState("");
  const expanderRef = useRef<HTMLButtonElement | null>(null);
  const collapseRef = useRef<HTMLButtonElement | null>(null);

  // Escape collapses an expanded trail when focus is anywhere inside the nav.
  const onNavKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape" && expanded && rawSegments.length > COLLAPSE_AT) {
      e.stopPropagation();
      handleCollapse();
    }
  };

  const canCollapse = expanded && rawSegments.length > COLLAPSE_AT;

  const showBack = !ROOT_PATHS.has(pathname);
  const handleBack = () => {
    trackEvent("breadcrumb_back_click", { from: pathname });
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: "/today" });
    }
  };

  // The router force-applies aria-current="page" to an active <Link> after
  // any props we pass, so on /today the Home crumb would become a second
  // "current page" alongside the leaf. Strip it on the element instead: the
  // leaf crumb is the only element that may carry aria-current.
  const homeRef = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    homeRef.current?.removeAttribute("aria-current");
  }, [pathname]);

  if (isEmptyTrail) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      onKeyDown={onNavKeyDown}
    >
      {/* Polite live region announces expand/collapse state to screen readers. */}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-2 py-1 sm:px-4">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="tap-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <ol
          id={trailId}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap px-2 py-1 text-xs text-muted-foreground"
        >
          <li>
            <Link
              ref={homeRef}
              to="/today"
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Home"
              onClick={() => handleClick("/today", "Home", 0, crumbs.length + 1)}
            >
              <Home className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
            </Link>
          </li>

          {crumbs.map((c, idx) => (
            <li key={c.key} className="flex items-center gap-1">
              <ChevronRight
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
                focusable="false"
              />
              {c.kind === "expander" ? (
                <button
                  ref={expanderRef}
                  type="button"
                  onClick={() => handleExpand(c.hiddenCount)}
                  aria-label={`Show ${c.hiddenCount} hidden breadcrumb ${c.hiddenCount === 1 ? "step" : "steps"}`}
                  aria-expanded={false}
                  aria-controls={trailId}
                  className="inline-flex min-h-8 items-center gap-1 rounded px-1.5 py-1 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
                  <span aria-hidden="true" className="hidden sm:inline">
                    More
                  </span>
                </button>
              ) : c.isLast ? (
                <span
                  className="rounded px-1.5 py-1 font-medium text-foreground"
                  aria-current="page"
                >
                  {c.label}
                </span>
              ) : c.navigable ? (
                <Link
                  to={c.href as string}
                  className="rounded px-1.5 py-1 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => handleClick(c.href, c.label, idx + 1, crumbs.length + 1)}
                >
                  {c.label}
                </Link>
              ) : (
                // Non-navigable intermediate segment: announce as a static step so
                // screen readers don't skip context between linked ancestors and
                // the current page.
                <span
                  className="rounded px-1.5 py-1"
                  role="text"
                  aria-label={`${c.label} (not linked)`}
                >
                  {c.label}
                </span>
              )}
            </li>
          ))}
          {canCollapse && (
            <li className="flex items-center">
              <button
                ref={collapseRef}
                type="button"
                onClick={handleCollapse}
                aria-label="Collapse breadcrumb trail"
                aria-expanded={true}
                aria-controls={trailId}
                className="ml-1 inline-flex min-h-8 items-center gap-1 rounded px-1.5 py-1 text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden="true">Show less</span>
              </button>
            </li>
          )}
        </ol>
      </div>
    </nav>
  );
}
