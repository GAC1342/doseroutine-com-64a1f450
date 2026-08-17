# Homepage: remove upfront trial/pricing and lead with free signup

## The problem

The homepage hero currently says:  
"7-day free trial, then $9.99/mo — no card to start."

That is inaccurate for the first click. The real flow is:

```text
/auth      -> free account, email or Google, no card asked
/onboarding -> profile questions
/trial     -> optional Pro trial (card required), with a skip into the free app
```

Leading with price and a day-7 clock before a visitor has seen the product creates a paywall impression and likely suppresses signups.

## What to change

**1. Homepage hero and supporting copy**

- Replace the hero subhead trial/pricing line with a free-to-start message.
- Keep the primary CTA button as "Sign up free" (already correct).
- Add a short trust line below the button: "No card needed. 7-day Pro trial is optional after signup."
- Remove "$9.99/mo" and "7-day free trial" from the homepage trust bar, footer, and any homepage-only feature cards.

**2. Public sitewide CTA card (`SignupCta`)**

- Change the aria-label from "Start your free trial" to "Sign up free".
- Keep the body copy "Free to start — no card needed."
- The button already says "Sign up free"; leave it.

**3. About DoseRoutine block**

- Replace "7-day free trial at doseroutine.com" with "Sign up free at doseroutine.com" so every indexed page matches the new homepage promise.

**4. What does NOT change**

- `/trial` keeps the full 7-day Pro trial pitch and pricing — that is the right place for it.
- The in-app welcome card's "Try Pro free for 7 days" button stays.
- Pricing page, RevenueCat, Stripe, and access logic stay untouched.

## Files touched

- `src/lib/i18n.ts` — `heroBody`, `freeForever`, `trustBarFree` in all supported locales.
- `src/routes/index.tsx` — any hardcoded homepage hero or trust-bar strings (if they bypass i18n).
- `src/components/signup-cta.tsx` — aria-label only.
- `src/components/about-doseroutine-block.tsx` — link text.

## Verification

- Typecheck and existing tests pass.
- Screenshot the homepage hero in light and dark mode to confirm the new copy reads cleanly and no pricing appears above the fold.
- Spot-check `/trial` still shows the 7-day trial and $9.99/$59.99 pricing.
