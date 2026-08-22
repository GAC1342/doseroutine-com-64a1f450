/**
 * Anchor-text lint for internal links.
 *
 * Search and answer engines use anchor text as the primary label for the page
 * being linked to. "Click here" or an empty icon-only link tells them nothing,
 * and the same anchor text pointing at two different destinations on one page
 * sends conflicting signals. This module parses rendered HTML and reports both.
 *
 * It is deliberately dependency-free (regex + small text helpers) so it can run
 * in CI against a crawled site without a headless browser.
 */

import { decodeEntities, htmlToText } from "@/lib/faq-anchor-parity";

export type AnchorIssueCode =
  | "empty-anchor-text"
  | "generic-anchor-text"
  | "too-short-anchor-text"
  | "url-as-anchor-text"
  | "inconsistent-anchor-text"
  | "missing-aria-label"
  | "generic-aria-label"
  | "aria-label-mismatch";

export type AnchorIssue = {
  code: AnchorIssueCode;
  href: string;
  text: string;
  detail: string;
};

export type AnchorLink = {
  href: string;
  /** Effective anchor text: visible text, else aria-label / title / img alt. */
  text: string;
  /** True when the label came from an attribute rather than visible text. */
  fromAttribute: boolean;
  /** Visible text content of the link, if any. */
  visible: string;
  /** aria-label attribute, if any. */
  ariaLabel: string | null;
  /** title attribute, if any. */
  title: string | null;
  /** alt text of an image inside the link, if any. */
  imgAlt: string | null;
};

export type AnchorLintResult = {
  links: AnchorLink[];
  issues: AnchorIssue[];
  ok: boolean;
};

export type AnchorLintOptions = {
  /** Same-origin absolute URLs treated as internal. */
  siteOrigin?: string;
  /** Extra anchor texts that are allowed to be short/repeated (nav chrome). */
  allow?: string[];
  /** Minimum characters for an anchor label. */
  minLength?: number;
  /**
   * Also validate accessibility metadata (aria-label presence, quality and
   * label-in-name parity with the visible text). Defaults to true.
   */
  accessibility?: boolean;
};

/** Anchor text that describes nothing about the destination. */
export const GENERIC_ANCHOR_TEXT = new Set([
  "click here",
  "click",
  "here",
  "read more",
  "read this",
  "learn more",
  "find out more",
  "more",
  "more info",
  "more information",
  "details",
  "this",
  "this page",
  "this post",
  "this article",
  "this link",
  "link",
  "go",
  "go here",
  "see more",
  "see here",
  "view",
  "view more",
  "continue",
  "continue reading",
  "full story",
  "download",
  "page",
  "info",
  "start",
]);

/**
 * Navigation chrome that is legitimately terse and repeated across the site.
 * These are exempt from the length rule only — never from the generic rule.
 */
const DEFAULT_ALLOW = [
  "home",
  "blog",
  "about",
  "login",
  "log in",
  "sign in",
  "sign up",
  "open app",
  "back",
  "next",
  "previous",
  "faq",
  "rss",
  "trt",
  "glp-1",
  "library",
  "sources",
  "pricing",
  "install",
  "calculators",
  "search",
  "menu",
  "skip to content",
];

/**
 * Card / CTA boilerplate: the visible words are a call to action and the
 * aria-label carries the real destination name. Exempt from the label-in-name
 * rule (the aria-label is the improvement, not a regression).
 */
const CTA_VISIBLE_TEXT = new Set([
  "read the comparison",
  "read the update",
  "read the guide",
  "read the research",
  "read the analysis",
  "open calculator",
  "open the calculator",
  "open app",
  "view guide",
  "view the guide",
  "see the protocol",
  "start tracking",
  "get started",
  "try it free",
]);

const SITE_DEFAULT = "https://doseroutine.com";

function normalize(text: string): string {
  return decodeEntities(text)
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .trim();
}

/** Strip trailing punctuation and lowercase, for comparison purposes. */
function compareKey(text: string): string {
  return normalize(text)
    .toLowerCase()
    .replace(/[\s.,:;!?→›»—–-]+$/g, "")
    .trim();
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  const raw = match?.[2] ?? match?.[3];
  return raw ? normalize(raw) : null;
}

/** Is this href a link to another page of our own site? */
export function isInternalHref(href: string, siteOrigin = SITE_DEFAULT): boolean {
  const value = href.trim();
  if (!value) return false;
  // In-page jumps, protocol links and non-navigational schemes are out of scope.
  if (/^(#|mailto:|tel:|sms:|javascript:|data:)/i.test(value)) return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/")) return true;
  try {
    return new URL(value).origin === new URL(siteOrigin).origin;
  } catch {
    return false;
  }
}

/** Path + fragment of an internal href, so /x and https://site/x compare equal. */
export function internalTarget(href: string, siteOrigin = SITE_DEFAULT): string {
  try {
    const url = href.startsWith("/") ? new URL(href, siteOrigin) : new URL(href);
    return `${url.pathname.replace(/\/+$/, "") || "/"}${url.hash}`;
  } catch {
    return href;
  }
}

/** Extract every internal <a> with its effective label. */
export function extractInternalLinks(html: string, siteOrigin = SITE_DEFAULT): AnchorLink[] {
  const links: AnchorLink[] = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const tag = match[1] ?? "";
    const inner = match[2] ?? "";
    const href = attribute(`<a ${tag}>`, "href");
    if (!href || !isInternalHref(href, siteOrigin)) continue;
    // Links hidden from assistive tech are also hidden from the anchor-text
    // signal, so linting their label would be noise.
    if (/aria-hidden\s*=\s*("|')true\1/i.test(tag)) continue;
    // Citation / canonical links quote a URL on purpose — that *is* the label a
    // reader is meant to copy — and are exempt by opt-out attribute as well.
    const rel = attribute(`<a ${tag}>`, "rel")?.toLowerCase() ?? "";
    if (/\b(canonical|bookmark|license|nofollow)\b/.test(rel)) continue;
    if (attribute(`<a ${tag}>`, "data-anchor-lint") === "ignore") continue;

    const visible = normalize(htmlToText(inner));
    // Search engines fall back to aria-label / title / alt when a link's visible
    // text is terse, so an explicit accessible name counts as the anchor text.
    const ariaLabel = attribute(`<a ${tag}>`, "aria-label");
    const title = attribute(`<a ${tag}>`, "title");
    const imgTag = inner.match(/<img\b[^>]*>/i)?.[0] ?? null;
    // Icon/image links carry their label in alt text.
    const imgAlt = imgTag ? attribute(imgTag, "alt") : null;
    // A generic aria-label should never win over descriptive visible text.
    const ariaIsGeneric = Boolean(ariaLabel) && GENERIC_ANCHOR_TEXT.has(compareKey(ariaLabel!));
    const label =
      (ariaIsGeneric ? visible || ariaLabel : ariaLabel || visible) || title || imgAlt || "";
    links.push({
      href,
      text: label,
      fromAttribute: (!ariaIsGeneric && Boolean(ariaLabel)) || (!visible && Boolean(label)),
      visible,
      ariaLabel,
      title,
      imgAlt,
    });
  }
  return links;
}

/** Lint every internal link on one rendered page. */
export function lintAnchorText(html: string, options: AnchorLintOptions = {}): AnchorLintResult {
  const siteOrigin = options.siteOrigin ?? SITE_DEFAULT;
  const minLength = options.minLength ?? 4;
  const allow = new Set([...DEFAULT_ALLOW, ...(options.allow ?? [])].map(compareKey));

  const links = extractInternalLinks(html, siteOrigin);
  const issues: AnchorIssue[] = [];
  const byText = new Map<string, Set<string>>();

  const checkA11y = options.accessibility !== false;

  for (const link of links) {
    const text = link.text;
    const key = compareKey(text);
    const target = internalTarget(link.href, siteOrigin);

    if (!key) {
      issues.push({
        code: "empty-anchor-text",
        href: link.href,
        text,
        detail: "link has no visible text, aria-label, title or image alt",
      });
      continue;
    }

    if (checkA11y) {
      const visibleKey = compareKey(link.visible);
      const ariaKey = link.ariaLabel ? compareKey(link.ariaLabel) : "";
      const visibleGeneric = !visibleKey || GENERIC_ANCHOR_TEXT.has(visibleKey);
      const ariaGeneric = Boolean(ariaKey) && GENERIC_ANCHOR_TEXT.has(ariaKey);

      if (ariaGeneric) {
        issues.push({
          code: "generic-aria-label",
          href: link.href,
          text: link.ariaLabel ?? "",
          detail: `aria-label "${link.ariaLabel}" is generic; name the destination instead`,
        });
        continue;
      }
      // An icon-only link that leans on title/alt has no reliable accessible
      // name: screen readers and crawlers both need an explicit aria-label.
      if (!visibleKey && !ariaKey) {
        issues.push({
          code: "missing-aria-label",
          href: link.href,
          text,
          detail: `link has no visible text and no aria-label (falls back to ${
            link.imgAlt ? "image alt" : "title"
          })`,
        });
        continue;
      }
      // WCAG 2.5.3 label-in-name: a spoken name that omits the visible words
      // breaks voice control and disagrees with the crawled anchor text.
      if (
        ariaKey &&
        visibleKey &&
        !visibleGeneric &&
        !CTA_VISIBLE_TEXT.has(visibleKey) &&
        !ariaKey.includes(visibleKey) &&
        visibleKey.length >= minLength
      ) {
        issues.push({
          code: "aria-label-mismatch",
          href: link.href,
          text: link.ariaLabel ?? "",
          detail: `aria-label "${link.ariaLabel}" does not contain the visible text "${link.visible}"`,
        });
        continue;
      }
    }

    if (GENERIC_ANCHOR_TEXT.has(key)) {
      issues.push({
        code: "generic-anchor-text",
        href: link.href,
        text,
        detail: `"${text}" says nothing about the destination`,
      });
      continue;
    }
    // A link whose label *is* its own URL is a citation the reader can copy;
    // a URL label pointing somewhere else is just lazy anchor text.
    const labelIsOwnUrl = compareKey(link.href) === key;
    if (/^https?:\/\/|^www\./i.test(key) && !labelIsOwnUrl) {
      issues.push({
        code: "url-as-anchor-text",
        href: link.href,
        text,
        detail: "raw URLs make poor anchor text; describe the destination instead",
      });
      continue;
    }
    // Short compound abbreviations (EPA, NMN, HCG) are descriptive names.
    const raw = normalize(text);
    const isAbbreviation = /^[A-Za-z0-9][A-Za-z0-9.-]{1,5}$/.test(raw) && /[A-Z0-9]/.test(raw);
    if (key.length < minLength && !allow.has(key) && !isAbbreviation) {
      issues.push({
        code: "too-short-anchor-text",
        href: link.href,
        text,
        detail: `"${text}" is shorter than ${minLength} characters and not navigation chrome`,
      });
      continue;
    }

    if (!allow.has(key)) {
      const targets = byText.get(key) ?? new Set<string>();
      targets.add(target);
      byText.set(key, targets);
    }
  }

  for (const [key, targets] of byText) {
    if (targets.size > 1) {
      issues.push({
        code: "inconsistent-anchor-text",
        href: [...targets].sort().join(" , "),
        text: key,
        detail: `same anchor text points at ${targets.size} different destinations on this page`,
      });
    }
  }

  return { links, issues, ok: issues.length === 0 };
}
