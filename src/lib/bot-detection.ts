// Lightweight client-side bot heuristic. Used by analytics to keep
// visitor counts human-only. Intentionally conservative: false negatives
// (missing a niche bot) are better than false positives (dropping a real
// user). We deliberately allow AI-assistant crawlers (GPTBot, ClaudeBot,
// PerplexityBot, Google-Extended, etc.) to hit the site normally — we
// want them to read us and cite us — but we track them separately so
// they don't inflate the "humans" number in the dashboard.

const BOT_UA_PATTERNS: RegExp[] = [
  // Generic
  /bot|crawler|spider|crawling|scrape|scraper|fetch|curl|wget|python-requests|httpclient|okhttp|axios\//i,
  // Search engines
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|sogou|exabot|facebot|ia_archiver/i,
  // Social previewers (still not a human sign-up)
  /facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|skypeuripreview/i,
  // AI assistants and dataset crawlers
  /gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic-ai|perplexitybot|perplexity-user|google-extended|bytespider|amazonbot|applebot|ccbot|cohere-ai|meta-externalagent|diffbot/i,
  // Uptime / SEO tools
  /pingdom|uptimerobot|newrelicpinger|statuscake|ahrefsbot|semrushbot|mj12bot|dotbot|screaming frog/i,
  // Headless
  /headlesschrome|phantomjs|puppeteer|playwright/i,
];

const AI_UA_PATTERNS: RegExp[] = [
  /gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic-ai|perplexitybot|perplexity-user|google-extended|cohere-ai|meta-externalagent|ccbot|bytespider|applebot-extended/i,
];

export function isBotUA(ua: string | undefined | null): boolean {
  if (!ua) return false;
  return BOT_UA_PATTERNS.some((r) => r.test(ua));
}

export function isAIAssistantUA(ua: string | undefined | null): boolean {
  if (!ua) return false;
  return AI_UA_PATTERNS.some((r) => r.test(ua));
}

/** True when the current browser session looks like a bot. */
export function isLikelyBotClient(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (isBotUA(ua)) return true;
  // Headless heuristics: navigator.webdriver, missing languages, zero plugins
  // AND no touch — real humans satisfy at least one of these.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((navigator as any).webdriver === true) return true;
  return false;
}
