// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Unique per-build ID used to cache-bust /public assets (icons, manifest,
// splash screens, sw-push.js) via a `?v=<BUILD_ID>` query string.
const BUILD_ID =
  process.env.LOVABLE_BUILD_ID ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.COMMIT_SHA ||
  String(Date.now());

// ISO timestamp of this build. Changes on every deploy; never read from the DB.
const BUILT_AT = new Date().toISOString();

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Colocated tests live in src/routes/**/__tests__; they are not routes.
    // Without this the route generator warns once per test file on every build.
    router: { routeFileIgnorePattern: "(__tests__|\\.test\\.tsx?)" },
  },
  vite: {
    define: {
      __BUILD_ID__: JSON.stringify(BUILD_ID),
      __BUILT_AT__: JSON.stringify(BUILT_AT),
    },
    build: {
      rollupOptions: {
        output: {
          // Split the vendor half of the entry bundle into stable, separately
          // cacheable chunks. Router/query, Supabase, UI primitives and charts
          // change on very different cadences than app code, so after a deploy
          // returning visitors re-download far less than one monolith.
          //
          // Rolldown ignores the legacy `manualChunks` callback (code splitting
          // is enabled), so the grouping has to be expressed with
          // `advancedChunks.groups`. Order matters: the first matching group
          // wins. Small shared utilities (clsx, tailwind-merge, …) get their
          // own group on purpose — unassigned they were absorbed into
          // vendor-charts, which forced every route to download the 380 KB
          // recharts bundle on first load.
          advancedChunks: {
            groups: [
              { name: "vendor-react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              {
                name: "vendor-utils",
                test: /node_modules[\\/](clsx|tailwind-merge|class-variance-authority|tslib|react-is|use-sync-external-store|fast-equals|tiny-invariant)[\\/]/,
              },
              { name: "vendor-tanstack", test: /node_modules[\\/]@tanstack[\\/]/ },
              { name: "vendor-supabase", test: /node_modules[\\/]@supabase[\\/]/ },
              {
                name: "vendor-charts",
                test: /node_modules[\\/](recharts|recharts-scale|victory-vendor|react-smooth|internmap|decimal\.js-light|d3-[a-z-]+)[\\/]/,
              },
              { name: "vendor-radix", test: /node_modules[\\/]@radix-ui[\\/]/ },
              { name: "vendor-zod", test: /node_modules[\\/]zod[\\/]/ },
              { name: "vendor-date", test: /node_modules[\\/]date-fns[\\/]/ },
            ],
          },
        },
      },
    },

  },
});
