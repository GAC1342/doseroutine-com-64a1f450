/**
 * Payload normalization and signature verification for the outrank.so webhook.
 *
 * outrank.so may send articles in a few common shapes, so this module is
 * defensive: it accepts several field-name variants and both HTML and Markdown
 * bodies, then normalizes everything to the shape the app expects.
 */
import { createHmac, timingSafeEqual } from "crypto";
import type { OutrankArticleRow } from "./outrank-articles.server";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type NormalizedOutrankArticle = {
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  target_keyword: string | null;
  answer: string | null;
  body: string;
  body_format: "markdown" | "html";
  faqs: { question: string; answer: string }[];
  status: "published" | "draft" | "archived";
  featured_image_url: string | null;
  lang: string;
  published_at: string | null;
  modified_at: string | null;
  raw_payload: Json;
};

function pickString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function pickStrings(payload: Record<string, unknown>, keys: string[]): string[] {
  const raw = payload[keys.find((k) => payload[k] !== undefined) ?? ""];
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim());
  return [];
}

function looksLikeHtml(text: string): boolean {
  return /<(?:html|head|body|div|p|h[1-6]|ul|ol|li|a|img|span|strong|em|br|table|tr|td|th)[\s>]/i.test(
    text,
  );
}

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(text: string): string {
  const m = text.match(/[^.!?]+[.!?]+/);
  return m ? m[0].trim() : text.slice(0, 160);
}

function parseFaqs(raw: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const q =
        (item as Record<string, unknown>)["question"] ??
        (item as Record<string, unknown>)["q"] ??
        null;
      const a =
        (item as Record<string, unknown>)["answer"] ??
        (item as Record<string, unknown>)["a"] ??
        null;
      if (typeof q !== "string" || typeof a !== "string") return null;
      return { question: q.trim(), answer: a.trim() };
    })
    .filter((f): f is { question: string; answer: string } => f !== null && f.question.length > 0);
}

export function normalizeOutrankPayload(
  payload: Record<string, unknown>,
): NormalizedOutrankArticle {
  const rawPayload = payload as Json;

  const slug = normalizeSlug(pickString(payload, ["slug", "post_slug", "id", "post_id"]) ?? "post");
  const title = pickString(payload, ["title", "headline", "post_title"]) ?? slug;

  const htmlBody = pickString(payload, ["html", "content_html", "body_html"]);
  const markdownBody = pickString(payload, ["markdown", "content_markdown", "body_markdown"]);
  const genericBody = pickString(payload, ["body", "content", "text"]);

  let body = markdownBody ?? htmlBody ?? genericBody ?? "";
  let body_format: "markdown" | "html" = markdownBody ? "markdown" : htmlBody ? "html" : "markdown";

  if (!markdownBody && !htmlBody && genericBody && looksLikeHtml(genericBody)) {
    body_format = "html";
  }

  const answer =
    pickString(payload, ["answer", "excerpt", "summary", "description"]) ??
    firstSentence(stripHtmlTags(body || title));

  const meta_title = pickString(payload, ["meta_title", "metaTitle", "seo_title"]);
  const meta_description =
    pickString(payload, ["meta_description", "metaDescription", "seo_description"]) ??
    answer.slice(0, 155);
  const target_keyword = pickString(payload, ["target_keyword", "targetKeyword", "keyword"]);

  const statusRaw = (pickString(payload, ["status", "post_status"]) ?? "published").toLowerCase();
  const status = ["published", "draft", "archived"].includes(statusRaw)
    ? (statusRaw as NormalizedOutrankArticle["status"])
    : "published";

  const featured_image_url = pickString(payload, [
    "featured_image_url",
    "featuredImage",
    "featured_image",
    "image_url",
    "hero_image",
  ]);

  const lang = pickString(payload, ["lang", "language", "locale"]) ?? "en";
  const published_at = pickString(payload, [
    "published_at",
    "publishedAt",
    "published",
    "date",
    "created_at",
    "createdAt",
  ]);
  const modified_at = pickString(payload, ["modified_at", "modifiedAt", "updated_at", "updatedAt"]);
  const faqs = parseFaqs(payload["faqs"] ?? payload["faq"] ?? payload["questions"]);

  return {
    slug,
    title,
    meta_title,
    meta_description,
    target_keyword,
    answer,
    body,
    body_format,
    faqs,
    status,
    featured_image_url,
    lang,
    published_at,
    modified_at,
    raw_payload: rawPayload,
  };
}

/**
 * Verifies the webhook signature using HMAC-SHA256.
 *
 * Accepts several common signature formats:
 * - raw hex string
 * - "sha256=<hex>"
 * - base64-encoded HMAC
 */
export function verifyOutrankWebhookSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const expectedHex = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  const expectedBase64 = createHmac("sha256", secret).update(body, "utf8").digest("base64");

  const candidates = new Set<string>();
  candidates.add(signature.trim().toLowerCase());

  const sig = signature.trim();
  if (sig.toLowerCase().startsWith("sha256=")) {
    candidates.add(sig.slice("sha256=".length).trim().toLowerCase());
  }

  try {
    const decoded = Buffer.from(sig, "base64").toString("utf8");
    if (decoded && decoded.length > 0) candidates.add(decoded.toLowerCase());
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    try {
      if (
        timingSafeEqual(Buffer.from(candidate), Buffer.from(expectedHex.toLowerCase())) ||
        timingSafeEqual(Buffer.from(candidate), Buffer.from(expectedBase64.toLowerCase()))
      ) {
        return true;
      }
    } catch {
      // lengths differ, ignore
    }
  }

  return false;
}

/**
 * Outrank's "Send test" button posts a placeholder article. Those must never
 * appear on /articles, so they are stored as drafts instead of published.
 */
export function isTestArticle(a: {
  slug: string;
  title: string;
  body: string;
  featured_image_url: string | null;
}): boolean {
  const slug = a.slug.toLowerCase();
  const title = a.title.toLowerCase();
  if (slug.includes("sample-article") || slug.includes("test-article")) return true;
  if (title.startsWith("sample article") || title.includes("for testing")) return true;
  if (/via\.placeholder\.com|placehold\.co/i.test(a.featured_image_url ?? "")) return true;
  if (a.body.trim().length < 400) return true;
  return false;
}

/** Maps the normalized webhook payload to a Supabase upsert row. */
export function toOutrankInsertRow(
  normalized: NormalizedOutrankArticle,
): Omit<OutrankArticleRow, "id" | "created_at" | "updated_at"> {
  return {
    slug: normalized.slug,
    title: normalized.title,
    meta_title: normalized.meta_title,
    meta_description: normalized.meta_description,
    target_keyword: normalized.target_keyword,
    answer: normalized.answer,
    body: normalized.body,
    body_format: normalized.body_format,
    faqs: normalized.faqs,
    status: isTestArticle(normalized) ? "draft" : normalized.status,
    featured_image_url: normalized.featured_image_url,
    lang: normalized.lang,
    published_at: normalized.published_at,
    modified_at: normalized.modified_at,
    raw_payload: normalized.raw_payload,
  };
}

/**
 * Outrank's "API Webhook" integration posts:
 *   { event_type: "publish_articles", timestamp, data: { articles: [...] } }
 * Older/custom setups may post a single article object. Accept both.
 */
export function extractOutrankArticles(
  payload: Record<string, unknown>,
): Record<string, unknown>[] {
  const data = payload["data"];
  const fromData =
    data && typeof data === "object" ? (data as Record<string, unknown>)["articles"] : undefined;
  const candidates = fromData ?? payload["articles"];
  if (Array.isArray(candidates)) {
    return candidates.filter(
      (a): a is Record<string, unknown> => !!a && typeof a === "object" && !Array.isArray(a),
    );
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (d["title"] || d["slug"] || d["content_markdown"] || d["content_html"]) return [d];
  }
  if (payload["title"] || payload["slug"] || payload["content_markdown"] || payload["content_html"])
    return [payload];
  return [];
}

/**
 * Outrank authenticates with `Authorization: Bearer <access token>`.
 * We accept that (token === OUTRANK_WEBHOOK_SECRET) or an HMAC signature header.
 */
export function verifyOutrankBearer(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !secret) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token.length === 0) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
