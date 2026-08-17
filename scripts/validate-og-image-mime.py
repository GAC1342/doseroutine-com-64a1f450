#!/usr/bin/env python3
"""Offline CI check: every file under public/og/ must have a supported
image extension (.jpg/.jpeg/.png/.webp) AND its on-disk magic bytes must
match that extension's MIME type.

This guards against:
  - Renaming a PNG to .jpg (crawlers reject the mismatch)
  - Uploading unsupported formats (AVIF, GIF, SVG, HEIC) that break
    Facebook/Twitter/iMessage/Android link previews
  - Zero-byte or truncated files

Usage:
    python3 scripts/validate-og-image-mime.py
"""
from __future__ import annotations

import sys
from pathlib import Path

OG_DIR = Path(__file__).resolve().parent.parent / "public" / "og"

# Supported: extension -> (expected MIME, list of magic-byte signatures)
SUPPORTED: dict[str, tuple[str, list[bytes]]] = {
    ".jpg":  ("image/jpeg", [b"\xff\xd8\xff"]),
    ".jpeg": ("image/jpeg", [b"\xff\xd8\xff"]),
    ".png":  ("image/png",  [b"\x89PNG\r\n\x1a\n"]),
    ".webp": ("image/webp", []),  # checked separately: RIFF....WEBP
}


def detect_mime(head: bytes) -> str | None:
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    if head.startswith(b"GIF87a") or head.startswith(b"GIF89a"):
        return "image/gif"
    if len(head) >= 12 and head[4:8] == b"ftyp" and head[8:12] in (b"avif", b"avis"):
        return "image/avif"
    if len(head) >= 12 and head[4:8] == b"ftyp" and head[8:12] in (b"heic", b"heix", b"mif1"):
        return "image/heic"
    if head.lstrip().startswith(b"<svg") or head.lstrip().startswith(b"<?xml"):
        return "image/svg+xml"
    return None


def main() -> int:
    if not OG_DIR.is_dir():
        print(f"FAIL: {OG_DIR} does not exist", file=sys.stderr)
        return 1

    files = sorted(p for p in OG_DIR.iterdir() if p.is_file())
    if not files:
        print(f"FAIL: no files found under {OG_DIR}", file=sys.stderr)
        return 1

    failures: list[str] = []
    for path in files:
        ext = path.suffix.lower()
        rel = f"public/og/{path.name}"

        if ext not in SUPPORTED:
            failures.append(
                f"{rel}: unsupported extension '{ext}' "
                f"(allowed: {', '.join(sorted(SUPPORTED))})"
            )
            continue

        try:
            head = path.read_bytes()[:32]
        except OSError as exc:
            failures.append(f"{rel}: read error: {exc}")
            continue

        if not head:
            failures.append(f"{rel}: empty file (0 bytes)")
            continue

        expected_mime = SUPPORTED[ext][0]
        detected = detect_mime(head)

        if detected is None:
            failures.append(
                f"{rel}: unrecognized magic bytes (expected {expected_mime}); "
                f"first bytes = {head[:12]!r}"
            )
            continue

        if detected != expected_mime:
            failures.append(
                f"{rel}: extension says {expected_mime} but file is {detected} "
                f"— rename the file or re-export in the correct format"
            )
            continue

        print(f"OK  {rel}  ({detected})")

    print(f"\nChecked {len(files)} file(s) under public/og/.", flush=True)

    if failures:
        print(f"\nFAIL: {len(failures)} og:image file(s) failed validation:", file=sys.stderr)
        for msg in failures:
            print(f"  - {msg}", file=sys.stderr)
        return 1

    print("OK: every public/og/* file has a supported extension and matching MIME.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
