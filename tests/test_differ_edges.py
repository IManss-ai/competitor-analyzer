import unittest

from app.pipeline.differ import (
    is_meaningful_change,
    compute_net_char_delta,
    _normalize,
    CHANGE_THRESHOLD,
)


class TestDifferEdges(unittest.TestCase):
    # --- None / empty handling (the `text or ""` branch) ---
    def test_normalize_none_returns_empty_string(self):
        self.assertEqual(_normalize(None), "")

    def test_normalize_empty_string(self):
        self.assertEqual(_normalize(""), "")

    def test_normalize_whitespace_only_strips_to_empty(self):
        self.assertEqual(_normalize("   \n\t  "), "")

    def test_delta_both_none_is_zero(self):
        self.assertEqual(compute_net_char_delta(None, None), 0)

    def test_delta_none_before_counts_full_after(self):
        after = "hello world"  # normalizes to same 11 chars
        self.assertEqual(compute_net_char_delta(None, after), len(after))

    def test_delta_none_after_counts_full_before(self):
        before = "hello world"
        self.assertEqual(compute_net_char_delta(before, None), len(before))

    # --- absolute value: shrinkage is treated like growth ---
    def test_delta_is_absolute_value_on_shrink(self):
        big = "x " * 200
        small = "x"
        grow = compute_net_char_delta(small, big)
        shrink = compute_net_char_delta(big, small)
        self.assertEqual(grow, shrink)
        self.assertGreater(grow, 0)

    def test_large_deletion_is_meaningful(self):
        before = "a" * 500
        after = ""
        changed, delta = is_meaningful_change(before, after)
        self.assertTrue(changed)
        self.assertEqual(delta, 500)

    # --- boundary: strictly greater-than threshold ---
    def test_delta_exactly_at_threshold_not_meaningful(self):
        before = ""
        after = "a" * CHANGE_THRESHOLD  # delta == 100
        changed, delta = is_meaningful_change(before, after)
        self.assertEqual(delta, CHANGE_THRESHOLD)
        self.assertFalse(changed)

    def test_delta_one_over_threshold_is_meaningful(self):
        before = ""
        after = "a" * (CHANGE_THRESHOLD + 1)
        changed, delta = is_meaningful_change(before, after)
        self.assertEqual(delta, CHANGE_THRESHOLD + 1)
        self.assertTrue(changed)

    # --- identical content / no change ---
    def test_identical_text_zero_delta_not_meaningful(self):
        t = "Acme Plan: $19 per month."
        changed, delta = is_meaningful_change(t, t)
        self.assertEqual(delta, 0)
        self.assertFalse(changed)

    def test_empty_to_empty_not_meaningful(self):
        changed, delta = is_meaningful_change("", "")
        self.assertEqual(delta, 0)
        self.assertFalse(changed)

    # --- content swap with equal normalized length yields zero delta ---
    def test_equal_length_content_swap_is_zero_delta(self):
        before = "price is one dollar"
        after = "price is two dollars"[:len(before)]
        self.assertEqual(len(before), len(after))
        self.assertEqual(compute_net_char_delta(before, after), 0)

    # --- case fold does not change length here ---
    def test_unicode_case_fold_length_change(self):
        a = "STRASSE"
        b = "strasse"
        self.assertEqual(compute_net_char_delta(a, b), 0)


if __name__ == "__main__":
    unittest.main()
