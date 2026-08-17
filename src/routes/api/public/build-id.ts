import { createFileRoute } from "@tanstack/react-router";

// __BUILD_ID__ is injected by Vite `define` at build time and is available
// in both the client bundle and the server (worker) bundle. Each deploy
// produces a fresh id, so clients can compare their baked-in id against
// this endpoint to detect that a new build (and therefore a new versioned
// manifest / icons / service worker) is available.
declare const __BUILD_ID__: string;

const CURRENT_BUILD_ID = typeof __BUILD_ID__ === "string" && __BUILD_ID__ ? __BUILD_ID__ : "dev";

export const Route = createFileRoute("/api/public/build-id")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ id: CURRENT_BUILD_ID }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            // Never cache — a stale response defeats the whole update check.
            "Cache-Control": "no-store, must-revalidate",
          },
        }),
    },
  },
});
