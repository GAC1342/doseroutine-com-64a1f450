import type { CapacitorConfig } from "@capacitor/cli";
// Type-only: erased at build time, so the Node-side CLI config never loads
// @capacitor/core just to read one string.
import type { KeyboardResize } from "@capacitor/keyboard";

/**
 * DoseRoutine native app wrapper (iOS + Android via Capacitor).
 *
 * Ships the built web assets from `dist/client/` inside the native binary. This is
 * required by Apple App Store review — a shell that just points at a live
 * URL (`server.url`) gets rejected as "not a native app" under 4.2.
 *
 * Build workflow:
 *   1. `bun run build`  (produces dist/client/)
 *   2. `npx cap sync`   (copies dist into iOS / Android projects)
 *   3. Open ios/App/App.xcworkspace or android/ in the respective IDE.
 *
 * IAP is handled via RevenueCat (`src/lib/revenuecat.ts`). Web checkout
 * (Stripe) is only shown when `getPlatform() === 'web'`.
 */
const config: CapacitorConfig = {
  appId: "com.doseroutine.app",
  appName: "DoseRoutine",
  webDir: "dist/client",
  // Server-side guideline 3.1.1 defense: the native shell tags its WebView
  // user agent so server functions can refuse to open Stripe checkout for
  // requests coming from inside the app, not just hide the button.
  appendUserAgent: "DoseRoutineApp",
  ios: {
    // L3 — the app applies its own `env(safe-area-inset-*)` padding in
    // styles.css. Leaving WKWebView's automatic contentInset on top of that
    // double-pads the top/bottom on notch / Dynamic Island hardware, so the
    // webview inset is disabled and CSS remains the single source of truth
    // (`viewport-fit=cover` is set in __root.tsx).
    contentInset: "never",
    // Required for the OAuth round trip: Apple/Google sign-in leaves the
    // app-bound domain. The sign-in pages themselves never load in this
    // webview — `src/lib/native-oauth.ts` opens them with the Browser plugin.
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#0b1220",
  },
  // NOTE: deliberately no `server.allowNavigation`. Capacitor's default empty
  // allowlist means every off-origin navigation is handed to the system
  // browser, which is exactly the H3 policy enforced in
  // `src/lib/external-link.ts` (even our own subdomains open externally).
  // Adding hosts here would let third-party pages load inside the chromeless
  // app shell — an Apple Guideline 4.2 rejection risk. Do not add one.
  //
  // `server.androidScheme` is likewise left unset so it tracks the Capacitor
  // default (`https`). Changing the scheme later would orphan every existing
  // install's localStorage/IndexedDB, so it must never be pinned or edited.
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b1220",
  },
  plugins: {
    SplashScreen: {
      // C2 — the splash stays up until React paints; NativeSplash calls
      // SplashScreen.hide() after the first frame (with a 4s safety timeout).
      launchShowDuration: 4000,
      launchAutoHide: false,
      backgroundColor: "#0b1220",
      showSpinner: false,
      androidSplashResourceName: "splash",
      iosSpinnerStyle: "small",
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#14b8a6",
    },
    // ML Kit barcode scanner (Google) — uses the on-device model, no network.
    // iOS requires NSCameraUsageDescription in ios/App/App/Info.plist:
    //   "DoseRoutine uses the camera to scan supplement barcodes and add them to your stack."
    BarcodeScanner: {
      // Bundle the Google barcode module inside the Android APK so users
      // don't need to download it on first scan.
      barcodeScannerBundled: true,
    },
    // @capgo/capacitor-health — HealthKit (iOS) / Health Connect (Android).
    // iOS also requires the HealthKit capability enabled in Xcode and the
    // NSHealthShareUsageDescription / NSHealthUpdateUsageDescription keys in
    // Info.plist (already added). Android requires the health.* permissions
    // in AndroidManifest.xml (already added) and the Health Connect app
    // installed on-device for Android < 14.
    Health: {},
    // H1 — the plugin reports the keyboard height (correct for external,
    // split and floating keyboards, unlike visualViewport alone), but it must
    // NOT resize the webview: `src/lib/keyboard-inset.ts` already pads layouts
    // through `--keyboard-inset`. Native resizing on top of that stacks ~2x the
    // keyboard height and pushes primary actions off short screens. Same rule
    // as `contentInset: "never"` — CSS is the single source of truth.
    Keyboard: {
      // "none" is the string value of KeyboardResize.None.
      resize: "none" as unknown as KeyboardResize,
    },
  },
};

export default config;
