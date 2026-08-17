/**
 * Social image metadata (og:image* / twitter:image*) for marketing and
 * calculator pages.
 *
 * Every share card on this site is a DoseRoutine-branded card — either a
 * generated card in `public/og/pages/<slug>.png` (see
 * `scripts/generate-page-og.py`) or hand-made artwork in `public/og/`. The alt
 * text has to say so: "DoseRoutine" plus what the page is about, never a
 * generic "og image" / "preview" / "banner". Screen-reader users hear this
 * string when a link is unfurled, and answer engines read it as an image
 * caption, so it is written as a sentence about the page, not a filename.
 */
import { PAGE_OG_CARD_SLUGS } from "@/lib/page-og-manifest";

export const SOCIAL_IMAGE_SITE = "https://doseroutine.com";

/** Alt text that says nothing about the image — rejected by the lint/tests. */
export const GENERIC_IMAGE_ALT = new Set([
  "og image",
  "og:image",
  "image",
  "preview",
  "preview image",
  "share image",
  "social image",
  "social card",
  "banner",
  "cover",
  "cover image",
  "screenshot",
  "logo",
  "thumbnail",
  "doseroutine",
]);

export type SocialImage = {
  /** Absolute https URL of the card. */
  url: string;
  /** Descriptive, DoseRoutine-branded alt text. */
  alt: string;
  width?: number;
  height?: number;
};

/** URL of the generated brand card for a page slug, when one exists. */
export function pageCardUrl(slug: string): string | null {
  return PAGE_OG_CARD_SLUGS.has(slug) ? `${SOCIAL_IMAGE_SITE}/og/pages/${slug}.png` : null;
}

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
}

/**
 * Trim the "| DoseRoutine" / "— DoseRoutine" suffix so the brand name is not
 * repeated twice in one alt string.
 */
function withoutBrandSuffix(text: string): string {
  return tidy(text.replace(/\s*[|—–-]\s*DoseRoutine\s*$/i, ""));
}

/** Keep alt text within the length social platforms and readers actually use. */
function clamp(text: string, max = 125): string {
  const clean = tidy(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${tidy(cut.slice(0, cut.lastIndexOf(" ")))}…`;
}

/**
 * Branded alt text for a page's share card.
 *
 * @param subject  What the page is about (page H1 or compound name).
 * @param kind     What kind of page the card fronts.
 */
export function brandedImageAlt(
  subject: string,
  kind: "roundup" | "use-case" | "calculator" | "guide" | "comparison" | "app" = "app",
): string {
  const name = withoutBrandSuffix(subject);
  switch (kind) {
    case "roundup":
      return clamp(`DoseRoutine app card for "${name}" — peptide, supplement and hormone tracking`);
    case "use-case":
      return clamp(`DoseRoutine app card: ${name}, dose scheduling and interaction checks`);
    case "calculator":
      return clamp(`DoseRoutine ${name} card — reconstitution maths, BAC water volume and syringe units`);
    case "guide":
      return clamp(`DoseRoutine guide card: ${name}, with evidence summaries and dosing detail`);
    case "comparison":
      return clamp(`DoseRoutine comparison card: ${name}, side by side on dosing and evidence`);
    default:
      return clamp(`DoseRoutine card: ${name}`);
  }
}

/**
 * Full og:image / twitter:image meta block for one page.
 * Returns an empty array when the page has no branded card — a missing image
 * is better than a generic one.
 */
export function socialImageMeta(image: SocialImage | null | undefined) {
  if (!image?.url || !image.alt) return [];
  const type = image.url.endsWith(".png") ? "image/png" : "image/jpeg";
  return [
    { property: "og:image", content: image.url },
    { property: "og:image:secure_url", content: image.url },
    { property: "og:image:type", content: type },
    { property: "og:image:width", content: String(image.width ?? 1200) },
    { property: "og:image:height", content: String(image.height ?? 630) },
    { property: "og:image:alt", content: image.alt },
    { name: "twitter:image", content: image.url },
    { name: "twitter:image:alt", content: image.alt },
  ];
}

/** Convenience: branded card meta for a page slug, or [] when there is none. */
export function pageCardMeta(
  slug: string,
  subject: string,
  kind: Parameters<typeof brandedImageAlt>[1],
) {
  const url = pageCardUrl(slug);
  return url ? socialImageMeta({ url, alt: brandedImageAlt(subject, kind) }) : [];
}

/** True when alt text is missing, generic, or just the brand name. */
export function isGenericImageAlt(alt: string | null | undefined): boolean {
  const key = tidy(alt ?? "").toLowerCase();
  if (!key) return true;
  if (GENERIC_IMAGE_ALT.has(key)) return true;
  return key.length < 15;
}
