"""Synthesizer data-honesty tests (weekly-brief heuristic fallback).

Same class of bug as GitHub issue #3 (battle-card fabrication), never back-ported
to the synthesizer: when the AI is unavailable, `_synthesize_heuristically` shipped
hard-coded specifics — invented prices ("$29/mo (was $19/mo)"), an invented feature
("AI Copilot"), an invented tagline ("Operating System for Enterprise Productivity")
— as fact in the weekly email, for EVERY competitor regardless of what changed.

The heuristic knows only the competitor name and the change_type (not the actual
before/after copy), so it must state a generic, change-type-grounded truth and
point the founder at the source — never fabricate specifics.
"""
import unittest

from app.pipeline.synthesizer import _synthesize_heuristically

# Specifics the OLD heuristic invented and presented as fact for ANY competitor.
FABRICATED_SPECIFICS = [
    "$29", "$19", "$59", "$49",                       # invented prices
    "AI Copilot",                                     # invented feature
    "Operating System for Enterprise Productivity",   # invented tagline
]

CHANGE_TYPES = ["pricing_change", "feature_add", "repositioning", "minor_copy", "something_else"]


class TestSynthesizerHonesty(unittest.TestCase):
    def test_no_fabricated_specifics_in_any_branch(self):
        for ct in CHANGE_TYPES:
            brief = _synthesize_heuristically("Acme", ct)
            for phrase in FABRICATED_SPECIFICS:
                self.assertNotIn(
                    phrase.lower(), brief.lower(),
                    f"heuristic {ct!r} brief fabricates {phrase!r}: {brief!r}",
                )

    def test_no_invented_dollar_amounts(self):
        for ct in CHANGE_TYPES:
            brief = _synthesize_heuristically("Acme", ct)
            self.assertNotIn("$", brief, f"heuristic {ct!r} brief invents a price: {brief!r}")

    def test_brief_names_the_competitor(self):
        for ct in CHANGE_TYPES:
            brief = _synthesize_heuristically("Acme", ct)
            self.assertIn("Acme", brief)

    def test_branches_remain_distinct(self):
        pricing = _synthesize_heuristically("N", "pricing_change")
        feature = _synthesize_heuristically("N", "feature_add")
        repos = _synthesize_heuristically("N", "repositioning")
        self.assertNotEqual(pricing, feature)
        self.assertNotEqual(feature, repos)
        self.assertNotEqual(pricing, repos)


if __name__ == "__main__":
    unittest.main()
