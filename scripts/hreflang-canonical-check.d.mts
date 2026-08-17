export declare const DEFAULT_BASE_URL: string;
export declare const DEFAULT_LOCALE: string;

export declare function parseLinkTags(html: string): Record<string, string>[];
export declare function extractCanonicals(html: string): string[];
export declare function extractAlternates(html: string): { hreflang: string; href: string }[];
export declare function normaliseUrl(raw: string): string | null;
export declare function isValidHreflang(code: string): boolean;
export declare function checkPage(input: {
  url: string;
  html: string;
  origin?: string;
  sitemapUrls?: Set<string> | null;
  defaultLocale?: string;
}): string[];
export declare function normaliseLocaleUrl(raw: string): string | null;
export declare function localeOfUrl(raw: string, defaultLocale?: string): string;
export declare function checkReciprocity(input: {
  url: string;
  html: string;
  alternateDocs: Map<string, string | null> | Record<string, string | null>;
  defaultLocale?: string;
}): string[];
