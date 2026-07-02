import difflib
import re

CHANGE_THRESHOLD = 100  # chars changed (edit magnitude) on normalized main content body

_WS = re.compile(r"\s+")
_LINE_WS = re.compile(r"[ \t]+")
_PRICE = re.compile(r"[$€£]\s?\d[\d,]*(?:\.\d+)?")
# Above this many words in a changed chunk, skip word-level refinement and
# count the whole chunk coarsely — bounds SequenceMatcher on pathological
# inputs (e.g. a single 100KB line from the direct-HTTP fallback).
_REFINE_CAP_WORDS = 20_000


def _normalize(text: str) -> str:
    """Lowercase + collapse all whitespace runs to a single space + strip.

    Absorbs LLM/markdown formatting jitter (whitespace, casing) so the
    character-level differ only reacts to real content changes.
    """
    return _WS.sub(" ", (text or "").lower()).strip()


def _normalize_lines(text: str) -> list[str]:
    """Per-line normalization: lowercase, collapse spaces/tabs, drop blanks.

    Unlike _normalize this preserves line structure, so the line-level diff
    can localize edits before word-level refinement.
    """
    lines = []
    for line in (text or "").lower().splitlines():
        line = _LINE_WS.sub(" ", line).strip()
        if line:
            lines.append(line)
    return lines


def _price_tokens(normalized_text: str) -> list[str]:
    """Sorted multiset of currency amounts (e.g. '$19', '€1299.00')."""
    return sorted(
        m.replace(" ", "").replace(",", "")
        for m in _PRICE.findall(normalized_text)
    )


def compute_net_char_delta(text_before: str, text_after: str) -> int:
    """abs(len(after) - len(before)) on the NORMALIZED content body."""
    return abs(len(_normalize(text_after)) - len(_normalize(text_before)))


def compute_chars_changed(text_before: str, text_after: str) -> int:
    """Edit magnitude: how many characters were actually edited between versions.

    Two-stage diff — lines first, then words within each changed chunk — so a
    rewrapped-but-identical word stream costs 0 while an in-place substitution
    (e.g. '$19' -> '$29') costs its real size. The net length delta is blind
    to same-length edits; this metric is always >= it.
    """
    a_norm = _normalize(text_before)
    b_norm = _normalize(text_after)
    if a_norm == b_norm:
        return 0
    if not a_norm or not b_norm:
        return max(len(a_norm), len(b_norm))

    a_lines = _normalize_lines(text_before)
    b_lines = _normalize_lines(text_after)
    changed = 0
    # autojunk must stay False: with repetitive page vocab it junks popular
    # words/lines and inflates the cost to the whole page.
    line_sm = difflib.SequenceMatcher(None, a_lines, b_lines, autojunk=False)
    for tag, a1, a2, b1, b2 in line_sm.get_opcodes():
        if tag == "equal":
            continue
        a_words = " ".join(a_lines[a1:a2]).split()
        b_words = " ".join(b_lines[b1:b2]).split()
        a_chunk = " ".join(a_words)
        b_chunk = " ".join(b_words)
        if (
            not a_words
            or not b_words
            or max(len(a_words), len(b_words)) > _REFINE_CAP_WORDS
        ):
            changed += max(len(a_chunk), len(b_chunk))
            continue
        word_sm = difflib.SequenceMatcher(None, a_words, b_words, autojunk=False)
        for wtag, x1, x2, y1, y2 in word_sm.get_opcodes():
            if wtag == "equal":
                continue
            changed += max(
                len(" ".join(a_words[x1:x2])),
                len(" ".join(b_words[y1:y2])),
            )
    return changed


def is_meaningful_change(text_before: str, text_after: str) -> tuple[bool, int]:
    """Returns (is_meaningful, chars_changed).

    Meaningful = more than CHANGE_THRESHOLD chars actually edited, OR any
    change to the multiset of currency amounts on the page — price swaps are
    usually same-length digit substitutions the generic gate would miss.
    """
    chars = compute_chars_changed(text_before, text_after)
    if chars == 0:
        return False, 0
    if chars > CHANGE_THRESHOLD:
        return True, chars
    if _price_tokens(_normalize(text_before)) != _price_tokens(_normalize(text_after)):
        return True, chars
    return False, chars
