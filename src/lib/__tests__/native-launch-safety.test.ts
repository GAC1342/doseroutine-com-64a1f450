/**
 * Native launch-safety guard.
 *
 * Build 95 aborted (SIGABRT) on every iOS launch: the Firebase Capacitor
 * plugins call `FirebaseApp.configure()` from `load()` while the Capacitor
 * bridge boots, and with no `GoogleService-Info.plist` in the bundle that
 * raises an uncaught Objective-C exception before the first frame. App Store
 * review could not open the app at all.
 *
 * These checks fail the build for the whole class of problem:
 *  - a native plugin that needs a config file being linked without that file
 *  - iOS/Android plugin references that point at packages we no longer install
 *  - missing iOS usage-description strings (requesting the camera without
 *    NSCameraUsageDescription is an instant crash, not a denied prompt)
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const has = (p: string) => existsSync(resolve(root, p));

const IOS_PACKAGE_SWIFT = "ios/App/CapApp-SPM/Package.swift";
const ANDROID_SETTINGS = "android/capacitor.settings.gradle";
const ANDROID_BUILD = "android/app/capacitor.build.gradle";
const IOS_INFO_PLIST = "ios/App/App/Info.plist";

/** Plugins that hard-require a native config file present in the app bundle. */
const CONFIG_DEPENDENT_PLUGINS = [
  {
    match: /firebase/i,
    label: "Firebase",
    iosConfig: "ios/App/App/GoogleService-Info.plist",
    androidConfig: "android/app/google-services.json",
  },
];

describe("iOS native project", () => {
  const pkg = has(IOS_PACKAGE_SWIFT) ? read(IOS_PACKAGE_SWIFT) : "";

  it("does not link a config-dependent plugin without its config file", () => {
    for (const plugin of CONFIG_DEPENDENT_PLUGINS) {
      if (plugin.match.test(pkg)) {
        expect(
          has(plugin.iosConfig),
          `${plugin.label} is linked in ${IOS_PACKAGE_SWIFT} but ${plugin.iosConfig} is missing — the app aborts at launch.`,
        ).toBe(true);
      }
    }
  });

  it("only references local package paths that exist on disk", () => {
    // `npx cap sync` points these at ../../../node_modules/<plugin>; older
    // builds vendored copies under LocalPackages/. Either shape must resolve.
    const paths = [...pkg.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]!);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(has(`ios/App/CapApp-SPM/${p}`), `${p} referenced but missing`).toBe(true);
    }
  });

  it("declares the usage descriptions the app's features require", () => {
    const plist = read(IOS_INFO_PLIST);
    for (const key of ["NSCameraUsageDescription", "NSPhotoLibraryUsageDescription"]) {
      expect(plist, `${key} missing from Info.plist`).toContain(key);
    }
    // L2 — the app never writes to the photo library, and Apple rejects
    // purpose strings for capabilities the app doesn't use.
    expect(plist).not.toContain("NSPhotoLibraryAddUsageDescription");
  });
});

describe("Android native project", () => {
  const settings = has(ANDROID_SETTINGS) ? read(ANDROID_SETTINGS) : "";
  const build = has(ANDROID_BUILD) ? read(ANDROID_BUILD) : "";

  it("does not link a config-dependent plugin without its config file", () => {
    for (const plugin of CONFIG_DEPENDENT_PLUGINS) {
      if (plugin.match.test(settings) || plugin.match.test(build)) {
        expect(
          has(plugin.androidConfig),
          `${plugin.label} is linked for Android but ${plugin.androidConfig} is missing.`,
        ).toBe(true);
      }
    }
  });

  it("only includes gradle projects whose node_modules directory is installed", () => {
    const dirs = [...settings.matchAll(/new File\('\.\.\/(node_modules\/[^']+)'\)/g)].map(
      (m) => m[1]!,
    );
    expect(dirs.length).toBeGreaterThan(0);
    for (const dir of dirs) {
      expect(has(dir), `${dir} referenced in capacitor.settings.gradle but not installed`).toBe(
        true,
      );
    }
  });
});

describe("app code", () => {
  it("has no import of the removed Firebase Capacitor packages", () => {
    const crash = read("src/lib/crashlytics.ts");
    expect(crash).not.toMatch(/@capacitor-firebase\//);
  });
});
