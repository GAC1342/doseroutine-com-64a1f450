import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error - plain JS audit script, no type declarations
import { driftLevel, evaluate, parseVersion } from "../../../scripts/check-dependency-versions.mjs";

const root = path.resolve(__dirname, "../../..");
const policy = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/dependency-policy.json"), "utf8"),
);
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const allDeps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

describe("dependency policy", () => {
  it("only watches packages the project actually installs", () => {
    const missing: string[] = [];
    for (const group of policy.groups) {
      for (const name of group.packages) if (!allDeps[name]) missing.push(name);
    }
    expect(missing).toEqual([]);
  });

  it("keeps the framework, backend and native shell on the critical tier", () => {
    const critical = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
      policy.groups.filter((g: any) => g.tier === "critical").flatMap((g: any) => g.packages),
    );
    for (const name of [
      "react",
      "react-dom",
      "@tanstack/react-router",
      "@supabase/supabase-js",
      "@capacitor/core",
    ]) {
      expect(critical.has(name), `${name} must stay on the critical tier`).toBe(true);
    }
  });

  it("uses valid tiers and failOn levels", () => {
    for (const group of policy.groups) {
      expect(["critical", "watch"]).toContain(group.tier);
      expect(["patch", "minor", "major"]).toContain(group.failOn);
      expect(group.packages.length).toBeGreaterThan(0);
    }
  });

  it("lists each package only once", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const all = policy.groups.flatMap((g: any) => g.packages);
    expect(all.length).toBe(new Set(all).size);
  });
});

describe("version drift detection", () => {
  it("parses semver-ish strings", () => {
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion("v19.2.0")).toEqual({ major: 19, minor: 2, patch: 0 });
    expect(parseVersion("nonsense")).toBeNull();
  });

  it("classifies drift", () => {
    expect(driftLevel("1.2.3", "2.0.0")).toBe("major");
    expect(driftLevel("1.2.3", "1.3.0")).toBe("minor");
    expect(driftLevel("1.2.3", "1.2.4")).toBe("patch");
    expect(driftLevel("1.2.3", "1.2.3")).toBeNull();
    expect(driftLevel("2.0.0", "1.9.9")).toBeNull();
  });

  it("fails only on critical-tier breaches", () => {
    const findings = evaluate(
      {
        react: { current: "18.3.0", latest: "19.2.0" },
        "@supabase/supabase-js": { current: "2.110.0", latest: "2.111.0" },
        "lucide-react": { current: "0.575.0", latest: "0.999.0" },
        vitest: { current: "3.0.0", latest: "3.0.1" },
      },
      policy,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const byName = Object.fromEntries(findings.map((f: any) => [f.name, f]));
    expect(byName["react"].severity).toBe("error");
    expect(byName["@supabase/supabase-js"].severity).toBe("error"); // failOn: minor
    expect(byName["lucide-react"].severity).toBe("warn"); // watch tier
    expect(byName["vitest"].severity).toBe("warn"); // patch only
  });

  it("reports nothing when everything is current", () => {
    expect(evaluate({ react: { current: "19.2.0", latest: "19.2.0" } }, policy)).toEqual([]);
  });
});
