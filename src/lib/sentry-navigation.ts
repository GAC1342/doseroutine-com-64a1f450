/**
 * Sentry breadcrumbs for the two things that explain most errors: where the
 * user navigated, and which API call ran just before the crash.
 *
 * Everything here is best-effort — telemetry must never break the app, so all
 * of it is wrapped and safely no-ops when Sentry has no DSN.
 */
import { addSentryBreadcrumb } from "./sentry";

type RouterLike = {
  subscribe: (event: string, cb: (payload: unknown) => void) => () => void;
};

/** Strip query strings and obvious identifiers so breadcrumbs stay non-PII. */
function safePath(url: string): string {
  try {
    const parsed = url.startsWith("http") ? new URL(url) : new URL(url, window.location.origin);
    return parsed.pathname.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:id",
    );
  } catch {
    return url.split("?")[0] ?? url;
  }
}

/** Human label for the kinds of requests this app makes. */
function describeRequest(url: string): { category: string; label: string } | null {
  const path = safePath(url);
  if (path.startsWith("/_serverFn")) return { category: "api.server-fn", label: "server function" };
  if (path.startsWith("/api/")) return { category: "api.route", label: path };
  if (/supabase\.co/.test(url)) {
    if (url.includes("/auth/v1/")) return { category: "api.auth", label: "auth" };
    const table = path.split("/rest/v1/")[1];
    return { category: "api.db", label: table ? `db ${table.split("/")[0]}` : "db" };
  }
  if (/^https?:/i.test(url) && !url.includes(window.location.host)) {
    try {
      return { category: "api.external", label: new URL(url).host };
    } catch {
      return null;
    }
  }
  return null;
}

let navigationWired = false;
let fetchWired = false;

/** Record route changes as breadcrumbs (from → to, plus failures). */
export function initSentryNavigationBreadcrumbs(router: RouterLike): (() => void) | undefined {
  if (navigationWired || typeof window === "undefined") return undefined;
  navigationWired = true;
  try {
    let from = window.location.pathname;
    const startedAt = { value: 0 };

    const unsubStart = router.subscribe("onBeforeNavigate", () => {
      startedAt.value = performance.now();
    });
    const unsubLoad = router.subscribe("onResolved", () => {
      const to = window.location.pathname;
      addSentryBreadcrumb({
        category: "navigation",
        message: `${from} → ${to}`,
        level: "info",
        data: {
          from,
          to,
          duration_ms: startedAt.value
            ? Math.round(performance.now() - startedAt.value)
            : undefined,
        },
      });
      from = to;
    });

    return () => {
      unsubStart();
      unsubLoad();
      navigationWired = false;
    };
  } catch {
    return undefined;
  }
}

/**
 * Wrap fetch so API calls leave a breadcrumb with status and duration. Sentry's
 * built-in fetch breadcrumbs are generic; these name the server function,
 * table or endpoint so the timeline reads like a story.
 */
export function initSentryApiBreadcrumbs(): void {
  if (fetchWired || typeof window === "undefined" || typeof window.fetch !== "function") return;
  fetchWired = true;
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (
      init?.method ||
      (typeof input === "object" && "method" in input ? input.method : "GET") ||
      "GET"
    ).toUpperCase();
    const info = describeRequest(url);
    if (!info) return original(input as RequestInfo, init);

    const started = performance.now();
    try {
      const res = await original(input as RequestInfo, init);
      addSentryBreadcrumb({
        category: info.category,
        message: `${method} ${info.label} → ${res.status}`,
        level: res.ok ? "info" : "warning",
        data: {
          url: safePath(url),
          method,
          status: res.status,
          duration_ms: Math.round(performance.now() - started),
        },
      });
      return res;
    } catch (err) {
      addSentryBreadcrumb({
        category: info.category,
        message: `${method} ${info.label} → network error`,
        level: "error",
        data: {
          url: safePath(url),
          method,
          duration_ms: Math.round(performance.now() - started),
          error: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  };
}
