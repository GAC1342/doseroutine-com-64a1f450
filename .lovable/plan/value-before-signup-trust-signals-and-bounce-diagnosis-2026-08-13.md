# Value-before-signup, trust signals, and bounce diagnosis

Three connected changes: let people finish a tool before any signup ask, add real trust signals (your photo + testimonial, app screenshots, usage numbers), and find out which pages actually bounce before touching anything else.

## 1. Value first, gate the "save" step

The interaction checker and the reconstitution calculator already work fully without an account — the problem is the ask, not the gate. Both pages currently lead with "Sign up free" in the header and repeat it as the main CTA.

Changes:
- Remove the top-right "Sign up free" button from the interaction checker and calculator pages. Those headers keep only the logo and back link, so nothing competes with the tool itself.
- After a user gets a real result (2+ compounds selected, or a calculation produced), show a contextual save prompt directly under the result: "Save this check to your stack" / "Save this vial to your inventory" with a short line on what saving gets them (reminders, re-checks when the stack changes, PDF export).
- The save prompt appears only after a result exists — never on page load, never blocking the answer.
- Track it as a distinct funnel event (`funnel_save_gate_shown`, `funnel_save_gate_click`) so we can compare its conversion against the generic sitewide CTA.
- The generic sitewide signup block stays at the very bottom of these pages, below the tool and the save prompt.

## 2. Trust signals

New `<Testimonials />` component, using your attached photo (uploaded as a CDN asset, not committed as a binary):

> "Built because tracking by memory and calendar alone wasn't enough to get serious about my life longevity."
> — Alexander D., Canada

Placement: homepage (below the hero, above the feature grid), auth page, and the sitewide signup CTA block on compound/library pages.

Also on the homepage:
- Real device screenshots — Today view, interaction result, injection site map — shot at iPhone dimensions in a phone frame, so the app looks like a product and not a promise.
- A concrete, honest usage line pulled from real data (compounds in the library, interaction rules, pages of sourced content) rather than an invented user count.

## 3. Where the bounce actually is (do this first)

Before any further homepage work, pull page-level analytics to split traffic by landing page: homepage vs library/compound pages vs calculators vs blog. If the bounce sits on library pages arriving from Google, that is normal informational search behaviour, and the fix is the in-content save gate from step 1 — not homepage styling. I will report the split before implementing step 1's copy, so the CTA wording matches where people actually land.

## Technical notes

- Photo goes through `lovable-assets create` from the upload mount; the component imports the pointer JSON.
- Save-prompt component is shared between the checker and calculator, driven by a `hasResult` prop.
- Device screenshots captured headless against the running app, saved as project assets with explicit width/height (existing CLS guard requires it).
- New funnel steps added to the `FunnelStep` union in `src/lib/funnel.ts`.
- No design-token changes; all colors stay on existing tokens.
