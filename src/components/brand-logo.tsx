import { assetUrl } from "@/lib/asset-url";

/**
 * Responsive brand mark.
 *
 * Serves AVIF first, WebP second and a small PNG as the universal fallback,
 * each with a `srcset` of pixel-density variants so 1x/2x/3x screens download
 * only what they render. Rendered dimensions are unchanged — the browser picks
 * the smallest file that still looks sharp at the given CSS box.
 */

// Width buckets available on disk (public/logo-<w>.{avif,webp}).
const BUCKETS = [32, 64, 96, 128, 224, 336] as const;

function pickBuckets(size: number): number[] {
  const wanted = [size, size * 2, size * 3];
  const picked = new Set<number>();
  for (const w of wanted) {
    const bucket = BUCKETS.find((b) => b >= w) ?? BUCKETS[BUCKETS.length - 1];
    picked.add(bucket);
  }
  return [...picked].sort((a, b) => a - b);
}

function srcSet(size: number, ext: "avif" | "webp"): string {
  return pickBuckets(size)
    .map((w) => `${assetUrl(`/logo-${w}.${ext}`)} ${w}w`)
    .join(", ");
}

export type BrandLogoProps = {
  /** Rendered CSS size in px (square). Drives the srcset density buckets. */
  size?: number;
  alt: string;
  /** Tooltip text; audits flag images without a title attribute. */
  title?: string;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ size = 32, alt, title, className, priority = false }: BrandLogoProps) {
  const sizes = `${size}px`;
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(size, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(size, "webp")} sizes={sizes} />
      <img
        src={assetUrl("/logo-64.png")}
        alt={alt}
        title={title ?? alt}
        width={size}
        height={size}
        sizes={sizes}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={className}
      />
    </picture>
  );
}

/** Preload descriptors for the above-the-fold logo, for a route `head().links`. */
export function brandLogoPreload(size = 32) {
  return {
    rel: "preload",
    as: "image",
    href: assetUrl(`/logo-${pickBuckets(size)[0]}.avif`),
    imageSrcSet: srcSet(size, "avif"),
    imageSizes: `${size}px`,
    type: "image/avif",
    fetchPriority: "high" as const,
  };
}

export { pickBuckets as __pickBuckets, srcSet as __srcSet };
