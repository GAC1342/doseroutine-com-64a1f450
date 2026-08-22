# iOS real-device smoke checklist (pre-submission)

Automated coverage: `npx playwright test e2e/ios-keyboard-device-smoke.spec.ts`
(emulated iPhone 390x844 and iPad 1024x1366, fake Capacitor Keyboard plugin +
visualViewport fallback). It cannot emulate the real UIKit keyboard, hardware
keyboards, or Safari's predictive-text bar — run the pass below on hardware
once before submitting.

## Devices

- iPhone with a notch/Dynamic Island (iOS 17+)
- iPad with the keyboard **undocked** and **split**, plus one run with a
  hardware keyboard attached

## 1. Keyboard inset

- [ ] Focus a field on Library search, Stack editor, Food search, Auth sign-in,
      and AI chat. The field stays visible; nothing jumps or oscillates while
      typing (predictive-text bar toggling must not cause a scroll loop).
- [ ] Dismiss the keyboard (swipe down and Done). Layout returns to full height
      with no leftover gap at the bottom.
- [ ] iPad undocked/floating: the layout still reserves space or scrolls the
      field clear — this is the `visualViewport` fallback path.
- [ ] Hardware keyboard attached: no phantom inset (bottom gap) appears.

## 2. Bottom controls

- [ ] Bottom tab bar hides while the keyboard is open and returns after it
      closes.
- [ ] The Stack editor's sticky **Save** bar sits directly above the keyboard
      and is tappable, not behind it.
- [ ] Any sheet with a bottom action row (Add to workout, meal edit, paywall)
      keeps its primary button reachable.
- [ ] Rotate to landscape with the keyboard open and back — no clipped controls.

## 3. In-app navigation

- [ ] Every internal link, breadcrumb, and footer affordance navigates inside
      the app; nothing bounces out to Safari.
- [ ] Paywall Terms/Privacy open in-sheet, not as a full app reload.
- [ ] Genuinely external links (research citations, support email) open in the
      system browser/mail app.
- [ ] Edge-swipe back gesture works from a detail screen back to its list.
- [ ] Deep link (universal link) into a compound page from Notes/Messages lands
      on the right screen with breadcrumbs intact.

## 4. Fresh-install sanity

- [ ] Delete the app, reinstall, launch with airplane mode on: no white screen,
      no hang; an offline notice or cached content is shown.
- [ ] Launch signed out: onboarding completes without a dead end.
- [ ] Deny camera permission on the barcode scanner: a clear recovery message
      appears, no crash.

Record pass/fail per line and attach screenshots of anything that fails.
