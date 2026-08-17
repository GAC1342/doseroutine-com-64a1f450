# Codemagic Builds — DoseRoutine

Android is now built from the normal **Branch/commit** option in Codemagic. Do
not use a tag for the Android retry unless you intentionally want the version
name to come from a tag.

iOS can still use `ios-vX.Y.Z` tags for clean release tracking, but the Android
workflow must stay simple so it does not burn builds on tag setup mistakes.

---

## Optional release tag formats

| Platform | Tag pattern  | Example           |
| -------- | ------------ | ----------------- |
| iOS      | `ios-vX.Y.Z` | `ios-v1.0.0`      |
| Android  | not required | use Branch/commit |

The `X.Y.Z` portion becomes the marketing / version name inside the build when
a matching tag is present. If Android is started from Branch/commit, it falls
back to `1.0.0` and still auto-generates a higher Play versionCode.

---

## How to ship a build

### iOS → TestFlight

1. On your machine or from GitHub, create and push the tag:
   ```bash
   git tag ios-v1.0.0
   git push origin ios-v1.0.0
   ```
2. In Codemagic → your app → **Start new build**.
3. Pick the **Tag** option (not Branch), select `ios-v1.0.0`, choose
   the `ios-testflight` workflow, hit Start.
4. When the build finishes, the `.ipa` is uploaded to TestFlight automatically.

### Android → Google Play (internal track)

1. Make sure the latest code is pushed to GitHub.
2. Codemagic → Start new build → **Branch/commit** → `main` →
   `android-play` workflow → Start.
3. The signed `.aab` is uploaded to the Play Console **internal** track.

---

## Bumping the version for the next build

Every new iOS TestFlight upload should use a fresh iOS tag. Android does not
require a new tag; Codemagic reads the latest Play versionCode and makes the
next one higher automatically.

Small change / bug fix → bump the last number: `ios-v1.0.0` → `ios-v1.0.1`
New feature → bump the middle: `ios-v1.0.1` → `ios-v1.1.0`
Big rework → bump the first: `ios-v1.1.0` → `ios-v2.0.0`

If you later choose to tag Android releases, use the same numbers on both
platforms so `ios-v1.2.0` and `android-v1.2.0` represent the same release.

---

## Android preflight before retrying

Run this before pushing an Android build change:

```bash
npm run audit:android-codemagic
```

It fails if the Android workflow accidentally reintroduces the paid instance
type, iOS-only variable group, tag guard, wrong package name, missing keystore
reference, or missing Play publishing setup.

---

## Fixing common tag mistakes

For iOS tags only: deleted the wrong tag locally but it still exists on GitHub:

```bash
git push --delete origin <bad-tag>
```

Pushed a tag by accident and the build already started: it's cheap — let it
fail at the guard, delete the tag, push a corrected one.

---

## Replacing a build that is already under review

Apple reviews the exact binary you uploaded. If you fixed bugs after uploading,
you must send Apple a **new** binary.

The good news: the workflow now looks up the latest build number in App Store
Connect and automatically makes the next build number higher. You do not have
to remember the old number.

### Step-by-step

1. **Make sure your fixes are in the code and pushed to GitHub.**
2. **Create a new tag** (bump the last number):
   ```bash
   git tag ios-v1.0.1
   git push origin ios-v1.0.1
   ```
   You can keep the same marketing version like `1.0.0` and only change the
   build number, but a new tag is the cleanest way to track what you sent.
3. **In Codemagic, start a new build.**
   - Choose **Tag**.
   - Pick your new tag, e.g. `ios-v1.0.1`.
   - Choose the `ios-testflight` workflow.
   - Click **Start**.
4. **Wait for the build to finish.**
   - The logs will show the version and the new build number.
   - The `.ipa` uploads to TestFlight automatically.
5. **In App Store Connect, swap the build:**
   - Open **App Store Connect → DoseRoutine → iOS App → App Store** tab.
   - Click the version that says **Waiting for Review** or **In Review**.
   - In the **Build** section, click the old build, then click **Expire Build**.
   - Select the new build that just finished processing.
   - Click **Save**, then click **Submit for Review** again.

### What if the new build says "Redundant Binary Upload"?

That means the build number was not higher than a build already in App Store
Connect. The YAML now auto-fixes this by reading the latest number from Apple
and adding 1. If you still see this error, check the build log for the line
`App Store Connect latest=...` and make sure it matched your app.

---

## Blue icon emergency checklist

If App Store Connect or TestFlight still shows the old blue placeholder icon:

1. **Do not rebuild the old build.** Do not reuse build 53 or any older build.
2. **Start a brand-new iOS build from the newest source.** Use the latest `ios-vX.Y.Z` tag after the icon fix is pushed.
3. **Open the Codemagic build logs and search for both lines:**
   ```text
   DR_ICON_PREUPLOAD_GATE_PASSED
   APPLE_EXTRACTED_ICON_GATE_PASSED
   ```
4. **If either line is missing, do not use that build.** It did not prove Apple received the DR icon.
5. **If both lines are present, the uploaded binary is proven correct.** If the web page still looks blue, wait for Apple's thumbnail cache to refresh instead of spending another build.

Apple approval does not change the icon. The icon comes from the uploaded build that Apple processes.
