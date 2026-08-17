import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";

/** Reusable error boundary UI for content routes (library, goals, etc.).
 *  Calls both `reset()` (clear the boundary) and `router.invalidate()`
 *  (re-run loaders) so the retry actually re-fetches data. */
export function ContentRouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const message =
    error?.message && error.message.length < 200
      ? error.message
      : "Something went wrong loading this page.";
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-semibold">We hit a snag</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            reset();
            void router.invalidate();
          }}
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
