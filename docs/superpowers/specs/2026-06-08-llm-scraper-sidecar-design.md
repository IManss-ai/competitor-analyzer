# llm-scraper Sidecar — Replace Jina Fetcher — Design Spec

**Date:** 2026-06-08
**Status:** Approved for planning
**Scope:** Backend fetch layer + new Node sidecar + deployment. No frontend changes.

---

## Goal

Replace Rivalscope's Jina-based page fetching with a Node.js **scraper sidecar** that renders
pages with Playwright and (for competitor homepages) extracts structured content with
**llm-scraper** (`gpt-4o-mini`). The Python backend calls the sidecar over HTTP. Fully removes
the Jina dependency (homepage fetch **and** review fetch).

## Decisions (locked during brainstorming)

1. **Fetch strategy:** llm-scraper structured extraction in the fetch path (as the original prompt
   specified), with explicit hardening so the character-level differ does not emit phantom
   "competitor changed" alerts.
2. **Deployment:** **combined container** — one Railway service runs both `uvicorn` and the Node
   sidecar; `SCRAPER_URL=http://localhost:3001`. Replaces the nixpacks build with a `Dockerfile`.
3. **Reviews:** **migrate too** — `review_scraper.py` drops Jina and calls the sidecar's
   deterministic raw endpoint; its existing Claude-based review extraction is unchanged. Jina is
   removed entirely.

## Non-Goals

- No change to `classifier.py`, `synthesizer.py`, `action_generator.py`, `scanner.py` control flow,
  or the DB schema.
- No new review-extraction schema in the sidecar (reviews already extract via Claude in Python).
- No frontend changes.

---

## Architecture

A Node sidecar at `scraper-service/` (Express, port 3001) holding ONE shared Playwright Chromium
browser, exposing three endpoints:

- **`POST /scrape`** `{ url }` → llm-scraper structured extraction → `{ text }`.
  - `llm-scraper` with `@ai-sdk/openai` `gpt-4o-mini`, `format: 'markdown'` preprocessing,
    **temperature 0**.
  - Zod schema: `{ headline: string, pricing: string, features: string[], cta: string, main_content: string }`.
  - **Canonical serialization** → `text`: fixed section order, `features` trimmed + sorted,
    whitespace normalized. Identical field values MUST produce a byte-identical string.
  - Used by `app/pipeline/fetcher.py`.
- **`POST /scrape-raw`** `{ url }` → Playwright render → Mozilla Readability + Turndown → markdown
  → `{ text }`. Deterministic (no LLM). Used by `app/pipeline/review_scraper.py`.
- **`GET /health`** → `200 {ok:true}` once the browser is launched; non-200 until ready.

Both scrape endpoints reuse the shared browser (new context/page per request, closed after).
Request timeout ~30s; on Playwright/LLM error return `502 { error }`.

## Phantom-diff mitigation

`app/pipeline/differ.py` is `abs(len(after)-len(before)) > 100`. LLM output jitters, so three layers:

1. **temperature 0** on `/scrape` extraction.
2. **Canonical serialization** in the sidecar (above).
3. **`differ.py` normalization:** add a `_normalize(text)` that lowercases, collapses all runs of
   whitespace to a single space, and strips; `compute_net_char_delta` compares normalized forms.
   `CHANGE_THRESHOLD` stays `100`. This absorbs residual wording/whitespace jitter while still
   catching real content deltas.

**Residual-risk note (documented, not built):** temp 0 + canonicalization reduces but cannot fully
guarantee LLM determinism. Escape hatch if phantom alerts appear in production: diff on
`/scrape-raw` markdown (deterministic) while keeping structured `text` for display/classification.
Not implemented now per YAGNI.

---

## Components & Files

### New: `scraper-service/`
- `package.json` — deps: `llm-scraper`, `playwright`, `zod`, `@ai-sdk/openai`, `express`,
  `@mozilla/readability`, `turndown`, `jsdom`; dev: `typescript`, `tsx`, `@types/*`. Scripts:
  `build` (tsc), `start` (node dist), `dev` (tsx).
- `tsconfig.json` — NodeNext, outDir `dist`, strict.
- `index.ts` — Express app: shared browser bootstrap, `/scrape`, `/scrape-raw`, `/health`,
  canonical serializer, structured error responses.
- `src/schema.ts` (or inline) — the Zod homepage schema + `serialize(struct): string`.

### Modified: `app/pipeline/fetcher.py`
- Replace the Jina GET with `httpx.AsyncClient(timeout=35).post(f"{SCRAPER_URL}/scrape", json={"url": url})`,
  read `resp.json()["text"]`.
- **Fallback order preserved:** if `SCRAPER_URL` is empty or `"dummy"` → `generate_mock_webpage`
  (local dev/tests). If the sidecar call fails → existing direct-HTTP + regex tag-strip last resort.
  Final failure → `("", error)`.
- Signature stays `async def fetch_page_text(url, snapshot_count=0) -> tuple[str, str|None]`.
- Remove `from app.config import JINA_API_KEY` and `JINA_BASE`; import `SCRAPER_URL`.

### Modified: `app/pipeline/differ.py`
- Add `_normalize(text)`; apply in `compute_net_char_delta`. Threshold unchanged.

### Modified: `app/pipeline/review_scraper.py`
- Replace its local `fetch_page_text` (Jina) with `httpx POST {SCRAPER_URL}/scrape-raw`.
- Remove `JINA_BASE` and the `JINA_API_KEY` read. Keep `_extract_reviews_with_claude` /
  `_analyze_complaints_with_claude` and all downstream logic. On sidecar failure, raise so the
  existing per-platform `try/except` skips that platform (current behavior).
- If `SCRAPER_URL` is empty/`"dummy"`, short-circuit to "no reviews" (so local tests don't hit network).

### Modified: `app/config.py`
- Remove `JINA_API_KEY`. Add `SCRAPER_URL = os.environ.get("SCRAPER_URL", "")`.

### Modified: deployment
- New `Dockerfile` (repo root): base Python 3.11-slim + Node 20; `npx playwright install --with-deps chromium`;
  install `scraper-service` deps + `npm run build`; install Python `requirements.txt`. Entrypoint script.
- New `scripts/start.sh` (entrypoint): `alembic upgrade head` → launch Node sidecar
  (`node scraper-service/dist/index.js`) in background → poll `http://localhost:3001/health`
  (timeout ~60s) → `exec uvicorn main:app --host 0.0.0.0 --port $PORT`. Export `SCRAPER_URL=http://localhost:3001`.
- `railway.toml` — `[build] builder = "dockerfile"`; keep `healthcheckPath="/health"` (the FastAPI one).
  Remove `nixpacks.toml` (or leave unused). `Procfile` updated to the same start script for parity.
- `OPENAI_API_KEY` (already in Railway) is read by the sidecar for llm-scraper. Document
  `SCRAPER_URL` in README; remove `JINA_API_KEY` row.

---

## Error Handling

| Condition | Behavior |
|-----------|----------|
| `SCRAPER_URL` empty/`"dummy"` (local) | fetcher → mock; reviews → no-op |
| Sidecar non-200 / unreachable (homepage) | fetcher → direct-HTTP+regex fallback → else `("", error)`; scanner stores `fetch_error`, skips |
| Sidecar non-200 / unreachable (reviews) | per-platform `try/except` skips that platform |
| llm-scraper/LLM error inside sidecar | endpoint returns `502 {error}`; treated as sidecar failure above |
| Browser crash | `/health` flips non-200; entrypoint already exec'd uvicorn, so sidecar restart is a follow-up concern (documented) |

---

## Testing

- **Sidecar smoke test** (`scraper-service`): start server against a local static HTML fixture
  (`file://` or a tiny http server); assert `/health` 200, `/scrape-raw` returns non-empty markdown,
  and the canonical serializer is stable (same input struct → identical string).
- **Python unit tests** (extend `tests/`):
  - fetcher returns sidecar `text` (httpx mocked), falls back to direct-HTTP on sidecar error,
    returns mock when `SCRAPER_URL` unset.
  - differ: `_normalize` makes whitespace/case-only changes a 0 delta, but a real >100-char content
    change still exceeds threshold.
  - review_scraper: `fetch_page_text` posts to `/scrape-raw` (httpx mocked); empty `SCRAPER_URL`
    short-circuits.
- **Regression:** existing 147 backend tests stay green.

## Success Criteria

1. No `JINA_API_KEY` / `r.jina.ai` references remain in `app/` (README updated).
2. `fetch_page_text` signature + `(text, error)` contract unchanged; `scanner.py` untouched.
3. Homepage fetch returns llm-scraper structured-then-serialized text; reviews fetch returns
   deterministic markdown; both via the sidecar.
4. Differ normalization proven to drop whitespace/case jitter and keep real deltas.
5. Combined Docker container boots both processes; `/health` (FastAPI) green; sidecar reachable on
   `localhost:3001`.
6. Local dev with no `SCRAPER_URL` still works via mock; full test suite green.
