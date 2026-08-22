/**
 * Run non-critical work after the page has painted.
 *
 * Analytics, monitoring and pixels have no deadline, but if they start during
 * hydration they compete with the largest paint. `afterPaint` waits for the
 * browser to go idle (with a hard timeout so it always runs).
 */

export function afterPaint(fn: () => void, timeout = 2500): () => void {
  if (typeof window === "undefined") return () => {};

  let cancelled = false;
  const run = () => {
    if (!cancelled) fn();
  };

  const ric = (window as unknown as { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback;

  if (typeof ric === "function") {
    const handle = ric(run, { timeout });
    return () => {
      cancelled = true;
      (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(
        handle as unknown as number,
      );
    };
  }

  const handle = window.setTimeout(run, 200);
  return () => {
    cancelled = true;
    window.clearTimeout(handle);
  };
}

/**
 * Append a third-party script tag once, after paint. Returns a canceller.
 * Scripts already present (by src) are never added twice.
 */
export function loadScriptAfterPaint(src: string, attrs: Record<string, string> = {}): () => void {
  return afterPaint(() => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.head.appendChild(el);
  });
}
