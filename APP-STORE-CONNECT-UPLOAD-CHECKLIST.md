# App Store Connect Upload Checklist — DoseRoutine

Use this checklist the day you submit. Check each box as you go.

---

## 1. Before you build

- [ ] Confirm Apple Developer Program membership is active and paid.
- [ ] Confirm App ID `com.doseroutine.app` is registered in Certificates, Identifiers & Profiles.
- [ ] Confirm App Record exists in App Store Connect with:
  - **Name:** DoseRoutine App
  - **SKU:** doseroutine2026
  - **Bundle ID:** com.doseroutine.app
  - **User Access:** Full access enabled

---

## 2. RevenueCat final check

- [ ] `REVENUECAT_APPLE_KEY` is saved as a runtime secret in Lovable.
- [ ] iOS subscription products are created in App Store Connect:
  - Pro Yearly: $59.99/year
  - 14-day free trial enabled
- [ ] Subscription Group ID `22258206` is linked in RevenueCat dashboard.
- [ ] RevenueCat App Store Connect API key (.p8) + Issuer ID are configured in RevenueCat.
- [ ] Webhook `https://doseroutine.com/api/public/payments/revenuecat-webhook` shows green checkmark in RevenueCat.

---

## 3. Build the iOS app (no Mac — use Codemagic)

- [ ] Push latest code to GitHub.
- [ ] Open [codemagic.io](https://codemagic.io) and authenticate with GitHub.
- [ ] Add the DoseRoutine repo as an app in Codemagic.
- [ ] Upload or link your Apple Developer credentials:
  - App Store Connect API key (.p8)
  - Issuer ID
  - Key ID
- [ ] Use workflow file `codemagic.yaml` (or build settings):
  - Build scheme: `App`
  - iOS version: 16.0+
  - Distribution method: App Store Connect
- [ ] Add environment variables in Codemagic:
  - `REVENUECAT_APPLE_KEY`
  - `REVENUECAT_GOOGLE_KEY` (optional for iOS-only build)
- [ ] Start the build.
- [ ] Download the `.ipa` artifact when it succeeds.

---

## 4. Upload to App Store Connect

- [ ] Use the Codemagic iOS workflow only. Do **not** manually upload an `.ipa` with Transporter unless the Codemagic logs proved the DR icon passed.
- [ ] In the successful Codemagic logs, confirm both icon proof lines are present:
  ```text
  DR_ICON_PREUPLOAD_GATE_PASSED
  APPLE_EXTRACTED_ICON_GATE_PASSED
  ```
- [ ] If either line is missing, stop and rebuild from the newest source. Do not submit that build.
- [ ] Wait 10–30 minutes for processing.
- [ ] Refresh App Store Connect → App → TestFlight → confirm build appears.

---

## 5. Fill in App Store Connect metadata

### Required app information

- [ ] **Name:** DoseRoutine App
- [ ] **Subtitle:** (e.g., "Supplement & Dose Tracker")
- [ ] **Category:** Health & Fitness
- [ ] **Content Rights:** Confirm you own all content.
- [ ] **Age Rating:** 12+ (health & fitness reference; no medical claims).

### Pricing and availability

- [ ] **Price:** Free
- [ ] **Availability:** All countries/regions you want.

### App Privacy

- [ ] Privacy policy URL: `https://doseroutine.com/privacy`
- [ ] Data types collected: Email, Health & Fitness (optional), User ID.
- [ ] Account deletion: Confirm users can delete accounts in app (More → Delete Account).

### iOS App

- [ ] Screenshots uploaded for:
  - 6.7" (iPhone 14 Pro Max / 15 Pro Max) — required
  - 6.5" (iPhone 11 Pro Max / 12/13/14 Plus)
  - 5.5" (iPhone 8 Plus)
  - iPad Pro 12.9" 2nd gen and 6th gen (if supporting iPad)
- [ ] Promotional text, description, keywords, support URL, marketing URL filled in.
- [ ] Build selected in the iOS App section.

---

## 6. App Review Information

- [ ] **Sign-in required:** Yes
- [ ] **Demo account email:** `appreview@doseroutine.com`
- [ ] **Demo account password:** `DoseReview2026!`
- [ ] **Notes for reviewer:**
  > This app includes a 14-day free trial for DoseRoutine Pro. The provided demo account is grandfathered and skips the paywall so you can access all features during review. Subscription management is handled via RevenueCat and Apple In-App Purchase.
- [ ] **Contact information:** your email/phone.

---

## 7. Prepare for submission

- [ ] No test ads, no placeholder text, no broken links.
- [ ] All in-app purchases are in "Ready to Submit" state.
- [ ] Subscription group is in "Ready to Submit" state.
- [ ] App icon, build, screenshots, metadata all green.
- [ ] Review the app on a real device or simulator for crashes.

---

## 8. Submit for Review

- [ ] Click **Add to Review** in App Store Connect.
- [ ] Confirm all items in the modal are checked.
- [ ] Click **Submit to App Review**.
- [ ] Typical review time: 24–48 hours for new apps, sometimes longer.

---

## 9. After submission

- [ ] Watch email for App Review messages.
- [ ] If rejected, read the exact reason, fix it, and resubmit.
- [ ] Once approved, set release to manual or automatic as desired.

---

## Blue icon emergency rule

- [ ] Do not rebuild or select build 53 again.
- [ ] Only use a brand-new build where Codemagic shows both icon proof lines above.
- [ ] Apple approval does not fix a wrong icon. If the build is validated and still blue without those proof lines, the build is not trusted.
- [ ] If both proof lines are present but the page still shows blue, Apple's thumbnail cache is the only thing left to wait on.

---

## Quick reference

| Field              | Value                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Bundle ID          | `com.doseroutine.app`                                                 |
| SKU                | `doseroutine2026`                                                     |
| Review email       | `appreview@doseroutine.com`                                           |
| Review password    | `DoseReview2026!`                                                     |
| Privacy policy     | `https://doseroutine.com/privacy`                                     |
| Support URL        | `https://doseroutine.com/contact` or `mailto:support@doseroutine.com` |
| RevenueCat webhook | `https://doseroutine.com/api/public/payments/revenuecat-webhook`      |

---

Print this page or keep it open while you submit. Good luck.
