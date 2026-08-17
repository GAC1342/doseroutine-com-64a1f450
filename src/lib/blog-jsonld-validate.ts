/**
 * CI validation for blog post structured data.
 *
 * Runs the real `blogPostHead()` output for every post and asserts the
 * Article/BlogPosting JSON-LD block exists and carries the required fields.
 * A missing or malformed field fails the build — see
 * src/lib/__tests__/blog-jsonld.test.ts and the blog-seo-score workflow.
 */
import { BLOG_POSTS, type BlogPost } from "@/lib/blog-posts";
import { blogPostHead } from "@/lib/blog-seo";

/** @type values accepted as the post's Article node. */
export const ARTICLE_TYPES = ["Article", "BlogPosting", "NewsArticle", "ScholarlyArticle"] as const;

export type JsonLdNode = Record<string, unknown>;

export type BlogJsonLdIssue = { slug: string; field: string; message: string };

export type BlogJsonLdResult = {
  slug: string;
  /** The Article-typed JSON-LD node, when one was found. */
  article: JsonLdNode | null;
  issues: BlogJsonLdIssue[];
};

/** Every JSON-LD script block emitted by a route head payload. */
export function parseJsonLdBlocks(head: {
  scripts?: Array<{ type?: string; children?: string }>;
}): JsonLdNode[] {
  const out: JsonLdNode[] = [];
  for (const s of head.scripts ?? []) {
    if (s?.type !== "application/ld+json" || typeof s.children !== "string") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(s.children);
    } catch {
      out.push({ __invalidJson: s.children.slice(0, 120) });
      continue;
    }
    const graph = (parsed as JsonLdNode)?.["@graph"];
    if (Array.isArray(graph)) out.push(...(graph as JsonLdNode[]));
    else if (Array.isArray(parsed)) out.push(...(parsed as JsonLdNode[]));
    else if (parsed && typeof parsed === "object") out.push(parsed as JsonLdNode);
  }
  return out;
}

function isArticle(node: JsonLdNode): boolean {
  const t = node["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => ARTICLE_TYPES.includes(x as (typeof ARTICLE_TYPES)[number]));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2}))?$/;

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Validate one post's structured data. */
export function validateBlogPostJsonLd(post: BlogPost): BlogJsonLdResult {
  const slug = post.slug;
  const issues: BlogJsonLdIssue[] = [];
  const nodes = parseJsonLdBlocks(blogPostHead(post) as never);

  const broken = nodes.find((n) => "__invalidJson" in n);
  if (broken) {
    issues.push({ slug, field: "json", message: "JSON-LD block is not valid JSON" });
  }

  const article = nodes.find(isArticle) ?? null;
  if (!article) {
    issues.push({
      slug,
      field: "@type",
      message: `no JSON-LD node with @type in ${ARTICLE_TYPES.join("/")}`,
    });
    return { slug, article: null, issues };
  }

  if (!nonEmptyString(article["@context"])) {
    issues.push({ slug, field: "@context", message: "missing @context" });
  }

  if (!nonEmptyString(article.headline)) {
    issues.push({ slug, field: "headline", message: "missing headline" });
  } else if ((article.headline as string).length > 110) {
    issues.push({
      slug,
      field: "headline",
      message: `headline is ${(article.headline as string).length} chars (max 110)`,
    });
  }

  for (const field of ["datePublished", "dateModified"] as const) {
    const v = article[field];
    if (!nonEmptyString(v)) {
      issues.push({ slug, field, message: `missing ${field}` });
    } else if (!ISO_DATE.test(v)) {
      issues.push({ slug, field, message: `${field} "${v}" is not an ISO-8601 date` });
    }
  }

  const published = article.datePublished;
  const modified = article.dateModified;
  if (nonEmptyString(published) && nonEmptyString(modified)) {
    if (Date.parse(modified) < Date.parse(published)) {
      issues.push({ slug, field: "dateModified", message: "dateModified precedes datePublished" });
    }
  }

  const author = article.author as JsonLdNode | undefined;
  if (!author || typeof author !== "object") {
    issues.push({ slug, field: "author", message: "missing author" });
  } else {
    const type = author["@type"];
    if (type !== "Person" && type !== "Organization") {
      issues.push({ slug, field: "author", message: "author needs @type Person or Organization" });
    }
    if (!nonEmptyString(author.name)) {
      issues.push({ slug, field: "author", message: "author is missing a name" });
    }
  }

  const publisher = article.publisher as JsonLdNode | undefined;
  if (!publisher || typeof publisher !== "object" || !nonEmptyString(publisher.name)) {
    issues.push({ slug, field: "publisher", message: "missing publisher with a name" });
  }

  if (!nonEmptyString(article.description)) {
    issues.push({ slug, field: "description", message: "missing description" });
  }

  const url = article.url;
  if (!nonEmptyString(url) || !url.startsWith("https://")) {
    issues.push({ slug, field: "url", message: "missing absolute https url" });
  }

  const image = article.image;
  const images = Array.isArray(image) ? image : image ? [image] : [];
  if (!images.length || !images.every((i) => nonEmptyString(i) && i.startsWith("https://"))) {
    issues.push({ slug, field: "image", message: "missing absolute https image" });
  }

  const mainEntity = article.mainEntityOfPage as JsonLdNode | undefined;
  if (!mainEntity || typeof mainEntity !== "object" || !nonEmptyString(mainEntity["@id"])) {
    issues.push({ slug, field: "mainEntityOfPage", message: "missing mainEntityOfPage @id" });
  }

  return { slug, article, issues };
}

export function validateAllBlogPostJsonLd(
  posts: readonly BlogPost[] = BLOG_POSTS,
): BlogJsonLdResult[] {
  return posts.map(validateBlogPostJsonLd);
}

/** Flat list of "slug: field — message" strings, empty when everything passes. */
export function blogJsonLdFailures(results: readonly BlogJsonLdResult[]): string[] {
  return results.flatMap((r) => r.issues.map((i) => `${r.slug}: ${i.field} — ${i.message}`));
}
