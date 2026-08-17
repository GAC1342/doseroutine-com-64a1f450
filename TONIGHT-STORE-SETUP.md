# DoseRoutine – Store Setup Checklist

## Why do this now?

- Reserves the app name "DoseRoutine" before someone else takes it.
- Lets you create subscription product IDs in Apple/Google.
- RevenueCat can only connect to stores after the app records exist.
- You do **not** upload the app binary yet and you do **not** submit for review yet.

---

## 1. Apple App Store Connect

**App Store App ID:** `6793807589`

1. Go to https://appstoreconnect.apple.com
2. Click **Apps** → **(+)** → **New App**
3. Fill in:
   - **Platform:** iOS
   - **App Name:** DoseRoutine
   - **Primary Language:** English (US)
   - **Bundle ID:** com.doseroutine.app
   - **SKU:** doseroutine-ios-2026
   - **User Access:** Full Access
4. Click **Create**
5. On the app page, go to **Monetization → Subscriptions**
6. Click **Create Subscription Group**
   - **Reference name:** `pro`
   - **Subscription group display name:** DoseRoutine Pro
   - Note the **Subscription Group ID** (e.g. `22258206`) — you do not need to paste it anywhere, but it confirms the group exists.
7. Inside that group, create two subscriptions:

   | Subscription            | Product ID    | Period  | Price  | Trial  |
   | ----------------------- | ------------- | ------- | ------ | ------ |
   | DoseRoutine Pro Monthly | `pro_monthly` | 1 Month | $9.99  | 7 days |
   | DoseRoutine Pro Yearly  | `pro_yearly`  | 1 Year  | $59.99 | 7 days |

8. For each subscription, set:
   - **Reference Name:** DoseRoutine Pro Monthly / Yearly
   - **Subscription Group:** `pro`
   - **Billing Type:** Auto-renewable
   - **Free Trial:** 7 days
9. Save. Status will say "Missing Metadata" or "Waiting for Review" — that is normal until a build is uploaded and reviewed.

### Connect RevenueCat to Apple (StoreKit 2)

RevenueCat now uses an **In-App Purchase Key** (`.p8`) for StoreKit 2.

1. In App Store Connect go to **Users and Access → Integrations → In-App Purchase**
2. Click **Generate In-App Purchase Key**
3. **Name:** `RevenueCat`
4. Download the `.p8` file (shown once)
5. In RevenueCat go to **Projects → DoseRoutine → Settings → Apps → iOS → App Store Connect Configuration**
6. Upload the `.p8` file and paste the **Key ID** and **Issuer ID**

The old **App-Specific Shared Secret** is legacy and optional for StoreKit 2; only add it if you are also supporting iOS 15 or StoreKit 1.

---

## 2. Google Play Console

**Developer account ID:** `7705492751128043194`  
**Developer name:** X-Developer

1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in:
   - **App name:** DoseRoutine
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free
4. Click **Create app**
5. In the left menu, go to **Monetization setup**
   - Turn on **In-app products** if it is not already on.
6. Go to **Products → Subscriptions**
7. Click **Create subscription**

   | Subscription            | Product ID    | Period  | Price  | Trial  |
   | ----------------------- | ------------- | ------- | ------ | ------ |
   | DoseRoutine Pro Monthly | `pro_monthly` | 1 Month | $9.99  | 7 days |
   | DoseRoutine Pro Yearly  | `pro_yearly`  | 1 Year  | $59.99 | 7 days |

8. For each subscription, set:
   - **Name:** DoseRoutine Pro Monthly / Yearly
   - **Description:** Unlock unlimited stacks, AI plans, calendar alarms, and interaction checks.
   - **Billing period:** Monthly / Yearly
   - **Default price:** $9.99 / $59.99
   - **Free trial:** 7 days
9. Click **Activate** for each subscription.

### Connect RevenueCat to Google Play

1. In Google Cloud create a service account with the **Finance** role.
2. In Google Play Console go to **Users and permissions → Invite new user** and invite that service account.
3. In RevenueCat go to **Projects → DoseRoutine → Settings → Apps → Android → Play Store Configuration**
4. Upload the service-account JSON file.

---

## 3. RevenueCat

You signed up / are signed in with **support@doseroutine.com**.

1. Go to https://app.revenuecat.com and open the DoseRoutine project.
2. Go to **Project settings → API keys**
   - Copy the **iOS SDK key** and **Android SDK key**
   - Paste them into Lovable **Project Settings → Secrets**:
     - `REVENUECAT_APPLE_KEY` = your iOS SDK key
     - `REVENUECAT_GOOGLE_KEY` = your Android SDK key
3. Go to **Products** and add:
   - iOS: `pro_monthly` and `pro_yearly`
   - Android: `pro_monthly` and `pro_yearly`
4. Go to **Entitlements** and create an entitlement called `pro`
5. Attach both monthly and yearly products to the `pro` entitlement.
6. Go to **Integrations** in the left sidebar → **+ Add integration** → search **Webhooks** → click **Webhooks**
   - **Webhook name:** `DoseRoutine Webhook`
   - **Webhook URL:** `https://doseroutine.com/api/public/payments/revenuecat-webhook`
   - For preview builds you can also add: `https://id-preview--b76a384e-67c0-4f04-b53e-b70d374f6ac7.lovable.app/api/public/payments/revenuecat-webhook`
   - **Authorization header:** `5967259370a599d9af4c37c1ec1d6792849b4b61a4efe528719a4be5ded44a48`
   - Enable these events: `INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `UNCANCELLATION`, `SUBSCRIPTION_EXTENDED`, `TEMPORARY_ENTITLEMENT_GRANT`, `CANCELLATION`, `EXPIRATION`, `SUBSCRIPTION_PAUSED`, `BILLING_ISSUE`, `TRANSFER`
7. In RevenueCat, create an **Offering** called `default` and add two packages:
   - `monthly` → `pro_monthly`
   - `annual` → `pro_yearly`

---

## 4. Should you connect Stripe to RevenueCat?

**Short answer:** Not required.

- Stripe already handles web payments on doseroutine.com.
- RevenueCat will handle Apple/Google mobile payments.
- Connecting Stripe to RevenueCat is mainly if you want one unified dashboard of all revenue. You can skip it for now and add it later.

---

## 5. What to send me when you are done

Reply with these values so I can wire them into the app:

1. RevenueCat iOS SDK key
2. RevenueCat Android SDK key
3. RevenueCat webhook auth token (or confirm you pasted it into Lovable secrets as `REVENUECAT_WEBHOOK_AUTH`)
4. Confirmation that these product IDs exist in both stores:
   - `pro_monthly`
   - `pro_yearly`

---

## 6. What NOT to do yet

- Do **not** upload the app binary until RevenueCat is wired and tested.
- Do **not** fill out the full app store listing yet if it is still in progress.
- Do **not** submit for review.
- Do **not** worry if subscriptions say "Missing Metadata" or "Waiting for Review" — Apple reviews subscriptions together with the uploaded app binary.
