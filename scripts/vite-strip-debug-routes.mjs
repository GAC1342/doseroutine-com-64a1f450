/**
 * H3 — strip internal debug screens from the native (App Store) bundle.
 *
 * The Capacitor binary ships `dist/client/` inside the app, so any route file
 * left in the bundle is shippable code that App Review can reach through a
 * deep link. `nativeRedirectFor()` already blocks `/debug/*` at runtime; this
 * plugin removes the screens from the binary altogether when the build runs
 * with `NATIVE_BUILD=1` (see `bun run build:native`).
 *
 * The route modules are replaced with a stub that keeps the generated route
 * tree valid but renders nothing and redirects to the app home.
 */

/**
 * `src/routes/debug.index-check.tsx` -> `/debug/index-check`
 * `src/routes/_authenticated/debug.crashlytics.tsx` ->
 * `/_authenticated/debug/crashlytics` (the generated route ID).
 */
export function routePathForDebugFile(id) {
  const clean = id.split("?")[0] ?? "";
  const routesAt = clean.lastIndexOf("/src/routes/");
  const relative = routesAt >= 0 ? clean.slice(routesAt + "/src/routes/".length) : clean;
  const file = relative.replace(/\\/g, "/");
  const base = file.replace(/\.tsx?$/, "");
  return `/${base.split(/[./]/).filter(Boolean).join("/")}`;
}

/** Stub module source for a stripped debug route. */
export function stubModule(routePath) {
  return `import { createFileRoute, redirect } from "@tanstack/react-router";

export const DESC = "";

export const Route = createFileRoute(${JSON.stringify(routePath)})({
  beforeLoad: () => {
    throw redirect({ to: "/today" });
  },
  component: () => null,
});
`;
}

const DEBUG_ROUTE_RE = /[\\/]src[\\/]routes[\\/](?:_authenticated[\\/])?debug\.[^\\/]+\.tsx$/;

export function isDebugRouteFile(id) {
  return DEBUG_ROUTE_RE.test(id.split("?")[0] ?? "");
}

export function stripDebugRoutes({ enabled } = {}) {
  const on = enabled ?? process.env.NATIVE_BUILD === "1";
  return {
    name: "doseroutine:strip-debug-routes",
    enforce: "pre",
    apply: "build",
    transform(_code, id) {
      if (!on || !isDebugRouteFile(id)) return null;
      return { code: stubModule(routePathForDebugFile(id)), map: null };
    },
  };
}

export default stripDebugRoutes;
