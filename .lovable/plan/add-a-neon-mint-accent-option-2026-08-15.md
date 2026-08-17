# Add a "Neon Mint" accent option

Short answer: yes, it's doable — with one adjustment. Every other accent is a mid-dark color with white text on top. True neon mint is very bright, so white text on it would be unreadable. The fix is to pair neon mint with dark text instead of white, which is exactly how Apple and Nothing handle their bright greens. It stays neon; the text just flips dark.

## What gets added

- A new **Neon Mint** swatch in Settings > Appearance, alongside Teal, Blue, Turquoise, Indigo, Green, Violet, Graphite.
- Marked **Pro**, matching every accent beyond the two free ones.
- Light mode: bright mint fill, near-black text on top.
- Dark mode: the same mint glows against the dark background; still dark text on filled buttons.
- Safety colors (avoid / caution / note / synergy) and the upgrade coral stay untouched, as with all themes.

## Where the neon shows and where it's toned down

Neon at full strength on large filled surfaces (big buttons, active nav) gets glary on a phone at night. So:

- Filled buttons, active states, progress rings: full neon mint.
- Small text links and thin icons on white: a slightly deeper mint of the same hue, so they stay readable at small sizes.

This is the only real "difficulty" in the color, and it's handled by having two shades of the same hue rather than one.

## Technical notes

- New `[data-theme="mint"]` and `.dark[data-theme="mint"]` blocks in `src/styles.css` defining `--primary`, `--primary-hover`, `--primary-tint`, `--primary-foreground`, `--ring`.
- New entry in `COLOR_THEMES` in `src/lib/theme.ts` (`id: "mint"`, `pro: true`).
- The existing theme test suite (`src/lib/__tests__/theme-palettes.test.ts`) already enforces both blocks exist, the full token set is declared, severity/money tokens are not overridden, and primary/primary-foreground clears 4.5:1 contrast — this theme will be tuned until it passes unchanged.
- No component changes; everything reads from tokens already.

## One thing to confirm

The earlier photo's mint: do you want it electric/highlighter-bright, or the softer seafoam mint? I'll default to the brighter one and can dial it back after you see it live.
