export declare const DEFAULT_BASE_URL: string;
export declare const PRIVATE_PREFIXES: string[];
export declare const SITEMAP_MAX_URLS: number;

export interface RobotsGroup {
  agents: string[];
  allow: string[];
  disallow: string[];
}
export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
}

export declare function parseSitemap(xml: string): {
  kind: "index" | "urlset" | "unknown";
  locs: string[];
};
export declare function parseRobots(text: string): ParsedRobots;
export declare function wildcardGroup(robots: ParsedRobots): RobotsGroup | null;
export declare function isDisallowed(robots: ParsedRobots, path: string): boolean;
export declare function isPrivatePath(path: string): boolean;
export declare function validateRobots(
  text: string,
  options?: { baseUrl?: string },
): { failures: string[]; robots: ParsedRobots };
export declare function validateSitemapUrls(
  urls: string[],
  options?: { baseUrl?: string; robots?: ParsedRobots; minUrls?: number },
): string[];
export declare function checkUrlResult(input: {
  url: string;
  status: number;
  finalUrl?: string;
}): string | null;
export declare function pickSample(urls: string[], size: number): string[];
export declare const MUST_BLOCK_PREFIXES: string[];
