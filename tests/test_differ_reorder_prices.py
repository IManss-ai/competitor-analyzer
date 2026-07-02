"""Regression tests for differ review findings: moved-line double-counting,
price-token coverage (postfix/European/code-prefixed/magnitude), and
boundary-space undercounting of scattered deletions."""
import unittest

from app.pipeline.differ import (
    CHANGE_THRESHOLD,
    _normalize,
    _price_tokens,
    compute_chars_changed,
    is_meaningful_change,
)


class TestMovedLinesNotCharged(unittest.TestCase):
    """A line that merely moves position was charged twice its length —
    rotating testimonial/logo blocks fired a change event on every scan."""

    def test_pure_rotation_costs_zero(self):
        a = "alpha testimonial from a very happy customer here\n" \
            "beta testimonial from another delighted customer\n" \
            "gamma testimonial from a third glowing reviewer\n"
        b = "gamma testimonial from a third glowing reviewer\n" \
            "alpha testimonial from a very happy customer here\n" \
            "beta testimonial from another delighted customer\n"
        self.assertEqual(compute_chars_changed(a, b), 0)
        meaningful, _ = is_meaningful_change(a, b)
        self.assertFalse(meaningful)

    def test_shuffled_block_below_threshold(self):
        lines = [f"logo row {i} with some partner branding text" for i in range(10)]
        a = "\n".join(lines)
        b = "\n".join(reversed(lines))
        self.assertEqual(compute_chars_changed(a, b), 0)

    def test_move_plus_real_edit_charges_only_the_edit(self):
        a = "first stable line of content\nprice line says $19 per month\nlast stable line here\n"
        b = "last stable line here\nfirst stable line of content\nprice line says $29 per month\n"
        # The move is free; the $19 -> $29 substitution is a real edit.
        chars = compute_chars_changed(a, b)
        self.assertGreater(chars, 0)
        self.assertLess(chars, 40)
        meaningful, _ = is_meaningful_change(a, b)
        self.assertTrue(meaningful)  # price multiset changed

    def test_genuine_replacement_still_counted(self):
        a = "\n".join(f"old content row number {i} describing the legacy product" for i in range(5))
        b = "\n".join(f"brand new copy line {i} describing the relaunched platform" for i in range(5))
        self.assertGreater(compute_chars_changed(a, b), CHANGE_THRESHOLD)


class TestPriceTokenCoverage(unittest.TestCase):
    def test_postfix_euro(self):
        self.assertTrue(_price_tokens(_normalize("Ab 9,99 € pro Monat")))
        meaningful, _ = is_meaningful_change(
            "unser plan kostet 9,99 € pro monat und mehr text hier",
            "unser plan kostet 19,99 € pro monat und mehr text hier",
        )
        self.assertTrue(meaningful)

    def test_postfix_euro_no_space(self):
        self.assertTrue(_price_tokens(_normalize("nur 19€ im monat")))

    def test_currency_code_prefix(self):
        self.assertTrue(_price_tokens(_normalize("Pro plan USD 19 per seat")))
        meaningful, _ = is_meaningful_change(
            "pro plan usd 19 per seat billed annually",
            "pro plan usd 29 per seat billed annually",
        )
        self.assertTrue(meaningful)

    def test_magnitude_suffix(self):
        a = _price_tokens(_normalize("raised $1M in funding"))
        b = _price_tokens(_normalize("raised $1B in funding"))
        self.assertNotEqual(a, b)

    def test_prefix_forms_still_work(self):
        self.assertEqual(_price_tokens(_normalize("$1,000 plan")), ["$1000"])
        self.assertTrue(_price_tokens(_normalize("€ 9.99")))

    def test_plain_numbers_not_prices(self):
        self.assertEqual(_price_tokens(_normalize("founded in 2020 with 500 users")), [])


class TestScatteredDeletions(unittest.TestCase):
    def test_scattered_word_deletions_count_separators(self):
        """Deleting every other word from a long line: the old net-delta was
        ~2x the new magnitude because boundary spaces were dropped. Charge one
        separator per removed word so real bulk shrinkage stays meaningful."""
        words = [f"word{i:03d}" for i in range(40)]  # 7 chars each
        a = " ".join(words)
        b = " ".join(w for i, w in enumerate(words) if i % 2 == 0)
        chars = compute_chars_changed(a, b)
        # 20 deleted words x (7 chars + 1 separator) = 160
        self.assertGreaterEqual(chars, 20 * 8 - 1)
        self.assertTrue(is_meaningful_change(a, b)[0])


if __name__ == "__main__":
    unittest.main()
