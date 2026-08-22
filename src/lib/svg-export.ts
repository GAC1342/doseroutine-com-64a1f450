/**
 * Download an on-screen SVG as a standalone .svg or a high-resolution .png.
 *
 * The live diagrams paint with CSS classes and design tokens, so a plain
 * serialize would export an unstyled shape. We clone the node and inline the
 * *computed* paint properties, which keeps the exported file looking exactly
 * like what the user sees (including their accent color and light/dark mode).
 */

const PAINT_PROPS = [
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "opacity",
] as const;

function inlinePaint(source: SVGElement, clone: SVGElement) {
  const src = Array.from(source.querySelectorAll<SVGElement>("*"));
  const dst = Array.from(clone.querySelectorAll<SVGElement>("*"));
  const pairs: [SVGElement, SVGElement][] = [
    [source, clone],
    ...src.map((n, i) => [n, dst[i]] as [SVGElement, SVGElement]),
  ];

  for (const [from, to] of pairs) {
    if (!to) continue;
    const computed = getComputedStyle(from);
    const style = PAINT_PROPS.map((p) => `${p}:${computed.getPropertyValue(p)}`).join(";");
    to.setAttribute("style", style);
    to.removeAttribute("class");
  }
}

/** Serializes an on-screen SVG into standalone, self-contained markup. */
export function serializeSvg(el: SVGSVGElement, size?: { width: number; height: number }): string {
  const clone = el.cloneNode(true) as SVGSVGElement;
  inlinePaint(el, clone);

  const box = el.viewBox.baseVal;
  const width = size?.width ?? (box.width || el.clientWidth || 100);
  const height = size?.height ?? (box.height || el.clientHeight || 100);

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (box.width) clone.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Saves the diagram as a vector .svg — crisp at any size. */
export function downloadSvg(el: SVGSVGElement, filename: string) {
  const markup = serializeSvg(el);
  triggerDownload(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), filename);
}

/**
 * Rasterises the diagram at `scale`× its viewBox (default 6× → ~600x1200 for
 * the 100x200 body map) so it stays sharp on retina screens and in print.
 */
export async function downloadPng(
  el: SVGSVGElement,
  filename: string,
  opts: { scale?: number; background?: string } = {},
): Promise<void> {
  const scale = opts.scale ?? 6;
  const box = el.viewBox.baseVal;
  const baseW = box.width || el.clientWidth || 100;
  const baseH = box.height || el.clientHeight || 100;
  const markup = serializeSvg(el, { width: baseW, height: baseH });

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  const img = new Image();
  img.decoding = "sync";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not render the diagram"));
    img.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(baseW * scale);
  canvas.height = Math.round(baseH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not build the PNG");
  triggerDownload(blob, filename);
}
