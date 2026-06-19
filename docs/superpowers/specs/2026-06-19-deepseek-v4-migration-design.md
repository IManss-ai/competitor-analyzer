# DeepSeek V4 Migration — Design Spec

**Date:** 2026-06-19 · **Branch:** `feat/deepseek-v4` · **Status:** design, awaiting implementation plan

## Goal

Cut AI cost by replacing OpenAI (`gpt-4o-mini`) and Anthropic (`claude-haiku-4-5`,
`claude-sonnet-4-6`) with a **single provider, single model**: DeepSeek V4
(`deepseek-v4-flash`) for **every** AI task. Consolidate today's ~14 scattered
client constructions behind one module so the provider is defined in exactly one place.

**Non-goal:** changing any feature, data shape, or API response contract. The
frontend redesign runs in parallel (worktree `../rivalscope-frontend`, branch
`feat/blue-redesign`) against the **frozen** current API — this migration must not
alter request/response shapes.

## Decisions (locked with the user)

1. **DeepSeek-only.** OpenAI and Anthropic provider code is **removed**, not kept as
   fallback. The user explicitly wants one provider for simplicity ("it has to work
   clueless"). See memory `deepseek-single-provider-pref`.
2. **One model:** `deepseek-v4-flash` for all tasks (classify, brief, actions, geo,
   battlecard, planner, scanners). `deepseek-v4-pro` is a documented one-line future
   upgrade for battlecard/planner only, if quality disappoints — NOT implemented now.
3. **Keep the heuristic crash-guard.** The existing non-AI keyword/rules fallback in
   each pipeline file stays unchanged. It is distinct from a competing AI provider —
   it prevents crashes when DeepSeek is unreachable or out of credits (this has
   happened before). This is the ONLY fallback that survives.
4. **No auto-failover, no provenance.** Provenance tagging ("ai" vs "heuristic") is
   explicitly out of scope to keep the API contract frozen.

## Why one code path works

DeepSeek's API is **OpenAI-compatible** (`https://api.deepseek.com`, OpenAI
`chat.completions` shape). Today the app has two shapes:

- **OpenAI shape** (`chat.completions.create` → `.choices[0].message.content`):
  `classifier.py`, `synthesizer.py`, `action_generator.py`, `geo/visibility.py`.
- **Anthropic shape** (`messages.create` with `cache_control` → `.content[0].text`):
  `routes/battlecard.py`, `planner/engine.py`, `pipeline/social_tracker.py`,
  `pipeline/job_tracker.py`, `pipeline/google_reviews_scraper.py`,
  `pipeline/review_scraper.py`, `discovery/scanner.py`.

No site uses tool-use or streaming (verified). All Anthropic sites are mechanical
rewrites into the OpenAI `chat.completions` shape.

## Architecture

### New module: `app/llm.py`

The single source of truth for the AI provider. Exposes:

- `get_async_client()` → configured `openai.AsyncOpenAI` (base_url + key from config).
- `get_sync_client()` → configured `openai.OpenAI` (battlecard + planner are sync).
- `MODEL` constant = `deepseek-v4-flash` (and `MODEL_FLAGSHIP = deepseek-v4-pro`,
  defined but unused — for the documented future upgrade).
- `ai_available()` → bool; true when `DEEPSEEK_API_KEY` is set and not a dummy
  placeholder. Centralizes the dummy/no-key guard that today lives inconsistently
  across files.

Clients are constructed once at module load from `app/config.py`.

### Config: `app/config.py`

- Add `DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")`.
- Add `DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")`.
- Remove the hard `OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]` requirement
  (it currently crashes startup if unset). Old keys no longer required.

### Call-site conversions

**OpenAI-shape sites** — swap the module client + model only:
- `client = AsyncOpenAI(api_key=OPENAI_API_KEY)` → `client = llm.get_async_client()`
- `model="gpt-4o-mini"` → `model=llm.MODEL`
- Keep `messages`, `max_tokens`, `temperature`, response parsing, and the existing
  `try/except → _classify_heuristically / _synthesize_heuristically / …` unchanged.

**Anthropic-shape sites** — rewrite the call body:
- `anthropic.Anthropic(...)` / `AsyncAnthropic(...)` → `llm.get_sync_client()` /
  `llm.get_async_client()`.
- The cached system block `{"type":"text","text":SYSTEM,"cache_control":…}` becomes a
  `{"role":"system","content":SYSTEM}` message; the user block becomes
  `{"role":"user","content":USER}`. **Drop `cache_control`** — DeepSeek auto-caches
  context with no annotation.
- `model="claude-…"` → `model=llm.MODEL`.
- `response.content[0].text` → `response.choices[0].message.content`.
- Preserve `max_tokens`, `temperature`, the `_extract_json_from_response` /
  `parse_profile_json` parsing, and the existing `is_dummy` / heuristic guards
  (re-expressed via `llm.ai_available()`).

### JSON robustness (battlecard + JSON-returning scanners)

Sites that parse JSON out of the model response will:
1. Pass `response_format={"type": "json_object"}` (DeepSeek-supported) to bias toward
   clean JSON.
2. **Keep** the existing tolerant `_extract_json_from_response` (handles ` ```json `
   fences and bare prose) as a backstop. Belt and suspenders.

`deepseek-v4-flash` runs in non-thinking mode by default, so the `max_tokens=20`
classifier never receives reasoning-token noise.

## Files touched

| File | Change |
|---|---|
| `app/llm.py` | **new** — provider module |
| `app/config.py` | add DeepSeek vars; drop mandatory OPENAI key |
| `app/pipeline/classifier.py` | swap client+model |
| `app/pipeline/synthesizer.py` | swap client+model (2 calls) |
| `app/pipeline/action_generator.py` | swap client+model |
| `app/geo/visibility.py` | swap client+model |
| `app/routes/battlecard.py` | rewrite Anthropic→OpenAI shape (2 calls) + JSON mode |
| `app/planner/engine.py` | rewrite Anthropic→OpenAI shape |
| `app/pipeline/social_tracker.py` | rewrite (2 calls) |
| `app/pipeline/job_tracker.py` | rewrite (2 calls) |
| `app/pipeline/google_reviews_scraper.py` | rewrite |
| `app/pipeline/review_scraper.py` | rewrite (2 calls) |
| `app/discovery/scanner.py` | rewrite |
| `requirements.txt` | `anthropic` dep removable once no imports remain; `openai` stays (it's the DeepSeek client) |

## Invariants (must not change)

- Every site's `try/except → heuristic` and dummy-key guard behaves exactly as before.
- No API response shape changes (frontend contract frozen).
- `temperature` / `max_tokens` per call preserved.
- The differ's 100-char cost gate and battlecard cache/auth guards untouched.

## Verification — two distinct states

**State 1 — code-complete (no key needed):**
- `grep` confirms zero remaining `import anthropic`, `gpt-4o`, `claude-` references.
- `./venv/bin/python -m unittest discover -s tests -p "test_*.py"` passes (tests
  exercise heuristic paths when no key is set).
- App imports clean; `uvicorn main:app` boots without OPENAI/ANTHROPIC keys.

**State 2 — verified against live DeepSeek (needs user's `DEEPSEEK_API_KEY`):**
- Set key locally; run one real scan end-to-end (fetch → classify → brief → actions)
  and confirm non-heuristic output.
- Generate one battlecard; confirm JSON parses into all 4 quadrants.
- Confirm `note_degraded` is NOT firing (i.e. real AI, not the crash-guard).

Code lands in State 1 now; State 2 happens when the user provides the key. The spec
treats them as separate sign-offs.

## Deployment

- Add `DEEPSEEK_API_KEY` to Railway env vars (and local `.env`, never committed —
  per the repo's public-`.env.production` rule).
- `LLM` provider is fixed to DeepSeek in code; no provider toggle env needed.

## Open questions

None blocking. `deepseek-v4-pro` upgrade path for battlecards is documented but
deferred.
