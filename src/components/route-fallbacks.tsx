import { useEffect, useMemo } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { reportBoundaryError } from "@/lib/boundary-report";
import { friendlyErrorMessage } from "@/lib/error-classify";
import { loginRedirectSearch } from "@/lib/session-expiry";
import { NetworkRecoveryScreen } from "@/components/network-recovery";

/**
 * Shared behavior for every route boundary:
 *   - classify the failure (offline / auth-expired / unknown)
 *   - report it once, centrally (analytics `client_error` + Sentry mirror)
 *   - offline  → the dedicated recovery screen with a live "Try again"
 *   - expired  → straight back into the login flow
 *   - anything else → the generic boundary below
 */
function useBoundaryRecovery(error: Error, boundary: string) {
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const kind = useMemo(
    () => reportBoundaryError(error, { boundary, route: pathname }),
    [error, boundary, pathname],
  );

  useEffect(() => {
    if (kind !== "auth-expired") return;
    void navigate({ to: "/auth", search: loginRedirectSearch(pathname), replace: true });
  }, [kind, navigate, pathname]);

  const retry = (reset: () => void) => {
    reset();
    void router.invalidate();
  };

  return { kind, retry };
}

/** Reusable error boundary UI for content routes (library, goals, etc.).
 *  Calls both `reset()` (clear the boundary) and `router.invalidate()`
 *  (re-run loaders) so the retry actually re-fetches data. */
export function ContentRouteError({ error, reset }: { error: Error; reset: () => void }) {
  const { kind, retry } = useBoundaryRecovery(error, "content-route");
  const message = friendlyErrorMessage(error, "Something went wrong loading this page.");

  // Redirect/navigation cancelled this load: show the pending state, not a
  // crash screen. The incoming route renders a beat later.
  if (kind === "cancelled") return <RouteCancelledFallback onSettled={() => retry(reset)} />;

  if (kind === "offline") {
    return <NetworkRecoveryScreen onRetry={() => retry(reset)} />;
  }

  return (
    <div
      data-testid="content-route-error"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center"
    >
      <h1 className="font-display text-2xl font-semibold">We hit a snag</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          data-testid="route-error-retry"
          onClick={() => retry(reset)}
          className="tap-target inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
        <Link
          to="/library"
          className="tap-target inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Link>
      </div>
    </div>
  );
}

export function ContentRouteNotFound({ label }: { label: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-semibold">{label} not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you were looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/library"
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Browse the library
      </Link>
    </div>
  );
}

/**
 * H6 — default error boundary for in-app (authenticated) screens.
 *
 * Any route without its own `errorComponent` previously bubbled its error up
 * to the root boundary, blanking the whole app shell. This keeps the user
 * inside the app with a retry that re-runs the route's loaders, reports the
 * crash centrally, and swaps in the offline recovery screen or the login
 * redirect when that's the real cause.
 */
export function AppRouteError({ error, reset }: { error: Error; reset: () => void }) {
  const { kind, retry } = useBoundaryRecovery(error, "app-route");
  const message = friendlyErrorMessage(error, "Something went wrong loading this screen.");

  // Redirect/navigation cancelled this load: show the pending state, not a
  // crash screen. The incoming route renders a beat later.
  if (kind === "cancelled") return <RouteCancelledFallback onSettled={() => retry(reset)} />;

  if (kind === "offline") {
    return <NetworkRecoveryScreen onRetry={() => retry(reset)} />;
  }

  if (kind === "auth-expired") {
    return (
      <div
        data-testid="session-expired"
        className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center"
      >
        <h1 className="font-display text-2xl font-semibold">Please sign in again</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your session expired. Taking you back to the login screen…
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="app-route-error"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center"
    >
      <h1 className="font-display text-2xl font-semibold">We hit a snag</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          data-testid="route-error-retry"
          onClick={() => retry(reset)}
          className="tap-target inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
        <Link
          to="/today"
          data-testid="route-error-home"
          className="tap-target inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Today
        </Link>
      </div>
    </div>
  );
}

/** Neutral pending UI shown when a load was cancelled by a redirect.
 *  Clears the boundary on the next tick so the incoming route can mount. */
function RouteCancelledFallback({ onSettled }: { onSettled: () => void }) {
  useEffect(() => {
    const id = setTimeout(onSettled, 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-testid="route-cancelled"
      className="flex min-h-[60vh] items-center justify-center"
      aria-busy="true"
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}
