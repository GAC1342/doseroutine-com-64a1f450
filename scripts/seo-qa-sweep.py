#!/usr/bin/env python3
"""Full SEO/AEO QA sweep: crawls SSR HTML for every sitemap URL group and
checks content depth, canonical self-reference, FAQ Q&A markup, JSON-LD
validity, home navigation, and rich-result eligibility signals.

Optionally measures Core Web Vitals (LCP/CLS/INP) in headless Chromium and
reports every page over Google's "good" thresholds with a concrete fix:

    python3 scripts/seo-qa-sweep.py 3 --vitals        # sample pages
    python3 scripts/seo-qa-sweep.py 3 --vitals 12     # cap vitals pages
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser

BASE = "http://localhost:8080"
SITE = "https://doseroutine.com"
_ARGS = sys.argv[1:]
SAMPLE_PER_GROUP = int(_ARGS[0]) if _ARGS and _ARGS[0].isdigit() else 3
VITALS = "--vitals" in _ARGS
VITALS_LIMIT = 10
if VITALS:
    _i = _ARGS.index("--vitals")
    if len(_ARGS) > _i + 1 and _ARGS[_i + 1].isdigit():
        VITALS_LIMIT = int(_ARGS[_i + 1])

# Google's "good" Core Web Vitals thresholds. VITALS_THRESHOLD_SCALE loosens
# them when measuring an unoptimised dev server (no minification, on-demand
# transforms), where absolute numbers are not comparable to production.
import os

VITALS_THRESHOLD_SCALE = float(os.environ.get("VITALS_THRESHOLD_SCALE", "1"))
VITALS_THRESHOLDS = {
    "lcp": 2500.0 * VITALS_THRESHOLD_SCALE,
    "cls": 0.1,
    "inp": 200.0 * VITALS_THRESHOLD_SCALE,
}
VITALS_UNITS = {"lcp": "ms", "cls": "", "inp": "ms"}



def fetch(path: str) -> tuple[int, str]:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Googlebot"})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, f"ERROR {e}"


class Text(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.skip = 0
        self.buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript") and self.skip:
            self.skip -= 1

    def handle_data(self, d):
        if not self.skip:
            self.buf.append(d)


def visible_words(html: str) -> int:
    p = Text()
    p.feed(html)
    return len(" ".join(p.buf).split())


def jsonld(html: str) -> tuple[list, list[str]]:
    blocks, errs = [], []
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.S | re.I,
    ):
        raw = m.group(1).strip()
        try:
            blocks.append(json.loads(raw))
        except Exception as e:  # noqa: BLE001
            errs.append(str(e))
    return blocks, errs


def flatten(node, out):
    if isinstance(node, list):
        for n in node:
            flatten(n, out)
    elif isinstance(node, dict):
        if "@graph" in node:
            flatten(node["@graph"], out)
        if "@type" in node:
            out.append(node)


def group_of(path: str) -> str:
    if path.startswith("/library/womens-health/"):
        return "/library/womens-health/*"
    for prefix in ("/library/", "/blog/", "/articles/", "/help/", "/interactions/",
                   "/calculators/", "/goals/", "/peptides/", "/for/", "/vs/"):
        if path.startswith(prefix) and path.count("/") >= 2:
            return prefix + "*"
    return path


def recommend(metric: str, sample: dict) -> str:
    """Actionable, page-specific advice for a failing metric."""
    if metric == "lcp":
        el = sample.get("lcpElement") or "the hero element"
        return (
            f"LCP element is {el}. Preload/prioritise it (fetchpriority=\"high\", no lazy-load), "
            "serve it as a sized AVIF/WebP, and make sure it is server-rendered, not fetched "
            "client-side. Cut render-blocking CSS/JS above it."
        )
    if metric == "cls":
        shifters = ", ".join(sample.get("shifters") or []) or "unknown nodes"
        return (
            f"Layout shifted around: {shifters}. Reserve space with width/height or aspect-ratio "
            "on media and embeds, avoid injecting banners above existing content, and use "
            "font-display: optional/swap with a matched fallback metric."
        )
    return (
        "Interaction stayed blocked on the main thread. Split large route bundles, defer "
        "non-critical hydration/analytics, and break long tasks with scheduler.yield or "
        "requestIdleCallback."
    )


def run_vitals(paths: list[str]) -> int:
    """Measure Core Web Vitals for `paths`; returns 1 when a threshold is exceeded."""
    print(f"\ncore web vitals: measuring {len(paths)} page(s) (mobile emulation)")
    try:
        proc = subprocess.run(
            ["node", "scripts/collect-web-vitals.mjs", BASE, *paths],
            capture_output=True,
            text=True,
            timeout=900,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"  vitals collection failed to start: {exc}")
        return 1
    if proc.returncode != 0 or not proc.stdout.strip():
        print(f"  vitals collection failed: {proc.stderr.strip()[:400]}")
        return 1
    payload = json.loads(proc.stdout)

    failures = 0
    for sample in payload["results"]:
        over = [
            m
            for m in ("lcp", "cls", "inp")
            if sample[m] and sample[m] > VITALS_THRESHOLDS[m]
        ]
        line = (
            f"  {sample['path']}: LCP {sample['lcp']}ms  CLS {sample['cls']}  INP {sample['inp']}ms"
        )
        print(line + ("  <-- OVER THRESHOLD" if over else ""))
        for m in over:
            failures += 1
            print(
                f"      {m.upper()} {sample[m]}{VITALS_UNITS[m]} > "
                f"{VITALS_THRESHOLDS[m]}{VITALS_UNITS[m]} — {recommend(m, sample)}"
            )
    for err in payload["errors"]:
        failures += 1
        print(f"  {err['path']}: vitals error {err['error']}")

    print(
        f"\nvitals: {len(payload['results']) } page(s) measured, {failures} threshold breach(es)"
    )
    return 1 if failures else 0


def main() -> int:

    _, sm = fetch("/sitemap.xml")
    locs = re.findall(r"<loc>([^<]+)</loc>", sm)
    paths = [u.replace(SITE, "") or "/" for u in locs]

    groups: dict[str, list[str]] = {}
    for p in paths:
        groups.setdefault(group_of(p), []).append(p)
    targets: list[str] = []
    for g, members in groups.items():
        targets.extend(members[:SAMPLE_PER_GROUP] if g.endswith("*") else members)

    print(f"sitemap urls: {len(paths)}  groups: {len(groups)}  crawling: {len(targets)}")

    problems: dict[str, list[str]] = {}
    titles: dict[str, list[str]] = {}

    def check(path: str) -> None:
        status, html = fetch(path)
        issues: list[str] = []
        if status != 200:
            problems[path] = [f"status {status}"]
            return
        words = visible_words(html)
        if words < 300:
            issues.append(f"thin content ({words} words)")
        t = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
        title = (t.group(1).strip() if t else "")
        if not title:
            issues.append("missing title")
        else:
            titles.setdefault(title, []).append(path)
        if not re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'][^"\']{50,}', html, re.I):
            issues.append("missing/short meta description")
        can = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', html, re.I)
        if not can:
            issues.append("missing canonical")
        else:
            want = SITE + (path.rstrip("/") or "/")
            got = can.group(1).rstrip("/") or "/"
            if got != want.rstrip("/") and not (path == "/" and got in (SITE, SITE + "/")):
                issues.append(f"canonical mismatch -> {can.group(1)}")
        if not re.search(r'<meta[^>]+property=["\']og:title', html, re.I):
            issues.append("missing og:title")
        blocks, errs = jsonld(html)
        for e in errs:
            issues.append(f"invalid JSON-LD: {e[:60]}")
        nodes: list = []
        flatten(blocks, nodes)
        types = set()
        for n in nodes:
            tt = n.get("@type")
            types.update(tt if isinstance(tt, list) else [tt])
        if not types:
            issues.append("no JSON-LD")
        if "BreadcrumbList" not in types and path != "/":
            issues.append("no BreadcrumbList")
        # Paginated listing pages deliberately omit FAQ markup: repeating the
        # same Q&A on every page is duplicate rich-result content.
        paginated = "page=" in path
        if not ({"FAQPage", "QAPage"} & types) and not paginated:
            issues.append("no FAQPage/QAPage Q&A markup")

        else:
            for n in nodes:
                if n.get("@type") == "FAQPage":
                    qs = n.get("mainEntity") or []
                    if len(qs) < 2:
                        issues.append("FAQPage has <2 questions")
                    for q in qs:
                        ans = (q.get("acceptedAnswer") or {}).get("text", "")
                        if len(ans) < 40:
                            issues.append("FAQ answer too short")
                            break
        if not re.search(r'href=["\'](/|https://(www\.)?doseroutine\.com/?)["\']', html):
            issues.append("no link back to homepage")
        if issues:
            problems[path] = issues

    with ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(check, targets))

    dupes = {t: p for t, p in titles.items() if len(p) > 1}
    print(f"\npages with issues: {len(problems)} / {len(targets)}")
    for p in sorted(problems):
        print(f"  {p}: {'; '.join(problems[p])}")
    if dupes:
        print(f"\nduplicate titles: {len(dupes)}")
        for t, ps in list(dupes.items())[:20]:
            print(f"  {t!r}: {ps}")

    vitals_failed = 0
    if VITALS:
        # Spread the sample across route groups so one template can't hide
        # behind another: homepage first, then evenly spaced targets.
        ordered = ["/"] + [t for t in targets if t != "/"]
        step = max(1, len(ordered) // VITALS_LIMIT)
        vitals_paths = ordered[::step][:VITALS_LIMIT]
        vitals_failed = run_vitals(vitals_paths)

    return 1 if (problems or vitals_failed) else 0



if __name__ == "__main__":
    sys.exit(main())
