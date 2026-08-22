# Workout illustration modal — VoiceOver & TalkBack test script

Manual pass for the workout-type illustration thumbnail and its full-size
modal (`src/components/exercise-art-lightbox.tsx`). Run it whenever that
component, the workout log sheet, or the shadcn dialog primitive changes.

The automated proxy for this script is `e2e/exercise-art-screenreader.spec.ts`
(accessibility tree, focus moves, duplicate-text detection). CI cannot drive a
real screen reader, so the device pass below is still required before release.

## Expected announcements

| Step                                             | VoiceOver (iOS)                                                          | TalkBack (Android)                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Swipe to thumbnail                               | "Enlarge Yoga illustration. `<caption sentence>`, button, pop-up dialog" | "Enlarge Yoga illustration. `<caption sentence>`, button, collapsed / activates dialog" |
| Activate (double-tap)                            | "Yoga illustration, full size, dialog. `<caption sentence>`"             | "Yoga illustration, full size, dialog. `<caption sentence>`"                            |
| Swipe right inside                               | "Close, button" → "Yoga" → "`<caption sentence>`"                        | same order                                                                              |
| Swipe past last item                             | Stays inside the dialog (does not reach page content)                    | Stays inside the dialog                                                                 |
| Close (Escape / Close / two-finger scrub / back) | "Enlarge Yoga illustration…, button" — focus is back on the thumbnail    | same                                                                                    |

The caption sentence must be read **once** on entry and **once** more only if
the user swipes to the caption itself. Hearing it three times means the image
regained an `alt` or a hidden duplicate description came back.

## iOS — VoiceOver

1. Settings → Accessibility → VoiceOver → On (or triple-click the side button).
2. Open DoseRoutine, go to **Fitness**, tap the **Log a workout** button, pick
   **Yoga**.
3. Swipe right until you reach the illustration thumbnail. Confirm the row-1
   announcement above; the word "image" must not be spoken (the bitmap is
   decorative).
4. Double-tap. Confirm focus moves into the dialog and the row-2 announcement.
5. Swipe right through the dialog; confirm order and that swiping never leaves
   the dialog into the workout form behind it.
6. Use the rotor → Headings: "Yoga illustration" is present as the dialog title.
7. Two-finger scrub (or activate **Close**). Confirm focus returns to the
   thumbnail and it is re-announced.
8. Repeat with **Speak Screen** off/on and at the largest Dynamic Type size to
   check nothing is clipped or unreachable.

## Android — TalkBack

1. Settings → Accessibility → TalkBack → On.
2. Same navigation: Fitness → Log a workout → Yoga.
3. Swipe right to the thumbnail; confirm the row-1 announcement, including the
   "activates dialog" hint (from `aria-haspopup="dialog"`).
4. Double-tap; confirm the dialog announcement and that TalkBack focus is
   trapped inside it (swipe right repeatedly; it should wrap within the dialog).
5. Use **Reading controls → Headings** to confirm the dialog title is exposed.
6. Press the system Back gesture; confirm the dialog closes and the thumbnail
   is re-announced with "collapsed".
7. Repeat with Font size = largest and Display size = largest.

## Failure triage

- **Caption read twice on entry** — an `aria-describedby` target duplicated by a
  visually-hidden `DialogDescription`. Keep exactly one, and point it at the
  visible `<figcaption>`.
- **"image" announced** — the modal or thumbnail `<img>` lost `alt=""` /
  `aria-hidden="true"`.
- **Focus stays on the page after opening** — the dialog is not receiving
  initial focus; check the Radix `DialogContent` is mounted, not custom markup.
- **Swiping escapes the dialog** — `aria-modal`/inert on background content was
  removed; do not hand-roll focus trapping, use the shadcn dialog.
- **Focus lost after closing** — `onCloseAutoFocus` no longer restores
  `triggerRef`.

## Record of manual passes

| Date      | Build | Device / OS        | Reader    | Result | Notes |
| --------- | ----- | ------------------ | --------- | ------ | ----- |
| _pending_ |       | iPhone / iOS 18    | VoiceOver |        |       |
| _pending_ |       | Pixel / Android 15 | TalkBack  |        |       |
