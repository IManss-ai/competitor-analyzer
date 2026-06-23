import unittest
from app.discovery.normalize import normalize_url, slugify


class TestNormalizeUrlEdges(unittest.TestCase):
    def test_none_input_returns_empty(self):
        # None -> "" -> scheme prepended -> empty host/path
        self.assertEqual(normalize_url(None), "")

    def test_empty_string_returns_empty(self):
        self.assertEqual(normalize_url(""), "")

    def test_whitespace_is_stripped(self):
        self.assertEqual(normalize_url("  acme.io  "), "acme.io")

    def test_scheme_match_is_case_insensitive(self):
        # HTTPS already present (uppercase) -> not double-prefixed
        self.assertEqual(normalize_url("HTTPS://www.acme.io/"), "acme.io")

    def test_uppercase_path_is_preserved(self):
        # only host is lowercased; path case is kept
        self.assertEqual(normalize_url("https://acme.io/Pricing"), "acme.io/Pricing")

    def test_port_is_kept_in_host(self):
        self.assertEqual(normalize_url("http://acme.io:8080/x"), "acme.io:8080/x")

    def test_multiple_trailing_slashes_all_stripped(self):
        self.assertEqual(normalize_url("https://acme.io/pricing///"), "acme.io/pricing")

    def test_root_path_only_yields_bare_host(self):
        self.assertEqual(normalize_url("https://acme.io"), "acme.io")

    def test_www_prefix_only_stripped_from_start(self):
        # 'www.' inside a deeper subdomain chain: only leading www. removed
        self.assertEqual(normalize_url("https://www.www.acme.io/"), "www.acme.io")

    def test_subdomain_not_treated_as_www(self):
        self.assertEqual(normalize_url("https://app.acme.io/"), "app.acme.io")

    def test_host_starting_with_www_but_not_dot_not_stripped(self):
        # 'wwwacme.io' must NOT have leading chars removed
        self.assertEqual(normalize_url("https://wwwacme.io/"), "wwwacme.io")

    def test_query_without_path_dropped(self):
        self.assertEqual(normalize_url("https://acme.io?ref=x"), "acme.io")


class TestSlugifyEdges(unittest.TestCase):
    def test_none_input_falls_back(self):
        self.assertEqual(slugify(None), "app")

    def test_empty_string_falls_back(self):
        self.assertEqual(slugify(""), "app")

    def test_leading_trailing_separators_trimmed(self):
        self.assertEqual(slugify("  Hello World  "), "hello-world")

    def test_unicode_non_ascii_dropped(self):
        # accented/non-ascii chars are non [a-z0-9] -> become separators
        self.assertEqual(slugify("Café Münch"), "caf-m-nch")

    def test_digits_preserved(self):
        self.assertEqual(slugify("Web3 App 2024"), "web3-app-2024")

    def test_only_separators_falls_back(self):
        self.assertEqual(slugify("---"), "app")

    def test_underscores_become_separator(self):
        self.assertEqual(slugify("snake_case_name"), "snake-case-name")

    def test_already_slug_unchanged(self):
        self.assertEqual(slugify("acme-app"), "acme-app")


if __name__ == "__main__":
    unittest.main()
