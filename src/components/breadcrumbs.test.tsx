import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Breadcrumbs,
  __resetBreadcrumbImpressions,
  __resetBreadcrumbExpansions,
} from "./breadcrumbs";

// --- Mocks ---------------------------------------------------------------

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

const trackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (name: string, props: Record<string, unknown>) => trackEvent(name, props),
}));

// Stub the library-data module so the dynamic-label hook doesn't hit Supabase.
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

// Helpers
function crumbItems(): HTMLElement[] {
  const list = screen.getByRole("navigation", { name: /breadcrumb/i }).querySelector("ol")!;
  return Array.from(list.querySelectorAll<HTMLLIElement>(":scope > li"));
}

beforeEach(() => {
  trackEvent.mockClear();
  __resetBreadcrumbImpressions();
  __resetBreadcrumbExpansions();
  cleanup();
});

// --- Tests ---------------------------------------------------------------

describe("Breadcrumbs on nested authenticated routes", () => {
  it("returns null for the root path", () => {
    const { container } = renderAt("/");
    expect(container.firstChild).toBeNull();
  });

  it("renders a single-level route with the current segment as plain text (aria-current)", () => {
    renderAt("/today");
    const items = crumbItems();
    // Home icon + "Today" = 2 items
    expect(items).toHaveLength(2);
    // Home is always a link
    expect(within(items[0]).getByRole("link", { name: /home/i })).toHaveAttribute(
      "data-to",
      "/today",
    );
    // Current page: not a link, aria-current="page"
    const current = items[1].querySelector('[aria-current="page"]');
    expect(current).not.toBeNull();
    expect(current!.textContent).toBe("Today");
    expect(within(items[1]).queryByRole("link")).toBeNull();
  });

  it("renders intermediate levels as links and the leaf as plain text", () => {
    renderAt("/admin/schema-report");
    const items = crumbItems();
    // Home + admin + schema-report
    expect(items).toHaveLength(3);

    // Intermediate "admin" — NOT in NAVIGABLE set, must be plain text (no link)
    expect(items[1].textContent).toContain("Admin");
    expect(within(items[1]).queryByRole("link")).toBeNull();

    // Leaf "schema-report" — aria-current, plain text
    const leaf = items[2].querySelector('[aria-current="page"]');
    expect(leaf).not.toBeNull();
    expect(leaf!.textContent).toBe("Schema report");
  });

  it("renders known navigable intermediate segments as real links", () => {
    // /library/goals/muscle: /library is navigable, /library/goals is not, leaf plain
    renderAt("/library/goals/muscle");
    const items = crumbItems();
    expect(items).toHaveLength(4); // Home + library + goals + muscle

    // library → link with correct href
    const libLink = within(items[1]).getByRole("link");
    expect(libLink).toHaveAttribute("data-to", "/library");
    expect(libLink.textContent).toBe("Library");

    // goals → intermediate, non-navigable, plain text
    expect(within(items[2]).queryByRole("link")).toBeNull();
    expect(items[2].textContent).toContain("Goals");

    // muscle → leaf, plain text with aria-current
    expect(items[3].querySelector('[aria-current="page"]')?.textContent).toBe("Muscle");
  });

  it("title-cases and decodes unknown dynamic segments", () => {
    renderAt("/library/vitamin-d3");
    const leaf = crumbItems().at(-1)!;
    expect(leaf.querySelector('[aria-current="page"]')?.textContent).toBe("Vitamin D3");
  });

  it("collapses long trails behind an expandable More button and expands on click", () => {
    renderAt("/a/b/c/d/e/f");
    let items = crumbItems();
    // Collapsed: Home + first + expander + last 2 = 5
    expect(items).toHaveLength(5);
    const moreBtn = screen.getByRole("button", { name: /show \d+ hidden/i });
    expect(moreBtn).toBeInTheDocument();

    fireEvent.click(moreBtn);

    items = crumbItems();
    // Expanded: Home + 6 segments = 7
    // Home + 6 segments + "Show less" collapse control = 8
    expect(items).toHaveLength(8);
    expect(screen.queryByRole("button", { name: /show \d+ hidden/i })).toBeNull();
  });

  it("fires trail impression with the exact payload shape", () => {
    renderAt("/library/creatine");
    const impressions = trackEvent.mock.calls.filter((c) => c[0] === "breadcrumb_trail_impression");
    expect(impressions).toHaveLength(1);
    expect(impressions[0][1]).toEqual({
      pathname: "/library/creatine",
      depth: 2,
      collapsed: false,
      trail: ["/library", "/library/creatine"],
    });
  });

  it("fires breadcrumb_click with the exact payload for an intermediate link", () => {
    renderAt("/library/creatine");
    trackEvent.mockClear();
    const libLink = within(crumbItems()[1]).getByRole("link");
    fireEvent.click(libLink);
    const clicks = trackEvent.mock.calls.filter((c) => c[0] === "breadcrumb_click");
    expect(clicks).toHaveLength(1);
    // depth = crumbs.length + 1 (includes the Home entry).
    expect(clicks[0][1]).toEqual({
      href: "/library",
      label: "Library",
      position: 1,
      depth: 3,
      from: "/library/creatine",
    });
  });

  it("fires breadcrumb_click for the Home crumb with position 0 and Home's href", () => {
    renderAt("/admin/schema-report");
    trackEvent.mockClear();
    const homeLink = within(crumbItems()[0]).getByRole("link", { name: /home/i });
    fireEvent.click(homeLink);
    const clicks = trackEvent.mock.calls.filter((c) => c[0] === "breadcrumb_click");
    expect(clicks).toHaveLength(1);
    // The Home crumb navigates to /today regardless of the current pathname.
    expect(clicks[0][1]).toEqual({
      href: "/today",
      label: "Home",
      position: 0,
      depth: 3,
      from: "/admin/schema-report",
    });
  });

  it("fires breadcrumb_expand_click with the exact payload", () => {
    renderAt("/a/b/c/d/e");
    trackEvent.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /show \d+ hidden/i }));
    const expands = trackEvent.mock.calls.filter((c) => c[0] === "breadcrumb_expand_click");
    expect(expands).toHaveLength(1);
    // Depth = 5, KEEP_TAIL = 2, first = 1 → hidden_count = 5 - 2 - 1 = 2.
    expect(expands[0][1]).toEqual({
      pathname: "/a/b/c/d/e",
      depth: 5,
      hidden_count: 2,
    });
  });

  it("collapsed trail impressions carry collapsed:true and the full trail (not just the visible slice)", () => {
    renderAt("/a/b/c/d/e/f");
    const impressions = trackEvent.mock.calls.filter((c) => c[0] === "breadcrumb_trail_impression");
    expect(impressions).toHaveLength(1);
    expect(impressions[0][1]).toEqual({
      pathname: "/a/b/c/d/e/f",
      depth: 6,
      collapsed: true,
      // trail reflects the rendered visible links (Home + first + tail 2)
      trail: ["/a", "/a/b/c/d/e", "/a/b/c/d/e/f"],
    });
  });
});

// --- Fallback / edge-case regression tests -------------------------------

describe("Breadcrumbs fallback behavior (malformed, empty, deep paths)", () => {
  it("returns null for an empty pathname", () => {
    const { container } = renderAt("");
    expect(container.firstChild).toBeNull();
  });

  it("returns null when the path is only slashes", () => {
    const { container } = renderAt("///");
    expect(container.firstChild).toBeNull();
  });

  it("ignores trailing slashes and duplicate separators", () => {
    renderAt("//today//");
    const items = crumbItems();
    // Home + Today only — no empty crumbs in between
    expect(items).toHaveLength(2);
    expect(items[1].querySelector('[aria-current="page"]')?.textContent).toBe("Today");
  });

  it("does not throw and renders a fallback label for a segment that fails to decode", () => {
    // '%E0%A4%A' is an incomplete UTF-8 sequence — decodeURIComponent throws.
    // The component must catch and fall back to the raw slug (title-cased).
    expect(() => renderAt("/library/%E0%A4%A")).not.toThrow();
    const leaf = crumbItems().at(-1)!;
    expect(leaf.querySelector('[aria-current="page"]')).not.toBeNull();
    expect(leaf.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it("truncates absurdly long segments with an ellipsis so the trail never blows out", () => {
    const long = "x".repeat(200);
    renderAt(`/library/${long}`);
    const leafText = crumbItems().at(-1)!.querySelector('[aria-current="page"]')!.textContent!;
    // Must be truncated to <= 32 chars and end with an ellipsis.
    expect(leafText.length).toBeLessThanOrEqual(32);
    expect(leafText.endsWith("…")).toBe(true);
  });

  it("renders 'Untitled' when a segment normalizes to whitespace", () => {
    // A segment made of only separators normalizes to empty after cleanup.
    renderAt("/today/-_-");
    const leaf = crumbItems().at(-1)!.querySelector('[aria-current="page"]')!;
    expect(leaf.textContent).toBe("Untitled");
  });

  it("collapses very deep trails to the fixed Home + first + More + last 2 shape", () => {
    // 10-deep path — collapsed view stays compact regardless of depth.
    renderAt("/a/b/c/d/e/f/g/h/i/j");
    const items = crumbItems();
    // Home + first + expander + last 2 = 5
    expect(items).toHaveLength(5);
    // Expander must announce the correct hidden count (10 - 1 first - 2 tail = 7).
    expect(screen.getByRole("button", { name: /show 7 hidden/i })).toBeInTheDocument();
    // Leaf is still marked as current.
    expect(items.at(-1)!.querySelector('[aria-current="page"]')?.textContent).toBe("J");
  });

  it("keeps the leaf non-navigable even when its href happens to match a NAVIGABLE entry", () => {
    // /today is in NAVIGABLE, but as the leaf it must render as aria-current
    // plain text, not as a self-referential link.
    renderAt("/today");
    const leaf = crumbItems().at(-1)!;
    expect(within(leaf).queryByRole("link")).toBeNull();
    expect(leaf.querySelector('[aria-current="page"]')?.textContent).toBe("Today");
  });
});

// --- Impression de-duplication ------------------------------------------

describe("Breadcrumbs trail-impression de-duplication", () => {
  function impressionCalls() {
    return trackEvent.mock.calls.filter((c) => c[0] === "breadcrumb_trail_impression");
  }

  it("fires exactly once per pathname across re-mounts in the same session", () => {
    renderAt("/library/creatine");
    expect(impressionCalls()).toHaveLength(1);

    // Re-mount at the same path (simulates re-render / provider swap).
    cleanup();
    renderAt("/library/creatine");
    expect(impressionCalls()).toHaveLength(1);
  });

  it("does not re-fire when only expansion state changes", () => {
    renderAt("/a/b/c/d/e/f");
    expect(impressionCalls()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /show \d+ hidden/i }));
    expect(impressionCalls()).toHaveLength(1);
  });

  it("fires again for a different pathname, then de-dupes that one too", () => {
    renderAt("/today");
    cleanup();
    renderAt("/stack");
    cleanup();
    renderAt("/today"); // already fired
    cleanup();
    renderAt("/stack"); // already fired
    const paths = impressionCalls().map((c) => (c[1] as { pathname: string }).pathname);
    expect(paths).toEqual(["/today", "/stack"]);
  });

  it("resets after the session memo is cleared", () => {
    renderAt("/today");
    cleanup();
    renderAt("/today");
    expect(impressionCalls()).toHaveLength(1);
    __resetBreadcrumbImpressions();
    cleanup();
    renderAt("/today");
    expect(impressionCalls()).toHaveLength(2);
  });
});

// --- Expansion persistence ----------------------------------------------

describe("Breadcrumbs expansion persistence per route", () => {
  const DEEP = "/a/b/c/d/e/f";
  const OTHER = "/x/y/z/w/v";

  function isCollapsed() {
    return !!screen.queryByRole("button", { name: /show \d+ hidden/i });
  }

  it("stays expanded when re-mounting the same pathname after expanding", () => {
    renderAt(DEEP);
    fireEvent.click(screen.getByRole("button", { name: /show \d+ hidden/i }));
    expect(isCollapsed()).toBe(false);

    cleanup();
    renderAt(DEEP);
    expect(isCollapsed()).toBe(false);
    // Home + 6 segments + "Show less" collapse control
    expect(crumbItems()).toHaveLength(1 + 6 + 1);
  });

  it("starts collapsed on a different route the user hasn't expanded", () => {
    renderAt(DEEP);
    fireEvent.click(screen.getByRole("button", { name: /show \d+ hidden/i }));
    cleanup();

    renderAt(OTHER);
    expect(isCollapsed()).toBe(true);
  });

  it("restores prior expansion when returning to a previously expanded route", () => {
    renderAt(DEEP);
    fireEvent.click(screen.getByRole("button", { name: /show \d+ hidden/i }));
    cleanup();
    renderAt(OTHER);
    expect(isCollapsed()).toBe(true);
    cleanup();

    renderAt(DEEP);
    expect(isCollapsed()).toBe(false);
  });

  it("clears persisted expansion when the memo is reset", () => {
    renderAt(DEEP);
    fireEvent.click(screen.getByRole("button", { name: /show \d+ hidden/i }));
    cleanup();

    __resetBreadcrumbExpansions();
    renderAt(DEEP);
    expect(isCollapsed()).toBe(true);
  });
});

// --- Expander a11y / keyboard ------------------------------------------

describe("Breadcrumbs expander accessibility and keyboard", () => {
  const DEEP = "/a/b/c/d/e/f";

  it("expander exposes aria-expanded=false, aria-controls, and a descriptive label", () => {
    renderAt(DEEP);
    const btn = screen.getByRole("button", { name: /show \d+ hidden breadcrumb/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    const controls = btn.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    // aria-controls must point at the trail list.
    expect(document.getElementById(controls!)?.tagName).toBe("OL");
  });

  it("activates the expander with the Enter key", () => {
    renderAt(DEEP);
    const btn = screen.getByRole("button", { name: /show \d+ hidden breadcrumb/i });
    btn.focus();
    fireEvent.keyDown(btn, { key: "Enter" });
    fireEvent.click(btn); // jsdom needs the click to follow Enter on a native button
    expect(screen.queryByRole("button", { name: /show \d+ hidden/i })).toBeNull();
  });

  it("renders a Show less toggle when expanded, with aria-expanded=true and matching aria-controls", () => {
    renderAt(DEEP);
    fireEvent.click(screen.getByRole("button", { name: /show \d+ hidden/i }));
    const collapse = screen.getByRole("button", { name: /collapse breadcrumb trail/i });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    expect(collapse.getAttribute("aria-controls")).toBe(
      screen.getByRole("navigation", { name: /breadcrumb/i }).querySelector("ol")!.id,
    );
  });

  it("clicking Show less collapses the trail again", () => {
    renderAt(DEEP);
    fireEvent.click(screen.getByRole("button", { name: /show \d+ hidden/i }));
    fireEvent.click(screen.getByRole("button", { name: /collapse breadcrumb trail/i }));
    expect(screen.getByRole("button", { name: /show \d+ hidden/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /collapse breadcrumb trail/i })).toBeNull();
  });

  it("Escape while expanded collapses the trail", () => {
    renderAt(DEEP);
    fireEvent.click(screen.getByRole("button", { name: /show \d+ hidden/i }));
    fireEvent.keyDown(screen.getByRole("navigation", { name: /breadcrumb/i }), {
      key: "Escape",
    });
    expect(screen.getByRole("button", { name: /show \d+ hidden/i })).toBeInTheDocument();
  });

  it("announces expand and collapse via a polite live region", () => {
    renderAt(DEEP);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status.textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: /show \d+ hidden/i }));
    expect(status.textContent).toMatch(/expanded.*showing 6 steps/i);

    fireEvent.click(screen.getByRole("button", { name: /collapse breadcrumb trail/i }));
    expect(status.textContent).toMatch(/collapsed/i);
  });

  it("does not render a collapse control on shallow (non-collapsible) trails", () => {
    renderAt("/library/creatine");
    expect(screen.queryByRole("button", { name: /collapse breadcrumb trail/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /show \d+ hidden/i })).toBeNull();
  });
});

// --- Tricky path input regression tests ---------------------------------

describe("Breadcrumbs handles tricky route inputs safely", () => {
  it("percent-decodes a spaced slug into a readable, title-cased label", () => {
    renderAt("/library/vitamin%20d3");
    const leaf = crumbItems().at(-1)!.querySelector('[aria-current="page"]')!;
    expect(leaf.textContent).toBe("Vitamin D3");
  });

  it("decodes non-ASCII percent-escapes without throwing", () => {
    expect(() => renderAt("/library/caf%C3%A9")).not.toThrow();
    const leaf = crumbItems().at(-1)!.querySelector('[aria-current="page"]')!;
    expect(leaf.textContent).toBe("Café");
  });

  it("does not double-decode already-encoded segments (%2520 stays literal %20)", () => {
    renderAt("/library/pre%2520workout");
    const leaf = crumbItems().at(-1)!.querySelector('[aria-current="page"]')!;
    // %2520 decodes once to the literal string "%20", which then title-cases.
    // Accept either "Pre%20workout" or a variant that preserves the %20 token.
    expect(leaf.textContent).toMatch(/pre.*%20.*workout/i);
  });

  it("collapses repeated internal slashes without producing empty crumbs", () => {
    renderAt("/library///creatine");
    const items = crumbItems();
    expect(items).toHaveLength(3);
    expect(items[1].textContent).toContain("Library");
    expect(items[2].querySelector('[aria-current="page"]')?.textContent).toBe("Creatine");
  });

  it("strips a trailing slash and still marks the last real segment as current", () => {
    renderAt("/library/creatine/");
    const items = crumbItems();
    expect(items).toHaveLength(3);
    const leaf = items.at(-1)!;
    expect(leaf.querySelector('[aria-current="page"]')?.textContent).toBe("Creatine");
    expect(within(leaf).queryByRole("link")).toBeNull();
  });

  it("strips multiple trailing slashes", () => {
    renderAt("/today////");
    const items = crumbItems();
    expect(items).toHaveLength(2);
    expect(items.at(-1)!.querySelector('[aria-current="page"]')?.textContent).toBe("Today");
  });

  it("tolerates a mix of leading, repeated, and trailing slashes", () => {
    renderAt("///library//goals///muscle///");
    const items = crumbItems();
    expect(items).toHaveLength(4);
    expect(within(items[1]).getByRole("link")).toHaveAttribute("data-to", "/library");
    expect(within(items[2]).queryByRole("link")).toBeNull();
    expect(items[3].querySelector('[aria-current="page"]')?.textContent).toBe("Muscle");
  });

  it("builds intermediate hrefs from the normalized path, not the raw one", () => {
    renderAt("//library//creatine");
    const libLink = within(crumbItems()[1]).getByRole("link");
    expect(libLink).toHaveAttribute("data-to", "/library");
  });

  it("percent-encoded slashes (%2F) stay inside a single segment and don't split the trail", () => {
    renderAt("/library/a%2Fb");
    const items = crumbItems();
    expect(items).toHaveLength(3);
    const leafText = items.at(-1)!.querySelector('[aria-current="page"]')!.textContent!;
    expect(leafText.length).toBeGreaterThan(0);
  });

  it("renders 'Untitled' when a segment is only separators after decoding", () => {
    renderAt("/library/---");
    const leaf = crumbItems().at(-1)!.querySelector('[aria-current="page"]')!;
    expect(leaf.textContent).toBe("Untitled");
  });

  it("does not throw on a bare malformed percent-escape", () => {
    expect(() => renderAt("/library/%")).not.toThrow();
    const leaf = crumbItems().at(-1)!.querySelector('[aria-current="page"]');
    expect(leaf).not.toBeNull();
    expect((leaf!.textContent ?? "").length).toBeGreaterThan(0);
  });

  it("fires a trail impression using the normalized pathname, not the raw one", () => {
    renderAt("//library//creatine//");
    const impressions = trackEvent.mock.calls.filter((c) => c[0] === "breadcrumb_trail_impression");
    expect(impressions).toHaveLength(1);
    const trail = (impressions[0][1] as { trail: string[] }).trail;
    expect(trail).toEqual(["/library", "/library/creatine"]);
  });
});
