/**
 * Device / app metadata attached to every Sentry event so a crash report says
 * *where* it happened: which platform, which app build, which screen size,
 * online or offline. Everything here is best-effort — a failure to read any
 * field must never break telemetry or the app.
 */
import { getPlatform, isNative } from "./platform";

export type SentryEnvironmentInfo = {
  tags: Record<string, string>;
  app: Record<string, unknown>;
  device: Record<string, unknown>;
};

function displayMode(): string {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "unknown";
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return "standalone";
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return "minimal-ui";
    return "browser";
  } catch {
    return "unknown";
  }
}

/** Collect platform, build and device info. Never throws. */
export async function collectSentryEnvironment(): Promise<SentryEnvironmentInfo> {
  const platform = getPlatform();
  const native = isNative();

  let appVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) || "";
  let appBuild = "";
  let appId = "";

  if (native) {
    try {
      const { App } = await import("@capacitor/app");
      const info = await App.getInfo();
      appVersion = info.version || appVersion;
      appBuild = info.build || "";
      appId = info.id || "";
    } catch {
      /* plugin unavailable — keep the web values */
    }
  }

  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const screenSize =
    typeof window === "undefined"
      ? ""
      : `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}`;

  const tags: Record<string, string> = {
    platform,
    runtime: native ? "native" : "web",
    display_mode: displayMode(),
  };
  if (appVersion) tags["app_version"] = appVersion;
  if (appBuild) tags["app_build"] = appBuild;

  return {
    tags,
    app: {
      version: appVersion || "unknown",
      build: appBuild || "unknown",
      bundleId: appId || "unknown",
      mode: import.meta.env.MODE,
      displayMode: displayMode(),
      host: typeof window === "undefined" ? "unknown" : window.location.host,
    },
    device: {
      platform,
      runtime: native ? "native" : "web",
      userAgent: nav?.userAgent ?? "unknown",
      language: nav?.language ?? "unknown",
      languages: nav?.languages ? [...nav.languages] : undefined,
      online: nav?.onLine ?? null,
      screen: screenSize || "unknown",
      timezone: (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
          return "unknown";
        }
      })(),
      hardwareConcurrency: nav?.hardwareConcurrency ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deviceMemory is non-standard
      memoryGb: (nav as any)?.deviceMemory ?? null,
    },
  };
}
