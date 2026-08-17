import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

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

function recoverFromStaleChunk() {
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
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    recoverFromStaleChunk();
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (isStaleChunkError(event.reason)) recoverFromStaleChunk();
  });
  window.addEventListener("error", (event) => {
    if (isStaleChunkError(event.error ?? event.message)) recoverFromStaleChunk();
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
  });

  return router;
};
