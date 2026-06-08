"""Centralized provenance / degradation signalling for the pipeline.

Every AI- and scraper-backed module degrades to heuristic or mock output on
failure. Without a signal, that fabricated data is indistinguishable from real
data — which is exactly how an out-of-credits outage stayed invisible while the
UI kept showing confident (fake) intel.

Call ``note_degraded()`` at every fallback site. Failures that mean "we expected
real data and could not get it" (API error, sidecar down) are logged LOUDLY via
print() so they surface in Railway logs; intentional local-dev paths (no key,
scraper unset) are quiet.

Grep production logs for ``[degraded]`` to see every place fake data was served.
"""

# Reasons that mean real data was expected but unavailable → make them loud.
_FAILURE_REASONS = {"api_error", "sidecar_down"}


def note_degraded(module: str, source: str, reason: str, exc: BaseException | None = None) -> None:
    """Record that ``module`` returned ``source`` (e.g. mock/heuristic/direct_http)
    output instead of real AI/sidecar data, for ``reason``."""
    detail = f" — {type(exc).__name__}: {exc}" if exc is not None else ""
    loud = "FALLBACK" if reason in _FAILURE_REASONS else "degraded"
    print(f"[{loud}] {module} -> {source} output (reason={reason}){detail}", flush=True)
