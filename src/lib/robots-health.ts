/**
 * Pure analysis helpers for the recurring robots.txt health check.
 *
 * Kept free of network/IO so it can be unit-tested and reused by the
 * scheduled hook at /api/public/hooks/robots-health.
 */

export interface RobotsIssue {
  /** Short machine-readable code. */
  code: string;
  /** Human-readable explanation shown in the alert email. */
  message: string;
  severity: "error" | "warning";
}

export interface RobotsCheckInput {
  /** HTTP status returned by GET /robots.txt */
  status: number;
  /** Content-Type header of the robots.txt response */
  contentType: string;
  /** Raw robots.txt body */
  body: string;
  /** X-Robots-Tag response header on robots.txt (if any) */
  xRobotsTag?: string | null;
  /** Canonical sitemap URL that must be referenced */
  expectedSitemapUrl: string;
  /** Whether the referenced sitemap actually responded 200 */
  sitemapReachable?: boolean;
  /** Sample of live sitemap URLs, used to detect over-broad Disallow rules */
  sampleSitemapPaths?: string[];
  /**
   * Approved rule fingerprint (see ROBOTS_BASELINE). When provided, any
   * difference between the live rules and this baseline is reported so an
   * unexpected robots.txt change raises an alert.
   */
  expectedFingerprint?: string[];
}

/**
 * Crawlers whose access we explicitly verify on every run. Each must be able
 * to reach the public site (either through its own group or the `*` group).
 */
export const MONITORED_CRAWLERS = [
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "DuckDuckBot",
  "Applebot",
  "Slurp",
] as const;

/** Public paths every monitored crawler must be allowed to fetch. */
export const MUST_ALLOW_PATHS = [
  "/",
  "/library",
  "/library/creatine",
  "/interaction-checker",
  "/calculators",
  "/faq",
  "/about",
];

/** Private paths that must stay blocked for every crawler. */
export const MUST_DISALLOW_PATHS = [
  "/today",
  "/settings",
  "/admin",
  "/api/health",
  "/lovable/anything",
  "/debug/index-check",
];

/** Parse `Disallow:` / `Allow:` rules for the `*` user-agent group. */
export function parseWildcardGroup(body: string): {
  found: boolean;
  disallow: string[];
  allow: string[];
} {
  const lines = body.split("\n").map((l) => l.replace(/#.*$/, "").trim());
  let inWildcard = false;
  let found = false;
  const disallow: string[] = [];
  const allow: string[] = [];
  let lastWasUserAgent = false;

  for (const line of lines) {
    if (!line) continue;
    const ua = /^user-agent:\s*(.*)$/i.exec(line);
    if (ua) {
      const agent = ua[1].trim();
      if (!lastWasUserAgent) inWildcard = false;
      if (agent === "*") {
        inWildcard = true;
        found = true;
      }
      lastWasUserAgent = true;
      continue;
    }
    lastWasUserAgent = false;
    if (!inWildcard) continue;
    const dis = /^disallow:\s*(.*)$/i.exec(line);
    if (dis) {
      const v = dis[1].trim();
      if (v) disallow.push(v);
      continue;
    }
    const alw = /^allow:\s*(.*)$/i.exec(line);
    if (alw) {
      const v = alw[1].trim();
      if (v) allow.push(v);
    }
  }

  return { found, disallow, allow };
}

/** All `Sitemap:` directives, in order. */
export function parseSitemapDirectives(body: string): string[] {
  return body
    .split("\n")
    .map((l) => l.replace(/#.*$/, "").trim())
    .map((l) => /^sitemap:\s*(\S+)/i.exec(l)?.[1])
    .filter((v): v is string => Boolean(v));
}

/** Google-style prefix match with `*` and `$` support. */
export function matchesRule(rule: string, path: string): boolean {
  if (rule === "/") return true;
  const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const anchored = escaped.endsWith("\\$") ? `^${escaped.slice(0, -2)}$` : `^${escaped}`;
  try {
    return new RegExp(anchored).test(path);
  } catch {
    return path.startsWith(rule);
  }
}

/**
 * Effective rule group for a specific user-agent: its own group when one
 * exists (crawlers ignore `*` then), otherwise the `*` group.
 */
export function parseGroupFor(
  body: string,
  agent: string,
): { specific: boolean; disallow: string[]; allow: string[] } {
  const lines = body.split("\n").map((l) => l.replace(/#.*$/, "").trim());
  const wanted = agent.toLowerCase();
  let inGroup = false;
  let found = false;
  let lastWasUserAgent = false;
  const disallow: string[] = [];
  const allow: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    const ua = /^user-agent:\s*(.*)$/i.exec(line);
    if (ua) {
      const a = ua[1].trim().toLowerCase();
      if (!lastWasUserAgent) inGroup = false;
      if (a === wanted) {
        inGroup = true;
        found = true;
      }
      lastWasUserAgent = true;
      continue;
    }
    lastWasUserAgent = false;
    if (!inGroup) continue;
    const dis = /^disallow:\s*(.*)$/i.exec(line);
    if (dis) {
      const v = dis[1].trim();
      if (v) disallow.push(v);
      continue;
    }
    const alw = /^allow:\s*(.*)$/i.exec(line);
    if (alw) {
      const v = alw[1].trim();
      if (v) allow.push(v);
    }
  }

  if (found) return { specific: true, disallow, allow };
  const wildcard = parseWildcardGroup(body);
  return { specific: false, disallow: wildcard.disallow, allow: wildcard.allow };
}

/** Google's longest-match precedence: Allow wins ties. */
export function isPathAllowed(
  group: { disallow: string[]; allow: string[] },
  path: string,
): boolean {
  let bestDisallow = -1;
  for (const r of group.disallow) {
    if (matchesRule(r, path) && r.length > bestDisallow) bestDisallow = r.length;
  }
  if (bestDisallow < 0) return true;
  let bestAllow = -1;
  for (const r of group.allow) {
    if (matchesRule(r, path) && r.length > bestAllow) bestAllow = r.length;
  }
  return bestAllow >= bestDisallow;
}

/**
 * Normalised, order-independent fingerprint of every rule in the file:
 * `"<user-agent>|<directive>|<value>"`. Comments, blank lines and rule order
 * are ignored, so only real rule changes show up as drift.
 */
export function fingerprintRules(body: string): string[] {
  const lines = body.split("\n").map((l) => l.replace(/#.*$/, "").trim());
  let agents: string[] = [];
  let lastWasUserAgent = false;
  const out = new Set<string>();

  for (const line of lines) {
    if (!line) continue;
    const ua = /^user-agent:\s*(.*)$/i.exec(line);
    if (ua) {
      if (!lastWasUserAgent) agents = [];
      agents.push(ua[1].trim().toLowerCase());
      lastWasUserAgent = true;
      continue;
    }
    lastWasUserAgent = false;
    const rule = /^(disallow|allow|sitemap|crawl-delay):\s*(.*)$/i.exec(line);
    if (!rule) continue;
    const directive = rule[1].toLowerCase();
    const value = rule[2].trim();
    if (directive === "sitemap") {
      out.add(`*|sitemap|${value}`);
      continue;
    }
    const scope = agents.length > 0 ? agents : ["*"];
    for (const a of scope) out.add(`${a}|${directive}|${value}`);
  }

  return [...out].sort();
}

/** Added/removed rules between the approved baseline and the live file. */
export function diffFingerprints(
  expected: string[],
  actual: string[],
): { added: string[]; removed: string[] } {
  const e = new Set(expected);
  const a = new Set(actual);
  return {
    added: actual.filter((r) => !e.has(r)).sort(),
    removed: expected.filter((r) => !a.has(r)).sort(),
  };
}

/**
 * Run every robots.txt health assertion and return the issues found.
 * An empty array means the file is healthy.
 */
export function analyzeRobots(input: RobotsCheckInput): RobotsIssue[] {
  const issues: RobotsIssue[] = [];

  // 1. Reachable
  if (input.status !== 200) {
    issues.push({
      code: "unreachable",
      message: `robots.txt returned HTTP ${input.status} (expected 200)`,
      severity: "error",
    });
    return issues;
  }
  if (!/text\/plain/i.test(input.contentType)) {
    issues.push({
      code: "wrong_content_type",
      message: `robots.txt served as "${input.contentType || "unknown"}" instead of text/plain`,
      severity: "error",
    });
  }
  if (!input.body.trim()) {
    issues.push({ code: "empty", message: "robots.txt is empty", severity: "error" });
    return issues;
  }

  // 2. No unintended noindex directives
  if (input.xRobotsTag && /noindex/i.test(input.xRobotsTag)) {
    issues.push({
      code: "x_robots_noindex",
      message: `robots.txt is served with X-Robots-Tag: ${input.xRobotsTag}`,
      severity: "error",
    });
  }
  const noindexLines = input.body
    .split("\n")
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter((l) => /^noindex:/i.test(l));
  if (noindexLines.length > 0) {
    issues.push({
      code: "noindex_directive",
      message: `robots.txt contains unsupported/unintended noindex directive(s): ${noindexLines.join(" | ")}`,
      severity: "error",
    });
  }

  // 3. Wildcard group sanity
  const group = parseWildcardGroup(input.body);
  if (!group.found) {
    issues.push({
      code: "missing_wildcard_group",
      message: 'No "User-agent: *" group found — crawler rules are undefined',
      severity: "error",
    });
  } else {
    if (group.disallow.includes("/")) {
      issues.push({
        code: "site_wide_disallow",
        message: 'robots.txt blocks the entire site with "Disallow: /" for all crawlers',
        severity: "error",
      });
    }
    if (!group.allow.includes("/") && group.disallow.length === 0) {
      issues.push({
        code: "no_allow_rule",
        message: 'The "User-agent: *" group has no Allow or Disallow rules',
        severity: "warning",
      });
    }
  }

  // 4. Sitemap reference
  const sitemaps = parseSitemapDirectives(input.body);
  if (sitemaps.length === 0) {
    issues.push({
      code: "missing_sitemap",
      message: `No "Sitemap:" directive found (expected ${input.expectedSitemapUrl})`,
      severity: "error",
    });
  } else if (!sitemaps.includes(input.expectedSitemapUrl)) {
    issues.push({
      code: "wrong_sitemap",
      message: `Sitemap directive points at ${sitemaps.join(", ")} instead of ${input.expectedSitemapUrl}`,
      severity: "error",
    });
  } else if (input.sitemapReachable === false) {
    issues.push({
      code: "sitemap_unreachable",
      message: `Referenced sitemap ${input.expectedSitemapUrl} did not respond with HTTP 200`,
      severity: "error",
    });
  }

  // 5. Indexable pages must not be blocked
  const blocked: string[] = [];
  for (const path of input.sampleSitemapPaths ?? []) {
    const dis = group.disallow.find((r) => matchesRule(r, path));
    if (!dis) continue;
    const allowed = group.allow.some((r) => matchesRule(r, path) && r.length >= dis.length);
    if (!allowed) blocked.push(`${path} (blocked by "Disallow: ${dis}")`);
  }
  if (blocked.length > 0) {
    issues.push({
      code: "sitemap_url_blocked",
      message: `${blocked.length} sitemap URL(s) are blocked by robots.txt: ${blocked.slice(0, 10).join("; ")}`,
      severity: "error",
    });
  }

  // 6. Named crawlers (Googlebot, Bingbot, ...) keep the expected access
  for (const crawler of MONITORED_CRAWLERS) {
    const g = parseGroupFor(input.body, crawler);
    if (g.disallow.includes("/") && !g.allow.includes("/")) {
      issues.push({
        code: "crawler_blocked",
        message: `${crawler} is blocked site-wide by "Disallow: /"${g.specific ? ` in its own User-agent: ${crawler} group` : " in the User-agent: * group"}`,
        severity: "error",
      });
      continue;
    }
    const missing = MUST_ALLOW_PATHS.filter((p) => !isPathAllowed(g, p));
    if (missing.length > 0) {
      issues.push({
        code: "crawler_path_blocked",
        message: `${crawler} cannot crawl public page(s): ${missing.join(", ")}`,
        severity: "error",
      });
    }
    const leaked = MUST_DISALLOW_PATHS.filter((p) => isPathAllowed(g, p));
    if (leaked.length > 0) {
      issues.push({
        code: "private_path_crawlable",
        message: `${crawler} is allowed to crawl private path(s) that should stay blocked: ${leaked.join(", ")}`,
        severity: "error",
      });
    }
  }

  // 7. Drift: rules changed vs. the approved baseline
  if (input.expectedFingerprint && input.expectedFingerprint.length > 0) {
    const { added, removed } = diffFingerprints(
      input.expectedFingerprint,
      fingerprintRules(input.body),
    );
    if (added.length > 0 || removed.length > 0) {
      const parts: string[] = [];
      if (removed.length > 0) parts.push(`removed: ${removed.join(" | ")}`);
      if (added.length > 0) parts.push(`added: ${added.join(" | ")}`);
      issues.push({
        code: "rules_changed",
        message: `Live robots.txt rules differ from the approved baseline — ${parts.join(" ; ")}`,
        severity: "warning",
      });
    }
  }

  return issues;
}
