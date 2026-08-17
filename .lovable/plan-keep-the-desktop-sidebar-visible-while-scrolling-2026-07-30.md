# Keep the desktop sidebar visible while scrolling

## Problem

On desktop the left navigation is part of the normal page flow, so it scrolls away with the content. On mobile the bottom tab bar is already fixed and stays visible.

## What changes

The desktop sidebar becomes pinned to the left edge of the screen:

- It stays in place at full window height while the main content scrolls.
- If the nav list is ever taller than the window (small laptop screens, admin link visible), the sidebar itself scrolls internally so the language switcher at the bottom stays reachable.
- The language switcher stays anchored to the bottom of the sidebar.
- Mobile is untouched — the bottom tab bar keeps working exactly as it does now.

## Technical detail

Single file: `src/components/app-shell.tsx`.

- Add `md:sticky md:top-0 md:h-dvh md:overflow-y-auto` to the existing `<aside>` (it already has `hidden w-60 shrink-0 border-r md:flex md:flex-col`). Sticky is used rather than `fixed` so the existing flex layout keeps reserving the 15rem column with no extra offset math.
- Add `min-w-0` to the `<main>` element so long content can't push the flex row wider and break the sticky column.

## Verification

- Screenshot `/today` at desktop width scrolled to the bottom and confirm the sidebar is still on screen.
- Confirm mobile viewport still renders the bottom tab bar and no sidebar.
