/**
 * Scoped error UI for a single data-heavy screen.
 *
 * Without this, one failing widget bubbles all the way to the authenticated
 * layout boundary and the user loses the whole shell (and their navigation).
 * Here the app chrome stays put and the screen offers a local retry.
 */
import { AlertTriangle } from "lucide-react";
import { reportBoundaryError } from "@/lib/boundary-report";

export function RouteErrorPanel({
  error,
  reset,
  title = "This screen couldn't load",
  boundary,
}: {
  error: Error;
  reset?: () => void;
  title?: string;
  boundary: string;
}) {
  reportBoundaryError(error, { boundary });

  return (
    <div
      data-testid="route-error-panel"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-10 text-center"
    >
      <AlertTriangle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">
        {error?.message || "Something went wrong while loading this data."}
      </p>
      <button
        type="button"
        data-testid="route-error-panel-retry"
        onClick={() => reset?.()}
        className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}

/** Builds a route-ready `errorComponent` for the given screen. */
export function routeErrorComponent(boundary: string, title?: string) {
  return function RouteError({ error, reset }: { error: Error; reset?: () => void }) {
    return <RouteErrorPanel error={error} reset={reset} title={title} boundary={boundary} />;
  };
}
