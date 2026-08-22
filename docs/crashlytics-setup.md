# Crash reporting (Firebase Crashlytics removed)

**Status: removed on 2026-08-18.**

App Store build 95 aborted (`SIGABRT`) on every launch. Cause: the Capacitor
Firebase plugins call `FirebaseApp.configure()` inside `FirebaseAppPlugin.load()`,
which runs while the Capacitor bridge builds its root view controller. With no
`GoogleService-Info.plist` bundled in the app, Firebase raises an uncaught
Objective-C exception and the process aborts before the first frame — App Store
review could not open the app at all.

What changed:

- `@capacitor-firebase/app` and `@capacitor-firebase/crashlytics` uninstalled.
- Removed from `ios/App/CapApp-SPM/Package.swift`, its `LocalPackages/`,
  `android/capacitor.settings.gradle` and `android/app/capacitor.build.gradle`.
- `src/lib/crashlytics.ts` is now a shim that forwards handled errors to the
  first-party monitor (Admin → Health). It can never crash the app, and the
  "force a crash" debug action is gone.

Crash/error reporting today:

- First-party client error monitor (`src/lib/client-error-monitor.ts`),
  dashboard at `/admin/health`.
- Sentry (`src/lib/sentry.ts`) when a DSN is configured.

If Crashlytics is ever reintroduced, the config files
(`ios/App/App/GoogleService-Info.plist`, `android/app/google-services.json`)
must be committed or injected in CI **in the same change**. The guard test
`src/lib/__tests__/native-launch-safety.test.ts` fails the build otherwise.
