# Instant-Pay + One-Test Paywall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cosmetic 2-day trial with a usage-based paywall — full Pro for one test, then a read-only lock with an "Upgrade to Pro — billed today" paywall; instant charge via the Polar product config.

**Architecture:** Revive the tested `app/access.py` enforcement (single `access_level()` source of truth + `require_write_access` 402 dependency) from `origin/feat/polar-readonly-enforcement`, flipping its condition from time-based (`trial_ends_at`) to usage-based (`free_test_used`). Add a `PAYWALL_ENABLED` feature flag (ships dark) and `COMPED_EMAILS` (founder never locks). Frontend gates the app shell with a paywall overlay when `access_level == "read_only"`.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic (backend), Next.js 16 App Router (frontend), Polar SDK, unittest.

## Global Constraints (verbatim from spec)

- Paid (`subscription_status == "active"`) users and `COMPED_EMAILS` (incl. `nodes.kazakhstan@gmail.com`) **must never** be locked.
- Whole feature is inert unless `PAYWALL_ENABLED=true` — `access_level()` returns `"full"` when the flag is off.
- Reads stay open everywhere; only value/write endpoints 402.
- Existing non-active users are locked on rollout (backfill `free_test_used=true`); no grandfathering.
- The Polar *product* trial removal (instant charge) is a founder dashboard action, not code.
- Backend won't boot locally → verify via `unittest` + dark-deploy on Railway using the `/settings` `access_level` field.

---

### Task 1: `app/access.py` — usage-based access level + write guard

**Files:**
- Create: `app/access.py`
- Test: `tests/test_access_level.py` (port from `origin/feat/polar-readonly-enforcement`, adapt to usage-based)

**Interfaces:**
- Produces: `access_level(user: User) -> str` ("full"|"read_only"); `is_read_only(user) -> bool`; `require_write_access(authorization, db) -> str` (FastAPI dep, 402 on locked, returns user_id).
- Consumes: `app.config.PAYWALL_ENABLED: bool`, `app.config.COMPED_EMAILS: set[str]`, `User.subscription_status`, `User.free_test_used`.

- [ ] **Step 1: Write `app/access.py`**

```python
"""Single source of truth for paywall access level.

Usage-based: a user gets the full product for ONE test, then locks to
"read_only" until they pay. Reads stay open everywhere; require_write_access
gates the value/write endpoints with a 402. Inert unless PAYWALL_ENABLED.
"""
import uuid
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import PAYWALL_ENABLED, COMPED_EMAILS
from app.db import get_session
from app.models import User


def access_level(user: User) -> str:
    """Return "full" or "read_only".

    - "full" if the paywall is disabled (feature flag off).
    - "full" if the subscription is active (paid).
    - "full" if the email is comped (founder / staff).
    - "full" if the user has NOT yet used their one free test.
    - "read_only" otherwise (free test used, not paying).
    """
    if not PAYWALL_ENABLED:
        return "full"
    if user.subscription_status == "active":
        return "full"
    if user.email and user.email.lower() in COMPED_EMAILS:
        return "full"
    if not getattr(user, "free_test_used", False):
        return "full"
    return "read_only"


def is_read_only(user: User) -> bool:
    return access_level(user) == "read_only"


def require_write_access(
    authorization: str = Header(default=None),
    db: Session = Depends(get_session),
) -> str:
    """Drop-in for require_api_user on paid/value write endpoints.
    Unauthenticated -> 401 (delegated); authenticated-but-locked -> 402.
    """
    from app.routes.api_v1 import require_api_user  # lazy: avoid import cycle
    user_id = require_api_user(authorization)
    user = db.get(User, uuid.UUID(user_id))
    if user is not None and is_read_only(user):
        raise HTTPException(
            status_code=402,
            detail="Your free test is done — upgrade to Pro to continue.",
        )
    return user_id
```

- [ ] **Step 2: Port + adapt the test suite**

Copy the matrix tests from the branch, rewritten for usage-based:
```bash
git show origin/feat/polar-readonly-enforcement:tests/test_access_level.py > tests/test_access_level.py
```
Then edit so cases assert: active→full; comped email→full; flag off→full (even if test used); free_test_used=False→full; free_test_used=True & not active & not comped & flag on→read_only. Set `PAYWALL_ENABLED=true` and `COMPED_EMAILS` within tests via monkeypatch/`app.config` override. Keep the `require_write_access` 402 test.

- [ ] **Step 3: Run tests, expect PASS**

Run: `./venv/bin/python -m unittest tests.test_access_level -v`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add app/access.py tests/test_access_level.py
git commit -m "feat(paywall): usage-based access_level + require_write_access 402 guard"
```

---

### Task 2: Config — `PAYWALL_ENABLED` + `COMPED_EMAILS`

**Files:**
- Modify: `app/config.py` (after line 33, the FRONTEND_URL block)

**Interfaces:**
- Produces: `PAYWALL_ENABLED: bool`, `COMPED_EMAILS: set[str]`.

- [ ] **Step 1: Add config**

```python
# ── Paywall (usage-based one-test model) ───────────────────────────────────
# Feature flag — ships dark. When false, access_level() always returns "full".
PAYWALL_ENABLED = os.environ.get("PAYWALL_ENABLED", "false").lower() == "true"
# Comma-separated emails that are never locked (founder / staff), lower-cased.
# Founder is hard-defaulted so we can never accidentally lock ourselves out.
_comped_raw = os.environ.get("COMPED_EMAILS", "")
COMPED_EMAILS = {e.strip().lower() for e in _comped_raw.split(",") if e.strip()}
COMPED_EMAILS.add("nodes.kazakhstan@gmail.com")
```

- [ ] **Step 2: Verify import**

Run: `./venv/bin/python -c "from app.config import PAYWALL_ENABLED, COMPED_EMAILS; print(PAYWALL_ENABLED, COMPED_EMAILS)"`
Expected: `False {'nodes.kazakhstan@gmail.com'}`

- [ ] **Step 3: Commit**

```bash
git add app/config.py && git commit -m "feat(paywall): PAYWALL_ENABLED flag + COMPED_EMAILS config"
```

---

### Task 3: Model + migration — `free_test_used`

**Files:**
- Modify: `app/models.py:17` area (User class)
- Create: `alembic/versions/009_add_free_test_used.py`

**Interfaces:**
- Produces: `User.free_test_used: bool` (default False).

- [ ] **Step 1: Add column to model**

In `app/models.py`, inside `class User`, after `trial_ends_at` (line 17), add:
```python
    # Usage-based paywall: set True once the user has had their one free test
    # (first battle card generated). Drives access_level() lock.
    free_test_used = Column(Boolean, nullable=False, default=False, server_default="false")
```

- [ ] **Step 2: Write migration**

Create `alembic/versions/009_add_free_test_used.py`:
```python
"""add free_test_used to users

Revision ID: 009
Revises: 008
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("free_test_used", sa.Boolean(), nullable=False, server_default="false"),
    )
    # Backfill: existing NON-active users have already used way more than one
    # test → lock them (founder is protected by COMPED_EMAILS in access_level).
    op.execute(
        "UPDATE users SET free_test_used = true WHERE subscription_status != 'active'"
    )


def downgrade():
    op.drop_column("users", "free_test_used")
```

- [ ] **Step 3: Verify migration imports / SQL is valid (offline check)**

Run: `./venv/bin/python -c "import alembic.versions"` is not meaningful; instead syntax-check:
`./venv/bin/python -m py_compile alembic/versions/009_add_free_test_used.py app/models.py`
Expected: no output (success). (Actual `alembic upgrade` runs on Railway against Postgres at deploy.)

- [ ] **Step 4: Commit**

```bash
git add app/models.py alembic/versions/009_add_free_test_used.py
git commit -m "feat(paywall): free_test_used column + migration 009 (backfill locks non-active)"
```

---

### Task 4: Set `free_test_used` at first battle card

**Files:**
- Modify: `app/routes/battlecard.py` (the authenticated `@router.get("/generate/{competitor_id}")` at ~line 776)

**Interfaces:**
- Consumes: the authenticated owner `User`.

- [ ] **Step 1: After a successful authed generation, mark the test used**

In the `/generate/{competitor_id}` handler, after the card is successfully produced and ownership verified, before returning, add (using the request's `db` session and the owner `user`):
```python
    # Usage-based paywall: the first generated card is "the one test".
    if user is not None and not user.free_test_used:
        user.free_test_used = True
        db.commit()
```
Only on the **authenticated owner** path — never on the public `/share` heuristic (that endpoint has no `user`). Read the handler first to use its exact `user`/`db` variable names; if the handler resolves the user lazily, fetch `db.get(User, uuid.UUID(user_id))` and set there.

- [ ] **Step 2: Syntax check**

Run: `./venv/bin/python -m py_compile app/routes/battlecard.py`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add app/routes/battlecard.py
git commit -m "feat(paywall): mark free_test_used after first battle card (the one test)"
```

---

### Task 5: Enforce write guard on value endpoints + scheduler

**Files:**
- Modify: `app/routes/api_v1.py` — import + 5 endpoint deps
- Modify: `app/scheduler.py:93` area
- Modify: `app/routes/battlecard.py` — 402 the generate endpoint for already-locked users

**Interfaces:**
- Consumes: `require_write_access`, `access_level`, `is_read_only`.

- [ ] **Step 1: Import the guard in api_v1.py**

After line 20 (`from app.serialization import iso_utc as _iso_utc`):
```python
from app.access import require_write_access, access_level
```

- [ ] **Step 2: Swap the dependency on the five value endpoints**

In `app/routes/api_v1.py`, change `Depends(require_api_user)` → `Depends(require_write_access)` on exactly these handlers (verify each signature line before editing):
- `api_update_competitor` (line 411)
- `api_add_competitor` (line 512)
- `api_approve_action` (line 771)
- `api_scan_now` (line 996)
- `api_scan_reviews` (line 1004)
Leave all read endpoints and `api_delete_competitor` on `require_api_user`.

- [ ] **Step 3: Gate battlecard generation for already-locked users**

In `app/routes/battlecard.py` `/generate/{competitor_id}`, near the top (after the owner `user` is resolved), add:
```python
    from app.access import is_read_only
    if user is not None and is_read_only(user):
        raise HTTPException(status_code=402, detail="Your free test is done — upgrade to Pro to continue.")
```
(The owner's FIRST generation still succeeds because `free_test_used` is set *after* generation in Task 4; subsequent generations 402.)

- [ ] **Step 4: Scheduler scans only full-access users**

In `app/scheduler.py`, replace the loop body guard. After `for user in db.execute(stmt).scalars().all():` add as the first line inside the loop:
```python
            from app.access import access_level
            if access_level(user) != "full":
                continue
```
(Keeps active + comped + not-yet-tested users scanned; skips locked ones. Leave the existing SQL filter as-is.)

- [ ] **Step 5: Syntax check**

Run: `./venv/bin/python -m py_compile app/routes/api_v1.py app/routes/battlecard.py app/scheduler.py`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add app/routes/api_v1.py app/routes/battlecard.py app/scheduler.py
git commit -m "feat(paywall): 402 write guard on value endpoints + scheduler full-only"
```

---

### Task 6: Expose `access_level` in `/settings`

**Files:**
- Modify: `app/routes/api_v1.py` — both serializers (GET 948-957 and PATCH 980-988)

**Interfaces:**
- Produces: `access_level` field in the settings/me payload.

- [ ] **Step 1: Add the field to both return dicts**

In both the GET `/settings` (after line 952) and PATCH `/settings` (after line 984) return dicts, add:
```python
        "access_level": access_level(user),
```
(`access_level` is already imported in Task 5 Step 1.)

- [ ] **Step 2: Syntax check**

Run: `./venv/bin/python -m py_compile app/routes/api_v1.py`
Expected: success.

- [ ] **Step 3: Run full backend test suite (no regressions)**

Run: `./venv/bin/python -m unittest discover -s tests -p "test_*.py"`
Expected: all pass (or pre-existing failures unchanged — note any).

- [ ] **Step 4: Commit**

```bash
git add app/routes/api_v1.py
git commit -m "feat(paywall): expose access_level in /settings payload"
```

---

### Task 7: Frontend — read access_level + paywall overlay

**Files:**
- Modify: `frontend/src/lib/types.ts` — add `access_level` to `SettingsData`
- Create: `frontend/src/components/paywall-overlay.tsx`
- Modify: `frontend/src/app/(dashboard)/layout.tsx` — fetch settings, render overlay when locked
- Modify: `frontend/src/lib/api.ts` — add `getSettings()` if absent; surface 402 as a typed error

**Interfaces:**
- Consumes: `/api/v1/settings` `access_level`, `/api/v1/billing/checkout-url`.

- [ ] **Step 1: Add `access_level` to `SettingsData` type**

In `frontend/src/lib/types.ts`, add `access_level?: 'full' | 'read_only';` to the `SettingsData` interface.

- [ ] **Step 2: Create the paywall overlay (client component)**

Create `frontend/src/components/paywall-overlay.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaywallOverlay({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const upgrade = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/v1/billing/checkout-url?plan=saas`, {
        headers: { Authorization: `Bearer ${userId}` },
      });
      if (!res.ok) throw new Error('checkout unavailable');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setError('Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-(--shadow-modal)">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Lock size={22} />
        </div>
        <h2 className="font-display text-[26px] leading-[1.1] tracking-[-0.01em] text-foreground">
          Your free test is done
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Upgrade to Pro for full, ongoing competitive intelligence — billed today, full access instantly.
        </p>
        {error && <p className="mt-3 text-xs font-medium text-destructive">{error}</p>}
        <Button onClick={upgrade} disabled={loading} size="lg" variant="cta" className="mt-6 w-full">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Starting checkout…</>
                   : <>Upgrade to Pro — billed today <ArrowRight size={14} /></>}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Mount the overlay in the dashboard layout when locked**

In `frontend/src/app/(dashboard)/layout.tsx`, after fetching the dashboard, also fetch settings to read access_level, and render the overlay when `read_only`:
```tsx
  let accessLevel: string = 'full';
  try {
    const api = createApiClient(session.user.user_id);
    const settings = await api.getSettings();
    accessLevel = settings.access_level ?? 'full';
  } catch {
    // Non-fatal: default to full so a settings hiccup never locks a user out.
  }
```
Then in the returned JSX, after `<MainContent>{children}</MainContent>`, add:
```tsx
      {accessLevel === 'read_only' && <PaywallOverlay userId={session.user.user_id} />}
```
Import `PaywallOverlay` at top. If `api.getSettings()` does not exist in `lib/api.ts`, add it:
```ts
  async getSettings(): Promise<SettingsData> {
    return this.fetch<SettingsData>('/settings');
  }
```

- [ ] **Step 4: Production build (type + compile gate)**

Run: `cd frontend && ./node_modules/.bin/next build`
Expected: exit 0, all routes compile.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/components/paywall-overlay.tsx \
        "frontend/src/app/(dashboard)/layout.tsx" frontend/src/lib/api.ts
git commit -m "feat(paywall): access_level-driven paywall overlay + billed-today CTA"
```

---

### Task 8: Deploy dark, verify, enable

**Files:** none (ops).

- [ ] **Step 1: Push backend + frontend (flag OFF)**

```bash
git push origin feat/instant-pay-one-test-paywall
```
Merge to `main` (fast-forward or PR) so Railway + Vercel deploy. `PAYWALL_ENABLED` is unset → defaults false → behavior unchanged. Migration 009 runs on Railway (adds column, backfills).

- [ ] **Step 2: Verify dark deploy**
- `GET /health` is ok and on the new commit.
- With the founder token, `GET /api/v1/settings` returns `access_level: "full"` (comped) — flag still off so everyone is "full".
- Backend tests green in CI/local.

- [ ] **Step 3: Founder removes the Polar product trial (instant charge)**
Polar dashboard → Products → Rivalscope Pro ($49, `a0827598`) → Free trial → None → Save. Repeat for Local ($19, `6afc7623`). (Existing mid-trial customer: founder ends trial in Polar to charge now, or lets it auto-charge.)

- [ ] **Step 4: Pre-flip safety check (CRITICAL)**
Confirm via `/settings` that: the real paying customer resolves `active` (→ would be "full"); the founder is comped. If the customer is not `active`, add their email to `COMPED_EMAILS` on Railway before flipping.

- [ ] **Step 5: Flip the flag**
Set `PAYWALL_ENABLED=true` on Railway → redeploy. Verify: founder/active stay full; a fresh free account that used its one test gets `read_only` + the paywall overlay; the upgrade CTA opens Polar checkout and (post Step 3) charges immediately.

---

## Self-Review

- **Spec coverage:** Part 1 instant charge → Task 8 Step 3 (founder action, documented). Part 2 model → Tasks 3,4. Part 3 enforcement → Tasks 1,5,6 + frontend Task 7. Comp/flag → Tasks 1,2. Scheduler → Task 5 Step 4. access_level in /settings → Task 6. Rollout safety → Task 8. All covered.
- **Placeholder scan:** none — every code step has concrete code; "verify exact var names before editing" notes apply to the two spots (battlecard handler, layout) whose surrounding code must be read first, which is normal care, not a placeholder.
- **Type consistency:** `access_level()`/`is_read_only()`/`require_write_access` names consistent across tasks; `free_test_used` consistent; `access_level` field name consistent backend↔frontend (`SettingsData.access_level`).
- **Known minor edge:** a user who adds a competitor but never generates a battle card stays "full" (free_test_used set only at card generation). Acceptable for v1 — the battle card is the core value and onboarding auto-generates it. Hardening (set on first scan completion) is a follow-up.
