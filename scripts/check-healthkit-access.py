#!/usr/bin/env python3
"""Reject actual clinical Health Records access in an Apple entitlement plist.

Apple may include ``com.apple.developer.healthkit.access`` with an empty array
when ordinary HealthKit is enabled. The key's presence alone therefore does not
mean that clinical records access was granted.
"""

from __future__ import annotations

import plistlib
import sys
from pathlib import Path


ENTITLEMENT = "com.apple.developer.healthkit.access"


def clinical_access_values(plist_path: Path) -> list[str]:
    with plist_path.open("rb") as handle:
        payload = plistlib.load(handle)

    entitlements = payload.get("Entitlements", payload)
    if not isinstance(entitlements, dict):
        raise ValueError("plist does not contain an entitlements dictionary")

    value = entitlements.get(ENTITLEMENT)
    if value in (None, False, ""):
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(item) for item in value if str(item).strip()]
    return [str(value)]


APP_ENTITLEMENTS = Path("ios/App/App/App.entitlements")


def main() -> int:
    if len(sys.argv) not in (2, 3):
        print(
            f"Usage: {Path(sys.argv[0]).name} path/to/profile.plist [path/to/App.entitlements]",
            file=sys.stderr,
        )
        return 2

    path = Path(sys.argv[1])
    app_path = Path(sys.argv[2]) if len(sys.argv) == 3 else APP_ENTITLEMENTS

    try:
        profile_values = clinical_access_values(path)
    except (OSError, plistlib.InvalidFileException, ValueError) as exc:
        print(f"ERROR: could not inspect HealthKit access entitlement: {exc}", file=sys.stderr)
        return 2

    app_values: list[str] = []
    if app_path.exists():
        try:
            app_values = clinical_access_values(app_path)
        except (OSError, plistlib.InvalidFileException, ValueError) as exc:
            print(f"ERROR: could not inspect app entitlements: {exc}", file=sys.stderr)
            return 2

    if app_values:
        print(
            "ERROR: the app entitlements request clinical Health Records access: "
            + ", ".join(app_values),
            file=sys.stderr,
        )
        print(
            f"FIX: remove {ENTITLEMENT} from {app_path}. The app does not use "
            "Health Records and Apple rejects unapproved clinical access.",
            file=sys.stderr,
        )
        return 1

    if profile_values:
        # Signing uses the app's entitlements, which must be a subset of the
        # profile's. Extra capabilities carried by the Apple-generated profile
        # are unused and do not break App Store archiving.
        print(
            "WARNING: the provisioning profile carries clinical Health Records "
            "access (" + ", ".join(profile_values) + "). The app does not request "
            "it, so signing continues."
        )
        return 0

    print("OK: no clinical Health Records access is enabled (absent or empty entitlement).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())