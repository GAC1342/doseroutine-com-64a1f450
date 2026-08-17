/**
 * Pure logic for the redirect verification job.
 *
 * Every URL on the site that is supposed to redirect must:
 *   1. answer with HTTP 301 (permanent) — not 302/307/308,
 *   2. point its Location header at the exact expected canonical URL,
 *   3. land on a 200 canonical page in a single hop (no redirect chains),
 *   4. be crawlable: neither the redirecting URL nor its destination may be
 *      blocked by robots.txt for Googlebot.
 *
 * No network calls live here so the rules stay unit-testable.
 */

import { SITE_ORIGIN } from "./seo-monitor-urls";
import { decidePath, groupFor, parseRobots } from "./robots-policy";

export interface RedirectCase {
  /** Absolute URL that must redirect. */
  from: string;
  /** Absolute URL it must redirect to, exactly. */
  to: string;
  /** Why this redirect exists — shown in reports. */
  reason: string;
}

/** Host + trailing-slash + legacy-parameter canonicalisation handled in src/server.ts. */
const CANONICALIZATION_CASES: RedirectCase[] = [
  { from: "https://www.doseroutine.com/", to: `${SITE_ORIGIN}/`, reason: "www → apex host" },
  {
    from: "https://www.doseroutine.com/library",
    to: `${SITE_ORIGIN}/library`,
    reason: "www → apex host",
  },
  { from: `${SITE_ORIGIN}/library/`, to: `${SITE_ORIGIN}/library`, reason: "trailing slash" },
  { from: `${SITE_ORIGIN}/blog/`, to: `${SITE_ORIGIN}/blog`, reason: "trailing slash" },
  {
    from: `${SITE_ORIGIN}/interaction-checker/`,
    to: `${SITE_ORIGIN}/interaction-checker`,
    reason: "trailing slash",
  },
  { from: `${SITE_ORIGIN}/?lang=fr`, to: `${SITE_ORIGIN}/`, reason: "legacy ?lang= parameter" },
  { from: `${SITE_ORIGIN}/?lang=es`, to: `${SITE_ORIGIN}/`, reason: "legacy ?lang= parameter" },
  { from: `${SITE_ORIGIN}/?lang=de`, to: `${SITE_ORIGIN}/`, reason: "legacy ?lang= parameter" },
  {
    from: `${SITE_ORIGIN}/library?lang=fr`,
    to: `${SITE_ORIGIN}/library`,
    reason: "legacy ?lang= parameter",
  },
  {
    from: `${SITE_ORIGIN}/library/creatine-monohydrate?lang=es`,
    to: `${SITE_ORIGIN}/library/creatine-monohydrate`,
    reason: "legacy ?lang= parameter",
  },
  {
    from: `${SITE_ORIGIN}/library/semaglutide?lang=de`,
    to: `${SITE_ORIGIN}/library/semaglutide`,
    reason: "legacy ?lang= parameter",
  },
];

/** Route-level legacy aliases (src/routes/library.*.tsx). */
const ALIAS_CASES: RedirectCase[] = [
  {
    from: `${SITE_ORIGIN}/library/clomiphene`,
    to: `${SITE_ORIGIN}/library/clomiphene-citrate`,
    reason: "legacy slug alias",
  },
  {
    from: `${SITE_ORIGIN}/library/melanotan-2`,
    to: `${SITE_ORIGIN}/library/melanotan-ii`,
    reason: "legacy slug alias",
  },
  {
    from: `${SITE_ORIGIN}/library/testosterone`,
    to: `${SITE_ORIGIN}/library/testosterone-trt`,
    reason: "legacy slug alias",
  },
  {
    from: `${SITE_ORIGIN}/library/peptide-stacks`,
    to: `${SITE_ORIGIN}/library/peptide-stacks-for-muscle-growth`,
    reason: "legacy slug alias",
  },
];

export const REDIRECT_CASES: RedirectCase[] = [...CANONICALIZATION_CASES, ...ALIAS_CASES];

export interface RedirectObservation {
  from: string;
  expected: string;
  reason: string;
  /** Status of the first (unfollowed) response. */
  status: number | null;
  /** Location header of the first response, resolved to an absolute URL. */
  location: string | null;
  /** Status of the destination after following the Location once. */
  targetStatus: number | null;
  /** True when the destination itself responded with another 3xx. */
  targetRedirects: boolean;
  /** robots.txt verdict for the redirecting URL's path (Googlebot). */
  fromRobotsAllowed: boolean | null;
  /** robots.txt verdict for the destination path (Googlebot). */
  toRobotsAllowed: boolean | null;
  fetchError: string | null;
}

export type IssueSeverity = "error" | "warning";

export interface RedirectIssue {
  url: string;
  code:
    | "fetch_error"
    | "not_redirecting"
    | "wrong_status"
    | "wrong_target"
    | "redirect_chain"
    | "target_not_ok"
    | "robots_blocked_source"
    | "robots_blocked_target";
  severity: IssueSeverity;
  message: string;
}

/** Normalises for comparison: ignores a trailing slash difference on the root only. */
export function sameUrl(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const norm = (u: URL) =>
      `${u.protocol}//${u.host}${u.pathname === "/" ? "/" : u.pathname.replace(/\/+$/, "")}${u.search}`;
    return norm(ua) === norm(ub);
  } catch {
    return a === b;
  }
}

/** Every problem found for a single redirect observation. */
export function issuesForObservation(o: RedirectObservation): RedirectIssue[] {
  const issues: RedirectIssue[] = [];

  if (o.fetchError) {
    return [
      {
        url: o.from,
        code: "fetch_error",
        severity: "error",
        message: `Request failed: ${o.fetchError}`,
      },
    ];
  }

  if (o.status === null || o.status < 300 || o.status >= 400) {
    issues.push({
      url: o.from,
      code: "not_redirecting",
      severity: "error",
      message: `Expected a 301 to ${o.expected} but got HTTP ${o.status ?? "no response"}`,
    });
  } else if (o.status !== 301) {
    issues.push({
      url: o.from,
      code: "wrong_status",
      severity: "error",
      message: `Redirect is HTTP ${o.status}; it must be a permanent 301 so link equity consolidates`,
    });
  }

  if (o.location && !sameUrl(o.location, o.expected)) {
    issues.push({
      url: o.from,
      code: "wrong_target",
      severity: "error",
      message: `Redirects to ${o.location} instead of ${o.expected}`,
    });
  }

  if (o.targetRedirects) {
    issues.push({
      url: o.from,
      code: "redirect_chain",
      severity: "warning",
      message: `Destination ${o.location} redirects again (HTTP ${o.targetStatus}) — collapse the chain to one hop`,
    });
  } else if (o.targetStatus !== null && o.targetStatus !== 200) {
    issues.push({
      url: o.from,
      code: "target_not_ok",
      severity: "error",
      message: `Destination ${o.location ?? o.expected} returned HTTP ${o.targetStatus}`,
    });
  }

  if (o.fromRobotsAllowed === false) {
    issues.push({
      url: o.from,
      code: "robots_blocked_source",
      severity: "error",
      message: "robots.txt blocks the redirecting URL, so Google can never follow the redirect",
    });
  }
  if (o.toRobotsAllowed === false) {
    issues.push({
      url: o.from,
      code: "robots_blocked_target",
      severity: "error",
      message: `robots.txt blocks the destination ${o.expected}`,
    });
  }

  return issues;
}

export function collectIssues(observations: RedirectObservation[]): RedirectIssue[] {
  return observations.flatMap(issuesForObservation);
}

export function shouldAlert(issues: RedirectIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

export interface RedirectSummary {
  total: number;
  passing: number;
  failing: number;
  warnings: number;
}

export function summarize(
  observations: RedirectObservation[],
  issues: RedirectIssue[],
): RedirectSummary {
  const failingUrls = new Set(issues.filter((i) => i.severity === "error").map((i) => i.url));
  return {
    total: observations.length,
    passing: observations.length - failingUrls.size,
    failing: failingUrls.size,
    warnings: issues.filter((i) => i.severity === "warning").length,
  };
}

/** robots.txt verdict for Googlebot on a URL's path (+query), using the site's rules. */
export function robotsAllows(robotsTxt: string, url: string): boolean {
  const groups = parseRobots(robotsTxt);
  const group = groupFor(groups, "Googlebot") ?? groupFor(groups, "*");
  let path = url;
  try {
    const u = new URL(url);
    path = `${u.pathname}${u.search}`;
  } catch {
    /* treat as a path already */
  }
  return decidePath(group, path).allowed;
}
