export declare const PAGE_TYPES: readonly string[];

export type MicrodataScope = {
  itemtype: string | null;
  prop: string | null;
  props: string[];
  index: number;
};

export declare function parseScopes(html: string): MicrodataScope[];

export declare function isPageType(itemtype: string | null | undefined): boolean;

export declare function checkScopes(path: string, html: string): string[];
