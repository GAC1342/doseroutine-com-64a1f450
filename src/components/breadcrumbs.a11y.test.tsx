import { describe, it, expect, vi, beforeEach } from "vitest";

import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import {
  Breadcrumbs,
  __resetBreadcrumbImpressions,
  __resetBreadcrumbExpansions,
} from "./breadcrumbs";

// --- Mocks (mirror breadcrumbs.test.tsx) -------------------------------

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
  // The breadcrumb is rendered inside a landmark in the app shell; wrap in
  // <main> here so axe doesn't flag "region" for orphaned content in tests.
  return render(
    <QueryClientProvider client={qc}>
      <main>
        <Breadcrumbs />
      </main>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  __resetBreadcrumbImpressions();
  __resetBreadcrumbExpansions();
  cleanup();
});

// --- axe rules ---------------------------------------------------------

// A focused subset of WCAG 2.1 A/AA rules relevant to breadcrumbs. This
// excludes rules that only apply to a full document (html-has-lang, etc.).
const axeOptions = {
  runOnly: {
    type: "tag" as const,
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
  rules: {
    // color-contrast can't be evaluated reliably in jsdom (no layout/paint)
    "color-contrast": { enabled: false },
    // Test harness renders without full landmark structure
    region: { enabled: false },
  },
};

// --- Tests -------------------------------------------------------------

describe("breadcrumbs — accessibility (axe)", () => {
  it("has no axe violations on a top-level route", async () => {
    const { container } = renderAt("/stack");
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations on a deeply nested route", async () => {
    const { container } = renderAt("/admin/schema-report");
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations on a dynamic slug route", async () => {
    const { container } = renderAt("/library/creatine");
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations when the collapsed trail is expanded", async () => {
    const { container } = renderAt("/a/b/c/d/e/f/g");
    const expander = screen.queryByRole("button", { name: /hidden breadcrumb/i });
    if (expander) fireEvent.click(expander);
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
  });
});

describe("breadcrumbs — aria-current usage", () => {
  it("marks exactly one crumb with aria-current='page' (the leaf)", () => {
    renderAt("/admin/schema-report");
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    const current = nav.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0].textContent?.trim()).toMatch(/schema report/i);
  });

  it("aria-current is not set on any link (leaf must be plain text)", () => {
    renderAt("/stack");
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    const links = within(nav).getAllByRole("link");
    for (const a of links) {
      expect(a.getAttribute("aria-current")).toBeNull();
    }
  });

  it("uses a semantic list (ol) inside the breadcrumb nav", () => {
    renderAt("/stack");
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav.querySelector("ol")).not.toBeNull();
  });
});

describe("breadcrumbs — keyboard navigation", () => {
  it("all links are reachable via keyboard (native <a href> tab order)", () => {
    renderAt("/admin/schema-report");
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    const links = within(nav).getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      // Native anchors with href are keyboard focusable; explicit tabIndex,
      // when present, must not remove them from tab order.
      const ti = link.getAttribute("tabindex");
      expect(ti === null || Number(ti) >= 0).toBe(true);
      link.focus();
      expect(document.activeElement).toBe(link);
    }
  });

  it("expander button is focusable and toggles with Enter/Space", () => {
    renderAt("/a/b/c/d/e/f/g");
    const btn = screen.getByRole("button", { name: /hidden breadcrumb/i });
    btn.focus();
    expect(document.activeElement).toBe(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(btn); // Enter/Space on a native <button> fires click
    const toggled = screen.getByRole("button", { name: /collapse breadcrumb/i });
    expect(toggled.getAttribute("aria-expanded")).toBe("true");
  });

  it("Escape collapses the expanded trail and returns focus to the expander", async () => {
    renderAt("/a/b/c/d/e/f/g");
    const expander = screen.getByRole("button", { name: /hidden breadcrumb/i });
    fireEvent.click(expander);
    // trail is now expanded — Escape handler lives on the nav element
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    fireEvent.keyDown(nav, { key: "Escape" });
    // rAF in handleCollapse restores focus; flush it
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const afterCollapse = screen.getByRole("button", { name: /hidden breadcrumb/i });
    expect(afterCollapse.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(afterCollapse);
  });

  it("expander advertises the controlled region via aria-controls", () => {
    renderAt("/a/b/c/d/e/f/g");
    const btn = screen.getByRole("button", { name: /hidden breadcrumb/i });
    const controls = btn.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).not.toBeNull();
  });
});
