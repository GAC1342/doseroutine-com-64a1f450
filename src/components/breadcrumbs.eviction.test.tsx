/**
 * Tests for the bounded LRU eviction of the module-level expansion memo.
 *
 * The memo is scoped to a single browser session but a long-lived SPA
 * (never full-reloads) could accumulate thousands of expanded pathnames
 * over hours of navigation. We cap the Set at MAX_EXPANDED_PATHS and
 * evict least-recently-used entries so memory stays bounded and stale
 * routes fall out naturally.
 *
 * These tests drive the memo through the same public surface the
 * component uses (render + fire the expander button), so they cover
 * the real code path rather than probing internals directly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Breadcrumbs,
  __resetBreadcrumbExpansions,
  __resetBreadcrumbImpressions,
  __getBreadcrumbExpansionState,
  __BREADCRUMB_EXPANSION_LIMIT,
} from "./breadcrumbs";

let mockPathname = "/";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({ navigate: vi.fn(), invalidate: vi.fn() }),
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { pathname: mockPathname } }),
  Link: ({ to, children, onClick, ...rest }: React.ComponentProps<"a"> & { to: string }) => (
    <a href={to} data-to={to} onClick={onClick as never} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/library-data", () => ({
  compoundBySlugQuery: (slug: string) => ({
    queryKey: ["library", "compound", slug],
    queryFn: async () => null,
  }),
}));

function renderAt(pathname: string) {
  mockPathname = pathname;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Breadcrumbs />
    </QueryClientProvider>,
  );
}

/**
 * Build a >COLLAPSE_AT path so the expander button is rendered, then click
 * it. This is the only user-facing path that writes to the memo.
 */
function renderAndExpand(pathname: string) {
  renderAt(pathname);
  // If this pathname is already in the memo, useEffect will restore it to
  // the "expanded" state and no "More" button is rendered. That's a no-op
  // for the underlying state we care about, but we still need to touch the
  // memo (revisit path) so recency updates fire — the render itself is
  // enough because the sync useEffect calls touchExpansion(pathname).
  const expander = screen.queryByRole("button", { name: /hidden breadcrumb steps/i });
  if (expander) fireEvent.click(expander);
  cleanup();
}

function deepPath(id: string | number) {
  // 5 segments — deeper than COLLAPSE_AT — so the "More" button is present.
  return `/library/goals/longevity/stacks/item-${id}`;
}

beforeEach(() => {
  __resetBreadcrumbExpansions();
  __resetBreadcrumbImpressions();
  cleanup();
});

describe("Breadcrumbs expansion memo — bounded LRU", () => {
  it("caps size at MAX_EXPANDED_PATHS and evicts the oldest entry on overflow", () => {
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT; i++) {
      renderAndExpand(deepPath(i));
    }

    let state = __getBreadcrumbExpansionState();
    expect(state.size).toBe(__BREADCRUMB_EXPANSION_LIMIT);
    expect(state.keys[0]).toBe(deepPath(0)); // oldest
    expect(state.keys.at(-1)).toBe(deepPath(__BREADCRUMB_EXPANSION_LIMIT - 1));

    // One more expansion evicts the oldest, not the size limit itself.
    renderAndExpand(deepPath("overflow"));
    state = __getBreadcrumbExpansionState();
    expect(state.size).toBe(__BREADCRUMB_EXPANSION_LIMIT);
    expect(state.keys.includes(deepPath(0))).toBe(false);
    expect(state.keys.at(-1)).toBe(deepPath("overflow"));
  });

  it("does not double-count a repeated expansion of the same pathname", () => {
    renderAndExpand(deepPath("a"));
    renderAndExpand(deepPath("a"));
    renderAndExpand(deepPath("a"));
    const state = __getBreadcrumbExpansionState();
    expect(state.size).toBe(1);
    expect(state.keys).toEqual([deepPath("a")]);
  });

  it("promotes a re-expanded pathname to most-recent (LRU refresh)", () => {
    renderAndExpand(deepPath("a"));
    renderAndExpand(deepPath("b"));
    renderAndExpand(deepPath("c"));
    // Re-expand "a" — it should move to the end so it survives future evictions.
    renderAndExpand(deepPath("a"));
    const state = __getBreadcrumbExpansionState();
    expect(state.keys).toEqual([deepPath("b"), deepPath("c"), deepPath("a")]);
  });

  it("keeps a recently re-expanded entry alive when the memo overflows", () => {
    // Fill to capacity: a, then 0..N-2.
    renderAndExpand(deepPath("a"));
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT - 1; i++) {
      renderAndExpand(deepPath(i));
    }
    expect(__getBreadcrumbExpansionState().size).toBe(__BREADCRUMB_EXPANSION_LIMIT);

    // Re-touch "a" so it's now the most recent — no longer eligible for eviction.
    renderAndExpand(deepPath("a"));

    // Overflow by one; the oldest (item-0) must be evicted, not "a".
    renderAndExpand(deepPath("overflow"));
    const keys = __getBreadcrumbExpansionState().keys;
    expect(keys.includes(deepPath("a"))).toBe(true);
    expect(keys.includes(deepPath(0))).toBe(false);
  });

  it("bumps recency on plain revisit (no expand click) so warm paths survive overflow", () => {
    // Expand "a", then fill capacity with other paths.
    renderAndExpand(deepPath("a"));
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT - 1; i++) {
      renderAndExpand(deepPath(i));
    }
    // Revisit "a" (route change only — no click). The revisit useEffect should
    // touch the memo and promote "a" to most-recent.
    renderAt(deepPath("a"));
    cleanup();

    // Overflow by one; "a" survives because the revisit refreshed its recency.
    renderAndExpand(deepPath("overflow"));
    const keys = __getBreadcrumbExpansionState().keys;
    expect(keys.includes(deepPath("a"))).toBe(true);
    expect(keys.includes(deepPath(0))).toBe(false);
  });

  it("never exceeds the cap even under a large burst of unique expansions", () => {
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT * 4; i++) {
      renderAndExpand(deepPath(`burst-${i}`));
      // Cap must hold at every step, not just at the end.
      expect(__getBreadcrumbExpansionState().size).toBeLessThanOrEqual(
        __BREADCRUMB_EXPANSION_LIMIT,
      );
    }
    expect(__getBreadcrumbExpansionState().size).toBe(__BREADCRUMB_EXPANSION_LIMIT);
  });

  it("stress: interleaves thousands of route changes and re-expands without drift", () => {
    const LIMIT = __BREADCRUMB_EXPANSION_LIMIT;
    const HOT_KEYS = 5; // paths we keep touching so they must survive to the end
    const TOTAL_STEPS = LIMIT * 12; // ~600 nav events at LIMIT=50 — enough to churn several cache lifetimes

    // Seed a small set of "hot" paths that we'll re-touch throughout the run.
    const hot = Array.from({ length: HOT_KEYS }, (_, i) => deepPath(`hot-${i}`));
    for (const p of hot) renderAndExpand(p);

    // Deterministic pseudo-random walk so failures are reproducible.
    let seed = 0x9e3779b9;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    let coldCounter = 0;
    for (let step = 0; step < TOTAL_STEPS; step++) {
      const roll = rand();
      if (roll < 0.25) {
        // Re-expand a hot path (LRU refresh via click).
        renderAndExpand(hot[Math.floor(rand() * HOT_KEYS)]);
      } else if (roll < 0.45) {
        // Plain revisit of a hot path (no click — recency bump via effect only).
        renderAt(hot[Math.floor(rand() * HOT_KEYS)]);
        cleanup();
      } else {
        // Cold unique path — churns the cache.
        renderAndExpand(deepPath(`cold-${coldCounter++}`));
      }

      // Invariants that must hold at EVERY step, not just at the end.
      const state = __getBreadcrumbExpansionState();
      expect(state.size).toBeLessThanOrEqual(LIMIT);
      // Keys array and size agree (no silent dedupe drift).
      expect(state.keys.length).toBe(state.size);
      // No duplicate entries.
      expect(new Set(state.keys).size).toBe(state.keys.length);
    }

    const finalState = __getBreadcrumbExpansionState();
    expect(finalState.size).toBe(LIMIT);

    // With p(hot touch) ≈ 0.45 and TOTAL_STEPS >> LIMIT, every hot path is
    // touched inside the last LIMIT ops with overwhelming probability, so
    // all HOT_KEYS survive eviction.
    for (const p of hot) {
      expect(finalState.keys.includes(p)).toBe(true);
    }

    // The very first cold path is long gone.
    expect(finalState.keys.includes(deepPath("cold-0"))).toBe(false);
  }, 30_000);
});
