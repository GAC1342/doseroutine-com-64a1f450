import { describe, expect, it } from "vitest";

import {
  isDebugRouteFile,
  routePathForDebugFile,
  stripDebugRoutes,
  stubModule,
} from "../../../scripts/vite-strip-debug-routes.mjs";

describe("native build strips debug routes (guideline 2.3.1)", () => {
  it("matches only debug route files", () => {
    expect(isDebugRouteFile("/app/src/routes/debug.env.tsx")).toBe(true);
    expect(isDebugRouteFile("/app/src/routes/debug.deep-link.tsx?tsr-split")).toBe(true);
    expect(isDebugRouteFile("/app/src/routes/_authenticated/debug.crashlytics.tsx")).toBe(true);
    expect(isDebugRouteFile("/app/src/routes/today.tsx")).toBe(false);
    expect(isDebugRouteFile("/app/src/lib/debug.helper.ts")).toBe(false);
  });

  it("derives the route path from the file name", () => {
    expect(routePathForDebugFile("/app/src/routes/debug.index-check.tsx")).toBe(
      "/debug/index-check",
    );
    expect(routePathForDebugFile("/app/src/routes/debug.env.tsx")).toBe("/debug/env");
    expect(routePathForDebugFile("/app/src/routes/_authenticated/debug.crashlytics.tsx")).toBe(
      "/_authenticated/debug/crashlytics",
    );
  });

  it("emits a stub that keeps the route tree valid and renders nothing", () => {
    const code = stubModule("/debug/env");
    expect(code).toContain('createFileRoute("/debug/env")');
    expect(code).toContain('redirect({ to: "/today" })');
    expect(code).toContain("component: () => null");
  });

  it("only transforms when the native build flag is on", () => {
    const off = stripDebugRoutes({ enabled: false });
    expect(off.transform("original", "/app/src/routes/debug.env.tsx")).toBeNull();

    const on = stripDebugRoutes({ enabled: true });
    expect(on.transform("original", "/app/src/routes/today.tsx")).toBeNull();
    const out = on.transform("original", "/app/src/routes/debug.env.tsx");
    expect(out?.code).toContain('createFileRoute("/debug/env")');
    expect(out?.code).not.toContain("original");

    const authenticated = on.transform(
      "original",
      "/app/src/routes/_authenticated/debug.crashlytics.tsx",
    );
    expect(authenticated?.code).toContain('createFileRoute("/_authenticated/debug/crashlytics")');
    expect(authenticated?.code).toContain('redirect({ to: "/today" })');
  });
});
