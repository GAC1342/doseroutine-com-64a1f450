/**
 * Pure sitemap parsing + diffing.
 *
 * Used by scripts/diff-sitemap.ts (CLI, run before/after a publish) and by the
 * daily resubmit hook, so both agree on what "changed" and what counts as a
 * regression. Regressions are the things that quietly cost traffic: an article
 * URL or an <image:image> entry that used to be in the sitemap and isn't now.
 */

export interface SitemapEntrySnapshot {
  loc: string;
  lastmod: string | null;
  images: string[];
}

export interface SitemapSnapshot {
  entries: SitemapEntrySnapshot[];
  byLoc: Map<string, SitemapEntrySnapshot>;
  urlCount: number;
  imageCount: number;
  articleCount: number;
}

export interface SitemapDiff {
  addedUrls: string[];
  removedUrls: string[];
  /** Removed URLs under /articles — always treated as a regression. */
  removedArticleUrls: string[];
  /** Images that disappeared from a URL that still exists. */
  removedImages: Array<{ loc: string; image: string }>;
  addedImages: number;
  changedLastmod: string[];
  changed: boolean;
  regressions: string[];
}

const URL_BLOCK = /<url\b[\s\S]*?<\/url>/gi;
const LOC = /<loc>\s*([\s\S]*?)\s*<\/loc>/i;
const LASTMOD = /<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i;
const IMAGE_LOC = /<image:loc>\s*([\s\S]*?)\s*<\/image:loc>/gi;

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

/** True for a URL that belongs to the /articles blog (post, index or feed). */
export function isArticleUrl(loc: string): boolean {
  try {
    return new URL(loc).pathname.startsWith("/articles");
  } catch {
    return loc.includes("/articles");
  }
}

export function parseSitemap(xml: string): SitemapSnapshot {
  const entries: SitemapEntrySnapshot[] = [];
  for (const block of xml.match(URL_BLOCK) ?? []) {
    const locMatch = LOC.exec(block);
    if (!locMatch) continue;
    const loc = decodeXml(locMatch[1]);
    if (!loc) continue;
    const lastmodMatch = LASTMOD.exec(block);
    const images = [...block.matchAll(IMAGE_LOC)].map((m) => decodeXml(m[1])).filter(Boolean);
    entries.push({
      loc,
      lastmod: lastmodMatch ? decodeXml(lastmodMatch[1]) : null,
      images: [...new Set(images)],
    });
  }

  const byLoc = new Map(entries.map((e) => [e.loc, e]));
  return {
    entries,
    byLoc,
    urlCount: byLoc.size,
    imageCount: entries.reduce((sum, e) => sum + e.images.length, 0),
    articleCount: entries.filter((e) => isArticleUrl(e.loc)).length,
  };
}

/** Stable fingerprint of a sitemap's meaningful content (URLs + their images). */
export function fingerprintSitemap(snapshot: SitemapSnapshot): string {
  const parts = [...snapshot.byLoc.values()]
    .map((e) => `${e.loc}|${[...e.images].sort().join(",")}`)
    .sort();
  // FNV-1a: short, dependency-free, and stable across runtimes.
  let hash = 0x811c9dc5;
  const text = parts.join("\n");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${parts.length}-${hash.toString(16).padStart(8, "0")}`;
}

export function diffSitemaps(previousXml: string, nextXml: string): SitemapDiff {
  const previous = parseSitemap(previousXml);
  const next = parseSitemap(nextXml);

  const addedUrls: string[] = [];
  const removedUrls: string[] = [];
  const removedImages: Array<{ loc: string; image: string }> = [];
  const changedLastmod: string[] = [];
  let addedImages = 0;

  for (const [loc, entry] of next.byLoc) {
    const before = previous.byLoc.get(loc);
    if (!before) {
      addedUrls.push(loc);
      addedImages += entry.images.length;
      continue;
    }
    const beforeImages = new Set(before.images);
    const afterImages = new Set(entry.images);
    for (const image of beforeImages) {
      if (!afterImages.has(image)) removedImages.push({ loc, image });
    }
    for (const image of afterImages) if (!beforeImages.has(image)) addedImages += 1;
    if ((before.lastmod ?? null) !== (entry.lastmod ?? null)) changedLastmod.push(loc);
  }

  for (const [loc, entry] of previous.byLoc) {
    if (!next.byLoc.has(loc)) {
      removedUrls.push(loc);
      for (const image of entry.images) removedImages.push({ loc, image });
    }
  }

  const removedArticleUrls = removedUrls.filter(isArticleUrl);

  const regressions: string[] = [];
  for (const loc of removedArticleUrls) {
    regressions.push(`article URL missing from the new sitemap: ${loc}`);
  }
  for (const { loc, image } of removedImages) {
    regressions.push(`image entry missing: ${image} (was on ${loc})`);
  }

  return {
    addedUrls: addedUrls.sort(),
    removedUrls: removedUrls.sort(),
    removedArticleUrls: removedArticleUrls.sort(),
    removedImages,
    addedImages,
    changedLastmod: changedLastmod.sort(),
    changed:
      addedUrls.length > 0 ||
      removedUrls.length > 0 ||
      removedImages.length > 0 ||
      addedImages > 0 ||
      changedLastmod.length > 0,
    regressions,
  };
}

/** Human-readable report for CLI output and alert emails. */
export function formatSitemapDiff(diff: SitemapDiff): string {
  const lines = [
    `added URLs: ${diff.addedUrls.length}`,
    `removed URLs: ${diff.removedUrls.length}`,
    `added images: ${diff.addedImages}`,
    `removed images: ${diff.removedImages.length}`,
    `lastmod changes: ${diff.changedLastmod.length}`,
  ];
  if (diff.regressions.length > 0) {
    lines.push("", "REGRESSIONS:", ...diff.regressions.map((r) => `  - ${r}`));
  }
  return lines.join("\n");
}
