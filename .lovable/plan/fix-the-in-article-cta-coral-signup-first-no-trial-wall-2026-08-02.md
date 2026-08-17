# Fix the in-article CTA: coral, signup-first, no trial wall

You're right on both counts. That box on library pages is teal (it reads blue in dark mode) and it leads with "free for 7 days", which tells a first-time visitor there's a paywall clock before they've even seen the product. On a public, search-landed page the ask should be "sign up free", and money/trial language belongs after signup.

## What changes

**1. The library article callout (the box in your screenshot)**

- Recolor from teal/primary to the coral CTA color already in the design system (the same coral used on "Sign up free" buttons) — coral border, coral tint background, coral link.
- New copy:
  "Taking **[Compound]** alongside other supplements, TRT, or peptides? **Get access to all DoseRoutine tools — sign up free.**"
- The link becomes a real coral button pointing at signup, with the interaction checker named as what they get, instead of a bare underlined text link.

**2. Same fix on the other public callouts that carry the trial wall**

For consistency across everything a search engine or AI can land on:

- Women's health compound articles and the women's health hub card — drop "free for 7 days", switch to "sign up free", use the coral CTA token instead of the hardcoded `hsl(var(--accent, 12 78% 60%))` inline styles (that fallback isn't a real token in this project).
- The comparison pages (`/vs/medisafe`, `/vs/mytherapy`, `/vs/round-health`, `/vs/pill-reminder`, `/vs/cronometer`) and the public calculators (TRT dosage, peptide reconstitution) — their "Try DoseRoutine free for 7 days" buttons become "Get started free".
- The home page meta description drops "Try free for 7 days" in favor of free-to-start wording.

**3. What does NOT change**

Trial messaging stays where it's honest and useful — after the visitor is in: the auth page reassurance line, the in-app welcome card ("Try Pro free for 7 days"), and the upgrade/pricing pages. Free tier stays free; nothing about billing changes.

## Technical notes

- Color comes from the existing `--cta` token (deep coral, `oklch(0.57 0.185 44)`, AA-contrast with white text) via `bg-cta` / `text-cta-foreground` / `hover:bg-cta-hover`. No hardcoded hex or `text-white`.
- Files touched: `src/routes/library.$slug.tsx` (lines ~805-820), `src/components/womens-compound-article.tsx`, `src/components/womens-hub-page.tsx`, the five `src/routes/vs.*.tsx` files, `src/routes/trt-dosage-calculator.tsx`, `src/routes/peptide-reconstitution-calculator.tsx`, `src/routes/index.tsx` (meta description), and the women's-health FAQ answer that repeats the trial line.
- CTA destination: `/auth` (signup) rather than `/interaction-checker`, so the click matches the promise. The checker is named in the copy as the payoff.
- Verify with a typecheck, the existing test suite, and a screenshot of a library page in both light and dark mode to confirm the coral reads correctly.
