import type { CrawlHop } from "./crawl-smoke.d.mts";

export declare const DEFAULT_BASE_URL: string;

export declare function evaluateSitemapUrl(input: {
  url: string;
  chain: CrawlHop[];
  finalStatus: number;
  finalUrl: string;
  html: string;
  headers?: Record<string, string>;
  sitemapUrls?: Set<string> | null;
  maxHops?: number;
}): string[];
