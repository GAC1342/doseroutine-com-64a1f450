#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import plistlib
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("check-healthkit-access.py")
SPEC = importlib.util.spec_from_file_location("check_healthkit_access", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Could not load {SCRIPT}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class HealthKitAccessTests(unittest.TestCase):
    def values_for(self, value: object = None, *, include: bool = True) -> list[str]:
        entitlements = {}
        if include:
            entitlements[MODULE.ENTITLEMENT] = value
        with tempfile.NamedTemporaryFile(suffix=".plist") as handle:
            plistlib.dump({"Entitlements": entitlements}, handle)
            handle.flush()
            return MODULE.clinical_access_values(Path(handle.name))

    def test_absent_key_is_allowed(self) -> None:
        self.assertEqual(self.values_for(include=False), [])

    def test_empty_array_from_ordinary_healthkit_profile_is_allowed(self) -> None:
        self.assertEqual(self.values_for([]), [])

    def test_clinical_health_records_value_is_rejected(self) -> None:
        self.assertEqual(self.values_for(["health-records"]), ["health-records"])


class MainTests(unittest.TestCase):
    def run_main(self, profile_value: object, app_value: object | None) -> int:
        import sys

        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory) / "profile.plist"
            with profile.open("wb") as handle:
                plistlib.dump({"Entitlements": {MODULE.ENTITLEMENT: profile_value}}, handle)
            app = Path(directory) / "App.entitlements"
            entitlements: dict[str, object] = {}
            if app_value is not None:
                entitlements[MODULE.ENTITLEMENT] = app_value
            with app.open("wb") as handle:
                plistlib.dump(entitlements, handle)
            argv = sys.argv
            sys.argv = ["check-healthkit-access.py", str(profile), str(app)]
            try:
                return MODULE.main()
            finally:
                sys.argv = argv

    def test_profile_only_clinical_flag_passes(self) -> None:
        self.assertEqual(self.run_main(["health-records"], None), 0)

    def test_app_requesting_clinical_access_fails(self) -> None:
        self.assertEqual(self.run_main(["health-records"], ["health-records"]), 1)

    def test_clean_profile_passes(self) -> None:
        self.assertEqual(self.run_main([], None), 0)


if __name__ == "__main__":
    unittest.main()