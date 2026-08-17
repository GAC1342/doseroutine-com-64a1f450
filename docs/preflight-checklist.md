# Codemagic Preflight Checklist

Every mobile build in `codemagic.yaml` runs a chain of preflight steps
**before** any long-running work (npm install, cap sync, pod install,
xcodebuild, gradle). If a preflight fails, the build stops immediately
with a specific fix message.

This document lists each preflight, what it checks, the most common
failure causes, and the exact command / setting to recover.

Table of contents:

1. [Version source](#1-version-source)
2. [Build info](#2-build-info)
3. [Tooling preflight](#3-tooling-preflight)
4. [App Store Connect credentials preflight (iOS only)](#4-app-store-connect-credentials-preflight-ios-only)
5. [App Store Connect API key role probe (iOS only)](#5-app-store-connect-api-key-role-probe-ios-only)
6. [Capacitor preflight](#6-capacitor-preflight)
7. [Built bundle id & entitlements verification (iOS only)](#7-built-bundle-id--entitlements-verification-ios-only)
8. [Apple preflight report (iOS only)](#8-apple-preflight-report-ios-only)
9. [Provisioning profile verification (iOS only)](#9-provisioning-profile-verification-ios-only)

Where a failure produces a log, it will be under
`build-logs/` in the workflow artifacts.

---

## 1. Version source

**What it checks:** whether the build has a release tag that can provide a
marketing version.

**Why:** Android is allowed to start from Branch/commit. If there is no Android
tag, the workflow uses `1.0.0` for versionName and still auto-bumps versionCode
from Google Play / Codemagic build number.

**Common failure causes and fixes:**

- **Android branch build has no tag.** This is OK. Start
  `android-play` from **Branch/commit → main**.

- **iOS tag has wrong format** (e.g. `v1.0.0`, `release-1`, `ios-1.0`):

  ```bash
  git tag -d <bad-tag>
  git push --delete origin <bad-tag>
  git tag ios-v1.0.0 && git push origin ios-v1.0.0
  ```

- **Android asks for a tag again.** The old tag guard came back. Run
  `npm run audit:android-codemagic`; it will fail and point to the bad config.

---

## 2. Build info

**What it checks:** nothing — it records versions of Node, npm, Bun,
Xcode, CocoaPods, Java, Gradle, Android SDK into
`build-logs/build-info.txt`.

**Why:** so when a later step fails, you can see the exact toolchain
versions without re-running the build.

Not a gating step. Never fails on its own.

---

## 3. Tooling preflight

**What it checks:** required CLIs are installed and on `PATH`. Runs
different subsets per target:

- Shared: `node`, `npm`, `npx`, `@capacitor/cli`
- iOS only: `xcodebuild`, `xcode-project`, `app-store-connect`,
  `keychain`, `pod`
- Android only: `java` (plus an info line for `gradle`)

Log: `build-logs/tooling-preflight.log`.

**Common failure causes and fixes:**

- **`@capacitor/cli not resolvable via npx`.** Add it as a dev
  dependency:

  ```bash
  npm i -D @capacitor/cli
  git add package.json package-lock.json
  git commit -m "chore: add @capacitor/cli"
  ```

- **`xcode-project not found` / `app-store-connect not found` /
  `keychain not found`.** These are the Codemagic CLI Tools. On a
  Codemagic macOS image they are pre-installed; if you switched
  to a bare image they're missing:

  ```bash
  pip3 install codemagic-cli-tools
  ```

  Or switch back to `instance_type: mac_mini_m2` with the default
  Codemagic image.

- **`xcodebuild not found`.** The workflow is running on a Linux
  instance. Set `instance_type: mac_mini_m2` in the iOS workflow.

- **`pod not found`.** CocoaPods is missing on the image:

  ```bash
  sudo gem install cocoapods
  ```

- **`java not found`** (Android). Pin a JDK in the workflow:
  ```yaml
  environment:
    java: 17
  ```

---

## 4. App Store Connect credentials preflight (iOS only)

**What it checks:** `APP_STORE_CONNECT_ISSUER_ID`,
`APP_STORE_CONNECT_KEY_ID`, and `APP_STORE_CONNECT_PRIVATE_KEY`
are all set in the `doseroutine_env` group, and the private key
looks like a real `.p8` (contains `BEGIN PRIVATE KEY`).

**Common failure causes and fixes:**

- **A variable is empty.** In Codemagic: **Environment variables →
  doseroutine_env**, add / re-save the missing one, mark as secure.

- **`APP_STORE_CONNECT_PRIVATE_KEY does not look like a valid .p8`.**
  You pasted the download URL or the JSON wrapper instead of the file
  contents. Open the `AuthKey_XXXX.p8` file in a text editor and
  paste the entire contents including the
  `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
  lines.

---

## 5. App Store Connect API key role probe (iOS only)

**What it checks:** the API key can (a) authenticate against the App
Store Connect API and (b) actually create resources — verified by a
validation-only `POST /v1/bundleIds` with an intentionally invalid
identifier. A `403` means the role is below App Manager.

**Common failure causes and fixes:**

- **`Key authentication failed (401)`.** Issuer ID, Key ID, or `.p8`
  contents don't match. Recheck all three in App Store Connect →
  **Users and Access → Integrations → App Store Connect API**.

- **`Key role is insufficient (403 on POST /v1/bundleIds)`.** The key
  is Developer or lower. In App Store Connect:
  1. **Users and Access → Integrations → App Store Connect API**
  2. Find the key with the matching Key ID.
  3. If editable, change Access to **App Manager** and save.
  4. If not editable (Apple locks role after creation), revoke it,
     create a new key with **Access = App Manager**, download the
     new `.p8`, and update `APP_STORE_CONNECT_KEY_ID` and
     `APP_STORE_CONNECT_PRIVATE_KEY` in Codemagic.

---

## 6. Capacitor preflight

**What it checks:**

- `capacitor.config.ts` exists at repo root and `appId` equals
  `com.doseroutine.app`.
- `ios/` and `android/` folders exist; if missing, runs
  `npx cap add <platform>` to generate them.
- `android/app/build.gradle` `applicationId` equals
  `com.doseroutine.app`.

**Common failure causes and fixes:**

- **`capacitor.config.ts appId is 'X' but must be 'com.doseroutine.app'`.**
  Open `capacitor.config.ts` and set:

  ```ts
  appId: 'com.doseroutine.app',
  ```

  Then regenerate native folders:

  ```bash
  rm -rf ios android
  npx cap add ios
  npx cap add android
  git add capacitor.config.ts ios android
  git commit -m "fix: correct bundle id"
  ```

- **`npx cap add ios` fails** because `@capacitor/ios` isn't installed:

  ```bash
  npm i @capacitor/ios @capacitor/android
  ```

- **Android `applicationId` mismatch.** Edit
  `android/app/build.gradle` and set:
  ```gradle
  applicationId "com.doseroutine.app"
  ```
  Commit the change.

---

## 7. Built bundle id & entitlements verification (iOS only)

**What it checks:** after `cap sync`, the actual
`PRODUCT_BUNDLE_IDENTIFIER` inside
`ios/App/App.xcodeproj/project.pbxproj` equals `com.doseroutine.app`
and the entitlements file contains
`com.apple.developer.in-app-payments`.

**Common failure causes and fixes:**

- **Bundle id in `project.pbxproj` is wrong.** Almost always caused
  by an old `ios/` folder generated with the previous bundle id.
  Regenerate:

  ```bash
  rm -rf ios
  npx cap add ios
  npx cap sync ios
  git add ios
  git commit -m "chore: regenerate ios/ with correct bundle id"
  ```

- **`entitlements file not found` / `in-app-payments missing`.**
  Open the project in Xcode once locally, tick **Signing &
  Capabilities → + Capability → In-App Purchase**, which creates
  `ios/App/App/App.entitlements`. Commit that file.

---

## 8. Apple preflight report (iOS only)

**What it checks:** four things against the live App Store Connect
account and prints a single consolidated report in
`build-logs/appstore-preflight-report.log`:

- App ID `com.doseroutine.app` exists in the Developer portal.
- The In-App Purchase capability is enabled on that App ID.
- At least one iOS Distribution certificate exists (WARN if not —
  fetch-signing-files will try to create one).
- At least one App Store provisioning profile references the bundle
  id (WARN if not — fetch-signing-files will try to create one).

**Common failure causes and fixes:**

- **`No App ID found for 'com.doseroutine.app'`.**
  developer.apple.com → **Certificates, IDs & Profiles → Identifiers
  → + → App IDs → App → Explicit**, set Bundle ID to
  `com.doseroutine.app`, enable **In-App Purchase** and
  **Push Notifications**, save.

- **`In-App Purchase capability is missing`.** Same page →
  **Identifiers → com.doseroutine.app → Capabilities**, tick
  **In-App Purchase**, save.

- **`Did not find any Signing Certificates for given private key`** followed by
  **`You already have a current Distribution certificate or a pending certificate request`**.
  This means the Apple account already has Distribution certificates, but
  Codemagic does not have the matching private key for them. The easiest fix is:
  developer.apple.com → **Certificates, IDs & Profiles → Certificates** →
  revoke one old unused **iOS Distribution / Apple Distribution** certificate
  or delete the pending certificate request, then re-run Codemagic. Codemagic
  will create a fresh certificate with a private key it can use. Do **not**
  replace the App Store Connect `.p8` for this specific 409 error.

---

## 9. Provisioning profile verification (iOS only)

**What it checks:** after `fetch-signing-files --create` installs
profiles into `~/Library/Developer/Xcode/UserData/Provisioning Profiles/`, the
step decodes each with `security cms` and confirms an
`application-identifier` of `<TEAM>.com.doseroutine.app` and an
App Store distribution profile is present.

**Common failure causes and fixes:**

- **No profile references `com.doseroutine.app`.** The App ID isn't
  attached to any App Store Connect app record. In App Store
  Connect: **My Apps → + → New App**, pick bundle id
  `com.doseroutine.app`. Re-run the build.

- **Only Ad Hoc / Development profile found, no App Store profile.**
  Delete the stale cache in Codemagic:
  **App settings → Environment variables → Clear signing cache**,
  then re-run.

- **Wrong Team ID in `application-identifier`.** The API key belongs
  to a different Apple Developer team than the App ID was created
  under. Recreate the App ID under the correct team, or issue a new
  API key under the team that owns the existing App ID.

---

## Where each preflight runs

```text
ios-testflight            android-play
-----------------         ----------------
Version source            Version source
Build info                Build info
Tooling preflight         Tooling preflight
ASC credentials
ASC key role probe
Install deps              Install deps
Build web                 Build web
Capacitor preflight       Capacitor preflight
cap sync (ios)            cap sync (android)
Built bundle id + ents
Apple preflight report
fetch-signing-files
Provisioning verify
xcode build + upload      gradle bundleRelease + upload
```

## Grabbing all preflight logs at once

Every preflight writes to `build-logs/`. When a build fails, download
the workflow's artifacts and open these files first — they contain
the actionable message before any noisy build output:

- `build-logs/build-info.txt`
- `build-logs/tooling-preflight.log`
- `build-logs/appstore-preflight.log`
- `build-logs/appstore-preflight-report.log`
- `build-logs/fetch-signing-files.log`
- `build-logs/errors/FAILURE_SUMMARY.txt`
- `build-logs/errors/*.snippet.txt`
