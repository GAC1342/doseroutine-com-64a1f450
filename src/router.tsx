import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AppRouteError } from "./components/route-fallbacks";
import { RoutePending } from "./components/route-pending";
import { describeBootFailure, recordBootStep } from "./lib/boot-diagnostics";
import { isBenignRouterRejection } from "@/lib/benign-rejection";

/**
 * After a new deploy the browser may still hold HTML that points at hashed
 * chunks which no longer exist. The dynamic import then rejects and the app
 * renders a permanently blank screen (most visibly right after sign-in).
 * Reload once — the second load fetches the fresh manifest.
 */
const RELOAD_FLAG = "dr-chunk-reloaded-at";

function isStaleChunkError(reason: unknown): boolean {
  const message = String((reason as { message?: string } | undefined)?.message ?? reason ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

function recoverFromStaleChunk(reason?: unknown) {
  recordBootStep("route-chunk", "failed", describeBootFailure(reason));
  // Offline cold start: the chunk isn't stale, it's unreachable. Reloading
  // would replace the app with the browser's dead-page error, so let the route
  // boundary render the offline recovery screen instead.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_FLAG) ?? 0);
    // Don't loop: at most one automatic reload per minute.
    if (Date.now() - last < 60_000) return;
    window.sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    // sessionStorage blocked — still attempt a single reload.
  }
  window.location.reload();
}

if (typeof window !== "undefined") {
  recordBootStep("app-start", "ok", "App shell started");
  recordBootStep(
    "connectivity",
    navigator.onLine ? "ok" : "failed",
    navigator.onLine ? "Device reports a connection" : "Device reports no connection",
  );
  window.addEventListener("online", () =>
    recordBootStep("connectivity", "ok", "Connection came back"),
  );
  window.addEventListener("offline", () =>
    recordBootStep("connectivity", "failed", "Connection was lost"),
  );
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    recoverFromStaleChunk((event as unknown as { payload?: unknown }).payload);
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (isStaleChunkError(event.reason)) {
      recoverFromStaleChunk(event.reason);
      return;
    }
    // A deep link that supersedes an in-flight transition is normal; swallow
    // it so it never reaches the crash reporters or the browser console.
    if (isBenignRouterRejection(event.reason)) event.preventDefault();
  });
  window.addEventListener("error", (event) => {
    if (isStaleChunkError(event.error ?? event.message)) {
      recoverFromStaleChunk(event.error ?? event.message);
    }
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    defaultViewTransition: true,
    defaultPendingMs: 200,
    defaultPendingMinMs: 0,
    // H6: every route without its own boundary keeps the user in the app
    // with a retry instead of blanking out to the root error screen.
    defaultErrorComponent: AppRouteError,
    // Offline cold start: a spinner that can never resolve becomes an explicit
    // recovery screen instead of hanging.
    defaultPendingComponent: RoutePending,
  });

  return router;
};
