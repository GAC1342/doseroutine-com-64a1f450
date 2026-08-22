export declare const DEFAULT_BASE_URL: string;
export declare const MAX_HOPS: number;
export declare const LANGS: string[];

export interface CrawlHop {
  url: string;
  status: number;
  location?: string | null;
}

export interface CrawlResult {
  chain: CrawlHop[];
  finalStatus: number;
  finalUrl: string;
  html: string;
  headers: Record<string, string>;
}

export declare function langVariants(url: string, langs?: string[]): string[];
export declare function extractRobotsMeta(html: string): string[];
export declare function isNoindex(html: string, headers?: Record<string, string>): boolean;
export declare function evaluateChain(input: {
  start: string;
  chain: CrawlHop[];
  finalStatus: number;
  finalUrl: string;
  maxHops?: number;
}): string[];
export declare function evaluateDuplicateParams(input: {
  start: string;
  finalUrl: string;
}): string[];
export declare function evaluateCrawl(input: {
  start: string;
  chain: CrawlHop[];
  finalStatus: number;
  finalUrl: string;
  html: string;
  headers?: Record<string, string>;
  origin?: string;
  sitemapUrls?: Set<string> | null;
  maxHops?: number;
}): string[];
export declare function crawl(
  url: string,
  options?: { maxHops?: number; userAgent?: string },
): Promise<CrawlResult>;
