// Single source of truth for which paths must never be indexed.
// Denylist, not allowlist: any public content page is indexable by default so
// newly added guides/articles are never silently noindexed.
// Keep in sync with public/robots.txt (verified by /debug/noindex-audit).

export const NON_INDEXABLE_PATHS: readonly string[] = [
  "/auth",
  "/onboarding",
  "/reset-password",
  "/today",
  "/adherence",

  "/stack",
  "/timeline",
  "/safety",
  "/plan",
  "/reminders",
  "/more",
  "/upgrade",
  "/trial",
  "/chat",
  "/checkins",
  "/costs",
  "/cycles",
  "/doctor-report",
  "/export",
  "/health-sync",
  "/injection-sites",
  "/labs",
  "/body-metrics",
  "/fitness",
  "/notifications",
  "/progress-photos",
  "/side-effects",
  "/templates",
  "/scan",
  "/redeem",
  "/not-found",
];

export const NON_INDEXABLE_PREFIXES: readonly string[] = [
  "/auth/",
  "/auth_",
  "/onboarding/",
  "/p/",
  "/admin",
  "/debug/",
  "/lovable/",
  "/api/",
  "/today/",
  "/stack/",
  "/settings",
];

const PATH_SET = new Set(NON_INDEXABLE_PATHS);

export function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function isIndexablePath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (PATH_SET.has(path)) return false;
  if (NON_INDEXABLE_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  return true;
}

/**
 * Representative URLs to probe for each non-indexable rule. Prefix rules need a
 * concrete sample path (e.g. "/p/" -> "/p/sample").
 */
export function nonIndexableProbePaths(): { rule: string; path: string }[] {
  const fromPaths = NON_INDEXABLE_PATHS.map((p) => ({ rule: p, path: p }));
  const fromPrefixes = NON_INDEXABLE_PREFIXES.filter(
    (prefix) => !PATH_SET.has(normalizePath(prefix)),
  ).map((prefix) => ({
    rule: prefix,
    path: prefix.endsWith("/") ? `${prefix}smoke-test` : prefix,
  }));
  const seen = new Set<string>();
  return [...fromPaths, ...fromPrefixes].filter((entry) => {
    if (seen.has(entry.path)) return false;
    seen.add(entry.path);
    return true;
  });
}

/**
 * Representative 404 responses. Unmatched URLs are rendered by the root
 * `NotFoundComponent` and must carry `noindex` on the header AND the meta tag,
 * whatever the path looks like. Arbitrary unmatched URLs cannot be listed in
 * robots.txt, so only the explicit `/not-found` route requires a Disallow rule.
 */
export type NotFoundProbe = {
  /** Human label for the case being covered. */
  rule: string;
  path: string;
  /** robots.txt must contain a matching Disallow rule for this path. */
  requiresRobotsRule: boolean;
};

export const NOT_FOUND_PROBE_PATHS: readonly NotFoundProbe[] = [
  { rule: "explicit /not-found route", path: "/not-found", requiresRobotsRule: true },
  { rule: "unmatched top-level path", path: "/__audit-404-probe", requiresRobotsRule: false },
  {
    rule: "unmatched path under an indexable prefix",
    path: "/library/__audit-404-probe",
    requiresRobotsRule: false,
  },
  {
    rule: "unmatched path under a private prefix",
    path: "/today/__audit-404-probe",
    requiresRobotsRule: true,
  },
];

export function notFoundProbePaths(): NotFoundProbe[] {
  return [...NOT_FOUND_PROBE_PATHS];
}

/** Parse the `Disallow:` rules from the `User-agent: *` group of a robots.txt. */
export function parseRobotsDisallow(txt: string): string[] {
  const out: string[] = [];
  let inWildcardGroup = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      inWildcardGroup = value === "*";
      continue;
    }
    if (key === "disallow" && inWildcardGroup && value) out.push(value);
  }
  return out;
}

/** True when robots.txt blocks `path` for the wildcard user-agent. */
export function isDisallowedByRobots(path: string, disallow: string[]): boolean {
  const target = normalizePath(path);
  return disallow.some((rule) => {
    const r = normalizePath(rule);
    if (r === "/") return true;
    return target === r || target.startsWith(rule) || target.startsWith(`${r}/`);
  });
}
