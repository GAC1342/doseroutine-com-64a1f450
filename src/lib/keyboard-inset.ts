/**
 * L4 — single source of truth for the on-screen keyboard inset.
 *
 * Sets `--keyboard-inset` on <html> so layouts can reserve space without
 * scrolling the focused field (which causes a Safari predictive-text feedback
 * loop).
 *
 * Two signals, best available wins:
 *   1. Capacitor's Keyboard plugin, when the native runtime exposes it. It
 *      reports the real keyboard height, which stays correct with external,
 *      split and floating keyboards where visualViewport does not.
 *   2. `window.visualViewport`, the web fallback used everywhere else.
 *
 * The plugin is read off the Capacitor runtime registry rather than imported,
 * so no extra dependency is required and web builds are unaffected.
 */

type KeyboardPluginEvent = { keyboardHeight?: number };
type CapacitorKeyboardPlugin = {
  addListener: (
    event: string,
    cb: (info: KeyboardPluginEvent) => void,
  ) => Promise<{ remove: () => void }> | { remove: () => void };
};

const CSS_VAR = "--keyboard-inset";

function setInset(px: number) {
  const inset = Math.max(0, Math.round(px));
  document.documentElement.style.setProperty(CSS_VAR, `${inset}px`);
  document.documentElement.toggleAttribute("data-keyboard-open", inset > 0);
}

function nativeKeyboardPlugin(): CapacitorKeyboardPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor;
  const plugin = cap?.Plugins?.["Keyboard"] as CapacitorKeyboardPlugin | undefined;
  return plugin && typeof plugin.addListener === "function" ? plugin : null;
}

/**
 * Reference-counted so the app-wide tracker (mounted once in the root layout)
 * and any per-route caller can coexist without fighting over the variable.
 */
let refCount = 0;
let activeCleanup: (() => void) | null = null;

/** Start syncing. Returns a cleanup function that also clears the variable. */
export function trackKeyboardInset(): () => void {
  if (typeof window === "undefined") return () => {};

  refCount += 1;
  if (refCount > 1) {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      refCount -= 1;
      if (refCount === 0 && activeCleanup) {
        activeCleanup();
        activeCleanup = null;
      }
    };
  }

  const disposers: Array<() => void> = [];
  const plugin = nativeKeyboardPlugin();
  const viewport = window.visualViewport;
  let nativeInset = 0;
  let viewportInset = 0;
  let active = true;

  const publishInset = () => setInset(Math.max(nativeInset, viewportInset));
  const syncViewport = () => {
    if (!viewport) return;
    viewportInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    publishInset();
  };

  // Some native keyboards do not emit plugin events, so visualViewport stays
  // attached as a complementary fallback instead of an either/or fallback.
  if (viewport) {
    viewport.addEventListener("resize", syncViewport);
    viewport.addEventListener("scroll", syncViewport);
    disposers.push(() => {
      viewport.removeEventListener("resize", syncViewport);
      viewport.removeEventListener("scroll", syncViewport);
    });
  }

  // Preserve an already-open keyboard during route transitions.
  syncViewport();

  if (plugin) {
    const attach = async (event: string, height: (info: KeyboardPluginEvent) => number) => {
      try {
        const handle = await plugin.addListener(event, (info) => {
          nativeInset = Math.max(0, height(info));
          syncViewport();
          publishInset();
        });
        if (!active) {
          handle.remove();
          return;
        }
        disposers.push(() => {
          try {
            handle.remove();
          } catch {
            /* already removed */
          }
        });
      } catch {
        /* plugin unavailable on this platform */
      }
    };
    void attach("keyboardWillShow", (info) => info.keyboardHeight ?? 0);
    void attach("keyboardDidShow", (info) => info.keyboardHeight ?? 0);
    void attach("keyboardWillHide", () => 0);
    void attach("keyboardDidHide", () => 0);
  }

  activeCleanup = () => {
    active = false;
    disposers.forEach((d) => d());
    document.documentElement.style.removeProperty(CSS_VAR);
    document.documentElement.removeAttribute("data-keyboard-open");
  };

  let released = false;
  return () => {
    if (released) return;
    released = true;
    refCount -= 1;
    if (refCount === 0 && activeCleanup) {
      activeCleanup();
      activeCleanup = null;
    }
  };
}
