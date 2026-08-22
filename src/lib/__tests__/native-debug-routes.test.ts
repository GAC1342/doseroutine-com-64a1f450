import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NATIVE_HOME, nativeRedirectFor } from "@/lib/native-route-policy";

const ROUTES_DIR = join(process.cwd(), "src/routes");

/** Every `/debug/...` URL the router can serve, derived from the route files. */
function debugRoutePaths(): string[] {
  const out = new Set<string>(["/debug"]);
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__tests__") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, entry.name.startsWith("_") ? prefix : `${prefix}/${entry.name}`);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const base = entry.name.replace(/\.tsx?$/, "");
      if (!base.startsWith("debug")) continue;
      const segments = base.split(".").filter((s) => s !== "index");
      out.add(`${prefix}/${segments.join("/")}`);
    }
  };
  walk(ROUTES_DIR, "");
  return [...out];
}

describe("native builds never expose /debug routes", () => {
  const paths = debugRoutePaths();

  it("finds the debug routes that exist in the app", () => {
    // Guards the discovery itself: a broken walk would make every assertion
    // below vacuously pass.
    expect(paths.length).toBeGreaterThan(1);
    expect(paths).toContain("/debug/deep-link");
  });

  it("redirects every debug route to /today", () => {
    for (const path of paths) {
      expect(nativeRedirectFor(path), path).toBe(NATIVE_HOME);
    }
    expect(NATIVE_HOME).toBe("/today");
  });

  it("redirects debug routes with trailing slashes, queries and deep sub-paths", () => {
    const variants = [
      "/debug/",
      "/debug/env/",
      "/debug/deep-link/anything",
      "/debug/does-not-exist",
      "/debug/env",
      "/debug/crashlytics",
    ];
    for (const path of variants) {
      expect(nativeRedirectFor(path), path).toBe(NATIVE_HOME);
    }
  });

  it("keeps the debug allow-list empty so nothing can opt back in", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/native-route-policy.ts"), "utf8");
    expect(source).toMatch(/const NATIVE_ALLOWED_PATHS: string\[\] = \[\];/);
  });

  it("still allows the real app routes through", () => {
    for (const path of ["/today", "/fitness", "/more", "/legal", "/privacy"]) {
      expect(nativeRedirectFor(path), path).toBeNull();
    }
  });
});

describe("Codemagic release preflight", () => {
  const yaml = readFileSync(join(process.cwd(), "codemagic.yaml"), "utf8");

  it("fails the Android build when REVENUECAT_GOOGLE_KEY is missing", () => {
    expect(yaml).toMatch(/require\s+REVENUECAT_GOOGLE_KEY\b/);
  });

  it("fails any release build when VITE_SENTRY_DSN is missing", () => {
    expect(yaml).toMatch(/require\s+VITE_SENTRY_DSN\b/);
  });

  it("treats a missing required variable as a hard failure", () => {
    expect(yaml).toMatch(/MISSING=\$\(\(MISSING \+ 1\)\)/);
    expect(yaml).toMatch(/exit 1/);
  });
});
