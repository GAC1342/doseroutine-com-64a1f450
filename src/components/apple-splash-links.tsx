import { useEffect } from "react";

import { assetUrl } from "@/lib/asset-url";

// iOS device specs: [cssWidth, cssHeight, dpr, slug]
const APPLE_SPLASH_DEVICES: Array<[number, number, number, string]> = [
  [375, 667, 2, "iphone-se"],
  [414, 736, 3, "iphone-8plus"],
  [375, 812, 3, "iphone-x"],
  [414, 896, 2, "iphone-xr"],
  [414, 896, 3, "iphone-xs-max"],
  [390, 844, 3, "iphone-12"],
  [428, 926, 3, "iphone-12-pro-max"],
  [393, 852, 3, "iphone-14-pro"],
  [430, 932, 3, "iphone-14-pro-max"],
  [768, 1024, 2, "ipad"],
  [834, 1194, 2, "ipad-pro-11"],
  [1024, 1366, 2, "ipad-pro-12"],
];

function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports a desktop Mac UA but exposes touch points.
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
}

/**
 * iOS PWA splash screens (`apple-touch-startup-image`).
 *
 * These 24 <link> tags used to be server-rendered into <head>. They are only
 * ever read by Safari on iOS when the app is added to the home screen, but they
 * shipped in the HTML of every page for every visitor and crawler — inflating
 * the document and pushing <head> past 60 child nodes (an audit warning).
 *
 * Injecting them after hydration, on Apple mobile only, keeps the splash
 * screens working while removing the weight from the critical path.
 */
export function AppleSplashLinks() {
  useEffect(() => {
    if (!isAppleMobile()) return;
    if (document.head.querySelector('link[rel="apple-touch-startup-image"]')) return;

    const created: HTMLLinkElement[] = [];
    for (const [w, h, dpr, slug] of APPLE_SPLASH_DEVICES) {
      for (const orientation of ["portrait", "landscape"] as const) {
        const link = document.createElement("link");
        link.rel = "apple-touch-startup-image";
        link.href = assetUrl(`/splash/${slug}-${orientation}.png`);
        link.media = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orientation})`;
        document.head.appendChild(link);
        created.push(link);
      }
    }

    return () => {
      for (const link of created) link.remove();
    };
  }, []);

  return null;
}
