# DoseRoutine iOS Icon Failure Report

## Purpose

This report summarizes the repeated iOS/TestFlight app icon failure so it can be sent to Lovable support for review of credits used on unsuccessful repair attempts.

## What failed

DoseRoutine iOS builds repeatedly reached App Store Connect/TestFlight with Apple showing a generic blue placeholder icon instead of the DoseRoutine DR app icon.

The user reported this across many build attempts, including screenshots showing Build 58 and Build 61 still displaying the placeholder icon in App Store Connect.

## User impact

- Repeated failed Codemagic/TestFlight builds.
- Repeated Lovable credit usage attempting to repair the same native iOS icon issue.
- Significant time lost over roughly 1.5 days.
- App Store/TestFlight submission progress blocked by an unresolved branding/icon problem.

## Confirmed technical findings

The audit confirmed the master DoseRoutine icon asset itself was valid:

- `public/icon-master-dr.png` is 1024×1024.
- The icon is fully opaque.
- The source `assets/` copies match the DR master icon.

The persistent risk was in the native iOS packaging path:

- Capacitor can generate a minimal/default iOS AppIcon catalog.
- The local `verify:icons` command previously depended on generated native state and could miss the exact Apple-facing catalog state.
- Apple reads the compiled native `AppIcon` catalog and extracted build icons, not just the web/PWA icon.
- The strongest Apple-side verification can only happen after upload/processing, so pre-upload gates must prove the local archive and signed IPA before upload, and post-upload verification must fail loudly if Apple extracts anything else.

One local audit also uncovered a verifier bug: the opacity check was using Sharp channel statistics in a way that falsely read RGB data as alpha for RGB PNGs. That could create misleading verification behavior. This was corrected to inspect raw RGBA alpha bytes directly.

After Build 61 still showed the generic blue placeholder, a deeper asset audit found a remaining Apple-risky source-art issue: the DR icon image still contained a faint baked-in rounded-corner outline/ring near the outer edges. Apple expects full-square app icon artwork and applies the rounded mask itself. That outer-edge artifact is now removed from `public/icon-master-dr.png`, all native source icon inputs, and the generated iOS `AppIcon.appiconset`.

A separate packaging audit also confirmed the Codemagic/Xcode pipeline is now generating the correct binary-facing app icon resources. If App Store Connect still shows the blue placeholder after a new build, the likely remaining cause is outside the repo files: the App Store version/listing may still be attached to an older build, or Apple's App Store Connect thumbnail/cache may not have reprocessed the newly uploaded build icon yet.

## What was changed for the final repair attempt

The repair made the iOS AppIcon path deterministic and auditable:

1. The native iOS icon generator now writes a complete Apple AppIcon catalog from `public/icon-master-dr.png`.
2. The generator creates all required iPhone, iPad, and 1024×1024 iOS marketing icons.
3. Every generated PNG is checked for:
   - exact required dimensions
   - full opacity / no alpha transparency
   - non-blank visible pixels
4. The native verifier now validates the exact Apple AppIcon slot matrix instead of only checking that some icons exist.
5. The verifier fails if the 1024×1024 marketing icon is missing, wrong-sized, transparent, blank, placeholder-like, or different from the DR master.
6. `Info.plist` is pinned to `CFBundleIconName = AppIcon` for iPhone and iPad.
7. Legacy icon file lists and `UIPrerenderedIcon` are removed so Apple cannot follow stale icon metadata.
8. Codemagic now removes stale iOS icon/build artifacts before rewriting the DR AppIcon catalog.
9. Codemagic clears Xcode DerivedData before the archive icon lock so stale compiled `Assets.car` output cannot survive.
10. Local `npm run verify:icons` now runs the same deterministic iOS icon rewrite and verifier.
11. The master DR icon was cleaned to remove the baked rounded-corner outline/ring from the outer edge.
12. The local, native, archive, and IPA verifiers now fail if any bright rounded-edge artifact remains.

## Current validation result

The local native icon verification now passes with these proof points:

```text
Master DR icon: 1024×1024 png
Master DR icon alpha range: 255-255
iOS AppIcon Contents.json image entries: 18
iOS AppIcon.appiconset contains 18 PNG(s)
iOS AppIcon AppIcon-1024.png corner RGB: (7, 119, 134)
iOS AppIcon AppIcon-1024.png bright rounded-edge artifact pixels: 0
iOS marketing icon perceptual distance from DR master: 0 / 64
iOS marketing icon exact pixel delta from DR resize: meanAbs=0.00, rms=0.00
Xcode ASSETCATALOG_COMPILER_APPICON_NAME values: AppIcon
Xcode ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS values: YES
Xcode INFOPLIST_KEY_CFBundleIconName values: AppIcon
Info.plist CFBundleIconName: AppIcon
OK — DR branding confirmed in native icon assets.
```

## Request to Lovable support

Please review the credit usage for the repeated unsuccessful attempts to fix the same DoseRoutine iOS/TestFlight icon issue. The user reports approximately 58 failed attempts before this final audit and repair. The issue repeatedly consumed credits without resolving the visible App Store Connect/TestFlight placeholder icon.

The post-Build-61 audit indicates the code/build pipeline had been repeatedly fixed around native packaging, but the visible App Store Connect symptom may also depend on App Store version build selection and Apple-side icon reprocessing/caching, which the repo cannot force directly.

The request is for Lovable support to review the history, failed attempts, and credit usage, then determine whether a credit adjustment is appropriate.

## Relevant files changed or verified

- `scripts/force-ios-app-icons.mjs`
- `scripts/verify-native-icons.mjs`
- `scripts/verify-ios-ipa-icon.mjs`
- `codemagic.yaml`
- `package.json`
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json`
- `ios/App/App/Info.plist`

## Next required action

Trigger a fresh Codemagic iOS build with a new build number. Do not judge the result from Build 58 because Apple already processed that build. The next build must show the DR icon after App Store Connect finishes processing.

After the fresh build appears in App Store Connect, confirm the App Store version's selected build is the newest build number, save it, and allow Apple time to reprocess the listing/TestFlight thumbnail. If the build's internal icon gates pass but the web UI still shows blue, the next escalation should be App Store Connect support with the build number and the passing icon-gate logs.
