"""Shared response-serialization helpers."""
from datetime import timezone


def iso_utc(dt):
    """Serialize a datetime as an explicit-UTC ISO-8601 string.

    Our timestamps come from func.now() / datetime.utcnow() (UTC) but live in
    tz-naive columns. A bare .isoformat() drops the offset, so the browser's
    new Date(...) reads them as LOCAL time and "x ago" / trial countdowns skew
    by the user's UTC offset (GitHub issue #3, bug #2). Marking them UTC fixes
    it. None passes through unchanged.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()
