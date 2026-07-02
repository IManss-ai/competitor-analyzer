import difflib
import re
from collections import Counter

CHANGE_THRESHOLD = 100  # chars changed (edit magnitude) on normalized main content body

_WS = re.compile(r"\s+")
_LINE_WS = re.compile(r"[ \t]+")
# Three price notations (input is normalize()d, i.e. lowercase):
#   symbol-prefix   $19  € 1,299.00  $1m
#   symbol-postfix  9,99 €  19€   (European decimal comma allowed)
#   code-prefix     usd 19  eur 9.99
# Magnitude suffixes (k/m/b) are part of the token so $1m -> $1b is a change.
_PRICE = re.compile(
    r"[$€£]\s?\d[\d,]*(?:\.\d+)?[kmb]?"
    r"|\d[\d.]*(?:,\d+)?\s?[$€£]"
    r"|\b(?:usd|eur|gbp)\s?\d[\d,]*(?:[.,]\d+)?[kmb]?\b"
)
# A single unbroken run this long is never real prose — it's a URL, a signed
# CDN token, a base64 blob, or an LLM run-on. Collapsing every such run to one
# fixed placeholder means a rotating signature (or a tiny edit buried inside a
# 200-char token) reads as noise, not a phantom "meaningful change". Currency
# amounts are far under 40 chars, so _PRICE is unaffected.
_MONOLITHIC = re.compile(r"\S{40,}")
_MONOLITHIC_PLACEHOLDER = "￼"  # OBJECT REPLACEMENT CHARACTER (single, non-space)
# Above this many words in a changed chunk, skip word-level refinement and
# count the whole chunk coarsely — bounds SequenceMatcher on pathological
# inputs (e.g. a single 100KB line from the direct-HTTP fallback).
_REFINE_CAP_WORDS = 2_000
# Above this many lines on either side, skip the O(n^2) line-level
# SequenceMatcher and fall back to an order-insensitive multiset diff — a
# 4,000-line LLM-repetition page otherwise froze the event loop ~3.75s.
_MAX_DIFF_LINES = 3_000


def _normalize(text: str) -> str:
    """Lowercase + neutralize monolithic tokens + collapse whitespace + strip.

    Absorbs LLM/markdown formatting jitter (whitespace, casing) and rotating
    monolithic tokens (URLs, signed CDN params, base64 blobs) so the
    character-level differ only reacts to real content changes.
    """
    lowered = _MONOLITHIC.sub(_MONOLITHIC_PLACEHOLDER, (text or "").lower())
    return _WS.sub(" ", lowered).strip()


def _normalize_lines(text: str) -> list[str]:
    """Per-line normalization: lowercase, collapse spaces/tabs, drop blanks.

    Unlike _normalize this preserves line structure, so the line-level diff
    can localize edits before word-level refinement.
    """
    lines = []
    for line in (text or "").lower().splitlines():
        line = _MONOLITHIC.sub(_MONOLITHIC_PLACEHOLDER, line)
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


def _chunk_cost(words: list[str]) -> int:
    """Charge a run of words including one separator per word.

    Using bare join-length undercounts scattered edits (each single-word
    deletion also removes a boundary space the join never sees), which let
    real bulk shrinkage slip under CHANGE_THRESHOLD."""
    return sum(len(w) + 1 for w in words)


def compute_chars_changed(text_before: str, text_after: str) -> int:
    """Edit magnitude: how many characters were actually edited between versions.

    Two-stage diff — lines first, then words within each changed chunk — so a
    rewrapped-but-identical word stream costs 0 while an in-place substitution
    (e.g. '$19' -> '$29') costs its real size. Lines whose content merely moved
    position cost 0 (rotating testimonial/logo blocks are not edits). The net
    length delta is blind to same-length edits; this metric targets the edited
    characters themselves (±one separator per word), so pure length drift from
    scattered deletions is counted, not just netted.
    """
    a_norm = _normalize(text_before)
    b_norm = _normalize(text_after)
    if a_norm == b_norm:
        return 0
    if not a_norm or not b_norm:
        return max(len(a_norm), len(b_norm))

    a_lines = _normalize_lines(text_before)
    b_lines = _normalize_lines(text_after)
    # Pathological page (LLM run-on, giant feed): the O(n^2) line matcher would
    # freeze the event loop. Fall back to an order-insensitive multiset diff —
    # a moved line nets to zero, a changed/added/removed line costs its length.
    if max(len(a_lines), len(b_lines)) > _MAX_DIFF_LINES:
        ca = Counter(a_lines)
        cb = Counter(b_lines)
        return sum(abs(ca[ln] - cb[ln]) * len(ln) for ln in (ca.keys() | cb.keys()))
    # autojunk must stay False: with repetitive page vocab it junks popular
    # words/lines and inflates the cost to the whole page.
    line_sm = difflib.SequenceMatcher(None, a_lines, b_lines, autojunk=False)
    opcodes = [op for op in line_sm.get_opcodes() if op[0] != "equal"]

    # A line deleted in one place and inserted verbatim in another is a MOVE,
    # not an edit. SequenceMatcher never pairs a delete with a distant insert,
    # so without this exemption every moved line is charged twice its length.
    deleted = Counter()
    inserted = Counter()
    for _tag, a1, a2, b1, b2 in opcodes:
        deleted.update(a_lines[a1:a2])
        inserted.update(b_lines[b1:b2])
    moved_a = deleted & inserted  # multiset of lines to exempt on each side
    moved_b = moved_a.copy()

    def _keep(line: str, budget: Counter) -> bool:
        if budget[line] > 0:
            budget[line] -= 1
            return False
        return True

    changed = 0
    for _tag, a1, a2, b1, b2 in opcodes:
        a_kept = [ln for ln in a_lines[a1:a2] if _keep(ln, moved_a)]
        b_kept = [ln for ln in b_lines[b1:b2] if _keep(ln, moved_b)]
        a_words = " ".join(a_kept).split()
        b_words = " ".join(b_kept).split()
        if not a_words and not b_words:
            continue
        if (
            not a_words
            or not b_words
            or max(len(a_words), len(b_words)) > _REFINE_CAP_WORDS
        ):
            changed += max(_chunk_cost(a_words), _chunk_cost(b_words))
            continue
        word_sm = difflib.SequenceMatcher(None, a_words, b_words, autojunk=False)
        for wtag, x1, x2, y1, y2 in word_sm.get_opcodes():
            if wtag == "equal":
                continue
            changed += max(
                _chunk_cost(a_words[x1:x2]),
                _chunk_cost(b_words[y1:y2]),
            )
    return changed


def _pricing_section(text: str) -> str | None:
    """Body of the '## Pricing' section (heading to the next '## ' or EOF), or
    None when the page has no such heading.

    Runs on the per-line normalized form, which lowercases and keeps the
    markdown '## ' markers that _normalize would otherwise flatten into one line.
    """
    collected: list[str] = []
    found = False
    in_section = False
    for line in _normalize_lines(text):
        if line.startswith("## "):
            if in_section:
                break  # next level-2 heading ends the pricing section
            if "pricing" in line:
                found = True
                in_section = True
            continue
        if in_section:
            collected.append(line)
    return "\n".join(collected) if found else None


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
    # Price-swap gate. When BOTH versions carry a '## Pricing' section, compare
    # currency amounts only inside it — a rotating "Save $200" promo banner
    # elsewhere is marketing churn, not a plan-price change. Otherwise fall back
    # to the whole page (backward compatible for pages without the heading).
    section_before = _pricing_section(text_before)
    section_after = _pricing_section(text_after)
    if section_before is not None and section_after is not None:
        prices_before = _price_tokens(section_before)
        prices_after = _price_tokens(section_after)
    else:
        prices_before = _price_tokens(_normalize(text_before))
        prices_after = _price_tokens(_normalize(text_after))
    if prices_before != prices_after:
        return True, chars
    return False, chars
