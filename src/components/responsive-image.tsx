/**
 * ResponsiveImage
 *
 * A thin <picture> wrapper for content imagery. It exists so every non-avatar
 * image on the marketing/library side ships the same four things:
 *
 *  1. a WebP source set (modern browsers download ~60–70% fewer bytes),
 *  2. an original-format fallback so nothing breaks on old browsers,
 *  3. explicit width/height so the box is reserved before decode (no CLS),
 *  4. lazy loading by default — callers opt into eager for the LCP image only.
 *
 * `alt` is required and typed as a plain string. Decorative images should pass
 * alt="" explicitly, which keeps screen readers from announcing them.
 */
import { cn } from "@/lib/utils";

export type ResponsiveImageProps = {
  /** Fallback src in the original format (jpg/png). Always downloaded by old browsers. */
  src: string;
  /** WebP candidates, e.g. "/og/hero-640.webp 640w, /og/hero-1200.webp 1200w". */
  webpSrcSet: string;
  /** Optional fallback-format candidates in the same `w` syntax. */
  fallbackSrcSet?: string;
  /**
   * Layout hint telling the browser how wide the image renders before CSS loads.
   * Get this right or the browser over-downloads — it defaults to 100vw.
   */
  sizes?: string;
  /** Descriptive alternative text. Pass "" only for purely decorative images. */
  alt: string;
  /** Intrinsic width of the fallback file, in px. */
  width: number;
  /** Intrinsic height of the fallback file, in px. */
  height: number;
  /** Defaults to lazy; use "eager" for an above-the-fold LCP image. */
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  className?: string;
  /** Applied to the wrapping <picture>, useful for aspect-ratio boxes. */
  pictureClassName?: string;
};

export function ResponsiveImage({
  src,
  webpSrcSet,
  fallbackSrcSet,
  sizes = "100vw",
  alt,
  width,
  height,
  loading = "lazy",
  fetchPriority,
  className,
  pictureClassName,
}: ResponsiveImageProps) {
  return (
    <picture className={pictureClassName}>
      <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
      {fallbackSrcSet && <source srcSet={fallbackSrcSet} sizes={sizes} />}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority ?? (loading === "eager" ? "high" : "auto")}
        className={cn("block h-auto w-full", className)}
      />
    </picture>
  );
}
