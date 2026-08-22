/**
 * Shared robots.txt policy model.
 *
 * The static test (public/robots.txt on disk) and the integration test (the
 * file actually served over HTTP) both parse with this module, so the two can
 * never drift apart in how they interpret the file.
 *
 * The expectations themselves (which bots, which allow paths) live in
 * ./robots-policy.config.ts — the single place to edit when the policy changes.
 */

import {
  PUBLIC_CONTENT_PATHS,
  ROBOT_AGENT_POLICIES,
  WILDCARD_POLICY,
} from "./robots-policy.config";

export {
  ALLOWED_SITEMAP_URLS,
  CANONICAL_SITEMAP_URL,
  PUBLIC_CONTENT_PATHS,
  REQUIRED_AI_AGENTS,
  ROBOT_AGENT_POLICIES,
  WILDCARD_POLICY,
  policyFor,
} from "./robots-policy.config";
export type { RobotAgentPolicy } from "./robots-policy.config";

/** A robots.txt group: one or more user-agents sharing a rule block. */
export interface RobotsGroup {
  agents: string[];
  allow: string[];
  disallow: string[];
  /** Raw `Crawl-delay:` values seen in this group, in order (usually 0 or 1). */
  crawlDelay: string[];
}

export function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let expectingAgents = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;

    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;

    const field = match[1].toLowerCase();
    const value = match[2].trim();

    if (field === "user-agent") {
      // Consecutive User-agent lines share one rule block.
      if (!current || !expectingAgents) {
        current = { agents: [], allow: [], disallow: [], crawlDelay: [] };
        groups.push(current);
        expectingAgents = true;
      }
      current.agents.push(value);
      continue;
    }

    if (field === "allow" || field === "disallow") {
      if (!current) continue;
      expectingAgents = false;
      if (field === "allow") current.allow.push(value);
      else current.disallow.push(value);
      continue;
    }

    if (field === "crawl-delay") {
      if (!current) continue;
      expectingAgents = false;
      current.crawlDelay.push(value);
      continue;
    }
    // Sitemap and other non-group fields are ignored.
  }

  return groups;
}

export function groupFor(groups: RobotsGroup[], agent: string): RobotsGroup | undefined {
  return groups.find((g) => g.agents.some((a) => a.toLowerCase() === agent.toLowerCase()));
}

export function blocksPublicContent(group: RobotsGroup | undefined): boolean {
  return (group?.disallow ?? []).some((rule) =>
    (PUBLIC_CONTENT_PATHS as readonly string[]).includes(rule),
  );
}

/**
 * Turn a robots.txt path rule into a matcher. Supports the de-facto `*`
 * wildcard and `$` end-anchor understood by Google and the major AI crawlers.
 */
export function ruleMatches(rule: string, path: string): boolean {
  if (rule === "") return false; // "Disallow:" with an empty value matches nothing
  const anchored = rule.endsWith("$");
  const body = anchored ? rule.slice(0, -1) : rule;
  const pattern =
    body
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*") + (anchored ? "$" : "");
  return new RegExp("^" + pattern).test(path);
}

/** Effective rule length used for longest-match precedence. */
function ruleSpecificity(rule: string): number {
  return rule.replace(/\$$/, "").length;
}

export interface PathDecision {
  allowed: boolean;
  /** The winning rule, if any matched. */
  rule?: string;
  kind?: "allow" | "disallow";
}

/**
 * Resolve whether a path is crawlable for a group using longest-match wins,
 * with Allow winning ties (the standard search-engine precedence).
 */
export function decidePath(group: RobotsGroup | undefined, path: string): PathDecision {
  if (!group) return { allowed: true };
  let best: PathDecision = { allowed: true };
  let bestLength = -1;

  const consider = (rule: string, kind: "allow" | "disallow") => {
    if (!ruleMatches(rule, path)) return;
    const length = ruleSpecificity(rule);
    if (length > bestLength || (length === bestLength && kind === "allow")) {
      bestLength = length;
      best = { allowed: kind === "allow", rule, kind };
    }
  };

  for (const rule of group.disallow) consider(rule, "disallow");
  for (const rule of group.allow) consider(rule, "allow");
  return best;
}

/**
 * Path-level Disallow rules that contradict the group's own Allow entries or
 * the paths that must stay crawlable.
 */
export function findPathConflicts(
  group: RobotsGroup | undefined,
  paths: readonly string[],
): { path: string; rule: string }[] {
  if (!group) return [];
  const conflicts: { path: string; rule: string }[] = [];
  for (const path of paths) {
    const decision = decidePath(group, path);
    if (!decision.allowed && decision.rule) conflicts.push({ path, rule: decision.rule });
  }
  return conflicts;
}

export interface CrawlDelayCheck {
  values: number[];
  invalid: string[];
  duplicated: boolean;
}

/** Parse and sanity-check a group's Crawl-delay directives. */
export function inspectCrawlDelay(group: RobotsGroup | undefined): CrawlDelayCheck {
  const raw = group?.crawlDelay ?? [];
  const values: number[] = [];
  const invalid: string[] = [];
  for (const entry of raw) {
    const parsed = Number(entry);
    if (entry.trim() === "" || Number.isNaN(parsed) || parsed < 0) invalid.push(entry);
    else values.push(parsed);
  }
  return { values, invalid, duplicated: raw.length > 1 };
}

/** Crawl-delay problems for one group, given the configured ceiling. */
export function crawlDelayProblems(
  label: string,
  group: RobotsGroup | undefined,
  maxSeconds: number | null,
): string[] {
  const { values, invalid, duplicated } = inspectCrawlDelay(group);
  const problems: string[] = [];
  for (const bad of invalid) problems.push(`${label} has an invalid Crawl-delay value "${bad}"`);
  if (duplicated) problems.push(`${label} declares more than one Crawl-delay`);
  if (maxSeconds === null) {
    for (const value of values)
      problems.push(`${label} should not throttle crawling (Crawl-delay: ${value})`);
  } else {
    for (const value of values) {
      if (value > maxSeconds) {
        problems.push(`${label} Crawl-delay ${value}s exceeds the ${maxSeconds}s ceiling`);
      }
    }
  }
  return problems;
}

/**
 * Full policy check. Returns a list of human-readable problems; empty means the
 * served robots.txt satisfies the AI/search crawler policy.
 */
export function findPolicyViolations(text: string): string[] {
  const groups = parseRobots(text);
  const problems: string[] = [];

  const wildcard = groupFor(groups, "*");
  if (!wildcard) problems.push("no wildcard (User-agent: *) group");
  else {
    for (const path of WILDCARD_POLICY.allow) {
      if (!wildcard.allow.includes(path)) problems.push(`wildcard group does not Allow: ${path}`);
    }
    for (const path of WILDCARD_POLICY.forbiddenDisallow) {
      if (wildcard.disallow.includes(path)) {
        problems.push(`wildcard group has a Disallow: ${path}`);
      }
    }
    for (const conflict of findPathConflicts(wildcard, WILDCARD_POLICY.mustBeCrawlable)) {
      problems.push(`wildcard group blocks ${conflict.path} via Disallow: ${conflict.rule}`);
    }
    problems.push(
      ...crawlDelayProblems("wildcard group", wildcard, WILDCARD_POLICY.maxCrawlDelaySeconds),
    );
  }

  for (const policy of ROBOT_AGENT_POLICIES) {
    const group = groupFor(groups, policy.name);
    if (!group) {
      problems.push(`${policy.name} is missing from robots.txt`);
      continue;
    }
    for (const path of policy.allow) {
      if (!group.allow.includes(path))
        problems.push(`${policy.name} has no explicit Allow: ${path}`);
    }
    if (group.disallow.includes("/")) {
      problems.push(`${policy.name} is blocked by a site-wide Disallow`);
    }
    for (const path of policy.mustNotDisallow) {
      if (group.disallow.includes(path)) problems.push(`${policy.name} is blocked from ${path}`);
    }
    for (const conflict of findPathConflicts(group, policy.mustBeCrawlable)) {
      problems.push(
        `${policy.name}: Disallow: ${conflict.rule} contradicts the Allow entries for ${conflict.path}`,
      );
    }
    problems.push(...crawlDelayProblems(policy.name, group, policy.maxCrawlDelaySeconds));
  }

  for (const g of groups) {
    if (g.disallow.includes("/")) {
      problems.push(`group [${g.agents.join(", ")}] carries a site-wide Disallow: /`);
    }
  }

  return [...new Set(problems)];
}

/** Every `Sitemap:` directive in the file, in order. */
export function parseSitemapUrls(text: string): string[] {
  const out: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const match = /^sitemap\s*:\s*(\S+)$/i.exec(line);
    if (match) out.push(match[1]);
  }
  return out;
}

/** A sitemap directive must be an absolute https URL ending in .xml. */
export function isValidSitemapUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && /\.xml$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}
