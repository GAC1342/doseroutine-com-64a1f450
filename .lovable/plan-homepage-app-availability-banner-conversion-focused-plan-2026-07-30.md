# Homepage App-Availability Banner — Conversion-Focused Plan

## Goal
Add a homepage element that tells visitors DoseRoutine is available as a mobile app and drives them to install/add-to-homescreen, while protecting store-approval compliance and maximizing measurable conversion.

## What we will build

### 1. Hero "Get the app" strip (all viewports)
- Placement: directly beneath the primary + secondary hero CTAs, above the trust micro-copy.
- Content:
  - Apple + Google app icons (custom, **not** official store badges — compliance-safe until approved).
  - Headline: "Get DoseRoutine on your phone"
  - Subline: "iPhone and Android apps are in final review. Until then, add the web app to your home screen in 2 taps."
  - Primary action: "Add to home screen" (triggers the PWA install prompt on supported browsers; falls back to an iOS/Android instruction modal).
  - Secondary action: "Get notified when store apps launch" — opens a one-field email capture that drops into `closed_testing_signups` or a new `app_launch_waitlist` table.
- Styling: compact card with teal tint (`bg-primary/5`, `border-primary/20`), uses existing design tokens, no hardcoded colors.
- Tracking: `trackEvent` calls for `app_banner_impression`, `app_banner_add_homescreen_click`, `app_banner_waitlist_submit`.

### 2. Dismissible sticky mobile banner (mobile only)
- Appears after the user scrolls past the hero (reuses existing `showSticky` logic or a new independent state).
- Copy: "Add DoseRoutine to your home screen for the app experience."
- One tap opens the install modal/prompt; an X dismisses it for the session (`sessionStorage`).
- Safe-area aware, sits above the existing sticky CTA if both are shown, or replaces it on this path.
- Tracking: `mobile_install_sticky_impression`, `mobile_install_sticky_click`, `mobile_install_sticky_dismiss`.

### 3. PWA install helper modal (`/install` route reuse)
- Reuse or extend the existing `/install` page content as a modal.
- Detects iOS Safari vs Android Chrome vs desktop and shows the correct steps/screenshots.
- Provides the email waitlist form as a fallback for unsupported browsers.

### 4. Backend waitlist endpoint
- New server function `joinAppLaunchWaitlist` in `src/lib/app-launch.functions.ts`.
- Inserts into a new `app_launch_waitlist` table with `email`, `platform` (ios/android/other), `utm_source`, `created_at`.
- RLS: authenticated/anon insert allowed; only service_role can read.
- Sends a confirmation email via existing email infrastructure if available; otherwise just stores the row for manual export.

### 5. Analytics / measurement
- All clicks tracked via existing `trackEvent` with device type and UTM params.
- Add a dashboard metric on `/admin/analytics` (if it exists) or `/admin/testers` showing waitlist count and add-to-homescreen clicks.

## What we will NOT do
- Use official "Download on the App Store" / "Get it on Google Play" badges before the apps are actually live — both platforms restrict this and it can hurt approval.
- Promise a specific launch date.
- Make the banner non-dismissible or cover the primary CTA.

## Files expected to change
- `src/routes/index.tsx` — add hero strip and mobile sticky banner.
- `src/components/app-install-modal.tsx` — new modal component (or extend existing install page).
- `src/lib/app-launch.functions.ts` — new server function.
- New migration for `app_launch_waitlist` table with RLS + grants.
- `src/lib/analytics.ts` event names documented (if not already).

## Success metric
- Primary: increase in homepage-to-signup/auth conversion (banner should not lower existing hero CTA clicks).
- Secondary: waitlist signups and add-to-homescreen clicks tracked per device/UTM.
