/**
 * Centralised crash reporting for route error boundaries.
 *
 * Every authenticated (and content) screen boundary funnels through here so
 * failures are trackable over time in one place:
 *   - `captureClientError(..., "react_error_boundary")` writes a de-duplicated,
 *     redacted `client_error` analytics event (always on, no DSN needed) and
 *     mirrors into Sentry when VITE_SENTRY_DSN is configured.
 *   - a bounded in-memory log powers e2e assertions and local debugging.
 */
import { captureClientError } from "@/lib/client-error-monitor";
import { classifyBoundaryError, type BoundaryErrorKind } from "@/lib/error-classify";

export type BoundaryReport = {
  boundary: string;
  route: string;
  kind: BoundaryErrorKind;
  message: string;
  at: number;
};

const MAX_LOG = 20;
const recent: BoundaryReport[] = [];

declare global {
  interface Window {
    /** Read by e2e tests to assert boundary reporting actually fired. */
    __doseRoutineBoundaryReports?: BoundaryReport[];
  }
}

/** Snapshot of the most recent boundary reports (newest last). */
export function recentBoundaryReports(): BoundaryReport[] {
  return [...recent];
}

export function __resetBoundaryReports(): void {
  recent.length = 0;
  if (typeof window !== "undefined") window.__doseRoutineBoundaryReports = recent;
}

/**
 * Report a caught render/loader error. Never throws.
 * Returns the classification so the boundary can pick its recovery UI.
 */
export function reportBoundaryError(
  error: unknown,
  options: { boundary: string; route?: string } = { boundary: "unknown" },
): BoundaryErrorKind {
  const kind = classifyBoundaryError(error);
  // A cancelled loader/query is expected control flow (redirects, fast
  // navigation). Never log or report it as a crash.
  if (kind === "cancelled") return kind;
  try {
    const route =
      options.route ?? (typeof window !== "undefined" ? window.location.pathname : "(ssr)");

    const entry: BoundaryReport = {
      boundary: options.boundary,
      route,
      kind,
      message: error instanceof Error ? error.message : String(error ?? ""),
      at: Date.now(),
    };
    recent.push(entry);
    if (recent.length > MAX_LOG) recent.shift();
    if (typeof window !== "undefined") window.__doseRoutineBoundaryReports = recent;

    captureClientError(
      error,
      { boundary: options.boundary, route, error_kind: kind },
      "react_error_boundary",
    );
  } catch {
    /* telemetry must never break recovery UI */
  }
  return kind;
}
