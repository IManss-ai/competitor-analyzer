# Auth Hardening Spec — API bearer should not be the raw user_id

**Status:** IMPLEMENTED (Option A) on branch `fix/auth-hardening-signed-token` → PR #21, 2026-06-23. Not yet merged/deployed — see the rollout sequence in the PR (set `ALLOW_LEGACY_UUID_BEARER=true`, deploy both halves, verify login, then set it `false`).
**Severity:** HIGH (broken authentication)
**Owner:** T1 (backend) + T2 (frontend) — coordinated change

## The problem (evidence)

The backend API authenticates every request on the user's **raw `user_id` UUID** sent as a bearer token. There is no signature, no secret, no expiry.

- `frontend/src/lib/api.ts:18` → `Authorization: Bearer ${this.userId}`
- `app/routes/api_v1.py:25-33` (`require_api_user`) → parses the bearer, validates only that it is *UUID-shaped*, returns it. **21 endpoints** depend on this.

Confirmed against production:
- no auth → 401
- random valid UUID → **200** (empty auto-tenant)
- non-UUID garbage → 401

**Impact:** the `user_id` is a non-expiring credential. Anyone who learns a real user's UUID (server logs, `Referer` headers, the browser network tab if any of these calls run client-side, an XSS payload, a support ticket screenshot) gets full, permanent access to that account. Mitigated today only by UUIDv4 unguessability — that is not authentication.

## Constraint that shapes the fix

A signed token already exists (`app/auth.py`):
- `generate_session_token(user_id, email)` — itsdangerous signed, **5-minute expiry**
- `verify_session_token(token)` — verifies, `max_age=300`

It is a **login-handoff** token (login → `/api/auth/callback` exchange). It **cannot** be reused as the API bearer as-is: a 5-minute lifetime would log users out mid-session. So this is a design choice, not a one-line swap.

## Options

### Option A — long-lived signed API token (recommended, smallest blast radius)
Issue a separate signed API token at login (sign `{user_id}` with a longer/rotating expiry, e.g. 7–30d). Store it in the iron-session alongside `user`. Frontend sends it as the bearer. Backend `require_api_user` verifies the signature and extracts `user_id`.
- ✅ Reuses existing itsdangerous infra; `require_api_user` change is localized (1 function, 21 endpoints unaffected downstream — they still receive a `user_id` string)
- ✅ Real authentication (forged/expired tokens rejected)
- ❌ Token still reaches the client if any api.ts call runs client-side (XSS could lift it) — better than today, not perfect
- Effort: T1 ~1–2h, T2 ~1h (thread the token from session into `createApiClient`)

### Option B — server-side proxy, credential never reaches the client (most secure)
Move all data fetches behind Next.js server routes / server actions that read the httpOnly iron-session cookie and attach a server-only secret. The browser never holds an API credential.
- ✅ Strongest: no bearer in client JS at all
- ❌ Large refactor across 21 endpoints + the entire frontend data layer
- Effort: multi-day; treat as a separate milestone

### Option C — accept + monitor (do nothing structural)
Keep the design, add rate-limiting + alerting on auth anomalies.
- ❌ Does not fix the broken-auth property; not recommended beyond a stopgap

## Recommendation

**Option A now** (closes the no-signature/no-expiry hole with low risk), with **Option B logged as a future hardening milestone** if/when the app handles sensitive data or sees abuse.

## Implementation outline (Option A)

Backend (T1):
1. Add `generate_api_token(user_id)` / `verify_api_token(token)` in `app/auth.py` (longer `max_age`, e.g. 30d; sign `{user_id}` only — no email needed).
2. `require_api_user`: if the bearer parses as a UUID **and** signature-verifies → accept; reject otherwise. Verify signature first; drop the bare-UUID acceptance path. Return `user_id` as today so the 21 endpoints are untouched.
3. Return the api_token from `/auth/direct-login` and `/auth/exchange` (alongside `session_token`).
4. Keep a short deprecation window if needed (accept both) — but the goal is to stop accepting raw UUIDs.

Frontend (T2):
5. Store the api_token in the iron-session at `/api/auth/callback` (next to `user`).
6. `createApiClient` / `ApiClient` uses the api_token as the bearer instead of `userId`.

## Test plan
- `require_api_user`: valid signed token → 200; raw UUID → 401; tampered/expired token → 401; garbage → 401.
- Regression: existing `tests/test_api_v1_endpoints.py` auth fixture updated to use a signed token.
- E2E: login → dashboard → add competitor still works through the new bearer.

## Notes
- This is a **coordinated** change: shipping the backend half without the frontend half (or vice versa) logs everyone out. Land both behind one deploy, or use the accept-both deprecation window.
- Found during the 2026-06-23 exhaustive QA. See `.gstack/qa-reports/qa-report-rivalscope-dev-2026-06-23.md` (ISSUE-002).
