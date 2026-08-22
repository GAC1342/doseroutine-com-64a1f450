import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders `children` only once the placeholder scrolls near the viewport.
 *
 * Used for heavy, non-indexable widgets (charts) that otherwise hydrate during
 * the first paint and cause long tasks plus forced reflows. The visible copy
 * around them stays server-rendered — only the chart canvas waits.
 */
export function DeferUntilVisible({
  children,
  minHeight = 420,
  rootMargin = "300px",
  fallback,
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
  fallback?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver (very old browsers, some crawlers): render now.
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [rootMargin, show]);

  if (show) return <>{children}</>;

  return (
    <div ref={ref} style={{ minHeight }} aria-hidden="true">
      {fallback}
    </div>
  );
}

export default DeferUntilVisible;
