import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Every *static* public route the app serves, derived from the file-based
 * router rather than a hand-maintained list — a new marketing page is covered
 * by the overflow/a11y sweeps the moment it lands.
 *
 * Excluded: dynamic segments ($slug — covered by representative samples),
 * authenticated routes, API/feed/XML endpoints, debug and admin surfaces.
 */

const ROUTES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../src/routes");

const EXCLUDED_PREFIXES = [
  "_",
  "api",
  "admin",
  "debug",
  "lovable",
  ".",
  "[",
  "__",
  "auth",
  "onboarding",
];

/** Representative dynamic routes: one real slug per parameterised template. */
export const DYNAMIC_ROUTE_SAMPLES = [
  "/library/bpc-157",
  "/library/compare/bpc-157-vs-tb-500",
  "/calculators/reconstitution",
  "/vs/cronometer",
  "/interactions/caffeine-and-creatine",
  "/help/getting-started",
  "/for/peptides",
] as const;

function toPath(file: string): string | null {
  if (!file.endsWith(".tsx")) return null;
  const base = file.slice(0, -4);
  if (EXCLUDED_PREFIXES.some((prefix) => base.startsWith(prefix))) return null;
  if (base.includes("$")) return null; // dynamic — sampled explicitly above
  const segments = base.split(".").filter((s) => s !== "index");
  if (!segments.length) return "/";
  return `/${segments.join("/")}`;
}

let cached: string[] | null = null;

/** Static public routes, plus "/" and the dynamic samples, de-duplicated. */
export function publicRoutes(): string[] {
  if (cached) return cached;
  const entries = readdirSync(ROUTES_DIR, { withFileTypes: true });
  const paths = new Set<string>(["/"]);
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const path = toPath(entry.name);
    if (path) paths.add(path);
  }
  for (const sample of DYNAMIC_ROUTE_SAMPLES) paths.add(sample);
  cached = [...paths].sort();
  return cached;
}
