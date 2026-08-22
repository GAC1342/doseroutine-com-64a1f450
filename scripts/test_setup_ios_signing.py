#!/usr/bin/env python3
"""Regression checks for the direct Apple signing setup."""

from __future__ import annotations

import ast
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("setup-ios-signing.py")


class SigningApiRequestTests(unittest.TestCase):
    def test_required_capabilities_use_apple_api_enum_values(self) -> None:
        tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
        required_capabilities: set[str] | None = None

        for node in tree.body:
            if not isinstance(node, ast.Assign):
                continue
            if not any(
                isinstance(target, ast.Name) and target.id == "REQUIRED_CAPABILITIES"
                for target in node.targets
            ):
                continue
            value = ast.literal_eval(node.value)
            required_capabilities = set(value)
            break

        self.assertIsNotNone(required_capabilities)
        self.assertEqual(
            required_capabilities,
            {"APPLE_ID_AUTH", "ASSOCIATED_DOMAINS", "HEALTHKIT"},
        )
        self.assertNotIn("SIGN_IN_WITH_APPLE", required_capabilities)

    def test_bundle_relationships_have_no_query_parameters(self) -> None:
        tree = ast.parse(SCRIPT.read_text(encoding="utf-8"))
        relationship_calls: list[ast.Call] = []

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if node.func.attr != "list_data" or not node.args:
                continue
            path = ast.unparse(node.args[0])
            if "/bundleIds/" in path:
                relationship_calls.append(node)

        self.assertEqual(len(relationship_calls), 2)
        for call in relationship_calls:
            self.assertEqual(
                len(call.args),
                1,
                "Apple rejects query parameters on these bundle relationship endpoints",
            )
            self.assertFalse(call.keywords)


if __name__ == "__main__":
    unittest.main()