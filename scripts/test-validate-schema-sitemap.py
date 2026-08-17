#!/usr/bin/env python3
"""
Regression tests for scripts/validate-schema-sitemap.py.

Boots a tiny in-process HTTP server that serves a curated set of
known-good and known-bad routes, then invokes the validator against it
and asserts:

  1. The good-only fixture exits 0 and reports every route as OK.
  2. The mixed fixture exits 1 and each bad route surfaces the expected
     failure reason (missing schema, empty mainEntity, parse error,
     missing sitemap entry, HTTP 404, etc.).

Run locally or in CI before deploying:
    python3 scripts/test-validate-schema-sitemap.py
"""
from __future__ import annotations

import http.server
import socket
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VALIDATOR = ROOT / "scripts" / "validate-schema-sitemap.py"


# ---------- fixture HTML builders ----------

def _page(*json_ld_blocks: str) -> str:
    scripts = "\n".join(
        f'<script type="application/ld+json">{b}</script>' for b in json_ld_blocks
    )
    return f"<!doctype html><html><head>{scripts}</head><body>ok</body></html>"


ARTICLE_OK = """
{"@context":"https://schema.org","@type":"Article",
 "headline":"BPC-157 vs TB-500","author":{"@type":"Person","name":"DoseRoutine"}}
""".strip()

BREADCRUMB_OK = """
{"@context":"https://schema.org","@type":"BreadcrumbList",
 "itemListElement":[{"@type":"ListItem","position":1,"name":"Library","item":"/library"}]}
""".strip()

FAQ_OK = """
{"@context":"https://schema.org","@type":"FAQPage",
 "mainEntity":[{"@type":"Question","name":"Is it safe?",
 "acceptedAnswer":{"@type":"Answer","text":"Follow protocol."}}]}
""".strip()

MEDSUB_OK = """
{"@context":"https://schema.org","@type":"MedicalSubstance","name":"BPC-157"}
""".strip()

APP_OK = """
{"@context":"https://schema.org","@type":"SoftwareApplication","name":"DoseRoutine",
 "url":"https://doseroutine.com/","applicationCategory":"LifestyleApplication",
 "offers":[{"@type":"Offer","price":"0","priceCurrency":"USD"}]}
""".strip()

BLOGPOSTING_OK = """
{"@context":"https://schema.org","@type":"BlogPosting","headline":"Retatrutide phase 3",
 "author":{"@type":"Organization","name":"DoseRoutine"},
 "publisher":{"@type":"Organization","name":"DoseRoutine"},
 "datePublished":"2026-02-01","dateModified":"2026-02-02"}
""".strip()

# --- bad shapes ---
ARTICLE_NO_AUTHOR = """
{"@context":"https://schema.org","@type":"Article","headline":"Missing author"}
""".strip()

FAQ_EMPTY = """
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}
""".strip()

FAQ_NO_ANSWER = """
{"@context":"https://schema.org","@type":"FAQPage",
 "mainEntity":[{"@type":"Question","name":"Q?","acceptedAnswer":{"@type":"Answer"}}]}
""".strip()

BREADCRUMB_EMPTY = """
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[]}
""".strip()

APP_NO_OFFERS = """
{"@context":"https://schema.org","@type":"SoftwareApplication","name":"DoseRoutine",
 "url":"https://doseroutine.com/","applicationCategory":"LifestyleApplication"}
""".strip()

BLOGPOSTING_NO_DATE = """
{"@context":"https://schema.org","@type":"BlogPosting","headline":"No date",
 "author":{"@type":"Organization","name":"DoseRoutine"},
 "publisher":{"@type":"Organization","name":"DoseRoutine"}}
""".strip()

BROKEN_JSON = '{"@type":"Article","headline":"oops",'  # trailing comma / unclosed


# Two scenarios keyed by scenario name -> {path: (html_or_None_for_404,
# in_sitemap: bool)}. None html means the server returns 404.
GOOD_PAGES = {
    "/": (_page(APP_OK, FAQ_OK), True),
    "/library/compare/bpc-157-vs-tb-500": (
        _page(ARTICLE_OK, BREADCRUMB_OK, FAQ_OK),
        True,
    ),
    "/library/bpc-157": (
        _page(ARTICLE_OK, BREADCRUMB_OK, FAQ_OK, MEDSUB_OK),
        True,
    ),
    "/library/tb-500": (
        _page(ARTICLE_OK, BREADCRUMB_OK, FAQ_OK, MEDSUB_OK),
        True,
    ),
    # Blog post with FAQs, and one without (FAQPage is optional there).
    "/blog/retatrutide-phase-3": (
        _page(BLOGPOSTING_OK, BREADCRUMB_OK, FAQ_OK),
        True,
    ),
    "/blog/no-faq-update": (_page(BLOGPOSTING_OK, BREADCRUMB_OK), True),
}

BAD_PAGES = {
    # Homepage missing FAQPage and shipping offer-less app schema.
    "/": (_page(APP_NO_OFFERS), True),
    # Compare page missing FAQPage entirely.
    "/library/compare/bpc-157-vs-tb-500": (
        _page(ARTICLE_OK, BREADCRUMB_OK),
        True,
    ),
    # Compound page with empty FAQ mainEntity + Article without author.
    "/library/bpc-157": (
        _page(ARTICLE_NO_AUTHOR, BREADCRUMB_OK, FAQ_EMPTY, MEDSUB_OK),
        True,
    ),
    # Compound page with Question but no acceptedAnswer.text +
    # empty breadcrumb + malformed JSON block.
    "/library/tb-500": (
        _page(ARTICLE_OK, BREADCRUMB_EMPTY, FAQ_NO_ANSWER, MEDSUB_OK, BROKEN_JSON),
        True,
    ),
    # Blog post missing datePublished + shipping an empty optional FAQPage.
    "/blog/retatrutide-phase-3": (
        _page(BLOGPOSTING_NO_DATE, BREADCRUMB_OK, FAQ_EMPTY),
        True,
    ),
}



# ---------- ephemeral HTTP server ----------

class Fixture(http.server.BaseHTTPRequestHandler):
    pages: dict[str, tuple[str | None, bool]] = {}

    def log_message(self, *_a, **_kw):  # silence noisy stderr
        pass

    def do_GET(self):  # noqa: N802
        if self.path in ("/", "") and "/" not in self.pages:
            self._send(200, "text/html", "<html><body>root</body></html>")
            return
        if self.path == "":
            self.path = "/"

        if self.path == "/sitemap.xml":
            urls = "".join(
                f"<url><loc>http://127.0.0.1{p}</loc></url>"
                for p, (_, in_sm) in self.pages.items()
                if in_sm
            )
            xml = (
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                f"{urls}</urlset>"
            )
            self._send(200, "application/xml", xml)
            return
        entry = self.pages.get(self.path)
        if entry is None or entry[0] is None:
            self._send(404, "text/plain", "not found")
            return
        self._send(200, "text/html", entry[0])

    def _send(self, code: int, ctype: str, body: str) -> None:
        raw = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _serve(pages: dict[str, tuple[str | None, bool]]) -> tuple[http.server.HTTPServer, int]:
    port = _free_port()
    handler = type("H", (Fixture,), {"pages": pages})
    srv = http.server.HTTPServer(("127.0.0.1", port), handler)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return srv, port


def _run(base: str) -> tuple[int, str]:
    proc = subprocess.run(
        [sys.executable, str(VALIDATOR), base],
        capture_output=True,
        text=True,
        timeout=120,
    )
    return proc.returncode, proc.stdout + proc.stderr


# ---------- assertions ----------

def _assert(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


def test_good_scenario() -> None:
    srv, port = _serve(GOOD_PAGES)
    try:
        code, out = _run(f"http://127.0.0.1:{port}")
    finally:
        srv.shutdown()
    _assert(code == 0, f"expected exit 0, got {code}\n{out}")
    for path in GOOD_PAGES:
        _assert(f"OK   {path}" in out, f"expected '{path}' to pass\n{out}")
    _assert("FAIL" not in out, f"unexpected FAIL in good scenario\n{out}")
    print("PASS  good scenario: all curated routes validated cleanly")


def test_bad_scenario() -> None:
    srv, port = _serve(BAD_PAGES)
    try:
        code, out = _run(f"http://127.0.0.1:{port}")
    finally:
        srv.shutdown()
    _assert(code == 1, f"expected exit 1, got {code}\n{out}")

    expectations = {
        "/": [
            "missing JSON-LD @type=FAQPage",
            "SoftwareApplication missing offers",
        ],
        "/library/compare/bpc-157-vs-tb-500": ["missing JSON-LD @type=FAQPage"],
        "/library/bpc-157": [
            "FAQPage has no mainEntity",
            "Article missing author",
        ],
        "/library/tb-500": [
            "FAQPage Question missing acceptedAnswer.text",
            "BreadcrumbList has no itemListElement",
            "JSON-LD parse error",
        ],
        "/blog/retatrutide-phase-3": [
            "BlogPosting missing datePublished",
            "FAQPage has no mainEntity",
        ],
    }

    for path, needles in expectations.items():
        _assert(f"FAIL {path}" in out, f"expected FAIL for {path}\n{out}")
        for needle in needles:
            _assert(
                needle in out,
                f"expected '{needle}' in output for {path}\n{out}",
            )
    print("PASS  bad scenario: every seeded defect was reported")


def main() -> int:
    if not VALIDATOR.exists():
        print(f"validator not found: {VALIDATOR}", file=sys.stderr)
        return 2
    try:
        test_good_scenario()
        test_bad_scenario()
    except AssertionError as e:
        print(f"FAIL  {e}", file=sys.stderr)
        return 1
    print("\nAll validator regression tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
