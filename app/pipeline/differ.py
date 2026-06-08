import re

CHANGE_THRESHOLD = 100  # net character delta on normalized main content body

_WS = re.compile(r"\s+")


def _normalize(text: str) -> str:
    """Lowercase + collapse all whitespace runs to a single space + strip.

    Absorbs LLM/markdown formatting jitter (whitespace, casing) so the
    character-level differ only reacts to real content changes.
    """
    return _WS.sub(" ", (text or "").lower()).strip()


def compute_net_char_delta(text_before: str, text_after: str) -> int:
    """abs(len(after) - len(before)) on the NORMALIZED content body."""
    return abs(len(_normalize(text_after)) - len(_normalize(text_before)))


def is_meaningful_change(text_before: str, text_after: str) -> tuple[bool, int]:
    """Returns (is_meaningful, net_delta). Meaningful = net_delta > CHANGE_THRESHOLD."""
    delta = compute_net_char_delta(text_before, text_after)
    return delta > CHANGE_THRESHOLD, delta
