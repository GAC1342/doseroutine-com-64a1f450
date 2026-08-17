# App Store Submission — Handoff

Everything DoseRoutine needs to ship to the **Apple App Store** and **Google Play**.
Follow the sections top-to-bottom. Anything marked **[Do it yourself]** cannot be
done inside the Lovable project — you'll do it in Apple / Google / RevenueCat
consoles.

---

## 1. What's already done inside the app

- ✅ Native shell (Capacitor) targets `com.doseroutine.app`, bundled `dist/` build.
- ✅ In-app **account deletion** button (Apple 5.1.1(v) requirement).
- ✅ Mandatory **medical disclaimer gate** (Apple 1.4.1 / Google Health).
- ✅ Pre-permission **notification priming** card (higher opt-in vs cold prompt).
- ✅ Platform-aware **paywall**: iOS/Android → RevenueCat IAP, Web → Stripe.
- ✅ RevenueCat SDK wired to Supabase auth (`useRevenueCatIdentity`).
- ✅ RevenueCat webhook handler at `/api/public/payments/revenuecat-webhook`
  syncing purchases → `subscriptions` table.
- ✅ `subscriptions` table extended with `provider`, `store_transaction_id`,
  `entitlement`, `revenuecat_app_user_id`.
- ✅ Server-side account deletion cancels Stripe subscription + wipes auth user.
- ✅ `PrivacyInfo.xcprivacy` staged in `ios-privacy/` (copy into Xcode project).

---

## 2. RevenueCat setup **[Do it yourself]** — 30 min

1. Create a free account at https://app.revenuecat.com and a project called **DoseRoutine**.
2. Add **two apps** inside the project:
   - iOS app, bundle ID `com.doseroutine.app`
   - Android app, package name `com.doseroutine.app`
3. Copy the two **public SDK keys** (they look like `appl_xxx` and `goog_xxx`) into
   your project **Secrets** (Project Settings → Secrets):
   - `REVENUECAT_APPLE_KEY`
   - `REVENUECAT_GOOGLE_KEY`
4. Create an **entitlement** called `plus` (exact spelling — the code depends on it).
5. Create products in App Store Connect / Google Play (see step 3 below), then
   add them to RevenueCat under **Products** → attach them to the `plus`
   entitlement, then bundle them into an **Offering** called `default` with two
   packages: `$rc_weekly` and `$rc_annual`.
6. **Webhook**: Project Settings → Integrations → Webhooks. Point it at:
   `https://doseroutine.com/api/public/payments/revenuecat-webhook`
   For the Authorization header, paste the value of `REVENUECAT_WEBHOOK_AUTH`
   (already generated and stored as a runtime secret in your project — the
   value is visible under Project Settings → Secrets so you can copy it).

---

## 3. Apple App Store **[Do it yourself]** — half a day

1. **Apple Developer Program** — $99/yr at https://developer.apple.com.
2. **App Store Connect** → Apps → **+ New App**.
   - Bundle ID: `com.doseroutine.app`
   - Primary language: English (U.S.)
   - Category: Health & Fitness
3. **Subscriptions** → create a group **DoseRoutine Plus** with two auto-renewables:
   - `plus_weekly` — $2.99/week, **3-day free trial** (Introductory Offer → Free)
   - `plus_yearly` — $59.99/year
4. **App Privacy** questionnaire → pull answers from `ios-privacy/PrivacyInfo.xcprivacy`.
5. **Sign & Bank agreements** → Paid Apps agreement + tax forms (required for IAP).
6. **Build**:
   ```bash
   bun run build
   npx cap sync ios
   npx cap open ios
   # In Xcode: copy ios-privacy/PrivacyInfo.xcprivacy into App/App/
   # Set Signing Team, then Product → Archive → Distribute → App Store Connect.
   ```
7. **TestFlight** internal test → submit for review.

---

## 4. Google Play **[Do it yourself]** — half a day

1. **Google Play Console** — $25 one-time at https://play.google.com/console.
2. Create app: package `com.doseroutine.app`, Health & Fitness.
3. **Subscriptions** — same two SKUs (`plus_weekly`, `plus_yearly`) with a
   3-day free trial base plan on the weekly.
4. **Data Safety** form → declare Email, Health, User content; no tracking.
5. **Build**:
   ```bash
   bun run build
   npx cap sync android
   npx cap open android
   # In Android Studio: Build → Generate Signed Bundle → AAB → upload to Play.
   ```

---

## 5. Store listing copy

Already drafted in `store-listing.md` — copy/paste screenshots + description
into both stores.

---

## 6. Post-launch verification

Once approved, sanity-check in a real installed build:

- [ ] Sign up → medical disclaimer gate appears → accept → proceeds.
- [ ] Notification priming card appears → accept → OS prompt fires.
- [ ] Upgrade tab shows RevenueCat weekly + yearly (not Stripe).
- [ ] Buy the weekly plan with a sandbox account → `subscriptions` row appears
      with `provider = 'revenuecat'`, `tier = 'plus'`, `status = 'active'`.
- [ ] Delete account → row + auth user gone; RevenueCat sub stays until user
      cancels in device Settings (as the UI warns them).

---

## 7. Renewal cadence

Re-submit to the stores whenever:

- Native version, permissions, or plugins change.
- Icons or splash change.
- IAP product SKUs change.

Everything else (UI, content, library, prices for **web** users) ships
automatically via the normal Lovable publish flow — the native build no longer
points at the live URL, so store review isn't triggered by web-only changes.

---

## iOS `Info.plist` — required permission strings

After running `npx cap sync ios`, open `ios/App/App/Info.plist` in Xcode
(right-click → Open As → Source Code) and add these keys inside the top-level
`<dict>`. Apple **rejects** builds that request a capability without a
`*UsageDescription` string.

```xml
<key>NSUserNotificationsUsageDescription</key>
<string>DoseRoutine sends reminders when it's time to take your compounds. You can turn these off any time in Settings.</string>

<key>NSCameraUsageDescription</key>
<string>DoseRoutine uses the camera so you can take a profile photo.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>DoseRoutine reads photos so you can pick a profile picture from your library.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>DoseRoutine saves your exported reports and stack summaries back to your Photos library.</string>

<key>NSFaceIDUsageDescription</key>
<string>DoseRoutine uses Face ID to unlock your stack quickly and privately.</string>

<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

The last key (`ITSAppUsesNonExemptEncryption = false`) skips the export
compliance questionnaire on every TestFlight upload — DoseRoutine only uses
Apple-provided HTTPS, which qualifies for the exemption.

---

## Regenerating icons and splash screens

One source image (`assets/icon.png`, 1024×1024) generates every iOS and
Android size:

```bash
bun run icons        # runs @capacitor/assets, writes into ios/ and android/
npx cap sync
```

The script seeds `assets/icon.png` from `public/doseroutine-app-icon.png`
automatically if it's missing.

Optional inputs for richer output:

- `assets/splash.png` — 2732×2732, logo centered on brand background.
- `assets/icon-fg.png` — 1024×1024 transparent PNG, safe zone ≤ 640×640
  (used as the Android adaptive-icon foreground).

---

## Native error reporting (Sentry)

Set `VITE_SENTRY_DSN` in `.env.production` (and the CI env) to turn on
crash + error capture. Leave it unset and Sentry is a hard no-op — no
network calls, no bundle cost beyond the tiny init shim.

Native iOS/Android automatically use `@sentry/capacitor` which wraps
`@sentry/react`; web uses `@sentry/react` directly.
