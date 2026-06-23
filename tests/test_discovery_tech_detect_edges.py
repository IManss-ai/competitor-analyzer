import unittest
from app.discovery.tech_detect import detect_technologies


class TestDetectTechnologiesEdges(unittest.TestCase):
    def test_none_input_returns_empty(self):
        # `if not html` covers None too, not just ""
        self.assertEqual(detect_technologies(None), [])

    def test_whitespace_only_html_no_matches(self):
        # Non-empty but matches nothing -> empty list, not error
        self.assertEqual(detect_technologies("   \n\t  "), [])

    def test_plain_html_no_signatures(self):
        html = "<html><body><h1>Hello world</h1></body></html>"
        self.assertEqual(detect_technologies(html), [])

    def test_case_insensitive_match(self):
        # regex uses re.IGNORECASE — uppercased marker should still match
        html = "<div>JS.STRIPE.COM/v3</div>"
        found = {t["technology"] for t in detect_technologies(html)}
        self.assertIn("stripe", found)

    def test_results_preserve_signature_order(self):
        # framer appears before stripe in _SIGNATURES; put stripe first in HTML
        html = "js.stripe.com framerusercontent.com"
        order = [t["technology"] for t in detect_technologies(html)]
        self.assertEqual(order, ["framer", "stripe"])

    def test_category_mapping_is_correct(self):
        html = (
            "data-reactroot polar.sh client.crisp.chat "
            "js.hs-scripts.com plausible.io/js"
        )
        cat = {t["technology"]: t["tech_category"] for t in detect_technologies(html)}
        self.assertEqual(cat["react"], "framework")
        self.assertEqual(cat["polar"], "payments")
        self.assertEqual(cat["crisp"], "support")
        self.assertEqual(cat["hubspot"], "marketing")
        self.assertEqual(cat["plausible"], "analytics")

    def test_dict_shape_has_exactly_two_keys(self):
        html = "ng-version=\"17.0.0\""
        results = detect_technologies(html)
        self.assertEqual(len(results), 1)
        self.assertEqual(set(results[0].keys()), {"technology", "tech_category"})
        self.assertEqual(results[0]["technology"], "angular")

    def test_repeated_single_signature_dedups_to_one(self):
        # Same marker thrice -> the `tech not in seen` branch must collapse it
        html = "wp-content/ wp-content/ wp-includes/"
        results = detect_technologies(html)
        techs = [t["technology"] for t in results]
        self.assertEqual(techs, ["wordpress"])

    def test_svelte_hash_boundary(self):
        # svelte sig requires exactly 6 lowercase-alnum chars after "svelte-"
        self.assertEqual(
            [t["technology"] for t in detect_technologies("svelte-abc123")],
            ["svelte"],
        )
        # too short should not match
        self.assertEqual(detect_technologies("svelte-abc"), [])

    def test_returns_new_list_each_call(self):
        # Ensure no shared mutable state leaks between invocations
        a = detect_technologies("vue.global.prod.js")
        b = detect_technologies("vue.global.prod.js")
        self.assertIsNot(a, b)
        self.assertEqual(a, b)


if __name__ == "__main__":
    unittest.main()
