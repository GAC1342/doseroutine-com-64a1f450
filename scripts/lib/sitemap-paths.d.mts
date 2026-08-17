export declare const NON_COMPOUND_LIBRARY_SLUGS: Set<string>;

export declare function fetchTextDecompressed(
  url: string,
  timeoutMs?: number,
): Promise<{ status: number; contentType: string; text: string }>;

export declare function parseSitemapLocs(xml: string): string[];

export declare function filterCompoundPaths(locs: string[]): string[];

export declare function discoverCompoundPaths(
  base: string,
  options?: { fallback?: readonly string[] },
): Promise<{ paths: string[]; source: "sitemap" | "fallback"; reason: string }>;

export declare function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]>;
