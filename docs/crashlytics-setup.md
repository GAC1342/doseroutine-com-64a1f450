# Firebase Crashlytics Setup

Crashlytics is wired into the app via `@capacitor-firebase/crashlytics`. The
JS integration lives in `src/lib/crashlytics.ts` and initializes automatically
on native launch from `src/routes/__root.tsx`. It's a no-op on web.

To finish enabling it for the next internal test build, add the Firebase
config files (one-time setup per platform).

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com/> → **Add project** → name it
   `DoseRoutine`.
2. Skip Google Analytics (Crashlytics doesn't require it) or enable it — either works.

## 2. iOS — add `GoogleService-Info.plist`

1. In Firebase console → **Add app** → iOS.
2. Bundle ID: `com.doseroutine.app`.
3. Download `GoogleService-Info.plist`.
4. Drop it into `ios/App/App/GoogleService-Info.plist` (commit it — no secrets).
5. Codemagic will now auto-upload dSYMs to Crashlytics after every iOS build
   (`Upload dSYMs to Firebase Crashlytics` step in `codemagic.yaml`) as soon
   as the two env vars in step 4 below are set. Until then, the step logs a
   `SKIP` line and the build continues normally.

## 3. Android — add `google-services.json`

1. In Firebase console → **Add app** → Android.
2. Package name: `com.doseroutine.app`.
3. Download `google-services.json`.
4. Drop it into `android/app/google-services.json` (commit it — safe to share).
5. Codemagic runs `scripts/enable-android-crashlytics-gradle.sh` before
   `./gradlew bundleRelease`, which idempotently applies the
   `com.google.firebase.crashlytics` Gradle plugin and forces
   `mappingFileUploadEnabled true`. R8/ProGuard `mapping.txt` uploads to
   Crashlytics automatically as part of the release build — no extra env vars.

## 4. Codemagic env vars for iOS dSYM upload

Add these to Codemagic → **App settings → Environment variables → group
`doseroutine_env`** (mark both as _Secure_):

| Variable                        | Value                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIREBASE_IOS_APP_ID`           | Firebase console → Project settings → Your apps → iOS app → **App ID** (looks like `1:123456789:ios:abcdef012345`)                                          |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON of a service account with the **Firebase Crashlytics Symbol Uploader** role (Google Cloud console → IAM → Service Accounts → Keys → Add JSON key) |

The Android mapping upload does NOT need either variable — it authenticates via
`google-services.json` and the Gradle plugin.

## 4. Trigger the next build

- Push to `main` (or start a new Codemagic build).
- After the build installs on a test device, crashes will appear in
  Firebase console → **Crashlytics** within ~5 minutes of the first crash.

## Optional: force a test crash

From any native screen, call:

```ts
import { FirebaseCrashlytics } from "@capacitor-firebase/crashlytics";
await FirebaseCrashlytics.crash({ message: "Test crash" });
```

Remove after verifying it appears in the Firebase dashboard.

## Disabling in dev

Set `VITE_CRASHLYTICS_ENABLED=false` in `.env.development` to stop collection
without removing the plugin.
