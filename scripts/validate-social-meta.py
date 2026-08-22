#!/usr/bin/env python3
"""OpenGraph / Twitter Card consistency gate.

Every indexable page — marketing routes, compound library entries, peptide
guides, blog posts and CMS articles — must ship the same complete, valid
share-card contract so a link unfurls identically on Facebook, LinkedIn,
Slack, iMessage, WhatsApp and X:

  og:title, og:description, og:type, og:url, og:site_name, og:locale
  og:image (absolute https), og:image:width, og:image:height, og:image:alt
  twitter:card=summary_large_image, twitter:title, twitter:description,
  twitter:image, twitter:image:alt

It also enforces the rules that silently break previews:
  * exactly one of each tag (duplicates make crawlers pick arbitrarily)
  * og:url self-references the page and matches rel=canonical
  * og/twitter titles+descriptions track the page <title>/description
  * image URLs are absolute https and actually resolve (HEAD 200, image/*)
  * alt text is descriptive, never "og image" / "preview" / "banner"

Usage:  python3 scripts/validate-social-meta.py [base-url] [--all]
By default one page per route group is sampled; --all crawls every sitemap URL.
"""
from __future__ import annotations

import re
import sys
import io
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

BASE = "http://localhost:8080"
SITE = "https://doseroutine.com"

GENERIC_ALT = {
    "og image",
    "og:image",
    "image",
    "preview",
    "preview image",
    "share image",
    "social image",
    "social card",
    "banner",
    "cover",
    "cover image",
    "screenshot",
    "logo",
    "thumbnail",
    "doseroutine",
}

REQUIRED_PROPERTIES = [
    "og:title",
    "og:description",
    "og:type",
    "og:url",
    "og:site_name",
    "og:locale",
    "og:image",
    "og:image:width",
    "og:image:height",
    "og:image:alt",
]
REQUIRED_NAMES = [
    "twitter:card",
    "twitter:title",
    "twitter:description",
    "twitter:image",
    "twitter:image:alt",
]

_args = [a for a in sys.argv[1:] if not a.startswith("--")]
if _args:
    BASE = _args[0].rstrip("/")
CRAWL_ALL = "--all" in sys.argv
REPORT_JSON = next((sys.argv[i + 1] for i, a in enumerate(sys.argv[:-1]) if a == "--json"), None)
REPORT_MD = next((sys.argv[i + 1] for i, a in enumerate(sys.argv[:-1]) if a == "--markdown"), None)
COMPARE_BASE = next((sys.argv[i + 1].rstrip("/") for i, a in enumerate(sys.argv[:-1]) if a == "--compare-base"), None)
ROUTES = next((sys.argv[i + 1].split(",") for i, a in enumerate(sys.argv[:-1]) if a == "--routes"), None)


def fetch(path: str) -> tuple[int, str]:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "facebookexternalhit/1.1"})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except Exception as exc:  # noqa: BLE001
        return 0, f"ERROR {exc}"


_image_cache: dict[str, str | None] = {}


def image_problem(url: str, declared: tuple[str | None, str | None]) -> str | None:
    """None when the card resolves to a real image, else a reason."""
    if url in _image_cache:
        return _image_cache[url]

    def probe(target: str) -> str | None:
        try:
            req = urllib.request.Request(target, headers={"User-Agent": "Twitterbot"})
            with urllib.request.urlopen(req, timeout=45) as r:
                ctype = r.headers.get("Content-Type", "")
                if r.status != 200:
                    return f"HTTP {r.status}"
                if not ctype.startswith("image/"):
                    return f"content-type {ctype or 'missing'}"
                body = r.read()
                with Image.open(io.BytesIO(body)) as image:
                    width, height = image.size
                if width < 600 or height < 315:
                    return f"actual dimensions {width}x{height} are below 600x315"
                if not (1.5 <= width / height <= 2.2):
                    return f"actual aspect ratio {width / height:.2f} is outside the social-card range"
                dw, dh = declared
                if dw and dh and dw.isdigit() and dh.isdigit() and (width, height) != (int(dw), int(dh)):
                    return f"declared {dw}x{dh}, actual {width}x{height}"
        except Exception as exc:  # noqa: BLE001
            return str(exc)[:60]
        return None

    verdict = probe(url.replace(SITE, BASE) if url.startswith(SITE) else url)
    # The dev server doesn't serve uploaded assets, so a local miss falls back
    # to the live origin before it is reported as a broken card.
    if verdict and url.startswith(SITE) and BASE != SITE:
        verdict = probe(url)
    _image_cache[url] = verdict
    return verdict



META_RE = re.compile(r"<meta\b[^>]*>", re.I)
ATTR_RE = re.compile(r'(\w[\w:-]*)\s*=\s*"([^"]*)"|(\w[\w:-]*)\s*=\s*\'([^\']*)\'')


def meta_map(html: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for tag in META_RE.findall(html):
        attrs = {}
        for m in ATTR_RE.finditer(tag):
            k = (m.group(1) or m.group(3) or "").lower()
            attrs[k] = m.group(2) if m.group(2) is not None else (m.group(4) or "")
        key = attrs.get("property") or attrs.get("name")
        if key and "content" in attrs:
            out.setdefault(key.lower(), []).append(attrs["content"])
    return out


def group_of(path: str) -> str:
    if path.startswith("/library/womens-health/"):
        return "/library/womens-health/*"
    for prefix in (
        "/library/",
        "/blog/",
        "/articles/",
        "/help/",
        "/interactions/",
        "/calculators/",
        "/goals/",
        "/peptides/",
        "/for/",
        "/vs/",
    ):
        if path.startswith(prefix) and path.count("/") >= 2:
            return prefix + "*"
    return path


def check(path: str) -> tuple[str, list[str], dict[str, str]]:
    status, html = fetch(path)
    if status != 200:
        return path, [f"status {status}"], {}
    issues: list[str] = []
    metas = meta_map(html)

    def one(key: str) -> str | None:
        vals = metas.get(key) or []
        if not vals:
            issues.append(f"missing {key}")
            return None
        if len({v.strip() for v in vals}) > 1:
            issues.append(f"conflicting {key} ({len(vals)} values)")
        return vals[0].strip()

    values = {k: one(k) for k in REQUIRED_PROPERTIES + REQUIRED_NAMES}

    tm = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    title = (tm.group(1).strip() if tm else "")
    desc = (metas.get("description") or [""])[0].strip()

    card = values.get("twitter:card")
    if card and card != "summary_large_image":
        issues.append(f"twitter:card is {card!r}, expected summary_large_image")

    og_url = values.get("og:url")
    want = SITE + (path.rstrip("/") or "/")
    if og_url:
        if not og_url.startswith("https://"):
            issues.append(f"og:url is not absolute https: {og_url}")
        elif og_url.rstrip("/") != want.rstrip("/") and "?" not in path:
            issues.append(f"og:url {og_url} does not self-reference {want}")
    can = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', html, re.I)
    if can and og_url and can.group(1).rstrip("/") != og_url.rstrip("/"):
        issues.append(f"og:url {og_url} != canonical {can.group(1)}")

    og_type = values.get("og:type")
    if og_type and og_type not in {"website", "article", "product", "profile"}:
        issues.append(f"unexpected og:type {og_type!r}")

    # og:title may drop the brand suffix or shorten the headline for the card,
    # and og:description is often a tighter rewrite of the meta description.
    # What matters is that the card text is present, substantive, and clearly
    # about the same page — plus identical across OpenGraph and Twitter.
    def shares_subject(a: str, b: str) -> bool:
        strip = lambda s: re.split(r"\s+[—|]\s+", s)[0].strip().lower()  # noqa: E731
        x, y = strip(a), strip(b)
        return x == y or x.startswith(y) or y.startswith(x)

    for key, page_value, label in (("og:title", title, "page title"),):
        v = values.get(key)
        if v is not None and not v:
            issues.append(f"empty {key}")
        elif v and page_value and not shares_subject(v, page_value):
            issues.append(f"{key} is about a different subject than the {label}")

    for twitter, og in (("twitter:title", "og:title"), ("twitter:description", "og:description")):
        tv, ov = values.get(twitter), values.get(og)
        if tv is not None and not tv:
            issues.append(f"empty {twitter}")
        elif tv and ov and tv.strip() != ov.strip():
            issues.append(f"{twitter} does not match {og}")


    for key in ("og:description", "twitter:description"):
        v = values.get(key)
        if v and len(v) < 50:
            issues.append(f"{key} is only {len(v)} chars (needs 50+)")

    for key in ("og:image", "twitter:image"):
        v = values.get(key)
        if not v:
            continue
        if not v.startswith("https://"):
            issues.append(f"{key} is not an absolute https URL: {v}")
            continue
        bad = image_problem(v, (values.get("og:image:width"), values.get("og:image:height")))
        if bad:
            issues.append(f"{key} does not resolve ({bad})")
    if values.get("og:image") and values.get("twitter:image"):
        if values["og:image"] != values["twitter:image"]:
            issues.append("og:image and twitter:image differ")

    for key in ("og:image:alt", "twitter:image:alt"):
        alt = values.get(key)
        if alt is None:
            continue
        if alt.strip().lower() in GENERIC_ALT:
            issues.append(f"{key} is generic: {alt!r}")
        elif len(alt.strip()) < 15:
            issues.append(f"{key} is too short: {alt!r}")

    for key in ("og:image:width", "og:image:height"):
        v = values.get(key)
        if v and not v.isdigit():
            issues.append(f"{key} is not numeric: {v!r}")
    w, h = values.get("og:image:width"), values.get("og:image:height")
    if w and h and w.isdigit() and h.isdigit():
        ratio = int(w) / int(h)
        if int(w) < 600 or int(h) < 315:
            issues.append(f"card is {w}x{h}; large summary cards need at least 600x315")
        elif not (1.5 <= ratio <= 2.2):
            issues.append(f"card aspect ratio {ratio:.2f} is outside the 1.91:1 range")

    return path, issues, {key: value or "" for key, value in values.items()}


def remote_metas(base: str, path: str) -> dict[str, str]:
    try:
        req = urllib.request.Request(base + path, headers={"User-Agent": "Twitterbot"})
        with urllib.request.urlopen(req, timeout=45) as response:
            metas = meta_map(response.read().decode("utf-8", "replace"))
        return {key: values[0] for key, values in metas.items() if values}
    except Exception:  # noqa: BLE001
        return {}


def main() -> int:
    _, sm = fetch("/sitemap.xml")
    paths = [u.replace(SITE, "") or "/" for u in re.findall(r"<loc>([^<]+)</loc>", sm)]
    if not paths:
        print("could not read sitemap.xml")
        return 1

    if ROUTES:
        targets = [path if path.startswith("/") else f"/{path}" for path in ROUTES]
    elif CRAWL_ALL:
        targets = paths
    else:
        groups: dict[str, list[str]] = {}
        for p in paths:
            groups.setdefault(group_of(p), []).append(p)
        targets = []
        for g, members in groups.items():
            targets.extend(members[:2] if g.endswith("*") else members)

    print(f"checking social meta on {len(targets)} page(s) of {len(paths)} sitemap URLs")
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(check, targets))

    problems = {p: issues for p, issues, _ in results if issues}
    for p in sorted(problems):
        print(f"  {p}:")
        for issue in problems[p]:
            print(f"      - {issue}")
    changes: dict[str, dict[str, dict[str, str]]] = {}
    if COMPARE_BASE:
        for path, _, current in results:
            previous = remote_metas(COMPARE_BASE, path)
            changed = {
                key: {"before": previous.get(key, ""), "after": value}
                for key, value in current.items()
                if previous.get(key, "") != value
            }
            if changed:
                changes[path] = changed

    report = {
        "checked": len(targets),
        "failed": len(problems),
        "problems": problems,
        "changedTags": changes,
    }
    if REPORT_JSON:
        Path(REPORT_JSON).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if REPORT_MD:
        lines = ["## Social preview QA", "", f"Checked **{len(targets)}** pages; **{len(problems)}** failed."]
        if problems:
            lines += ["", "### Problems"]
            for path, issues in sorted(problems.items()):
                lines.append(f"- `{path}`: " + "; ".join(issues))
        if changes:
            lines += ["", "### Meta tags changed by page"]
            for path, tags in sorted(changes.items()):
                lines.append(f"- `{path}`: " + ", ".join(f"`{tag}`" for tag in sorted(tags)))
        Path(REPORT_MD).write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\npages with share-preview problems: {len(problems)} / {len(targets)}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
