import { devices, expect, type ConsoleMessage, type Page, type Request } from "@playwright/test";

/**
 * Shared helpers for the native (iOS/Android) smoke specs: device emulation,
 * a Capacitor shim, and fatal-signal capture/assertions.
 */

// Vite HMR chatter, devtools nags and SW noise are not launch failures.
export const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /Service Worker/i,
  /manifest.*(404|not found)/i,
  /favicon/i,
  // WebKit does not implement the interactive-widget viewport hint.
  /Viewport argument key/i,
  // React dev-mode advisory (not emitted in production builds).
  /perform a React state update on a component that hasn't mounted/i,
  // Intentional lowercase microdata attributes (itemscope/itemtype/itemprop)
  // kept verbatim for crawlers; React only warns about them in dev.
  /Invalid DOM property/i,
  // React 19 dev-only hydration notice for the `xmlns` attribute lucide-react
  // emits during SSR. Never reported in a production build.
  /A tree hydrated but some attributes[\s\S]*xmlns/i,
  // Report-only CSP violations are collected, not enforced.
  /\[Report Only\]/i,
  // WebKit logs advisories about the report-only CSP header itself
  // (`frame-ancestors` ignored, missing `report-to`). Enforcement-mode CSP is
  // served in production; these are dev-only diagnostics, not app errors.
  /Content Security Policy/i,
];

// Benign browser-level noise, mirroring src/lib/fatal-error-signal.ts: these
// never reach the user as a crash (aborted view transitions/fetches,
// ResizeObserver loop notices, stale chunk fetches after an HMR update).
export const IGNORED_ERROR_PATTERNS: RegExp[] = [
  // WebKit wording for a fetch the browser refused (blocked storage means no
  // auth token, so background refetches fail). The UI stays usable.
  /due to access control checks/i,
  /AbortError/i,
  /view transition/i,
  /ResizeObserver loop/i,
  /Load failed/i,
  // In-flight query aborted by a test-driven navigation.
  /Failed to fetch/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  // React recovered by itself (concurrent-render retry / hydration fallback):
  // the user still sees the correct UI. Mirrors src/lib/fatal-error-signal.ts.
  /React was able to recover/i,
  /error while hydrating/i,
  // Chromium advisory from the embedded Stripe iframe; not an app error.
  /Potential permissions policy violation/i,
  // Asset 404s from a marketing page that the guard redirects away from
  // before it finishes loading; response-level 5xx checks still apply.
  /Failed to load resource: the server responded with a status of 404/i,
  // A redirect (e.g. the native route guard) cancelled an in-flight query.
  // The app classifies these as cancellations and shows a pending state.
  /CancelledError/i,
];

export function isBenignError(text: string): boolean {
  return IGNORED_ERROR_PATTERNS.some((re) => re.test(text));
}

export type NativePlatform = "ios" | "android";

export type LaunchSignals = {
  pageErrors: string[];
  consoleErrors: string[];
  serverErrors: string[];
  crashed: boolean;
};

/**
 * Installs the Capacitor global before any app script evaluates so
 * `src/lib/platform.ts` and friends take the native branch — that branch is
 * exactly the one the web-only suite never exercised.
 */
export async function emulateNativeShell(page: Page, platform: NativePlatform): Promise<void> {
  await page.addInitScript((p) => {
    const win = window as unknown as Record<string, unknown>;
    // @capacitor/core rebuilds `window.Capacitor` on import and derives the
    // platform from the bridge globals / CapacitorCustomPlatform — setting
    // only `window.Capacitor` here would be overwritten and report "web".
    win["CapacitorCustomPlatform"] = { name: p, plugins: {} };
    if (p === "android") {
      win["androidBridge"] = { postMessage: () => {} };
    } else {
      win["webkit"] = { messageHandlers: { bridge: { postMessage: () => {} } } };
    }
    // Minimal shim: enough for getPlatform()/isNativePlatform() probes.
    // Plugin calls fall through to the web implementations.
    win["Capacitor"] = {
      platform: p,
      isNativePlatform: () => true,
      getPlatform: () => p,
      isPluginAvailable: () => false,
      convertFileSrc: (url: string) => url,
      Plugins: {},
    };
  }, platform);
}

/**
 * Simulates a native deep-link launch: the OS hands the app an
 * `https://doseroutine.com/<path>` universal link (iOS) / App Link (Android)
 * and Capacitor boots the webview straight at that path.
 *
 * The shim records the launch URL on `Capacitor.launchUrl` the same way the
 * runtime does, so any code that reads it takes the deep-link branch, and the
 * navigation itself lands the router on the deep-linked route rather than "/".
 */
export async function launchViaDeepLink(page: Page, path: string): Promise<void> {
  const url = new URL(path, "https://doseroutine.com").toString();
  await page.addInitScript((launchUrl) => {
    const cap = (window as unknown as Record<string, unknown>)["Capacitor"] as
      | Record<string, unknown>
      | undefined;
    if (cap) cap["launchUrl"] = launchUrl;
  }, url);

  // Cold start: full document load at the deep-linked path (not a client-side
  // navigation) — that is the surface where launch-time crashes show up.
  await expect(async () => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
  }).toPass({ timeout: 45_000 });
}

/**
 * Device characteristics without `defaultBrowserType` — Playwright refuses a
 * `test.use()` inside a describe group when it would force a new worker.
 * The engine comes from the project (mobile-safari = WebKit, chromium).
 */
export function deviceShape(name: "iPhone 13" | "Pixel 7") {
  const { defaultBrowserType: _engine, ...rest } = devices[name];
  return rest;
}

/** Starts collecting fatal signals on `page` (errors, console, 5xx, crash). */
export function watchLaunch(page: Page): LaunchSignals {
  const signals: LaunchSignals = {
    pageErrors: [],
    consoleErrors: [],
    serverErrors: [],
    crashed: false,
  };

  page.on("pageerror", (err) => {
    const text = String(err?.message ?? err);
    if (isBenignError(text)) return;
    signals.pageErrors.push(text);
  });
  page.on("crash", () => {
    signals.crashed = true;
  });
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text)) || isBenignError(text)) return;
    signals.consoleErrors.push(text);
  });
  page.on("response", (res) => {
    const type = (res.request() as Request).resourceType();
    if (res.status() >= 500 && (type === "document" || type === "script" || type === "fetch")) {
      signals.serverErrors.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });

  return signals;
}

/** Fails on the boundary fallback and the non-blocking recovery banner. */
export async function expectNoFatalUi(page: Page): Promise<void> {
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  await expect(page.getByText(/ran into an error/i)).toHaveCount(0);
}

export function assertClean(signals: LaunchSignals, phase = "launch"): void {
  expect(signals.crashed, `renderer crashed during ${phase}`).toBe(false);
  expect(signals.pageErrors, `uncaught errors / rejections during ${phase}`).toEqual([]);
  expect(signals.serverErrors, `5xx responses during ${phase}`).toEqual([]);
  expect(signals.consoleErrors, `console errors during ${phase}`).toEqual([]);
}

/**
 * In-page capture of uncaught errors and unhandled promise rejections.
 *
 * Playwright's `pageerror` event is engine-dependent for rejections (WebKit in
 * particular does not always surface them), so the permission specs install a
 * `window.onerror` / `unhandledrejection` collector before the first script
 * evaluates and read it back after the flow. Must be called BEFORE any
 * navigation on that page.
 */
const UNCAUGHT_KEY = "__doseUncaught";

export async function collectUncaught(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    const w = window as unknown as Record<string, unknown>;
    if (w[key]) return;
    const sink: string[] = [];
    w[key] = sink;
    window.addEventListener("error", (event) => {
      const err = (event as ErrorEvent).error;
      sink.push(`error: ${String((err && err.message) || (event as ErrorEvent).message || err)}`);
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = (event as PromiseRejectionEvent).reason;
      sink.push(
        `unhandledrejection: ${String((reason && (reason.message || reason.name)) || reason)}`,
      );
    });
  }, UNCAUGHT_KEY);
}

/** Reads the collected entries, dropping known-benign noise. */
export async function readUncaught(page: Page): Promise<string[]> {
  const entries = await page
    .evaluate(
      (key) => ((window as unknown as Record<string, string[]>)[key] ?? []) as string[],
      UNCAUGHT_KEY,
    )
    .catch(() => [] as string[]);
  return entries.filter((text) => !isBenignError(text));
}

/**
 * Asserts no uncaught error and no unhandled promise rejection was recorded.
 * Separated so failures name the flow that produced them.
 */
export async function expectNoUncaught(page: Page, phase = "flow"): Promise<void> {
  const entries = await readUncaught(page);
  expect(
    entries.filter((t) => t.startsWith("error:")),
    `uncaught errors during ${phase}`,
  ).toEqual([]);
  expect(
    entries.filter((t) => t.startsWith("unhandledrejection:")),
    `unhandled promise rejections during ${phase}`,
  ).toEqual([]);
}

/**
 * Notification permission state, as the OS reports it.
 *
 * Capacitor's LocalNotifications resolves through its web implementation in a
 * browser-emulated shell, and that implementation reads the Notification API —
 * so faking permission there drives exactly the same app code paths the
 * device does (priming card, denial card, Settings recovery).
 */
export type WebNotificationStub = {
  /** `Notification.permission`. */
  permission: NotificationPermission;
  /** What `requestPermission()` resolves to (defaults to `permission`). */
  onRequest?: NotificationPermission;
  /** Remove the API entirely — an unavailable/failed notification bridge. */
  unavailable?: boolean;
};

/** Installs the notification stub. MUST run before the first navigation. */
export async function stubWebNotifications(page: Page, stub: WebNotificationStub): Promise<void> {
  await page.addInitScript((spec: WebNotificationStub) => {
    if (spec.unavailable) {
      Object.defineProperty(window, "Notification", { configurable: true, value: undefined });
      return;
    }
    const ctor = function NotificationStub() {} as unknown as typeof window.Notification;
    Object.defineProperty(ctor, "permission", {
      configurable: true,
      get: () => spec.permission,
    });
    Object.defineProperty(ctor, "requestPermission", {
      configurable: true,
      value: async () => (spec.onRequest ?? spec.permission) as NotificationPermission,
    });
    Object.defineProperty(window, "Notification", { configurable: true, value: ctor });
  }, stub);
}

/** Shorthand: the user already tapped "Don't Allow". */
export async function denyWebNotifications(page: Page): Promise<void> {
  await stubWebNotifications(page, { permission: "denied" });
}

/**
 * Makes persistent storage unusable, the way iOS does in Lockdown/private
 * modes or when the data partition is full: every write throws
 * QuotaExceededError. Reads keep working so an existing session survives.
 */
export async function denyStorageWrites(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const name of ["localStorage", "sessionStorage"] as const) {
      const real = window[name];
      const blocked = {
        getItem: (k: string) => real.getItem(k),
        key: (i: number) => real.key(i),
        get length() {
          return real.length;
        },
        setItem: () => {
          throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        },
        removeItem: () => {
          throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        },
        clear: () => {
          throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        },
      };
      Object.defineProperty(window, name, { configurable: true, get: () => blocked });
    }
  });
}

/** Fails when the viewport is effectively blank (a white-screen launch). */
export async function expectNotBlank(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page
          .evaluate(() => (document.body?.innerText ?? "").replace(/\s+/g, " ").trim().length)
          .catch(() => 0),
      { timeout: 25_000, message: "app rendered a blank screen" },
    )
    .toBeGreaterThan(20);
}
