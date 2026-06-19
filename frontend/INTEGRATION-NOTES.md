# Frontend → Backend integration notes

Notes from the frontend redesign branch (`feat/blue-redesign`) for the backend migration
branch (`feat/deepseek-v4`). The frontend is built against the **frozen** `/api/v1/*`
contract — these are observations / requests, not changes the frontend made.

## 1. Battle card invents a "detected change" on a FIRST scan (trust / honesty)

**Observed:** a brand-new competitor's first battle card (`POST /api/v1/battlecards/generate/{id}`)
returns a detected-change entry (e.g. *"Updated landing page to highlight custom-quote pricing
instead of transparent flat rates"*) even though there is no prior snapshot to diff against on a
first scan. The dashboard Brief and Intel Feed correctly treat a first scan as a **baseline**, but
the battle card presents a fabricated change as fact. This is the core "AI-slop / can't-trust-the-
data" smell from the beta feedback.

**Request:** on an `initial_scan` / baseline card, either omit the detected-changes quadrant, or
add an `is_baseline: true` (or `change_type: "initial_scan"`) flag on the card payload so the
frontend can render it honestly ("baseline captured — first changes appear after the next scan")
instead of showing an invented change.

## 2. `last_scanned` looks stale immediately after a scan (please confirm)

**Observed:** right after a successful scan completes, the dashboard topbar showed
`LAST SCAN: 5H AGO` and competitor rows read "5h ago". Not yet confirmed whether this is a backend
`last_scanned` field that isn't updated on scan completion, or a frontend `formatTimeAgo` /
timezone issue.

**Request:** a quick joint check. If it's backend, please set `last_scanned` to the scan-completion
time in UTC so the "LIVE" framing is truthful.

---
_Added 2026-06-19 during the blue redesign. Frontend owner: `feat/blue-redesign`._
