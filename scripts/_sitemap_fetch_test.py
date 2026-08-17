"""Unit tests for scripts/_sitemap_fetch.py — resilient gzip detection.

Covers header/body permutations that real CDNs produce so regressions in
the sitemap walkers surface here, not in a broken CI crawl.

Run:  python3 -m pytest scripts/_sitemap_fetch_test.py -v
      (or)  python3 scripts/_sitemap_fetch_test.py
"""

from __future__ import annotations

import gzip
import importlib.util
import unittest
from pathlib import Path


_spec = importlib.util.spec_from_file_location(
    "_sitemap_fetch", Path(__file__).with_name("_sitemap_fetch.py")
)
assert _spec and _spec.loader
sf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sf)


XML_BODY = b'<?xml version="1.0"?><urlset><url><loc>https://x/</loc></url></urlset>'
GZ_XML = gzip.compress(XML_BODY)
DOUBLE_GZ_XML = gzip.compress(GZ_XML)


class LooksLikeGzipTests(unittest.TestCase):
    """`looks_like_gzip` — decision layer only, no I/O."""

    def test_magic_bytes_beat_missing_headers(self):
        self.assertTrue(sf.looks_like_gzip(GZ_XML))

    def test_magic_bytes_beat_wrong_content_type(self):
        # CDN mislabels a .gz payload as text/xml with no encoding hint.
        self.assertTrue(
            sf.looks_like_gzip(
                GZ_XML,
                url="https://x/sitemap.xml",
                content_type="text/xml",
            )
        )

    def test_content_encoding_gzip_token(self):
        self.assertTrue(
            sf.looks_like_gzip(XML_BODY, content_encoding="gzip")
        )

    def test_content_encoding_x_gzip_legacy_alias(self):
        self.assertTrue(
            sf.looks_like_gzip(XML_BODY, content_encoding="x-gzip")
        )

    def test_content_encoding_comma_separated_list(self):
        # Some CDNs emit `Content-Encoding: gzip, br` when chaining.
        self.assertTrue(
            sf.looks_like_gzip(XML_BODY, content_encoding="gzip, br")
        )
        self.assertTrue(
            sf.looks_like_gzip(XML_BODY, content_encoding="br, gzip")
        )

    def test_content_encoding_case_insensitive(self):
        self.assertTrue(
            sf.looks_like_gzip(XML_BODY, content_encoding="GZIP")
        )

    def test_content_type_application_gzip(self):
        self.assertTrue(
            sf.looks_like_gzip(XML_BODY, content_type="application/gzip")
        )

    def test_content_type_application_x_gzip(self):
        self.assertTrue(
            sf.looks_like_gzip(XML_BODY, content_type="application/x-gzip")
        )

    def test_content_type_with_charset_parameter(self):
        # `application/gzip; charset=binary` still counts.
        self.assertTrue(
            sf.looks_like_gzip(
                XML_BODY, content_type="application/gzip; charset=binary"
            )
        )

    def test_url_suffix_gz(self):
        self.assertTrue(
            sf.looks_like_gzip(XML_BODY, url="https://x/sitemap.xml.gz")
        )

    def test_url_suffix_gz_with_query_string(self):
        # `?v=2` or `#anchor` must not defeat suffix detection.
        self.assertTrue(
            sf.looks_like_gzip(XML_BODY, url="https://x/sitemap.xml.gz?v=2")
        )
        self.assertTrue(
            sf.looks_like_gzip(XML_BODY, url="https://x/sitemap.xml.gz#part")
        )

    def test_octet_stream_plus_gz_suffix(self):
        # Object stores default to application/octet-stream; combined
        # with a `.gz` URL suffix that still counts as gzip.
        self.assertTrue(
            sf.looks_like_gzip(
                XML_BODY,
                url="https://s3.example/site.xml.gz",
                content_type="application/octet-stream",
            )
        )

    def test_octet_stream_without_gz_suffix_does_not_count(self):
        # Bare octet-stream on a non-.gz URL is ambiguous — do NOT guess.
        self.assertFalse(
            sf.looks_like_gzip(
                XML_BODY,
                url="https://x/sitemap.xml",
                content_type="application/octet-stream",
            )
        )

    def test_plain_xml_body_is_not_gzip(self):
        self.assertFalse(
            sf.looks_like_gzip(
                XML_BODY,
                url="https://x/sitemap.xml",
                content_encoding="",
                content_type="application/xml",
            )
        )

    def test_short_body_no_headers_no_url(self):
        self.assertFalse(sf.looks_like_gzip(b""))
        self.assertFalse(sf.looks_like_gzip(b"<"))

    def test_content_encoding_identity_is_not_gzip(self):
        self.assertFalse(
            sf.looks_like_gzip(XML_BODY, content_encoding="identity")
        )


class DecompressIfGzipTests(unittest.TestCase):
    """`decompress_if_gzip` — full pipeline including double-gzip."""

    def test_passthrough_when_plain_xml(self):
        self.assertEqual(sf.decompress_if_gzip(XML_BODY), XML_BODY)

    def test_decompress_by_magic_bytes(self):
        self.assertEqual(sf.decompress_if_gzip(GZ_XML), XML_BODY)

    def test_decompress_by_header_only(self):
        # Simulate a rare server that pre-decompresses on the wire but
        # still sets Content-Encoding — no magic bytes → passthrough.
        self.assertEqual(
            sf.decompress_if_gzip(XML_BODY, content_encoding="gzip"),
            XML_BODY,
        )

    def test_decompress_double_gzip(self):
        # Two gzip layers must both be peeled.
        self.assertEqual(sf.decompress_if_gzip(DOUBLE_GZ_XML), XML_BODY)

    def test_conflicting_headers_magic_wins(self):
        # Server claims text/xml but body is genuine gzip.
        self.assertEqual(
            sf.decompress_if_gzip(
                GZ_XML,
                url="https://x/sitemap.xml",
                content_type="text/xml",
                content_encoding="",
            ),
            XML_BODY,
        )

    def test_headers_claim_gzip_body_is_xml_soft_fallback(self):
        # If only headers said gzip and decompression would fail because
        # the body is actually XML, we return the XML instead of raising.
        result = sf.decompress_if_gzip(
            XML_BODY,
            content_encoding="gzip",
            content_type="application/gzip",
        )
        self.assertEqual(result, XML_BODY)

    def test_truncated_gzip_stream_raises(self):
        # Magic bytes present but stream is corrupt → propagate. This is
        # the one case we do NOT swallow, because the caller is entitled
        # to know the payload was gzip-but-broken.
        truncated = GZ_XML[:10]
        with self.assertRaises((OSError, EOFError)):
            sf.decompress_if_gzip(truncated)


class FetchCacheTests(unittest.TestCase):
    """`fetch_sitemap_bytes` cache semantics: default reuse, cache=None
    disables reuse, and `clear_shared_cache()` resets state between runs."""

    def setUp(self):
        sf.clear_shared_cache()
        self.calls: list[str] = []

        class _FakeResp:
            def __init__(self, body: bytes):
                self._body = body
                self.headers = {"Content-Type": "application/xml"}

            def read(self):
                return self._body

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

        calls = self.calls

        def fake_urlopen(req, timeout=30):
            calls.append(req.full_url)
            return _FakeResp(XML_BODY)

        self._orig_urlopen = sf.urllib.request.urlopen
        sf.urllib.request.urlopen = fake_urlopen

    def tearDown(self):
        sf.urllib.request.urlopen = self._orig_urlopen
        sf.clear_shared_cache()

    def test_cache_none_disables_reuse(self):
        url = "https://example.com/sitemap.xml"
        for _ in range(3):
            self.assertEqual(sf.fetch_sitemap_bytes(url, user_agent="ua", cache=None), XML_BODY)
        self.assertEqual(len(self.calls), 3, "cache=None must re-fetch every call")
        # And it must NOT leak into the shared cache.
        self.assertNotIn(url, sf.get_shared_cache())

    def test_default_cache_reuses(self):
        url = "https://example.com/a.xml"
        sf.fetch_sitemap_bytes(url, user_agent="ua")
        sf.fetch_sitemap_bytes(url, user_agent="ua")
        self.assertEqual(len(self.calls), 1)
        self.assertIn(url, sf.get_shared_cache())

    def test_clear_shared_cache_resets_between_runs(self):
        url = "https://example.com/b.xml"
        sf.fetch_sitemap_bytes(url, user_agent="ua")
        self.assertEqual(len(self.calls), 1)
        sf.clear_shared_cache()
        self.assertEqual(sf.get_shared_cache(), {})
        sf.fetch_sitemap_bytes(url, user_agent="ua")
        self.assertEqual(len(self.calls), 2, "clear_shared_cache must force a re-fetch")

    def test_clear_shared_cache_drops_negative_entries(self):
        url = "https://example.com/missing.xml"

        def boom(req, timeout=30):
            self.calls.append(req.full_url)
            raise RuntimeError("404")

        sf.urllib.request.urlopen = boom
        with self.assertRaises(RuntimeError):
            sf.fetch_sitemap_bytes(url, user_agent="ua")
        # Negative result cached → next call re-raises without hitting network.
        with self.assertRaises(RuntimeError):
            sf.fetch_sitemap_bytes(url, user_agent="ua")
        self.assertEqual(len(self.calls), 1)
        # After clear, the failure is forgotten and the network is retried.
        sf.clear_shared_cache()
        with self.assertRaises(RuntimeError):
            sf.fetch_sitemap_bytes(url, user_agent="ua")
        self.assertEqual(len(self.calls), 2)

    def test_explicit_dict_cache_is_isolated_from_shared(self):
        url = "https://example.com/c.xml"
        local: dict = {}
        sf.fetch_sitemap_bytes(url, user_agent="ua", cache=local)
        sf.fetch_sitemap_bytes(url, user_agent="ua", cache=local)
        self.assertEqual(len(self.calls), 1)
        self.assertIn(url, local)
        self.assertNotIn(url, sf.get_shared_cache())


if __name__ == "__main__":
    unittest.main()

