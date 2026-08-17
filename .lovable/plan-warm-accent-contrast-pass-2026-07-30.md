# Warm accent + contrast pass

## What I found

The design system already contains a full warm palette — it's just barely used.

- `--cta` (deep coral), `--cta-tint`, `--pro` (amber), `--pro-tint`, `--warning`, `--caution` all exist in `src/styles.css`.
- Across the whole app: **748 uses of teal** (`text-primary` / `bg-primary`) vs **26 uses of coral** and **4 of amber** — and every one of those warm uses sits inside paywall, upgrade, trial-expired, or install-modal screens.
- So the warm accent is currently a "money color" only. Every other screen (Today, Stack, Timeline, Library) is 100% teal-on-gray, which is exactly the flat feeling described.

Nothing needs redesigning. The fix is redistributing accent usage and tightening typographic contrast.

## The plan

### 1. Split the warm accent into two roles

Today `--cta` means "pay us". Introduce a second semantic token, `--accent-warm` (amber-leaning coral, its own tint), reserved for *momentum and attention* — non-commercial warmth. `--cta` stays coral and stays exclusively for upgrade/paywall so the money moments don't lose their meaning.

### 2. One warm pop per screen

Apply the warm accent to exactly one focal element per view:

| Screen | Warm element |
|---|---|
| Today | Streak flame + streak number (currently muted) |
| Today | Primary "Log dose" / mark-taken action on the next-due card only — remaining actions stay quiet |
| Stack | Caution / interaction chips lean warm instead of neutral amber-gray |
| Timeline | Current-day marker and adherence highlight |
| Upgrade / Pro | Crown + Pro badge in amber (already correct — leave alone) |
| Library / public | Nothing warm; these stay clinical teal |

Everything else stays teal. The rule to hold the line: if a second warm element appears in a view, one of them is wrong.

### 3. Push contrast harder (the minimal half)

- Headings: darken the display token a step and raise weight from `semibold` to `bold` at h1/h2, keeping the existing `-0.01em` tracking.
- Widen the gap between heading ink and `--muted-foreground` so hierarchy reads at a glance instead of everything sitting mid-gray.
- Numeric/stat values (dose counts, streak, adherence %) get the display font at a heavier weight — these are the things users scan for.
- Slightly stronger card border on light mode so white cards separate from the warm off-white page without adding shadow.

### 4. Verify

- Contrast-check every new warm pairing against WCAG AA (the coral currently used for filled buttons was already tuned for this; the new accent gets the same treatment for both light and dark).
- Run the existing axe/a11y suite and the mobile regression e2e spec.
- Screenshot Today, Stack, and the homepage before/after so the change is visible rather than asserted.

## Technical notes

- New tokens defined in `src/styles.css` under `:root` and `.dark`, exposed through `@theme inline` as `--color-accent-warm` / `--color-accent-warm-tint`. No hardcoded hex in components.
- Changes are token + className only — no logic, no data, no route changes.
- Dark mode gets its own lightened warm values, same as the existing `--cta` / `--pro` pattern.

## Open question

Should the warm accent lean **coral** (closer to the existing `--cta`, more energetic) or **amber** (closer to `--pro`, warmer/calmer and more clinical)? I'd pick amber for a med-tracking app — it keeps coral unambiguously the "upgrade" color — but say the word if you want coral.
