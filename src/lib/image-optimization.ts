/**
 * Image optimization rules for /articles pages.
 *
 * Two audiences use this module:
 *  - the static lint (src/routes/__tests__/articles-images.test.ts) reads JSX
 *    source and checks every <img> declares the attributes below;
 *  - the browser check (e2e/articles-images.spec.ts) measures what actually
 *    rendered and flags oversized downloads, missing dimensions, or a hero
 *    that lazy-loads (which delays LCP).
 *
 * Everything here is pure so both can share one definition of "optimized".
 */

/** Attributes every content <img> must declare in source. */
export const REQUIRED_IMG_ATTRS = ["alt", "width", "height", "loading", "decoding"] as const;

/** Raster formats allowed for content imagery. GIF/BMP/TIFF are rejected. */
export const ALLOWED_IMAGE_EXTENSIONS = [".webp", ".avif", ".png", ".jpg", ".jpeg", ".svg"];

/** Formats that must ship a modern (webp/avif) sibling when used inline. */
export const LEGACY_RASTER_EXTENSIONS = [".png", ".jpg", ".jpeg"];

/** Social cards are fixed at 1200x630 and must stay small enough to fetch fast. */
export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;
export const OG_CARD_MAX_BYTES = 300_000;

/**
 * How much larger than its rendered CSS box (times DPR) a downloaded image may
 * be before it counts as wasted bytes.
 */
export const MAX_OVERSIZE_RATIO = 2;

/** Total image weight a single /articles page may download, in bytes. */
export const MAX_PAGE_IMAGE_BYTES = 600_000;

export type ImgTagAudit = {
  /** The raw JSX tag, trimmed for error messages. */
  tag: string;
  missing: string[];
  problems: string[];
};

/** Pulls every `<img ...>` / `<img ... />` JSX tag out of a source file. */
export function extractImgTags(source: string): string[] {
  const tags: string[] = [];
  const re = /<img\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    // Walk forward to the tag's closing `>`, tracking JSX brace depth so an
    // expression like className={cn("a>b")} doesn't end the tag early.
    let depth = 0;
    let i = match.index + 4;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      else if (ch === ">" && depth === 0) break;
    }
    tags.push(source.slice(match.index, i + 1));
  }
  return tags;
}

function hasAttr(tag: string, attr: string): boolean {
  return new RegExp(`(^|\\s)${attr}(=|\\s|/|>)`).test(tag);
}

/**
 * Audits a single JSX <img> tag. `sizes`/`srcSet` are required only when the
 * image is fluid — a fixed-size thumbnail with width/height doesn't need them.
 */
export function auditImgTag(tag: string): ImgTagAudit {
  const missing = REQUIRED_IMG_ATTRS.filter((attr) => !hasAttr(tag, attr));
  const problems: string[] = [];

  if (/\balt=\{?["']?\s*["']?\}?/.test(tag) === false && hasAttr(tag, "alt") === false) {
    problems.push('alt must be present (use alt="" for decorative images)');
  }
  if (
    hasAttr(tag, "loading") &&
    /loading=["']eager["']/.test(tag) &&
    hasAttr(tag, "fetchPriority") === false
  ) {
    problems.push("eager images should also set fetchPriority for LCP");
  }
  // A fluid image (w-full / 100vw) needs a sizes hint, otherwise the browser
  // assumes 100vw and over-downloads on phones.
  const isFluid = /w-full/.test(tag);
  if (isFluid && !hasAttr(tag, "sizes")) {
    problems.push("full-width images must declare sizes");
  }

  return { tag: tag.replace(/\s+/g, " ").slice(0, 160), missing, problems };
}

export type RenderedImage = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  loading: string | null;
  decoding: string | null;
  alt: string | null;
  hasDimensions: boolean;
  aboveFold: boolean;
  transferBytes?: number;
  fetchPriority?: string | null;
  /** True when the element sits inside the article body (LCP candidate). */
  isHero?: boolean;
};

/** Runtime audit of one rendered <img>; returns human-readable failures. */
export function auditRenderedImage(image: RenderedImage, dpr = 2): string[] {
  const issues: string[] = [];
  const parsed = new URL(image.src, "https://doseroutine.com");
  const ext = parsed.pathname.toLowerCase();
  // Resizing proxies encode the delivered format in a query param rather than
  // the path (…?output=webp), so honour that before judging the extension.
  const declaredFormat = (
    parsed.searchParams.get("output") ??
    parsed.searchParams.get("format") ??
    ""
  ).toLowerCase();

  if (image.alt === null) issues.push("missing alt attribute");
  if (!image.hasDimensions) issues.push("missing width/height (causes layout shift)");
  if (image.decoding !== "async") issues.push(`decoding="${image.decoding}" (expected async)`);

  if (image.aboveFold) {
    if (image.loading === "lazy") issues.push("above-the-fold image is lazy-loaded (delays LCP)");
  } else if (image.loading !== "lazy") {
    issues.push("below-the-fold image is not lazy-loaded");
  }

  const formatOk = declaredFormat
    ? ALLOWED_IMAGE_EXTENSIONS.includes(`.${declaredFormat}`)
    : ALLOWED_IMAGE_EXTENSIONS.some((allowed) => ext.endsWith(allowed));
  if (!formatOk) {
    issues.push(`unsupported image format: ${declaredFormat || ext}`);
  }

  if (image.displayWidth > 0 && image.naturalWidth > 0) {
    const ratio = image.naturalWidth / (image.displayWidth * dpr);
    if (ratio > MAX_OVERSIZE_RATIO) {
      issues.push(
        `downloads ${image.naturalWidth}px for a ${Math.round(image.displayWidth)}px box ` +
          `(${ratio.toFixed(1)}x oversized)`,
      );
    }
  }

  return issues;
}

/** Formats a page-level report so test failures name the exact image. */
export function formatImageReport(url: string, entries: Array<[string, string[]]>): string {
  return [
    `${url} has unoptimized images:`,
    ...entries.map(([src, issues]) => `  - ${src}\n      ${issues.join("\n      ")}`),
  ].join("\n");
}

/* ------------------------------------------------------------------------ *
 * Loading strategy: which images may lazy-load, and which must not.
 * ------------------------------------------------------------------------ */

/** Roles an article image can play; the hero is the LCP candidate. */
export type ImageRole = "hero" | "content" | "thumbnail";

export interface LoadingStrategy {
  role: ImageRole;
  loading: string | null;
  fetchPriority: string | null;
  decoding: string | null;
  /** Runtime only: was the image inside the first viewport? */
  aboveFold?: boolean;
}

/** Exactly one eager/high-priority image per page — more and they compete. */
export const MAX_EAGER_IMAGES_PER_PAGE = 1;

/**
 * Checks that a hero loads eagerly at high priority and everything else stays
 * lazy at low/auto priority. Below-the-fold images that load eagerly steal
 * bandwidth from the LCP; a lazy hero delays it outright.
 */
export function auditLoadingStrategy(image: LoadingStrategy): string[] {
  const issues: string[] = [];
  const loading = image.loading ?? "eager"; // the HTML default
  const priority = (image.fetchPriority ?? "auto").toLowerCase();

  if (image.role === "hero") {
    if (loading !== "eager") {
      issues.push(`hero must use loading="eager" (found "${image.loading ?? "unset"}")`);
    }
    if (priority !== "high") {
      issues.push(`hero must use fetchPriority="high" (found "${priority}")`);
    }
  } else {
    if (loading !== "lazy") {
      issues.push(`${image.role} must use loading="lazy" (found "${image.loading ?? "unset"}")`);
    }
    if (priority === "high") {
      issues.push(`${image.role} must not claim fetchPriority="high"`);
    }
  }

  if (image.decoding !== "async") {
    issues.push(`decoding must be "async" (found "${image.decoding ?? "unset"}")`);
  }

  // Runtime cross-check: whatever the declared role, geometry must agree.
  if (image.aboveFold === true && loading === "lazy" && image.role === "hero") {
    issues.push("above-the-fold hero is lazy-loaded (delays LCP)");
  }
  if (image.aboveFold === false && priority === "high") {
    issues.push("below-the-fold image claims high fetch priority");
  }

  return issues;
}

/** Flags a page that marks more than one image as the LCP candidate. */
export function auditEagerCount(images: LoadingStrategy[]): string[] {
  const eager = images.filter((i) => (i.fetchPriority ?? "").toLowerCase() === "high");
  if (eager.length > MAX_EAGER_IMAGES_PER_PAGE) {
    return [
      `${eager.length} images claim fetchPriority="high"; only ${MAX_EAGER_IMAGES_PER_PAGE} may`,
    ];
  }
  return [];
}

/* ------------------------------------------------------------------------ *
 * Modern formats and their fallbacks.
 * ------------------------------------------------------------------------ */

/** Modern formats a <picture> must offer, best first. */
export const MODERN_PICTURE_FORMATS = ["avif", "webp"] as const;
/** Formats accepted as the universally-supported <img> fallback. */
export const FALLBACK_PICTURE_FORMATS = ["jpg", "jpeg", "png"] as const;

export const MIME_BY_FORMAT: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
};

export interface PictureSource {
  type: string | null;
  srcSet: string | null;
}

export interface PictureAuditInput {
  sources: PictureSource[];
  /** The <img> inside the <picture>. */
  fallbackSrc: string | null;
  fallbackFormat: string | null;
  decoding?: string | null;
  /**
   * Formats that MUST be offered as <source>. Defaults to every modern format.
   * Narrow it when the delivery pipeline genuinely cannot produce one — our
   * remote proxy, for example, cannot encode AVIF, and emitting a <source>
   * that 404s would break the image entirely rather than fall back.
   */
  requiredFormats?: readonly string[];
}

/**
 * Validates a <picture>: AVIF and WebP sources present, each carrying the
 * correct `type` and a non-empty srcSet, ordered best-format-first, and a
 * JPEG/PNG <img> fallback for browsers that support neither.
 */
export function auditPictureFormats(input: PictureAuditInput): string[] {
  const issues: string[] = [];
  const types = input.sources.map((s) => (s.type ?? "").toLowerCase());

  for (const format of input.requiredFormats ?? MODERN_PICTURE_FORMATS) {
    const mime = MIME_BY_FORMAT[format];
    const source = input.sources.find((s) => (s.type ?? "").toLowerCase() === mime);
    if (!source) {
      issues.push(`missing <source type="${mime}">`);
      continue;
    }
    if (!source.srcSet || source.srcSet.trim() === "") {
      issues.push(`<source type="${mime}"> has an empty srcSet`);
    }
  }

  const avifIndex = types.indexOf(MIME_BY_FORMAT["avif"]!);
  const webpIndex = types.indexOf(MIME_BY_FORMAT["webp"]!);
  if (avifIndex >= 0 && webpIndex >= 0 && avifIndex > webpIndex) {
    issues.push("AVIF <source> must come before WebP so browsers pick the smaller format");
  }

  for (const source of input.sources) {
    if (!source.type) issues.push("every <source> must declare a type attribute");
  }

  if (!input.fallbackSrc) {
    issues.push("<picture> has no <img> fallback");
  } else {
    const format = (input.fallbackFormat ?? "").toLowerCase();
    if (!FALLBACK_PICTURE_FORMATS.includes(format as (typeof FALLBACK_PICTURE_FORMATS)[number])) {
      issues.push(
        `<img> fallback is "${format || "unknown"}"; expected one of ${FALLBACK_PICTURE_FORMATS.join(", ")}`,
      );
    }
  }

  if (input.decoding !== undefined && input.decoding !== "async") {
    issues.push(`<picture> <img> must set decoding="async" (found "${input.decoding ?? "unset"}")`);
  }

  return issues;
}
