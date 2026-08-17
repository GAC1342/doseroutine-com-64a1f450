"""End-to-end tests for gzipped sitemap discovery.

Spins up a real HTTP server on localhost, serves a small tree of
`.xml.gz` fixtures (top-level sitemap index → nested indexes → leaf
urlsets), and asserts that both production walkers extract every leaf
URL. This exercises the entire chain — HTTP fetch, gzip decode
(magic-bytes + header paths), XML parse, recursive index descent —
against bytes shaped like a real CDN response.

Run:  python3 scripts/sitemap_gz_e2e_test.py
      python3 -m pytest scripts/sitemap_gz_e2e_test.py -v
"""

from __future__ import annotations

import gzip
import importlib.util
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


SCRIPTS = Path(__file__).parent


def _load(name: str, filename: str):
    import sys
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod  # dataclass() needs the module registered
    spec.loader.exec_module(mod)
    return mod


og = _load("validate_og_twitter", "validate-og-twitter.py")
faq = _load("validate_library_faq", "validate-library-faq.py")
report = _load("report_library_faq_jsonld", "report-library-faq-jsonld.py")


# ---------------------------------------------------------------------------
# Fixture: a realistic 3-level sitemap tree.
#
#   /sitemap.xml                (plain XML, index → 2 gzipped children)
#     /sitemap-pages.xml.gz     (gzipped urlset, 2 static routes)
#     /sitemap-library.xml.gz   (gzipped index → 2 gzipped leaf sitemaps)
#       /sitemap-library-1.xml.gz  (gzipped urlset, 3 library detail URLs)
#       /sitemap-library-2.xml.gz  (gzipped urlset, 2 library detail URLs
#                                    + one excluded /library root URL)
# ---------------------------------------------------------------------------


def _urlset(*urls: str) -> bytes:
    body = ['<?xml version="1.0" encoding="UTF-8"?>']
    body.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for u in urls:
        body.append(f"<url><loc>{u}</loc></url>")
    body.append("</urlset>")
    return "".join(body).encode("utf-8")


def _index(*children: str) -> bytes:
    body = ['<?xml version="1.0" encoding="UTF-8"?>']
    body.append('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for c in children:
        body.append(f"<sitemap><loc>{c}</loc></sitemap>")
    body.append("</sitemapindex>")
    return "".join(body).encode("utf-8")


# Deferred: filled in once the server picks a port, since <loc> entries
# reference absolute URLs.
FIXTURES: dict[str, tuple[bytes, str, str]] = {}
# path -> (body, content-type, content-encoding)


def _build_fixtures(base: str) -> None:
    FIXTURES.clear()

    pages_xml = _urlset(f"{base}/", f"{base}/help")
    FIXTURES["/sitemap-pages.xml.gz"] = (
        gzip.compress(pages_xml),
        "application/gzip",
        "",
    )

    lib1_xml = _urlset(
        f"{base}/library/bpc-157",
        f"{base}/library/tb-500",
        f"{base}/library/melatonin",
    )
    FIXTURES["/sitemap-library-1.xml.gz"] = (
        gzip.compress(lib1_xml),
        # CDN mislabels the type but the URL suffix + magic bytes still work.
        "application/octet-stream",
        "",
    )

    lib2_xml = _urlset(
        f"{base}/library/creatine",
        f"{base}/library/magnesium-glycinate",
        # This one is excluded by LIBRARY_EXCLUDE_RE and must be dropped by
        # the FAQ walker but kept by the og-twitter walker (which returns
        # every URL).
        f"{base}/library",
    )
    FIXTURES["/sitemap-library-2.xml.gz"] = (
        # Header lies about encoding but body is genuine gzip. Magic
        # bytes must win in `_sitemap_fetch`.
        gzip.compress(lib2_xml),
        "text/xml",
        "gzip",
    )

    library_index_xml = _index(
        f"{base}/sitemap-library-1.xml.gz",
        f"{base}/sitemap-library-2.xml.gz",
    )
    FIXTURES["/sitemap-library.xml.gz"] = (
        gzip.compress(library_index_xml),
        "application/x-gzip",
        "",
    )

    root_index = _index(
        f"{base}/sitemap-pages.xml.gz",
        f"{base}/sitemap-library.xml.gz",
    )
    FIXTURES["/sitemap.xml"] = (root_index, "application/xml", "")


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, *_a, **_kw):  # silence per-request logs
        pass

    def do_GET(self):
        entry = FIXTURES.get(self.path)
        if entry is None:
            self.send_response(404)
            self.end_headers()
            return
        body, ctype, cenc = entry
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        if cenc:
            self.send_header("Content-Encoding", cenc)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class _Server:
    def __init__(self) -> None:
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
        self.port = self.httpd.server_address[1]
        self.base = f"http://127.0.0.1:{self.port}"
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)

    def __enter__(self):
        _build_fixtures(self.base)
        self.thread.start()
        return self

    def __exit__(self, *_exc):
        self.httpd.shutdown()
        self.httpd.server_close()


class NestedGzipSitemapE2E(unittest.TestCase):
    def setUp(self) -> None:
        # The three walkers share `_sitemap_fetch._SHARED_CACHE`. Reset
        # via either module's re-exported `clear_sitemap_cache` — they
        # point at the same function.
        og.clear_sitemap_cache()

    def test_og_walker_recurses_through_gzipped_index_tree(self):
        with _Server() as srv:
            urls, paths = og.discover_sitemap(srv.base)

        expected = {
            f"{srv.base}/",
            f"{srv.base}/help",
            f"{srv.base}/library/bpc-157",
            f"{srv.base}/library/tb-500",
            f"{srv.base}/library/melatonin",
            f"{srv.base}/library/creatine",
            f"{srv.base}/library/magnesium-glycinate",
            f"{srv.base}/library",
        }
        self.assertEqual(
            set(urls),
            expected,
            "og-twitter walker should surface every URL reachable through nested .xml.gz sitemaps",
        )
        # Paths are also collected for parity checks; every leaf URL's
        # path must appear.
        for u in expected:
            path = u[len(srv.base):] or "/"
            self.assertIn(path, paths, f"missing path {path!r} in normalized set")

    def test_faq_walker_filters_to_library_details_across_gzipped_index(self):
        with _Server() as srv:
            urls = faq.library_urls_from_sitemap(srv.base)

        expected = sorted(
            {
                f"{srv.base}/library/bpc-157",
                f"{srv.base}/library/tb-500",
                f"{srv.base}/library/melatonin",
                f"{srv.base}/library/creatine",
                f"{srv.base}/library/magnesium-glycinate",
            }
        )
        self.assertEqual(urls, expected)
        # Explicitly confirm the exclusion filter fired: bare /library
        # is present in the sitemap but must not appear in the output.
        self.assertNotIn(f"{srv.base}/library", urls)

    def test_walker_survives_missing_child_sitemap(self):
        """If one gzipped child sitemap 404s, the walker still returns
        every URL from the sibling sitemaps instead of aborting."""
        with _Server() as srv:
            # Pull the pages sitemap out of the fixture map so its GET
            # returns 404. The library subtree must still be walked.
            FIXTURES.pop("/sitemap-pages.xml.gz")
            urls, _ = og.discover_sitemap(srv.base)

        library_urls = {u for u in urls if "/library" in u}
        self.assertEqual(len(library_urls), 6, urls)
        self.assertNotIn(f"{srv.base}/help", urls)


def _build_dedupe_fixtures(base: str) -> None:
    """Fixture designed to stress leaf-URL de-duplication.

    Shape:

        /sitemap.xml (index)
          -> /sitemap-a.xml.gz          (urlset: L1, L2, L1 again)
          -> /sitemap-b.xml.gz          (nested index)
               -> /sitemap-b1.xml.gz    (urlset: L2, L3)
               -> /sitemap-b2.xml.gz    (urlset: L3, L4, L4)
          -> /sitemap-a.xml.gz          (index references A twice: cycle-ish)

    Every leaf URL (L1..L4) appears in at least two different nested
    sitemaps, and L1 / L4 appear twice inside a single urlset. A correct
    walker must surface each leaf exactly once regardless of how many
    paths reach it.
    """
    FIXTURES.clear()

    L1 = f"{base}/library/bpc-157"
    L2 = f"{base}/library/tb-500"
    L3 = f"{base}/library/melatonin"
    L4 = f"{base}/library/creatine"

    FIXTURES["/sitemap-a.xml.gz"] = (
        gzip.compress(_urlset(L1, L2, L1)),
        "application/gzip",
        "",
    )
    FIXTURES["/sitemap-b1.xml.gz"] = (
        gzip.compress(_urlset(L2, L3)),
        "application/octet-stream",
        "",
    )
    FIXTURES["/sitemap-b2.xml.gz"] = (
        gzip.compress(_urlset(L3, L4, L4)),
        "text/xml",
        "gzip",
    )
    FIXTURES["/sitemap-b.xml.gz"] = (
        gzip.compress(
            _index(f"{base}/sitemap-b1.xml.gz", f"{base}/sitemap-b2.xml.gz")
        ),
        "application/x-gzip",
        "",
    )
    root = _index(
        f"{base}/sitemap-a.xml.gz",
        f"{base}/sitemap-b.xml.gz",
        # Repeat a child sitemap at the top level. The visited-set guard
        # must prevent the walker from re-collecting its leaves.
        f"{base}/sitemap-a.xml.gz",
    )
    FIXTURES["/sitemap.xml"] = (root, "application/xml", "")


class LeafUrlDedupAcrossWalkersE2E(unittest.TestCase):
    """Cross-walker parity: every walker must dedupe leaf URLs the same
    way, whether duplicates come from repeated <loc> entries in one
    urlset, the same URL appearing in two sibling sitemaps, or a child
    sitemap being referenced twice from the parent index."""

    EXPECTED_LIBRARY: set[str] = set()

    def setUp(self) -> None:
        og.clear_sitemap_cache()

    def _run_all_walkers(self):
        with _Server() as srv:
            # Override the default fixture map with the dedupe shape.
            _build_dedupe_fixtures(srv.base)
            og_urls, _ = og.discover_sitemap(srv.base)
            # Each walker owns its own cache-clear helper but they all
            # point at `_sitemap_fetch._SHARED_CACHE`; clear between
            # walkers to force a real network+parse pass every time so
            # the assertion measures walker behaviour, not cache reuse.
            og.clear_sitemap_cache()
            faq_urls = faq.library_urls_from_sitemap(srv.base)
            og.clear_sitemap_cache()
            report_urls = report.library_urls_from_sitemap(srv.base)
            expected = {
                f"{srv.base}/library/bpc-157",
                f"{srv.base}/library/tb-500",
                f"{srv.base}/library/melatonin",
                f"{srv.base}/library/creatine",
            }
        return og_urls, faq_urls, report_urls, expected

    def _diff_report(self, name: str, actual: set[str], expected: set[str]) -> str:
        """Return a multi-line diagnostic showing exactly which URLs are
        missing from `actual` (present in `expected` but not returned) and
        which are extra (returned by the walker but not expected). Sorted
        so the failure message is stable and diff-friendly across runs."""
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        lines = [
            f"{name} walker leaf set disagrees with the expected set",
            f"  expected: {len(expected)} urls   actual: {len(actual)} urls",
            f"  missing from {name} ({len(missing)}):",
        ]
        lines += [f"    - {u}" for u in missing] or ["    (none)"]
        lines.append(f"  extra in {name} ({len(extra)}):")
        lines += [f"    + {u}" for u in extra] or ["    (none)"]
        return "\n".join(lines)

    def test_no_walker_emits_duplicate_leaf_urls(self):
        og_urls, faq_urls, report_urls, _ = self._run_all_walkers()
        for name, urls in (
            ("og-twitter", og_urls),
            ("faq", faq_urls),
            ("report", report_urls),
        ):
            dupes = sorted({u for u in urls if urls.count(u) > 1})
            self.assertEqual(
                len(urls),
                len(set(urls)),
                (
                    f"{name} walker returned duplicate leaf URLs "
                    f"(total={len(urls)}, unique={len(set(urls))}, "
                    f"duplicates={len(dupes)}):\n"
                    + "\n".join(f"  * {u}" for u in dupes)
                ),
            )

    def test_all_walkers_agree_on_library_leaf_set(self):
        og_urls, faq_urls, report_urls, expected = self._run_all_walkers()
        og_library = {u for u in og_urls if "/library/" in u}
        faq_set = set(faq_urls)
        report_set = set(report_urls)

        self.assertEqual(
            og_library,
            expected,
            self._diff_report("og-twitter", og_library, expected),
        )
        self.assertEqual(
            faq_set,
            expected,
            self._diff_report("faq", faq_set, expected),
        )
        self.assertEqual(
            report_set,
            expected,
            self._diff_report("report", report_set, expected),
        )
        # Cross-walker parity: also spell out where faq and report diverge
        # from each other, since a mismatch there is a different bug (one
        # filter drifted from the other) than a mismatch with `expected`.
        self.assertEqual(
            faq_set,
            report_set,
            self._diff_report("faq vs report", faq_set, report_set),
        )
        # Sorted-list parity: both filtered walkers must produce the
        # exact same ordered output (they both `sorted(set(...))`).
        self.assertEqual(
            faq_urls,
            report_urls,
            "faq and report walkers agree on the set but disagree on "
            f"ordering:\n  faq:    {faq_urls!r}\n  report: {report_urls!r}",
        )
        self.assertEqual(
            faq_urls,
            sorted(expected),
            "faq walker output is not sorted-unique of expected:\n"
            f"  got:      {faq_urls!r}\n  expected: {sorted(expected)!r}",
        )



if __name__ == "__main__":
    unittest.main()
