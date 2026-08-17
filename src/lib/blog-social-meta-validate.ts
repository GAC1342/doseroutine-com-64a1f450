/**
 * CI validation for blog post social-share meta tags.
 *
 * Runs the real `blogPostHead()` output for every post and asserts the
 * OpenGraph and Twitter card tags are complete. Missing or malformed tags
 * fail the build — see src/lib/__tests__/blog-social-meta.test.ts.
 */
import { BLOG_POSTS, type BlogPost } from "@/lib/blog-posts";
import { blogPostHead } from "@/lib/blog-seo";

export type MetaTag = { title?: string; name?: string; property?: string; content?: string };

export type SocialMetaIssue = { slug: string; tag: string; message: string };
export type SocialMetaResult = { slug: string; issues: SocialMetaIssue[] };

const VALID_TWITTER_CARDS = ["summary", "summary_large_image", "app", "player"];
const IMAGE_EXT = /\.(png|jpg|jpeg|webp|gif|avif)(\?.*)?$/i;

function readMeta(head: { meta?: MetaTag[] }) {
  const byKey = new Map<string, string>();
  let title = "";
  for (const m of head.meta ?? []) {
    if (typeof m?.title === "string") title = m.title;
    const key = m?.property ?? m?.name;
    if (key && typeof m.content === "string" && !byKey.has(key)) byKey.set(key, m.content);
  }
  return { title, get: (k: string) => byKey.get(k)?.trim() ?? "" };
}

/** Validate the OG/Twitter tags for one post. */
export function validateBlogSocialMeta(post: BlogPost): SocialMetaResult {
  const slug = post.slug;
  const issues: SocialMetaIssue[] = [];
  const push = (tag: string, message: string) => issues.push({ slug, tag, message });
  const head = blogPostHead(post) as { meta?: MetaTag[] };
  const { title, get } = readMeta(head);

  if (!title) push("title", "missing <title>");

  const description = get("description");
  if (!description) push("description", "missing meta description");

  // ---- OpenGraph ----
  const ogTitle = get("og:title");
  if (!ogTitle) push("og:title", "missing og:title");
  else if (ogTitle.length > 95) push("og:title", `${ogTitle.length} chars (max 95)`);

  const ogDescription = get("og:description");
  if (!ogDescription) push("og:description", "missing og:description");
  else if (ogDescription.length > 200) push("og:description", `${ogDescription.length} chars (max 200)`);

  const ogType = get("og:type");
  if (ogType !== "article") push("og:type", `expected "article", got "${ogType || "none"}"`);

  const ogUrl = get("og:url");
  if (!ogUrl.startsWith("https://")) push("og:url", "missing absolute https og:url");
  else if (!ogUrl.includes(`/blog/${slug}`)) push("og:url", `og:url does not self-reference: ${ogUrl}`);

  if (!get("og:site_name")) push("og:site_name", "missing og:site_name");

  const ogImage = get("og:image");
  if (!ogImage.startsWith("https://")) push("og:image", "missing absolute https og:image");
  else if (!IMAGE_EXT.test(ogImage)) push("og:image", `og:image has no image extension: ${ogImage}`);
  if (!get("og:image:alt")) push("og:image:alt", "missing og:image:alt");

  // ---- Twitter ----
  const card = get("twitter:card");
  if (!card) push("twitter:card", "missing twitter:card");
  else if (!VALID_TWITTER_CARDS.includes(card)) push("twitter:card", `invalid card type "${card}"`);

  if (!get("twitter:title")) push("twitter:title", "missing twitter:title");
  if (!get("twitter:description")) push("twitter:description", "missing twitter:description");

  const twImage = get("twitter:image");
  if (!twImage.startsWith("https://")) push("twitter:image", "missing absolute https twitter:image");
  if (!get("twitter:image:alt")) push("twitter:image:alt", "missing twitter:image:alt");

  if (card === "summary_large_image" && twImage && ogImage && twImage !== ogImage) {
    push("twitter:image", "twitter:image differs from og:image");
  }

  return { slug, issues };
}

export function validateAllBlogSocialMeta(
  posts: readonly BlogPost[] = BLOG_POSTS,
): SocialMetaResult[] {
  return posts.map(validateBlogSocialMeta);
}

/** Flat "slug: tag — message" list; empty when every post passes. */
export function blogSocialMetaFailures(results: readonly SocialMetaResult[]): string[] {
  return results.flatMap((r) => r.issues.map((i) => `${r.slug}: ${i.tag} — ${i.message}`));
}
