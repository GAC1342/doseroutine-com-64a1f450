export declare const DEFAULT_BASE_URL: string;
export declare const TITLE_MIN: number;
export declare const TITLE_MAX: number;
export declare const DESC_MIN: number;
export declare const DESC_MAX: number;
export declare const JSONLD_REQUIRED: Record<string, string[]>;

export declare function parseSitemapXml(xml: string): {
  kind: "index" | "urlset" | "unknown";
  locs: string[];
};
export declare function extractMeta(html: string): Record<string, string>;
export declare function extractCanonicals(html: string): string[];
export declare function extractTitle(html: string): string | null;
export declare function extractH1s(html: string): string[];
export declare function extractJsonLdBlocks(html: string): string[];
export declare function extractInternalLinks(html: string, pageUrl: string): string[];
export declare function normaliseUrl(target: string, base?: string): string | null;
export declare function checkJsonLd(html: string): string[];
export declare function checkMetadata(url: string, html: string): string[];
export declare function classifyLinkStatus(
  url: string,
  status: number,
  location?: string | null,
): string | null;
export declare function sampleEvenly<T>(items: T[], limit: number): T[];
