/**
 * Tiny image warming helper.
 *
 * The illustration modal shows the *same* file as its thumbnail, so the only
 * thing that makes a modal feel slow is opening it before that file has been
 * fetched and decoded. Warming on intent (pointer enter / focus / touch start)
 * gives the browser the ~100-200ms it needs while the user is still reaching
 * for the control, so the dialog paints its image on the first frame instead
 * of flashing empty and then reflowing.
 *
 * Deliberately not a React hook: it must be callable from event handlers and
 * must dedupe globally, since the same illustration appears in several lists.
 */

import { useCallback, useRef } from "react";

type WarmState = "pending" | "ready" | "failed";

/**
 * Session-wide registry. Parked on `window` so hot-module replacement (and any
 * duplicate copy of this module in a dev graph) shares one map instead of
 * silently keeping separate caches.
 */
const warmed: Map<string, WarmState> =
  typeof window === "undefined"
    ? new Map()
    : ((window as unknown as { __imageWarmed?: Map<string, WarmState> }).__imageWarmed ??=
        new Map());

/**
 * Fetches and decodes `src` once per session. Decoding matters as much as
 * fetching: an image that is downloaded but not decoded still costs a frame
 * when it first paints, which is exactly the modal-open frame.
 */
export function warmImage(input: string | null | undefined): void {
  if (!input || typeof window === "undefined") return;
  // Key on the resolved URL: the same file arrives as a bundler-relative path
  // in one place and an absolute URL in another, and those must not warm twice.
  const src = resolveSrc(input)!;
  if (warmed.has(src)) return;
  warmed.set(src, "pending");

  const img = new Image();
  img.decoding = "async";
  // Intent-driven, so it should not compete with the LCP image.
  img.fetchPriority = "low";
  img.src = src;

  const done = (state: WarmState) => () => warmed.set(src, state);
  if (typeof img.decode === "function") {
    img.decode().then(done("ready"), done("failed"));
  } else {
    img.onload = done("ready");
    img.onerror = done("failed");
  }
}

/** Normalises a src to an absolute URL so every caller shares one cache key. */
function resolveSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (typeof window === "undefined") return src;
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

/** True once the image has been fetched and decoded in this session. */
export function isImageWarm(src: string | null | undefined): boolean {
  const key = resolveSrc(src);
  return Boolean(key) && warmed.get(key!) === "ready";
}

/** Raw state, exposed for tests/diagnostics ("pending" | "ready" | "failed"). */
export function imageWarmState(src: string | null | undefined): WarmState | "cold" {
  const key = resolveSrc(src);
  if (!key) return "cold";
  return warmed.get(key) ?? "cold";
}

/**
 * Event props to spread on a trigger so the image warms on any signal that the
 * user is about to open it — hover, keyboard focus and the touch that precedes
 * a tap (touchstart fires ~100ms before click on mobile).
 *
 * Prefer {@link useWarmOnIntentRef} on touch-first surfaces: React delegates
 * these handlers from the root container, so they run a full bubble later than
 * a native listener bound to the element itself.
 */
export function warmOnIntent(src: string | null | undefined) {
  const warm = () => warmImage(src);
  return {
    onPointerEnter: warm,
    onPointerDown: warm,
    onTouchStart: warm,
    onFocus: warm,
  };
}

/**
 * iOS Safari-optimized intent warming.
 *
 * Why native listeners instead of React props:
 *   - React delegates every handler to the root container, so `onTouchStart`
 *     only runs once the event has bubbled the whole tree. Binding in the
 *     *capture* phase on the element itself is the earliest moment the page
 *     can know a finger landed, and on iOS that head start is the whole
 *     budget — `touchstart` precedes the synthesised `click` by ~100-300ms.
 *   - `{ passive: true }` guarantees Safari never treats the listener as a
 *     potential scroll blocker, so warming can't cost scroll smoothness.
 *   - iOS never fires `pointerenter`/`mouseover` before a first tap, so hover
 *     warming (the desktop path) does nothing there; `touchstart` and
 *     `pointerdown` are the only pre-tap signals that exist.
 *
 * Returns a ref callback: attach it to the trigger element. Listeners are
 * removed when the node unmounts or the src changes.
 */
export function useWarmOnIntentRef(src: string | null | undefined) {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback(
    (node: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (!node || !src) return;

      const warm = () => warmImage(src);
      // Capture + passive: fires before any bubbling handler and never blocks
      // scrolling. `touchstart` is the iOS pre-tap signal; `pointerdown`
      // covers Android/desktop pens and mice; hover/focus cover desktop.
      const opts: AddEventListenerOptions = { capture: true, passive: true };
      const events = ["touchstart", "pointerdown", "pointerenter", "focusin"] as const;
      for (const type of events) node.addEventListener(type, warm, opts);
      // Marker so e2e can assert the native binding exists (and didn't get
      // silently dropped by a cloneElement ref collision).
      node.dataset.warmIntent = "bound";

      cleanupRef.current = () => {
        for (const type of events) node.removeEventListener(type, warm, opts);
        delete node.dataset.warmIntent;
      };
    },
    [src],
  );
}

/** Test/debug hook: forget everything warmed so far. */
export function resetWarmedImages(): void {
  warmed.clear();
}

// Test-only bridge so end-to-end suites can assert that a tap actually warmed
// the file (and therefore that the modal opens from cache). Read-only.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__imageWarm = {
    state: imageWarmState,
    isWarm: isImageWarm,
    reset: resetWarmedImages,
  };
}
