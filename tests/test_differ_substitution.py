import unittest

from app.pipeline.differ import (
    is_meaningful_change,
    compute_chars_changed,
    compute_net_char_delta,
    CHANGE_THRESHOLD,
)
from app.pipeline.fetcher import generate_mock_webpage


BASE = """Acme - The Unified Workspace for Modern Teams.
Pricing and Plans:
Starter Plan: $19 per user per month. Includes basic task management.
Growth Plan: $49 per user per month. Includes advanced analytics.
Enterprise Plan: Custom pricing with SSO and compliance controls."""


class TestDifferSubstitution(unittest.TestCase):
    # --- the change class the old net-length metric provably missed ---
    def test_equal_length_price_swap_is_meaningful(self):
        after = BASE.replace("$19", "$29").replace("$49", "$59")
        self.assertEqual(len(BASE), len(after))
        changed, delta = is_meaningful_change(BASE, after)
        self.assertTrue(changed)
        self.assertGreater(delta, 0)

    def test_price_removed_is_meaningful(self):
        # same-length replacement (net delta 0), but the price multiset changed
        after = BASE.replace("$19 per user per month", "contact sales for info")
        self.assertEqual(len(BASE), len(after))
        changed, _ = is_meaningful_change(BASE, after)
        self.assertTrue(changed)

    def test_small_wording_jitter_stays_quiet(self):
        after = BASE.replace("basic task management", "core task tracking")
        changed, delta = is_meaningful_change(BASE, after)
        self.assertFalse(changed)
        self.assertLessEqual(delta, CHANGE_THRESHOLD)

    def test_line_rewrap_is_zero(self):
        rewrapped = " ".join(BASE.split())
        self.assertEqual(compute_chars_changed(BASE, rewrapped), 0)

    def test_equal_length_inplace_rewrite_fires(self):
        before = ("alpha bravo charlie delta echo foxtrot golf hotel " * 5).strip()
        after = ("zulu yankee xray whiskey victor uniform tango mike " * 5).strip()
        # pad to identical normalized length: net delta 0, >100 chars rewritten
        if len(after) < len(before):
            after += "x" * (len(before) - len(after))
        elif len(before) < len(after):
            before += "x" * (len(after) - len(before))
        self.assertEqual(compute_net_char_delta(before, after), 0)
        changed, delta = is_meaningful_change(before, after)
        self.assertTrue(changed)
        self.assertGreater(delta, CHANGE_THRESHOLD)

    def test_mock_page_price_only_swap_detected(self):
        page = generate_mock_webpage("https://acme.com", 0)
        changed, delta = is_meaningful_change(page, page.replace("$19", "$24"))
        self.assertTrue(changed)
        self.assertGreater(delta, 0)

    def test_large_page_single_price_swap(self):
        filler = "\n".join(
            f"feature row {i} keeps this competitor page long and steady"
            for i in range(2000)
        )
        before = f"{filler}\nStarter Plan: $19 per month"
        after = f"{filler}\nStarter Plan: $29 per month"
        changed, _ = is_meaningful_change(before, after)
        self.assertTrue(changed)

    def test_chars_changed_exceeds_net_delta_on_substitution(self):
        # pins the regression codified in test_differ_edges (equal-length swap)
        before = "price is one dollar"
        after = "price is two dollar "
        self.assertEqual(compute_net_char_delta(before, after), 0)
        self.assertGreater(compute_chars_changed(before, after), 0)


if __name__ == "__main__":
    unittest.main()
