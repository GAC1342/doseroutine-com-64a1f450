import * as React from "react";

/**
 * Touch-friendly chart tooltips.
 *
 * Recharts only reveals tooltips on mouse events, so on phones a tap does
 * nothing and a drag just scrolls the page. This hook adds a press-and-hold
 * gesture: hold ~180ms on the chart, the page stops scrolling and the finger
 * scrubs the tooltip across the series. Lifting the finger keeps the value
 * readable for a moment, then clears it.
 */
const HOLD_MS = 180;
/** Finger travel (px) before a hold is treated as a page scroll instead. */
const CANCEL_SLOP = 12;
/** How long the tooltip lingers after the finger lifts. */
const LINGER_MS = 1400;

function synthesizeMouse(target: Element, type: string, x: number, y: number) {
  target.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }),
  );
}

export function useChartTouchScrub<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [scrubbing, setScrubbing] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === "undefined") return;
    if (!window.matchMedia?.("(hover: none)").matches) return;

    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let lingerTimer: ReturnType<typeof setTimeout> | null = null;
    let active = false;
    let start = { x: 0, y: 0 };

    const clearHold = () => {
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = null;
    };

    const end = (x: number, y: number) => {
      clearHold();
      if (!active) return;
      active = false;
      setScrubbing(false);
      lingerTimer = setTimeout(() => {
        synthesizeMouse(node, "mouseleave", x, y);
      }, LINGER_MS);
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || e.touches.length > 1) return;
      if (lingerTimer) clearTimeout(lingerTimer);
      start = { x: t.clientX, y: t.clientY };
      clearHold();
      holdTimer = setTimeout(() => {
        active = true;
        setScrubbing(true);
        navigator.vibrate?.(8);
        synthesizeMouse(node, "mousemove", start.x, start.y);
      }, HOLD_MS);
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (!active) {
        const moved =
          Math.abs(t.clientX - start.x) > CANCEL_SLOP || Math.abs(t.clientY - start.y) > CANCEL_SLOP;
        if (moved) clearHold();
        return;
      }
      // Own the gesture: keep the page still while scrubbing values.
      if (e.cancelable) e.preventDefault();
      synthesizeMouse(node, "mousemove", t.clientX, t.clientY);
    };

    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      end(t?.clientX ?? start.x, t?.clientY ?? start.y);
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      clearHold();
      if (lingerTimer) clearTimeout(lingerTimer);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return { ref, scrubbing };
}
