export declare const MIN_WORDS: number;
export declare const MAX_WORDS: number;
export declare const MARKETING: RegExp;
export declare const CTA_MARKUP: string[];
export declare const NON_COMPOUND_SLUGS: Set<string>;

export declare function wordCount(text: string): number;
export declare function auditHtml(html: string): string[];
export declare function compoundSlugsFromSitemap(xml: string): string[];
