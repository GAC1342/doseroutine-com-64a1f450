/**
 * Global runtime-error signal.
 *
 * React error boundaries only catch errors thrown during render, lifecycle or
 * effects. Errors thrown in event handlers, timers, and rejected promises
 * escape React entirely: they get reported to the health monitor, but the user
 * is left staring at a UI that silently stopped working (a button that does
 * nothing, a sheet that never opens).
 *
 * This module turns those escaped errors into a signal the app can render a
 * safe fallback for. It only handles the *UI* side — reporting stays in
 * `client-error-monitor.ts`, which installs its own listeners.
 */

import { isBenignRouterRejection } from "./benign-rejection";

export type GlobalErrorSource = "uncaught" | "unhandledrejection";

export type GlobalErrorEvent = {
  source: GlobalErrorSource;
  message: string;
  at: number;
};

type Listener = (event: GlobalErrorEvent) => void;

const listeners = new Set<Listener>();
let installed = false;
let lastMessage = "";
let lastAt = 0;

/**
 * Noise that must never surface a fallback UI:
 *  - stale-chunk failures already trigger a one-shot reload in `router.tsx`
 *  - ResizeObserver loop warnings are benign and fire on ordinary layout work
 *  - aborted fetches/navigations happen whenever a user leaves a page early
 *  - cross-origin "Script error." carries no actionable detail
 */
const IGNORED = [
  // React reports *recovered* rendering/hydration problems through
  // `reportError`, which reaches this window listener even though the UI
  // rendered fine (it re-rendered on the client instead). Surfacing the
  // "Something didn't work" banner there scares users for a non-issue —
  // most visibly right after the native route guard redirects to /today.
  /React was able to recover/i,
  /error while hydrating/i,
  // React re-renders the subtree on the client after a hydration mismatch, so
  // the user still sees correct UI. Dev builds report it through this wording
  // (e.g. the lucide `xmlns` attribute); prod uses the minified codes below.
  /Hydration failed because the server rendered/i,
  /Text content does not match server-rendered HTML/i,
  /Minified React error #(418|421|423|425)\b/i,

  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
  // Router-internal preload race (a preloaded match discarded by a redirect).
  /_nonReactive/,
  /ResizeObserver loop/i,
  /\bAbortError\b/i,
  /The operation was aborted/i,
  /^Script error\.?$/i,
  /Non-Error promise rejection captured/i,
  // Extensions and injected third-party scripts, not our code.
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
];

export function isIgnoredRuntimeError(message: string): boolean {
  if (!message.trim()) return true;
  return IGNORED.some((re) => re.test(message));
}

function messageOf(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  const maybe = value as { message?: unknown };
  if (typeof maybe.message === "string") return maybe.message;
  try {
    return JSON.stringify(value).slice(0, 300);
  } catch {
    return "Unknown error";
  }
}

/** Broadcast a runtime error to subscribers. Exported for tests and manual use. */
export function emitGlobalError(source: GlobalErrorSource, error: unknown): void {
  const message = messageOf(error);
  if (isIgnoredRuntimeError(message)) return;

  const now = Date.now();
  // A single broken interaction often throws repeatedly (re-render loops,
  // retrying fetches). Collapse bursts so the fallback appears once.
  if (message === lastMessage && now - lastAt < 5_000) return;
  lastMessage = message;
  lastAt = now;

  const event: GlobalErrorEvent = { source, message, at: now };
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      /* a broken listener must never break error handling */
    }
  }
}

export function subscribeToGlobalErrors(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Install window listeners. Idempotent and safe on every mount. */
export function initGlobalErrorSignal(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    // Resource load failures (img/script/link) surface with the element as the
    // target and no `error`; they are logged, not fatal to the whole UI.
    const target = event.target as (HTMLElement & { tagName?: string }) | null;
    if (target && target !== (window as unknown as EventTarget) && target.tagName) return;
    emitGlobalError("uncaught", event.error ?? event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    // Superseded router transitions are expected on native warm-start deep
    // links; they must not trip the fatal-crash UI.
    if (isBenignRouterRejection(event.reason)) return;
    emitGlobalError("unhandledrejection", event.reason);
  });
}

/** Test-only reset. */
export function __resetGlobalErrorSignal(): void {
  listeners.clear();
  installed = false;
  lastMessage = "";
  lastAt = 0;
}
