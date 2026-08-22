/**
 * ATT / IDFA readiness checks — build-time guard only.
 *
 * App Review asks one binary question at submission: "Does this app use the
 * Advertising Identifier (IDFA)?" Answering it correctly requires knowing three
 * things that live in different places — the shipped Info.plist, the dependency
 * list, and what actually loaded inside the running WebView.
 *
 * H4 — nothing in the app imports this module: the former `/debug/att` screen
 * was removed so no diagnostics UI ships in the review binary. The checks now
 * run in CI via `src/lib/__tests__/att-readiness.test.ts`, which fails the
 * build if an advertising/attribution SDK or tracking plist key ever appears.
 */

import plistRaw from "../../ios/App/App/Info.plist?raw";
import packageRaw from "../../package.json?raw";
import { getPlatform, type NativePlatform } from "./platform";

export type CheckStatus = "pass" | "fail" | "warn" | "info";

export type AttCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** What to do if this check is not passing. */
  remedy?: string;
};

/** npm packages that request, read, or transmit the IDFA. */
const IDFA_SDK_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /(^|\/)@?capacitor-community\/admob/i, name: "AdMob" },
  { pattern: /google-mobile-ads|react-native-google-mobile-ads/i, name: "Google Mobile Ads" },
  {
    pattern: /app-tracking-transparency|@capacitor-community\/app-tracking/i,
    name: "App Tracking Transparency",
  },
  { pattern: /appsflyer/i, name: "AppsFlyer" },
  { pattern: /adjust/i, name: "Adjust" },
  { pattern: /branch-sdk|branch-io|react-native-branch/i, name: "Branch" },
  { pattern: /facebook-(sdk|ads|login)|react-native-fbsdk/i, name: "Facebook SDK" },
  { pattern: /singular-sdk/i, name: "Singular" },
  { pattern: /tenjin/i, name: "Tenjin" },
  { pattern: /idfa/i, name: "IDFA plugin" },
];

/** Browser globals that ad/attribution scripts install. */
const IDFA_GLOBALS: { key: string; name: string }[] = [
  { key: "fbq", name: "Meta Pixel" },
  { key: "AppsFlyer", name: "AppsFlyer web SDK" },
  { key: "AF", name: "AppsFlyer web SDK" },
  { key: "adsbygoogle", name: "Google AdSense" },
  { key: "googletag", name: "Google Publisher Tag" },
  { key: "ttq", name: "TikTok Pixel" },
  { key: "_linkedin_partner_id", name: "LinkedIn Insight" },
];

/** Usage-description keys the app legitimately needs, with a plain reason. */
const EXPECTED_USAGE_KEYS: { key: string; reason: string }[] = [
  { key: "NSCameraUsageDescription", reason: "Barcode and meal photo scanning" },
  { key: "NSPhotoLibraryUsageDescription", reason: "Choosing an existing meal photo" },
  { key: "NSHealthShareUsageDescription", reason: "Reading workouts and body metrics" },
  { key: "NSHealthUpdateUsageDescription", reason: "Writing workouts back to Health" },
];

const TRACKING_USAGE_KEY = "NSUserTrackingUsageDescription";

export function plistHasKey(key: string): boolean {
  return new RegExp(`<key>\\s*${key}\\s*</key>`).test(plistRaw);
}

export function plistStringValue(key: string): string | null {
  const match = plistRaw.match(
    new RegExp(`<key>\\s*${key}\\s*</key>\\s*<string>([\\s\\S]*?)</string>`),
  );
  return match ? match[1]!.trim() : null;
}

export function declaredDependencies(): string[] {
  try {
    const parsed = JSON.parse(packageRaw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return [
      ...Object.keys(parsed.dependencies ?? {}),
      ...Object.keys(parsed.devDependencies ?? {}),
    ];
  } catch {
    return [];
  }
}

export function findIdfaSdks(deps: string[] = declaredDependencies()): string[] {
  const found = new Set<string>();
  for (const dep of deps) {
    for (const { pattern, name } of IDFA_SDK_PATTERNS) {
      if (pattern.test(dep)) found.add(`${name} (${dep})`);
    }
  }
  return [...found];
}

function findIdfaGlobals(): string[] {
  if (typeof window === "undefined") return [];
  const found = new Set<string>();
  for (const { key, name } of IDFA_GLOBALS) {
    if ((window as unknown as Record<string, unknown>)[key] !== undefined) found.add(name);
  }
  return [...found];
}

function loadedCapacitorPlugins(): string[] {
  if (typeof window === "undefined") return [];
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor;
  return Object.keys(cap?.Plugins ?? {}).sort();
}

export type AttReport = {
  platform: NativePlatform;
  /** Whether the page is running inside the packaged native shell. */
  native: boolean;
  bundleId: string | null;
  /** The answer to give App Store Connect's IDFA question. */
  usesIdfa: boolean;
  attPromptRequired: boolean;
  checks: AttCheck[];
  plugins: string[];
  userAgent: string;
};

export function buildAttReport(): AttReport {
  const platform = getPlatform();
  const native = platform === "ios" || platform === "android";
  const sdks = findIdfaSdks();
  const globals = findIdfaGlobals();
  const hasTrackingKey = plistHasKey(TRACKING_USAGE_KEY);
  const usesIdfa = sdks.length > 0 || globals.length > 0;

  const checks: AttCheck[] = [];

  checks.push({
    id: "idfa-sdks",
    label: "No IDFA / attribution SDKs bundled",
    status: sdks.length === 0 ? "pass" : "fail",
    detail:
      sdks.length === 0
        ? "No advertising, attribution, or App Tracking Transparency package is declared in the app bundle."
        : `Found: ${sdks.join(", ")}`,
    remedy:
      sdks.length === 0
        ? undefined
        : "Remove the package, or add NSUserTrackingUsageDescription, request permission before any tracking, and answer Yes to Apple's IDFA question.",
  });

  checks.push({
    id: "idfa-globals",
    label: "No ad or pixel scripts loaded at runtime",
    status: globals.length === 0 ? "pass" : "fail",
    detail:
      globals.length === 0
        ? "No advertising or attribution script has installed itself on this page."
        : `Detected on this device: ${globals.join(", ")}`,
    remedy:
      globals.length === 0 ? undefined : "Remove the script or disable it inside the native shell.",
  });

  checks.push({
    id: "tracking-usage-description",
    label: `${TRACKING_USAGE_KEY} matches actual tracking`,
    status: hasTrackingKey === usesIdfa ? "pass" : hasTrackingKey ? "warn" : "fail",
    detail: hasTrackingKey
      ? usesIdfa
        ? `Present, and the app does use tracking: "${plistStringValue(TRACKING_USAGE_KEY) ?? ""}"`
        : "Present in Info.plist even though nothing in the app tracks users."
      : usesIdfa
        ? "Missing, but a tracking SDK is bundled — iOS will not let the app request permission."
        : "Absent, which is correct: the app never asks to track and never reads the IDFA.",
    remedy: hasTrackingKey
      ? usesIdfa
        ? undefined
        : "Remove the key so iOS does not show a tracking prompt the app never uses."
      : usesIdfa
        ? "Add the key with a plain-language purpose string before submitting."
        : undefined,
  });

  checks.push({
    id: "att-prompt",
    label: "No App Tracking Transparency prompt shown",
    status: usesIdfa ? "warn" : "pass",
    detail: usesIdfa
      ? "Tracking is present, so the ATT prompt must appear before any identifier is read."
      : "The app never presents the ATT prompt, which is expected when nothing tracks users.",
  });

  checks.push({
    id: "skadnetwork",
    label: "No SKAdNetwork ad-attribution entries",
    status: plistHasKey("SKAdNetworkItems") ? "warn" : "pass",
    detail: plistHasKey("SKAdNetworkItems")
      ? "SKAdNetworkItems is declared, which only belongs in apps running ad campaigns."
      : "Info.plist declares no ad-network attribution identifiers.",
    remedy: plistHasKey("SKAdNetworkItems")
      ? "Remove SKAdNetworkItems unless you run ad campaigns."
      : undefined,
  });

  checks.push({
    id: "purchases-identifiers",
    label: "Purchases SDK does not collect device identifiers",
    status: "info",
    detail:
      "RevenueCat is configured for in-app purchases only. collectDeviceIdentifiers() is never called, so no IDFA or IDFV is sent for attribution.",
  });

  for (const { key, reason } of EXPECTED_USAGE_KEYS) {
    const present = plistHasKey(key);
    checks.push({
      id: `usage-${key}`,
      label: key,
      status: present ? "pass" : "fail",
      detail: present
        ? `${reason} — "${plistStringValue(key) ?? ""}"`
        : `Missing. iOS will crash the app when it requests this permission (${reason.toLowerCase()}).`,
      remedy: present
        ? undefined
        : `Add ${key} to Info.plist with a plain-language purpose string.`,
    });
  }

  checks.push({
    id: "native-context",
    label: "Running inside the native app shell",
    status: native ? "pass" : "info",
    detail: native
      ? `Detected platform: ${platform}. These results reflect the installed build.`
      : "Opened in a browser. Plist and dependency checks are still accurate; runtime checks reflect the browser, so open this page on device for the full picture.",
  });

  return {
    platform,
    native,
    bundleId: plistStringValue("CFBundleIdentifier"),
    usesIdfa,
    attPromptRequired: usesIdfa,
    checks,
    plugins: loadedCapacitorPlugins(),
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
  };
}
