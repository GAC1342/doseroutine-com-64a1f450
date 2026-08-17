/**
 * Public SEO access audit.
 *
 * Answers one question for every page we want in search: can an anonymous
 * visitor (and Googlebot) actually reach it?
 *
 * Three ways a page silently disappears from search:
 *   1. Sign-up gate — the route lives under _authenticated/ or its own source
 *      redirects anonymous visitors to /auth.
 *   2. robots.txt — a Disallow rule for the wildcard user-agent.
 *   3. noindex — a robots meta tag or X-Robots-Tag header on the page.
 *
 * Pure functions only, so both the offline test suite (source files) and the
 * live CLI sweep (fetched HTML) share the same rules.
 */

import { isDisallowedByRobots, normalizePath, parseRobotsDisallow } from "./non-indexable";

export type AccessIssueKind = "auth-gated" | "robots-disallow" | "noindex" | "missing-route";

export type AccessIssue = {
  path: string;
  kind: AccessIssueKind;
  detail: string;
};

export type RouteSource = {
  /** URL path the file serves, e.g. "/manual". */
  path: string;
  /** Route file name, for error messages. */
  file: string;
  /** Raw file contents. */
  source: string;
  /** True when the file lives under src/routes/_authenticated/. */
  authenticated?: boolean;
};

/** Patterns that mean "anonymous visitors get bounced to sign-in". */
const AUTH_GATE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /requireSupabaseAuth/, label: "requireSupabaseAuth middleware" },
  { re: /redirect\(\s*\{[^}]*to:\s*["'`]\/auth/, label: "beforeLoad redirect to /auth" },
  { re: /<RequireAuth[\s/>]/, label: "<RequireAuth> wrapper" },
  { re: /<AuthGate[\s/>]/, label: "<AuthGate> wrapper" },
  { re: /useRequireAuth\s*\(/, label: "useRequireAuth()" },
];

/** True when the route source forces a sign-in before the page renders. */
export function findAuthGate(source: string): string | null {
  for (const { re, label } of AUTH_GATE_PATTERNS) {
    if (re.test(source)) return label;
  }
  return null;
}

/** True when a robots meta value opts the page out of indexing. */
export function isNoindexValue(value: string): boolean {
  return /\bnone\b|\bnoindex\b/i.test(value);
}

/** Robots meta value declared in a route file's head(), if any. */
export function robotsMetaFromSource(source: string): string | null {
  const match = source.match(
    /name:\s*["'`]robots["'`]\s*,\s*content:\s*["'`]([^"'`]+)["'`]/,
  );
  return match ? match[1] : null;
}

/** Robots meta value found in rendered HTML, if any. */
export function robotsMetaFromHtml(html: string): string | null {
  const match = html.match(
    /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i,
  ) ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']robots["']/i);
  return match ? match[1] : null;
}

/**
 * Offline audit: given every route file plus robots.txt, report each path that
 * search engines cannot reach.
 */
export function auditPublicSeoAccess(input: {
  /** Paths that must be publicly reachable (typically the sitemap entries). */
  paths: readonly string[];
  /** All route files, public and authenticated. */
  routes: readonly RouteSource[];
  robotsTxt: string;
}): AccessIssue[] {
  const disallow = parseRobotsDisallow(input.robotsTxt);
  const byPath = new Map<string, RouteSource>();
  for (const route of input.routes) byPath.set(normalizePath(route.path), route);

  const issues: AccessIssue[] = [];
  for (const rawPath of input.paths) {
    const path = normalizePath(rawPath);

    if (isDisallowedByRobots(path, disallow)) {
      issues.push({
        path,
        kind: "robots-disallow",
        detail: "blocked for User-agent: * in public/robots.txt",
      });
    }

    const route = byPath.get(path);
    if (!route) continue; // dynamic/DB-driven paths have no static file

    if (route.authenticated) {
      issues.push({
        path,
        kind: "auth-gated",
        detail: `route file lives under _authenticated/ (${route.file})`,
      });
    }

    const gate = findAuthGate(route.source);
    if (gate) {
      issues.push({ path, kind: "auth-gated", detail: `${route.file}: ${gate}` });
    }

    const robotsMeta = robotsMetaFromSource(route.source);
    if (robotsMeta && isNoindexValue(robotsMeta)) {
      issues.push({
        path,
        kind: "noindex",
        detail: `${route.file}: robots meta "${robotsMeta}"`,
      });
    }
  }
  return issues;
}

export type LiveProbe = {
  path: string;
  status: number;
  /** URL after following redirects. */
  finalUrl: string;
  xRobotsTag?: string | null;
  html?: string;
  /** robots.txt verdict for this path. */
  robotsBlocked: boolean;
};

export type LiveProbeResult = { path: string; ok: boolean; reasons: string[] };

/** Live audit: classify one anonymous fetch of a public SEO page. */
export function classifyLiveProbe(probe: LiveProbe): LiveProbeResult {
  const reasons: string[] = [];

  if (probe.robotsBlocked) reasons.push("blocked by robots.txt");
  if (probe.status !== 200) reasons.push(`HTTP ${probe.status}`);

  let finalPath = probe.finalUrl;
  try {
    finalPath = new URL(probe.finalUrl).pathname;
  } catch {
    /* already a path */
  }
  if (/^\/(auth|login|onboarding)\b/.test(normalizePath(finalPath))) {
    reasons.push(`redirected to sign-in (${finalPath})`);
  }

  if (probe.xRobotsTag && isNoindexValue(probe.xRobotsTag)) {
    reasons.push(`X-Robots-Tag: ${probe.xRobotsTag}`);
  }

  if (probe.html) {
    const meta = robotsMetaFromHtml(probe.html);
    if (meta && isNoindexValue(meta)) reasons.push(`meta robots: ${meta}`);
  }

  return { path: probe.path, ok: reasons.length === 0, reasons };
}

/** True when robots.txt blocks the path for the wildcard agent. */
export function robotsBlocks(robotsTxt: string, path: string): boolean {
  return isDisallowedByRobots(path, parseRobotsDisallow(robotsTxt));
}
