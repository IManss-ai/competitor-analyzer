import time
import unittest
from collections import Counter

from app.pipeline.differ import (
    is_meaningful_change,
    compute_chars_changed,
    _normalize,
    _normalize_lines,
    _price_tokens,
)


# Wordy lines (each >40 chars, every word <40) so the pure-move fixtures below
# exercise the move-exclusion path (A2) rather than the long-token guard (A3).
_LINES = [
    "Acme Analytics gives revenue teams realtime competitor pricing alerts.",
    "Trusted by four thousand business sales organizations across the world.",
    "Automated homepage monitoring catches every positioning shift instantly.",
    "Battle cards are generated from live intel, not stale quarterly decks now.",
]


class TestDifferHardening(unittest.TestCase):
    # --- A2: a pure reorder of two long lines is not an edit ---
    def test_pure_reorder_of_two_long_lines_is_not_meaningful(self):
        self.assertGreater(min(len(_LINES[0]), len(_LINES[3])), 40)
        before = "\n".join(_LINES)
        swapped = _LINES.copy()
        swapped[0], swapped[3] = swapped[3], swapped[0]
        after = "\n".join(swapped)
        self.assertEqual(compute_chars_changed(before, after), 0)
        changed, delta = is_meaningful_change(before, after)
        self.assertFalse(changed)
        self.assertEqual(delta, 0)

    # --- A3: a 3-char edit buried in a 200-char single token is noise ---
    def test_small_edit_inside_long_token_is_not_meaningful(self):
        token_before = "x" * 200
        token_after = "x" * 100 + "yyy" + "x" * 97  # same length, 3 chars changed
        self.assertEqual(len(token_before), len(token_after))
        before = f"stable intro copy about the product suite\n{token_before}\ncommon footer copy"
        after = f"stable intro copy about the product suite\n{token_after}\ncommon footer copy"
        changed, delta = is_meaningful_change(before, after)
        self.assertFalse(changed)
        self.assertEqual(delta, 0)

    # --- A3: a rotating signed-CDN-URL token must not fire every scan ---
    def test_rotated_long_url_token_is_not_meaningful(self):
        base = "welcome to acme, the competitor intelligence platform for revenue teams"
        before = f"{base}\nhttps://cdn.acme.com/asset?sig={'a' * 220}\nsame trailing copy line"
        after = f"{base}\nhttps://cdn.acme.com/asset?sig={'b' * 220}\nsame trailing copy line"
        changed, delta = is_meaningful_change(before, after)
        self.assertFalse(changed)
        self.assertEqual(delta, 0)

    # --- A4: a save-$X promo banner OUTSIDE ## Pricing must not fire ---
    def test_promo_banner_outside_pricing_section_is_not_meaningful(self):
        pricing = (
            "## Pricing\n"
            "Starter costs $19 per seat every month.\n"
            "Growth costs $49 per seat every month."
        )
        before = f"# Home\nSave $200 today only for brand new signups.\n{pricing}\n## FAQ\nReach support anytime."
        after = before.replace("$200", "$150")
        # non-vacuous: the WHOLE-text price multiset does change; only scoping
        # to the (identical) ## Pricing section keeps this quiet.
        self.assertNotEqual(
            _price_tokens(_normalize(before)), _price_tokens(_normalize(after))
        )
        changed, _ = is_meaningful_change(before, after)
        self.assertFalse(changed)

    # --- A4: a real plan-price change INSIDE ## Pricing still fires ---
    def test_price_change_inside_pricing_section_is_meaningful(self):
        pricing = (
            "## Pricing\n"
            "Starter costs $19 per seat every month.\n"
            "Growth costs $49 per seat every month."
        )
        before = f"# Home\nSave $200 today only for brand new signups.\n{pricing}\n## FAQ\nReach support anytime."
        after = before.replace("$19", "$29")
        changed, delta = is_meaningful_change(before, after)
        self.assertTrue(changed)
        self.assertGreater(delta, 0)

    # --- A1: a 4000-line page must not freeze the differ (coarse Counter diff) ---
    def test_large_repetitive_page_is_fast_and_nonzero(self):
        before = "\n".join(
            f"promotional filler line number {i} describing the product suite"
            for i in range(4000)
        )
        after = before.replace(
            "promotional filler line number 0 describing the product suite",
            "promotional filler line number 0 describing the newest product suite",
        )
        start = time.perf_counter()
        delta = compute_chars_changed(before, after)
        elapsed = time.perf_counter() - start
        self.assertLess(elapsed, 0.5)
        self.assertGreater(delta, 0)
        # pins the coarse multiset formula the >3000-line cap falls back to
        ca = Counter(_normalize_lines(before))
        cb = Counter(_normalize_lines(after))
        expected = sum(abs(ca[l] - cb[l]) * len(l) for l in (ca.keys() | cb.keys()))
        self.assertEqual(delta, expected)


if __name__ == "__main__":
    unittest.main()
