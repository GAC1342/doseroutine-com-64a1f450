# TestFlight Pre-Submission Validation Checklist — DoseRoutine

Run through this **after Codemagic uploads the build** and **before you tap "Submit for Review"** in App Store Connect. If any item fails, fix it first — a rejection costs 24–48h.

Bundle ID: `com.doseroutine.app` · Team: `LTZ9X7NMQJ` · ASC app record: DoseRoutine

---

## 1. Agreements, Tax & Banking (blocks everything)

App Store Connect → **Business** (top nav) → Agreements, Tax, and Banking.

- [ ] **Paid Apps Agreement** status = **Active** (not "Pending" or "Expired")
- [ ] **Tax forms** completed for your country (US: W-9 or W-8BEN)
- [ ] **Banking** — at least one active bank account attached to the Paid Apps agreement
- [ ] **Contact info** — all three roles filled (Legal, Financial, Technical)

> If Paid Apps is not Active, subscriptions cannot be submitted with the app and Apple auto-rejects.

---

## 2. Build Arrived & Processed

ASC → **Apps → DoseRoutine → TestFlight**.

- [ ] Build appears under **iOS builds** (may take 10–30 min after Codemagic finishes)
- [ ] Status = **Ready to Submit** (not "Processing", not "Invalid Binary", not "Missing Compliance")
- [ ] No red "Missing Compliance" badge — if present, click the build → answer export compliance:
  - Uses encryption? **Yes** (HTTPS only) → Exempt (standard iOS encryption)
- [ ] Build number matches what Codemagic printed in the "Set version & build number (iOS)" step
- [ ] Marketing version matches your tag (e.g. `1.0.0` from `ios-v1.0.0`)

---

## 3. Entitlements & Capabilities

Open the build in ASC → **Build Metadata** (or verify inside the `.ipa` if you saved the artifact).

- [ ] **In-App Purchase** entitlement present (required for RevenueCat subscriptions)
- [ ] **Push Notifications** entitlement — only if you enabled push in the app; otherwise absent (must not be a stray entitlement)
- [ ] **Associated Domains** — absent unless you added universal links
- [ ] No unexpected entitlements (HealthKit, Location, Camera) — DoseRoutine does not request these, so they must not appear
- [ ] Bundle ID inside `.ipa` = `com.doseroutine.app` (verify: `unzip -p App.ipa Payload/App.app/Info.plist | plutil -p - | grep CFBundleIdentifier`)

---

## 4. App Privacy & Data Use

ASC → **App Privacy** section.

- [ ] Privacy questionnaire completed (Data Types collected: Email, User Content, Diagnostics)
- [ ] **Privacy Policy URL** = `https://doseroutine.com/privacy` — reachable, returns 200
- [ ] Account deletion flow disclosed (Apple requires this since 2022) — DoseRoutine has it in More → Delete Account

---

## 5. Subscriptions Attached to This Build

ASC → **App → Monetization → Subscriptions**.

- [ ] Subscription group **DoseRoutine Pro** exists (Group ID `22258206`)
- [ ] `pro_monthly` and `pro_yearly` both status = **Ready to Submit** or **Approved**
- [ ] Localized display name + description filled for each
- [ ] Each subscription has a **review screenshot** (1284×2778 or 1290×2796 showing the paywall)
- [ ] **Submit subscriptions with this build** is checked on the App Version page

---

## 6. Screenshots & App Preview Videos

ASC → **App → iOS App → 1.0 Prepare for Submission**.

- [ ] **6.7" iPhone** screenshots: at least 3, exactly **1290×2796** (portrait)
- [ ] **6.5" iPhone** screenshots: at least 3, exactly **1284×2778** (portrait) — or use 6.7" scaled
- [ ] All screenshots show real app UI (no marketing frames, no device bezels unless part of a mockup that reads as content)
- [ ] No pricing shown on screenshots except on the paywall shot (Apple rejects mismatched prices)
- [ ] App Preview videos: **886×1920** portrait, ≤30s, no black frames, no third-party logos
- [ ] iPad screenshots: only required if the build's `UIDeviceFamily` includes iPad — Capacitor default is iPhone-only, so verify and either add iPad shots or set iPhone-only in Xcode

---

## 7. App Version Metadata

Same **Prepare for Submission** page.

- [ ] **Version number** matches the build's marketing version exactly (e.g. `1.0.0`)
- [ ] **Promotional text**, **Description**, **Keywords**, **Support URL** (`https://doseroutine.com`), **Marketing URL** all filled
- [ ] **Copyright**: `2026 DoseRoutine`
- [ ] **Primary category**: Health & Fitness; **Secondary**: Medical
- [ ] **Age rating** questionnaire completed — DoseRoutine = 12+ (health & fitness reference)
- [ ] **Build** section: click **+ Add Build** and select the Codemagic build

---

## 8. App Review Information

Same page, scroll down.

- [ ] **Sign-in required** = Yes
- [ ] Username: `appreview@doseroutine.com`
- [ ] Password: `DoseReview2026!`
- [ ] Notes field mentions:
  - "Account is grandfathered — paywall bypassed for review."
  - "RevenueCat sandbox: use a fresh Apple sandbox tester to test purchases; grandfathered account already has Pro."
  - "Restore Purchases is in More → Restore purchases (native only)."
- [ ] Contact info: your real name, phone, `support@doseroutine.com`

---

## 9. Version Release

- [ ] **Manually release** selected (safer for first submission — you control the go-live moment)
- [ ] Or **Automatic release** if you want it live the second Apple approves

---

## 10. Final Smoke Test on the TestFlight Build

Install via TestFlight on a real device with a **sandbox Apple ID** (Settings → App Store → Sandbox Account).

- [ ] App launches, no white screen, no crash on cold start
- [ ] Sign up with a throwaway email — email confirmation arrives from `notify.doseroutine.com`
- [ ] Onboarding completes end-to-end
- [ ] Paywall appears after trial gate; tapping a plan opens the native Apple sheet (not a web checkout)
- [ ] Sandbox purchase succeeds → app unlocks Pro immediately
- [ ] **Restore purchases** button in More works on a fresh install
- [ ] Sign in as `appreview@doseroutine.com` / `DoseReview2026!` — lands past the paywall with Pro active
- [ ] Delete account flow works (More → Delete Account)
- [ ] Legal links (Terms, Privacy) open in-app and load

---

## Submit

Only after every box above is checked:

App Store Version page → **Add for Review** → **Submit for Review**.

Expected review time: **24–48 hours** for a first submission of a health app. If rejected, the resolution note tells you exactly what to fix — reply in Resolution Center same day to keep momentum.

## Native build parity & deep links (added after the Aug 2026 audit)

- [ ] Run `npm run build && npx cap sync`, then `npm run verify:native-plugins`.
      It fails if any installed Capacitor plugin is missing from
      `ios/App/CapApp-SPM/Package.swift` or `android/app/capacitor.build.gradle`.
      (`@capacitor-mlkit/barcode-scanning` is a documented iOS exception — it is
      CocoaPods-only, so iOS falls back to the in-webview scanner.)
- [ ] Confirm the `APPLE_TEAM_ID` environment variable is set on the production
      deployment. Without it `https://doseroutine.com/.well-known/apple-app-site-association`
      returns 404 and Universal Links silently open Safari instead of the app.
      Verify with: `curl -I https://doseroutine.com/.well-known/apple-app-site-association`
      (expect `200` and `content-type: application/json`).
- [ ] Sign in with Apple and with Google on a real device — the system browser
      must open; failures now surface a recovery message on `/auth`.

## Build numbers (local archives)

CI derives the build number from the release tag. If you archive locally from
Xcode or Gradle instead, run `npm run bump:build` first — it increments
`CURRENT_PROJECT_VERSION` (iOS) and `versionCode` (Android) together, so App
Store Connect / Play never sees a duplicate build. `npm run bump:build -- --check`
prints the current values and fails if the two platforms drift apart.

## Webview navigation (no allowlist — on purpose)

`capacitor.config.ts` sets **no** `server.allowNavigation`. Capacitor's default
empty allowlist means every off-origin navigation is handed to the system
browser, which is the behavior we want: `src/lib/external-link.ts` treats even
our own subdomains as external so nobody gets trapped in the chromeless app
shell (Apple Guideline 4.2). Adding hosts here would undo that — don't.

`limitsNavigationsToAppBoundDomains` stays `false` because the OAuth round trip
leaves the app-bound domain, but the sign-in pages open through the Browser
plugin (`src/lib/native-oauth.ts`), never inside this webview.

## iPad keyboard insets (known cosmetic limit)

Keyboard avoidance uses `window.visualViewport` (`src/lib/keyboard-inset.ts`)
rather than `@capacitor/keyboard`. This is accurate on iPhone and for the
docked iPad keyboard, but split/floating iPad keyboards report no viewport
change, so an input can sit behind a floating keyboard. Accepted as cosmetic;
adding the plugin would require a native re-sync and a new parity entry.
Re-evaluate if a reviewer or user reports it.
