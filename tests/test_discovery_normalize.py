import unittest
from app.discovery.normalize import normalize_url, slugify


class TestNormalizeUrl(unittest.TestCase):
    def test_strips_scheme_www_and_trailing_slash(self):
        self.assertEqual(normalize_url("https://www.Acme.io/"), "acme.io")

    def test_adds_missing_scheme_then_normalizes(self):
        self.assertEqual(normalize_url("acme.io"), "acme.io")

    def test_keeps_path_but_strips_query_and_fragment(self):
        self.assertEqual(normalize_url("http://acme.io/pricing/?ref=x#top"), "acme.io/pricing")

    def test_equivalent_urls_normalize_identically(self):
        variants = ["https://www.acme.io", "http://acme.io/", "acme.io"]
        self.assertEqual(len({normalize_url(v) for v in variants}), 1)


class TestSlugify(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(slugify("Acme App!"), "acme-app")

    def test_collapses_separators(self):
        self.assertEqual(slugify("a  --  b"), "a-b")

    def test_empty_falls_back(self):
        self.assertEqual(slugify("???"), "app")


if __name__ == "__main__":
    unittest.main()
