CHANGE_THRESHOLD = 100  # net character delta on main content body

def compute_net_char_delta(text_before: str, text_after: str) -> int:
    """
    Returns abs(len(after) - len(before)) on main content text.
    Uses character count on the extracted content body (not raw HTML).
    """
    return abs(len(text_after) - len(text_before))

def is_meaningful_change(text_before: str, text_after: str) -> tuple[bool, int]:
    """
    Returns (is_meaningful, net_delta).
    Meaningful = net_delta > CHANGE_THRESHOLD.
    """
    delta = compute_net_char_delta(text_before, text_after)
    return delta > CHANGE_THRESHOLD, delta
