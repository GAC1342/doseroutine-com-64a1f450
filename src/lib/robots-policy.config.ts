/**
 * Single source of truth for the robots.txt crawler policy.
 *
 * Both the static test (public/robots.txt on disk) and the integration test
 * (the file served over HTTP) read this config, so adding, removing, or
 * re-scoping a bot is a one-line edit here — no test file needs to change.
 */

export interface RobotAgentPolicy {
  /** User-agent token exactly as it must appear in robots.txt. */
  name: string;
  /** Paths that must be explicitly Allowed for this agent. */
  allow: string[];
  /** Path prefixes that must never appear in this agent's Disallow rules. */
  mustNotDisallow: string[];
  /**
   * Representative URLs that must resolve to "crawlable" once Allow/Disallow
   * precedence is applied. Catches path-level Disallow rules that silently
   * contradict the Allow entries (e.g. `Disallow: /lib` swallowing /library).
   */
  mustBeCrawlable: string[];
  /**
   * Highest acceptable `Crawl-delay` in seconds. `null` means the agent must
   * carry no Crawl-delay directive at all.
   */
  maxCrawlDelaySeconds: number | null;
}

/** Public content prefixes that must stay crawlable (both bare and trailing-slash forms). */
export const PUBLIC_CONTENT_PATHS = ["/library", "/library/", "/blog", "/blog/"] as const;

/** Default expectations applied to every AI/search agent below. */
const DEFAULT_ALLOW = ["/"];
const DEFAULT_MUST_NOT_DISALLOW = [...PUBLIC_CONTENT_PATHS];

/** Real public URLs used to prove the Allow entries actually take effect. */
export const CRAWLABLE_SAMPLE_PATHS = [
  "/",
  "/library",
  "/library/retatrutide-dosage",
  "/blog",
  "/sources",
  "/sitemap.xml",
] as const;

const DEFAULT_MUST_BE_CRAWLABLE = [...CRAWLABLE_SAMPLE_PATHS];
/** No throttling for AI/search agents: we want full, timely crawls. */
const DEFAULT_MAX_CRAWL_DELAY: number | null = null;

function agent(name: string, overrides: Partial<Omit<RobotAgentPolicy, "name">> = {}): RobotAgentPolicy {
  return {
    name,
    allow: overrides.allow ?? DEFAULT_ALLOW,
    mustNotDisallow: overrides.mustNotDisallow ?? DEFAULT_MUST_NOT_DISALLOW,
    mustBeCrawlable: overrides.mustBeCrawlable ?? DEFAULT_MUST_BE_CRAWLABLE,
    maxCrawlDelaySeconds:
      overrides.maxCrawlDelaySeconds === undefined
        ? DEFAULT_MAX_CRAWL_DELAY
        : overrides.maxCrawlDelaySeconds,
  };
}

/** AI/search agents that must be explicitly named and allowed in robots.txt. */
export const ROBOT_AGENT_POLICIES: RobotAgentPolicy[] = [
  agent("GPTBot"),
  agent("OAI-SearchBot"),
  agent("ChatGPT-User"),
  agent("ClaudeBot"),
  agent("Claude-User"),
  agent("Claude-SearchBot"),
  agent("PerplexityBot"),
  agent("Perplexity-User"),
  agent("Google-Extended"),
  agent("Applebot-Extended"),
  agent("Bingbot"),
  agent("Amazonbot"),
  agent("CCBot"),
  agent("meta-externalagent"),
];

/** Convenience list of agent names, in config order. */
export const REQUIRED_AI_AGENTS = ROBOT_AGENT_POLICIES.map((a) => a.name);

/** Expectations for the wildcard (`User-agent: *`) group. */
export const WILDCARD_POLICY = {
  allow: ["/"],
  /** A literal "/" here would opt the whole site out of search. */
  forbiddenDisallow: ["/"],
  mustBeCrawlable: [...CRAWLABLE_SAMPLE_PATHS],
  maxCrawlDelaySeconds: null as number | null,
} as const;

/** The sitemap robots.txt must advertise. */
export const CANONICAL_SITEMAP_URL = "https://doseroutine.com/sitemap.xml";

export function policyFor(name: string): RobotAgentPolicy | undefined {
  return ROBOT_AGENT_POLICIES.find((a) => a.name.toLowerCase() === name.toLowerCase());
}
