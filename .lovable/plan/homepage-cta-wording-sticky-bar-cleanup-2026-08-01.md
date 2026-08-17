# Homepage CTA wording + sticky bar cleanup

## What I found (verified in the code, not guessed)

You are showing **three different promises** for the same button:

| Where | Text | Colour |
|---|---|---|
| Hero button (`i18n.ts` → `ctaPrimary`) | "Start 7-day free trial" | Coral |
| Sitewide CTA card (`signup-cta.tsx`) | "Start free 7-day trial" | Coral |
| Mobile sticky bar (`i18n.ts` → `stickyCta`) | "Start free stack" | **Teal** (uses `bg-primary`, not the coral `bg-cta` token) |

So yes — two (really three) different messages, and the sticky one is also the wrong colour.

**More important: the wording does not match what actually happens.**

The real flow is:

```text
/auth  ->  free account, email or Google, NO card asked
/onboarding  ->  profile questions
/trial  ->  Stripe checkout, card required for the 7-day Pro trial
            ...but this screen has a "skip" that drops you into /today free
```

Signing up costs nothing and asks for no card. The card only appears one screen
later, and it is skippable. But the very first button a stranger sees says
"Start 7-day free trial", which most people read as "give me your card now".
That is a real friction point, and it is inaccurate for the step it sits on.

## What to change

**1. First-touch buttons stop selling the trial, start selling the free account.**

- Hero + sitewide CTA + sticky bar all say the same thing: **"Sign up free"**
  with sub-text "No card needed — 7-day Pro trial optional".
- Secondary link stays "Sign in".
- All three use the coral `--cta` token so the primary action is one consistent colour.

Why this and not "Try Pro for free": "Try Pro for free" still implies a paid
product gate at step one. "Sign up free" matches reality (free account, no card),
which is the version that survives a scam-sensitive audience. The Pro pitch still
happens — one screen later, on `/trial`, where it is true.

**2. Keep the sticky bar, but only one at a time.**

The sticky bar earns its place on mobile (the hero scrolls away fast). But right
now it can stack with the install banner and it contradicts the hero. Fix:
same text, same coral, and hide the sticky CTA while the install banner is open
so only one bottom element is visible at a time.

**3. Trial language moves to where it is honest.**

- `/auth` signup headline changes from "Start your 7-day free trial" to
  **"Create your free account"** with "Free to start — no card required".
- `/trial` keeps every word of the current 7-day trial pitch. Nothing there changes.

**4. Welcome moment after signup.**

- On the first `/today` load after onboarding, show a dismissable welcome card:
  free account confirmed, what is unlocked, and a coral "Try Pro free for 7 days"
  button into `/trial`.
- When they actually start the trial (`/today?trial=started`), the card instead
  says "Welcome to your 7-day Pro free trial" with the feature list — the exact
  message you described.

**5. Measure it instead of guessing.**

The `trackEvent` funnel already fires `cta_click`, `trial_insight_shown`,
`trial_start_click`. I will add a `cta_variant` label to the click events so the
admin funnel can show signup-rate before vs after this change. If free-account
wording brings in signups but fewer trials, you will see it in the numbers rather
than having to trust a copy opinion.

## Technical notes

- Copy lives in `src/lib/i18n.ts` (`ctaPrimary`, `ctaSecondary`, `stickyCta`,
  `stickyCtaAlt`) across all 8 locales — each needs the equivalent change, not just English.
- `src/components/signup-cta.tsx` — headline, body and button label.
- `src/routes/index.tsx` — sticky bar: swap `bg-primary` for `bg-cta`, and gate it
  on `!showInstallSticky`.
- `src/routes/auth.tsx` — signup headline, sub-copy, and the head `title` /
  `og:title` meta (currently "Start your 7-day DoseRoutine trial").
- New `src/components/welcome-card.tsx`, rendered in
  `src/routes/_authenticated/today.tsx`, dismissal stored in localStorage.
- No change to `/trial`, Stripe, RevenueCat, or any access logic.

## Not doing

- No change to pricing, trial length, or the card-required Pro trial itself.
- No removal of the sticky bar — it converts on mobile; it just needs to agree
  with the hero.
