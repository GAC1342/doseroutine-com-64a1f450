import { BLOG_POSTS_NEWEST_FIRST } from "@/lib/blog-posts";

type ResearchLink = { slug: string; heading: string };

/**
 * Picks the "Latest research" links shown at the bottom of library and
 * interaction pages.
 *
 * Previously every one of those pages listed the same six newest posts, so an
 * identical ~150-word block appeared on hundreds of URLs and audit crawlers
 * flagged the thin pages as duplicate content. Selection is now derived from
 * the page's own path: posts whose heading/tags overlap the page topic rank
 * first, and the remainder is filled from a deterministic rotation so two
 * neighbouring compounds do not end up with the same list.
 */

const STOP_WORDS = new Set([
  "library",
  "interactions",
  "interaction",
  "checker",
  "and",
  "the",
  "for",
  "with",
  "vs",
  "acid",
]);

function pathTokens(pathname: string): string[] {
  return pathname
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/** Small, stable string hash so the rotation is identical on server and client. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pickResearchLinks(pathname: string, count = 6): ResearchLink[] {
  const posts = BLOG_POSTS_NEWEST_FIRST;
  if (posts.length === 0) return [];

  const tokens = pathTokens(pathname);
  const scored = posts.map((post, index) => {
    const haystack = `${post.heading} ${post.title} ${(post.tags ?? [])
      .map((t) => (typeof t === "string" ? t : JSON.stringify(t)))
      .join(" ")}`.toLowerCase();
    const score = tokens.reduce((sum, token) => (haystack.includes(token) ? sum + 1 : sum), 0);
    return { post, score, index };
  });

  const related = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((s) => s.post);

  // Deterministic rotation over the remaining posts keeps each page's filler
  // links distinct without any randomness (SSR and hydration must agree).
  const rest = posts.filter((p) => !related.includes(p));
  const offset = rest.length ? hash(pathname) % rest.length : 0;
  const rotated = [...rest.slice(offset), ...rest.slice(0, offset)];

  return [...related, ...rotated].slice(0, count).map((p) => ({
    slug: p.slug,
    heading: p.heading,
  }));
}
