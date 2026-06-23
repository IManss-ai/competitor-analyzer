#!/usr/bin/env python3
"""Diagnose which Polar environment the configured token belongs to.

Polar sits behind Cloudflare, which blocks the default urllib User-Agent
(returns 403 / error 1010) — so we send a browser UA. We hit the token-identity
endpoint (/v1/organizations/) on BOTH environments and read the status:

    200 -> token is valid in this environment
    401 -> token is invalid / belongs to the OTHER environment
    403 -> token authenticates but lacks scope (still that environment)

Usage (no secrets are printed):
    railway variables --json | python3 scripts/polar_probe.py
    # or:  POLAR_ACCESS_TOKEN=... python3 scripts/polar_probe.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
ENVS = [("PRODUCTION", "https://api.polar.sh"),
        ("SANDBOX", "https://sandbox-api.polar.sh")]


def load_token() -> str:
    if not sys.stdin.isatty():
        data = sys.stdin.read().strip()
        if data:
            try:
                return str(json.loads(data).get("POLAR_ACCESS_TOKEN", "") or "")
            except json.JSONDecodeError:
                pass
    return os.environ.get("POLAR_ACCESS_TOKEN", "")


def probe(label: str, base: str, token: str) -> None:
    req = urllib.request.Request(
        f"{base}/v1/organizations/",
        headers={"Authorization": f"Bearer {token}", "User-Agent": UA,
                 "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            code = r.status
    except urllib.error.HTTPError as e:
        code = e.code
    except Exception as e:  # noqa: BLE001
        print(f"  {label:11} -> ERROR {e}")
        return
    meaning = {200: "valid here", 401: "invalid / wrong env", 403: "valid env, scoped"}.get(code, "?")
    print(f"  {label:11} /v1/organizations/ -> HTTP {code}  ({meaning})")


def main() -> int:
    token = load_token()
    if not token:
        print("No POLAR_ACCESS_TOKEN found (pipe `railway variables --json` or set env var).")
        return 2
    print(f"token len={len(token)} prefix={token[:11]!r}\n")
    for label, base in ENVS:
        probe(label, base, token)
    print("\nGo-live expectation: PRODUCTION -> 200 (or 403). If PRODUCTION is 401, "
          "the configured token is NOT a production token.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
