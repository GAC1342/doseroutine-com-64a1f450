import type { CapacitorConfig } from "@capacitor/cli";

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
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#0b1220",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b1220",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
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
  },
};

export default config;
