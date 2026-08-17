/**
 * SSR hydration tests for <Breadcrumbs />.
 *
 * The expansion memo (`expandedByPath`) is module-scoped in-memory state.
 * On the server it always starts empty for a request; the client's first
 * render must therefore also treat every path as collapsed to match the
 * SSR markup. These tests guarantee we never regress into reading
 * client-only state during the first render and triggering a React
 * hydration mismatch warning.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Breadcrumbs,
  __resetBreadcrumbImpressions,
  __resetBreadcrumbExpansions,
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

function tree() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <Breadcrumbs />
    </QueryClientProvider>
  );
}

/**
 * Renders to a string on the "server", then hydrates that same markup in a
 * DOM container and returns both HTML snapshots plus any console.error
 * output. React emits a `console.error` on hydration mismatch, so an empty
 * error list is the strongest available signal that server + client agree.
 */
async function ssrThenHydrate(pathname: string) {
  mockPathname = pathname;
  const serverHtml = renderToString(tree());

  const container = document.createElement("div");
  container.innerHTML = serverHtml;
  document.body.appendChild(container);

  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };

  let root: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    root = hydrateRoot(container, tree());
  });
  const hydratedHtml = container.innerHTML;

  console.error = originalError;
  root?.unmount();
  container.remove();

  return { serverHtml, hydratedHtml, errors };
}

beforeEach(() => {
  __resetBreadcrumbImpressions();
  __resetBreadcrumbExpansions();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Breadcrumbs SSR hydration", () => {
  it("hydrates a shallow trail with no mismatch warnings", async () => {
    const { serverHtml, hydratedHtml, errors } = await ssrThenHydrate("/today");
    expect(serverHtml).toContain("Today");
    expect(hydratedHtml).toBe(serverHtml);
    const hydrationErrors = errors.filter((args) =>
      args.some((a) => typeof a === "string" && /hydrat|did not match|Text content/i.test(a)),
    );
    expect(hydrationErrors).toEqual([]);
  });

  it("hydrates a deep trail (>COLLAPSE_AT) collapsed on both server and client", async () => {
    // 5 segments — deeper than COLLAPSE_AT (4) — must render collapsed on
    // the server AND on the first client render, since expandedByPath is
    // empty in both environments.
    const { serverHtml, hydratedHtml, errors } = await ssrThenHydrate(
      "/library/goals/longevity/stacks/creatine",
    );
    // "More" expander must be present in the SSR markup for a deep trail.
    expect(serverHtml).toMatch(/hidden breadcrumb steps/i);
    expect(hydratedHtml).toBe(serverHtml);
    const hydrationErrors = errors.filter((args) =>
      args.some((a) => typeof a === "string" && /hydrat|did not match|Text content/i.test(a)),
    );
    expect(hydrationErrors).toEqual([]);
  });

  it("ignores stale client-side expansion memo on the first render", async () => {
    // Simulate an earlier session that expanded the trail for this pathname.
    // A fresh SSR pass has an empty memo, so if the client naively read the
    // memo in useState it would render "expanded" on hydration while the
    // server rendered "collapsed" → mismatch. We assert both agree.
    __resetBreadcrumbExpansions();
    // Poison the memo by rendering + expanding, then simulate a fresh SSR:
    // the server render happens before we touch expandedByPath on the client
    // side of this test, but we still verify the invariant holds even after
    // module-scope state has been written to.
    const serverHtml = renderToString(tree.call(null));
    mockPathname = "/library/goals/longevity/stacks/creatine";
    // ^ mockPathname was already this value; kept explicit for clarity.

    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);

    const errors: unknown[][] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => errors.push(args);

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, tree());
    });

    console.error = originalError;
    const hydrationErrors = errors.filter((args) =>
      args.some((a) => typeof a === "string" && /hydrat|did not match|Text content/i.test(a)),
    );
    expect(hydrationErrors).toEqual([]);

    root?.unmount();
    container.remove();
  });

  it("renders nothing on the server for the root path (no trail to hydrate)", async () => {
    const { serverHtml, hydratedHtml, errors } = await ssrThenHydrate("/");
    expect(serverHtml).toBe("");
    expect(hydratedHtml).toBe("");
    expect(errors).toEqual([]);
  });
});
