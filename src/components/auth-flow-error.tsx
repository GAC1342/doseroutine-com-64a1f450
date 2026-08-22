import { Link, useRouter } from "@tanstack/react-router";
import { RefreshCw, Home } from "lucide-react";

/**
 * Error boundary UI for the pre-app routes (/auth, /onboarding).
 * These run before the app shell exists, so a thrown loader/beforeLoad error
 * would otherwise land on the generic root error page with no way forward.
 */
export function AuthFlowError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const message =
    error?.message && error.message.length < 200
      ? error.message
      : "We couldn't reach our servers. Check your connection and try again.";
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
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
          to="/"
          className="tap-target inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground"
        >
          <Home className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}
