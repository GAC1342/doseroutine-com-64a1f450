/**
 * App-wide safety net.
 *
 * Two layers:
 *  1. A React error boundary around the whole app shell. Any render/lifecycle
 *     crash — including one thrown above the route boundaries, e.g. in a
 *     provider — renders a calm fallback screen instead of a white page.
 *  2. A live subscription to the global runtime-error signal, so errors that
 *     escape React (event handlers, timers, unhandled promise rejections)
 *     surface a non-blocking recovery banner rather than silently leaving a
 *     dead UI behind.
 *
 * Both paths report through `reportLovableError`, which forwards to the
 * first-party health monitor at /admin/health.
 */
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import {
  initGlobalErrorSignal,
  subscribeToGlobalErrors,
  type GlobalErrorEvent,
} from "@/lib/fatal-error-signal";
import { isCancellationError } from "@/lib/error-classify";

function reload() {
  if (typeof window !== "undefined") window.location.reload();
}

function goHome() {
  if (typeof window !== "undefined") window.location.assign("/");
}

export function GlobalErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-10"
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The app hit an unexpected error. Your logged data is safe — try again, or reload the page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-[color:var(--primary-hover)]"
            >
              Try again
            </button>
          ) : null}
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={goHome}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}

/** Non-blocking banner for errors React can't catch. */
function RuntimeErrorBanner() {
  const [event, setEvent] = useState<GlobalErrorEvent | null>(null);

  useEffect(() => {
    initGlobalErrorSignal();
    return subscribeToGlobalErrors((next) => {
      // Redirect/navigation cancellations are expected control flow, not crashes.
      if (isCancellationError(next?.message ?? next)) return;
      setEvent(next);
    });
  }, []);

  if (!event) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3"
    >
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Something didn&apos;t work</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Part of the page ran into an error. Reload if things look stuck.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-[color:var(--primary-hover)]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reload
          </button>
          <button
            type="button"
            onClick={() => setEvent(null)}
            aria-label="Dismiss error message"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; transient: boolean };

/**
 * The router rethrows navigation control-flow (redirects, cancelled matches,
 * suspended loads) as bare values — sometimes literally `undefined`. Those are
 * not crashes: showing the full-screen fallback for them turns a normal
 * navigation into "Something went wrong". Retry once instead.
 */
function isTransientRouterThrow(error: unknown): boolean {
  if (error == null) return true;
  if (isCancellationError(error)) return true;
  if (typeof error === "object") {
    const candidate = error as { isRedirect?: unknown; to?: unknown; message?: unknown };
    if (candidate.isRedirect) return true;
    if (!(error instanceof Error) && !candidate.message && candidate.to) return true;
  }
  return false;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, transient: false };
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, transient: isTransientRouterThrow(error) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (isTransientRouterThrow(error)) {
      // Let the router settle, then clear the boundary so the real screen renders.
      if (this.retries < 3) {
        this.retries += 1;
        this.retryTimer = setTimeout(
          () => this.setState({ hasError: false, transient: false }),
          50,
        );
        return;
      }
      this.setState({ transient: false });
      return;
    }
    // Debug hook: e2e/device checks read the last global crash off the window.
    if (typeof window !== "undefined") {
      (window as unknown as { __doseRoutineGlobalError?: unknown }).__doseRoutineGlobalError = {
        message: error?.message ?? String(error),
        stack: error?.stack?.slice(0, 2000) ?? null,
        componentStack: info.componentStack?.slice(0, 1000) ?? null,
      };
    }
    reportLovableError(error, {
      boundary: "global_error_boundary",
      component_stack: info.componentStack?.slice(0, 2000) ?? null,
    });
  }

  override componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private handleRetry = () => this.setState({ hasError: false, transient: false });

  override render() {
    if (this.state.hasError) {
      if (this.state.transient) {
        return (
          <div className="flex min-h-dvh items-center justify-center bg-background">
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              Loading…
            </p>
          </div>
        );
      }
      return this.props.fallback ?? <GlobalErrorFallback onRetry={this.handleRetry} />;
    }
    return (
      <>
        {this.props.children}
        <RuntimeErrorBanner />
      </>
    );
  }
}

export default GlobalErrorBoundary;
