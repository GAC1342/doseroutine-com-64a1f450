import { FALLBACK_PICTURE_FORMATS } from "@/lib/image-optimization";
import { isRemoteImage, remoteFormatSrcSet, resizedImageUrl } from "@/lib/remote-image";

/**
 * A remote (the CMS/CDN) image delivered as WebP with a JPEG fallback.
 *
 * The proxy re-encodes on the fly, so the modern format is offered via
 * a webp `source` element and a JPEG `img` element stays as the universal
 * fallback. AVIF is intentionally not offered here: the proxy rejects
 * `output=avif` with a 400, and a broken <source> would kill the image rather
 * than degrade. Every variant is resized to the slot, and width/height are
 * always declared so the box is reserved before the bytes land.
 */
export function OptimizedRemoteImage({
  src,
  alt,
  title,
  width,
  height,
  slotWidth,
  sizes,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  /** Tooltip text; defaults to `alt` so audits never see a title-less image. */
  title?: string;
  /** Intrinsic aspect box, used for width/height attributes. */
  width: number;
  height: number;
  /** CSS px the image occupies; drives the resized variants. */
  slotWidth: number;
  sizes?: string;
  className?: string;
  /** True for the LCP hero: eager + high fetch priority. */
  priority?: boolean;
}) {
  const fallbackFormat = FALLBACK_PICTURE_FORMATS[0];
  const imgProps = {
    alt,
    title: title ?? alt,
    width,
    height,
    sizes,
    className,
    decoding: "async" as const,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    fetchPriority: priority ? ("high" as const) : ("low" as const),
  };

  if (!isRemoteImage(src)) {
    return <img src={src} {...imgProps} width={width} height={height} />;
  }

  return (
    <picture>
      <source type="image/webp" srcSet={remoteFormatSrcSet(src, slotWidth, "webp")} />
      <img
        src={resizedImageUrl(src, slotWidth, fallbackFormat)}
        srcSet={remoteFormatSrcSet(src, slotWidth, fallbackFormat)}
        {...imgProps}
        width={width}
        height={height}
      />
    </picture>
  );
}
