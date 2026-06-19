# DeepSeek V4 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all OpenAI + Anthropic AI calls with a single provider/model (DeepSeek `deepseek-v4-flash`) routed through one new module `app/llm.py`, without changing any feature or API response shape.

**Architecture:** DeepSeek is OpenAI-compatible, so the whole app runs on one `openai`-SDK code path. A new `app/llm.py` constructs the configured client and owns the model name. Every AI call site imports a module-level `client` built from `llm` and uses `llm.MODEL`. Anthropic-shape call sites (`messages.create` + `cache_control`) are rewritten into the OpenAI `chat.completions` shape. Existing heuristic fallbacks and dummy-key guards are preserved exactly.

**Tech Stack:** Python, FastAPI, SQLAlchemy, `openai` SDK (used as the DeepSeek client), `unittest` (`IsolatedAsyncioTestCase`), `unittest.mock`.

## Global Constraints

- AI provider is **DeepSeek only**. Remove all OpenAI/Anthropic provider code. (per spec decision 1)
- One model everywhere: `deepseek-v4-flash`. `deepseek-v4-pro` defined but unused. (decision 2)
- Keep every existing `try/except → heuristic` fallback and dummy/no-key guard **unchanged in behavior**. (decision 3, invariant)
- **No API response-shape changes** — frontend contract is frozen. (non-goal)
- No provenance tagging, no auto-failover. (decision 4)
- Preserve each call's `max_tokens` and `temperature` exactly.
- Keep the module-level variable name `client` in each converted file (existing tests patch `app.<module>.client...`).
- Test runner: `./venv/bin/python -m unittest discover -s tests -p "test_*.py"`. Single test: `./venv/bin/python -m unittest tests.test_NAME -v`.
- Branch: `feat/deepseek-v4`. Commit only backend paths (`git add app/ tests/ requirements.txt docs/`), never `git add .`.
- DeepSeek base URL: `https://api.deepseek.com`. Key env var: `DEEPSEEK_API_KEY`.

---

### Task 1: Provider module `app/llm.py` + config

**Files:**
- Modify: `app/config.py`
- Create: `app/llm.py`
- Create: `tests/test_llm.py`

**Interfaces:**
- Consumes: `app.config.DEEPSEEK_API_KEY`, `app.config.DEEPSEEK_BASE_URL`.
- Produces:
  - `app.llm.MODEL: str` == `"deepseek-v4-flash"`
  - `app.llm.MODEL_FLAGSHIP: str` == `"deepseek-v4-pro"` (defined, unused)
  - `app.llm.ai_available() -> bool` (True when a real, non-dummy key is set)
  - `app.llm.get_async_client() -> openai.AsyncOpenAI`
  - `app.llm.get_sync_client() -> openai.OpenAI`

- [ ] **Step 1: Add DeepSeek config, drop the mandatory OpenAI key**

In `app/config.py`, replace the line `OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]` with:

```python
# AI provider — DeepSeek (OpenAI-compatible). Old OpenAI/Anthropic keys no longer required.
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
```

- [ ] **Step 2: Write the failing test for `app/llm.py`**

Create `tests/test_llm.py`:

```python
import unittest
from unittest.mock import patch
import app.llm as llm


class TestLlm(unittest.TestCase):
    def test_model_constants(self):
        self.assertEqual(llm.MODEL, "deepseek-v4-flash")
        self.assertEqual(llm.MODEL_FLAGSHIP, "deepseek-v4-pro")

    def test_ai_available_false_when_unset(self):
        with patch("app.llm.DEEPSEEK_API_KEY", ""):
            self.assertFalse(llm.ai_available())

    def test_ai_available_false_when_dummy(self):
        with patch("app.llm.DEEPSEEK_API_KEY", "dummy"):
            self.assertFalse(llm.ai_available())

    def test_ai_available_true_with_real_key(self):
        with patch("app.llm.DEEPSEEK_API_KEY", "sk-real-key-123"):
            self.assertTrue(llm.ai_available())

    def test_async_client_uses_deepseek_base_url(self):
        client = llm.get_async_client()
        self.assertEqual(str(client.base_url).rstrip("/"), "https://api.deepseek.com")

    def test_sync_client_uses_deepseek_base_url(self):
        client = llm.get_sync_client()
        self.assertEqual(str(client.base_url).rstrip("/"), "https://api.deepseek.com")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `./venv/bin/python -m unittest tests.test_llm -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.llm'`.

- [ ] **Step 4: Implement `app/llm.py`**

Create `app/llm.py`:

```python
"""Single source of truth for the AI provider (DeepSeek V4, OpenAI-compatible).

Every AI call site builds its module-level `client` from here and uses `MODEL`.
Switching provider/model is a one-place change.
"""
from openai import OpenAI, AsyncOpenAI
from app.config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL

MODEL = "deepseek-v4-flash"
MODEL_FLAGSHIP = "deepseek-v4-pro"  # defined for a future battlecard-only upgrade; unused today

_DUMMY_KEYS = {"", "dummy", "dummy_key", "dummy_anthropic_key", "dummy_openai_key"}


def ai_available() -> bool:
    """True when a real (non-placeholder) DeepSeek key is configured."""
    return DEEPSEEK_API_KEY not in _DUMMY_KEYS


def get_async_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=DEEPSEEK_API_KEY or "dummy", base_url=DEEPSEEK_BASE_URL)


def get_sync_client() -> OpenAI:
    return OpenAI(api_key=DEEPSEEK_API_KEY or "dummy", base_url=DEEPSEEK_BASE_URL)
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `./venv/bin/python -m unittest tests.test_llm -v`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add app/config.py app/llm.py tests/test_llm.py
git commit -m "feat(llm): add DeepSeek provider module and config"
```

---

### Task 2: Convert OpenAI-shape pipeline sites

`classifier.py`, `synthesizer.py`, `action_generator.py`, `geo/visibility.py` already use the OpenAI `chat.completions` shape. Swap the client construction and model name only; keep everything else.

**Files:**
- Modify: `app/pipeline/classifier.py:1-5`, `app/pipeline/synthesizer.py:1-5`, `app/pipeline/action_generator.py:1-4`, `app/geo/visibility.py` (client construction + `model=` lines)
- Test: `tests/test_classifier_synthesizer.py`, `tests/test_action_generator.py`

**Interfaces:**
- Consumes: `app.llm.get_async_client`, `app.llm.MODEL`.
- Produces: no signature changes — `classify_change`, `synthesize_brief`, `summarize_competitor_profile`, `generate_action` keep their current signatures and return types.

- [ ] **Step 1: Update tests to expect the new model (failing)**

In `tests/test_action_generator.py`, change the assertion `self.assertEqual(kwargs["model"], "gpt-4o-mini")` to:

```python
        self.assertEqual(kwargs["model"], "deepseek-v4-flash")
```

In `tests/test_classifier_synthesizer.py`, find any `assertEqual(..., "gpt-4o-mini")` model assertions and change the expected value to `"deepseek-v4-flash"`. (If that file asserts on model name, update it; if it only asserts on returned text, leave it.)

- [ ] **Step 2: Run those tests to verify they fail**

Run: `./venv/bin/python -m unittest tests.test_action_generator -v`
Expected: FAIL — `AssertionError: 'gpt-4o-mini' != 'deepseek-v4-flash'`.

- [ ] **Step 3: Convert `classifier.py`**

Replace lines 1-5 of `app/pipeline/classifier.py`:

```python
import app.llm as llm
from app.observability import note_degraded

client = llm.get_async_client()
```

Change the call's `model="gpt-4o-mini"` (line ~31) to `model=llm.MODEL`.

- [ ] **Step 4: Convert `synthesizer.py`**

Replace lines 1-5 of `app/pipeline/synthesizer.py`:

```python
import app.llm as llm
from app.observability import note_degraded

client = llm.get_async_client()
```

Change both `model="gpt-4o-mini"` occurrences (in `synthesize_brief` and `summarize_competitor_profile`) to `model=llm.MODEL`.

- [ ] **Step 5: Convert `action_generator.py`**

Replace lines 1-4 of `app/pipeline/action_generator.py`:

```python
import app.llm as llm

client = llm.get_async_client()
```

Change `model="gpt-4o-mini"` (line ~76) to `model=llm.MODEL`.

- [ ] **Step 6: Convert `geo/visibility.py`**

In `app/geo/visibility.py`, replace the OpenAI client construction (the `from openai import ...` / `client = OpenAI(...)` lines near the top) with:

```python
import app.llm as llm

client = llm.get_sync_client()
```

(`visibility.py` uses the **sync** call `client.chat.completions.create` at line ~61, so use `get_sync_client`.) Change `model="gpt-4o-mini"` (line ~62) to `model=llm.MODEL`. Remove the now-unused `OPENAI_API_KEY` import if present.

- [ ] **Step 7: Run the OpenAI-shape tests to verify they pass**

Run: `./venv/bin/python -m unittest tests.test_action_generator tests.test_classifier_synthesizer -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/pipeline/classifier.py app/pipeline/synthesizer.py app/pipeline/action_generator.py app/geo/visibility.py tests/test_action_generator.py tests/test_classifier_synthesizer.py
git commit -m "feat(llm): route OpenAI-shape pipeline sites through DeepSeek"
```

---

### Task 3: Convert Anthropic-shape scanner sites

`social_tracker.py`, `job_tracker.py`, `google_reviews_scraper.py`, `review_scraper.py`, `discovery/scanner.py` all use `await client.messages.create(model="claude-haiku-4-5", ...)` → `.content[0].text`, with a cached system block. Rewrite each into the async OpenAI `chat.completions` shape.

**Files:**
- Modify: `app/pipeline/social_tracker.py`, `app/pipeline/job_tracker.py`, `app/pipeline/google_reviews_scraper.py`, `app/pipeline/review_scraper.py`, `app/discovery/scanner.py`
- Test: `tests/test_job_tracker.py`, `tests/test_discovery_scanner.py`, `tests/test_review_scraper_sidecar.py`, `tests/test_reviews.py`

**Interfaces:**
- Consumes: `app.llm.get_async_client`, `app.llm.MODEL`, `app.llm.ai_available`.
- Produces: no signature changes; each module keeps its existing public function names and JSON-returning behavior.

**Conversion recipe (apply to each `messages.create` call):** an Anthropic call shaped like

```python
client = AsyncAnthropic(api_key=...)   # or anthropic.AsyncAnthropic
response = await client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=N,
    messages=[{"role": "user", "content": [
        {"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": user_text},
    ]}],
    temperature=T,
)
text = response.content[0].text
```

becomes

```python
client = llm.get_async_client()
response = await client.chat.completions.create(
    model=llm.MODEL,
    max_tokens=N,
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_text},
    ],
    temperature=T,
)
text = response.choices[0].message.content
```

Keep each call's `max_tokens`/`temperature`, the surrounding `try/except`, the dummy-key guard (re-expressed with `llm.ai_available()` where the file currently checks for a dummy Anthropic key), and the `_extract_json_from_response(text)` / `parse_profile_json(text)` parsing. Replace top-of-file `import anthropic` (and any `client = ...Anthropic(...)`) with `import app.llm as llm`.

- [ ] **Step 1: Update scanner tests to mock the new client (failing)**

In each of `tests/test_job_tracker.py`, `tests/test_discovery_scanner.py`, `tests/test_review_scraper_sidecar.py`, `tests/test_reviews.py`: find patches/targets referencing `messages.create` or `anthropic`/`claude` and update them to the new shape. Specifically:
- Change patch targets from `...client.messages.create` to `...client.chat.completions.create`.
- Change mocked responses from `response.content[0].text = "..."` to `response.choices[0].message.content = "..."`.
- Change any model assertion from `"claude-haiku-4-5"` to `"deepseek-v4-flash"`.

Example mock shape (matches the OpenAI client used elsewhere):

```python
mock_response = MagicMock()
mock_choice = MagicMock()
mock_choice.message.content = '{"posts": []}'   # whatever JSON the test expects
mock_response.choices = [mock_choice]
mock_create.return_value = mock_response
```

- [ ] **Step 2: Run the scanner tests to verify they fail**

Run: `./venv/bin/python -m unittest tests.test_job_tracker tests.test_discovery_scanner tests.test_review_scraper_sidecar tests.test_reviews -v`
Expected: FAIL (patch target or attribute mismatch).

- [ ] **Step 3: Convert `social_tracker.py`**

Apply the conversion recipe to both `messages.create` calls (lines ~34 and ~65). Replace the Anthropic import/client with `import app.llm as llm` and a module-level `client = llm.get_async_client()` (if the file constructs a client per-call, construct via `llm.get_async_client()` at the same spot). Keep `_extract_json_from_response(...)` on the result.

- [ ] **Step 4: Convert `job_tracker.py`**

Apply the recipe to both calls (lines ~119 and ~156). Note line ~162 returns `response.content[0].text.strip().strip('"').strip()` — convert to `response.choices[0].message.content.strip().strip('"').strip()`.

- [ ] **Step 5: Convert `google_reviews_scraper.py`**

Apply the recipe to the call at line ~37. Keep `_extract_json_from_response(...)`.

- [ ] **Step 6: Convert `review_scraper.py`**

Apply the recipe to both calls (lines ~67 and ~98). Keep `_extract_json_from_response(...)`.

- [ ] **Step 7: Convert `discovery/scanner.py`**

Apply the recipe to the call at line ~62. Convert `resp.content[0].text` → `resp.choices[0].message.content`, keep `parse_profile_json(...)`. Re-express any dummy-key guard with `llm.ai_available()`.

- [ ] **Step 8: Run the scanner tests to verify they pass**

Run: `./venv/bin/python -m unittest tests.test_job_tracker tests.test_discovery_scanner tests.test_review_scraper_sidecar tests.test_reviews -v`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/pipeline/social_tracker.py app/pipeline/job_tracker.py app/pipeline/google_reviews_scraper.py app/pipeline/review_scraper.py app/discovery/scanner.py tests/test_job_tracker.py tests/test_discovery_scanner.py tests/test_review_scraper_sidecar.py tests/test_reviews.py
git commit -m "feat(llm): route scanner sites through DeepSeek"
```

---

### Task 4: Convert battlecard + planner (flagship sites + JSON mode)

`routes/battlecard.py` (2 sync calls) and `planner/engine.py` (1 sync call) use `claude-sonnet-4-6` via the sync Anthropic client and parse JSON out of the text. Convert to the sync OpenAI shape and request JSON mode where the response is parsed as JSON.

**Files:**
- Modify: `app/routes/battlecard.py:165-210` (both call blocks), `app/planner/engine.py:223-235`
- Test: `tests/test_battlecard_local.py`

**Interfaces:**
- Consumes: `app.llm.get_sync_client`, `app.llm.MODEL`, `app.llm.ai_available`.
- Produces: `get_or_generate_battlecard` and the planner entry point keep their signatures and return shapes (4-quadrant dict). **No response-shape change.**

- [ ] **Step 1: Update `tests/test_battlecard_local.py` (failing)**

Change any patch target from `anthropic`/`client.messages.create` to the sync OpenAI client `chat.completions.create`, mock `response.choices[0].message.content` instead of `response.content[0].text`, and change model assertions from `"claude-sonnet-4-6"` to `"deepseek-v4-flash"`. Use the same `mock_response.choices = [mock_choice]` shape as Task 3 Step 1.

- [ ] **Step 2: Run the battlecard test to verify it fails**

Run: `./venv/bin/python -m unittest tests.test_battlecard_local -v`
Expected: FAIL.

- [ ] **Step 3: Convert the battlecard calls**

In `app/routes/battlecard.py`, for **both** generation blocks (around lines 165-210 and 341-395):
- Replace `api_key = os.getenv("ANTHROPIC_API_KEY")` + `is_dummy = (not api_key) or (api_key == "dummy_anthropic_key") or not allow_ai` with:

```python
    is_dummy = (not llm.ai_available()) or not allow_ai
```

- Replace `client = anthropic.Anthropic(api_key=api_key)` with `client = llm.get_sync_client()`.
- Replace the `client.messages.create(...)` call:

```python
            response = client.chat.completions.create(
                model=llm.MODEL,
                max_tokens=1024,
                messages=[
                    {"role": "system", "content": LOCAL_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
```

- Keep the existing tolerant parsing (`if "```json" in content: ...` then `json.loads`) unchanged as a backstop.
- Add `import app.llm as llm` at the top; remove `import anthropic`.
- Use the correct system prompt constant for each block (the second block may use a different prompt than `LOCAL_SYSTEM_PROMPT` — keep whichever each block already references).

- [ ] **Step 4: Convert the planner call**

In `app/planner/engine.py` (lines ~223-235): replace the Anthropic client + `messages.create` with `llm.get_sync_client()` + `chat.completions.create(model=llm.MODEL, ...)` using the recipe from Task 3 (system + user messages, drop `cache_control`). Convert `resp.content[0].text` → `resp.choices[0].message.content`. If the planner output is parsed as JSON, add `response_format={"type": "json_object"}`. Add `import app.llm as llm`, remove `import anthropic`.

- [ ] **Step 5: Run the battlecard test to verify it passes**

Run: `./venv/bin/python -m unittest tests.test_battlecard_local -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/routes/battlecard.py app/planner/engine.py tests/test_battlecard_local.py
git commit -m "feat(llm): route battlecard + planner through DeepSeek with JSON mode"
```

---

### Task 5: Cleanup, dependency removal, full-suite verification

**Files:**
- Modify: `requirements.txt`
- Verify: whole `app/` tree

- [ ] **Step 1: Confirm no provider references remain**

Run:
```bash
grep -rn "import anthropic\|from anthropic\|claude-\|gpt-4o\|OPENAI_API_KEY\|ANTHROPIC_API_KEY" app/
```
Expected: no matches in `app/` (config no longer references the old keys; no source imports `anthropic`). If any remain, fix them per the recipes above before continuing.

- [ ] **Step 2: Remove the `anthropic` dependency**

In `requirements.txt`, delete the `anthropic...` line. Keep `openai` (it is the DeepSeek client).

- [ ] **Step 3: Run the full test suite**

Run: `./venv/bin/python -m unittest discover -s tests -p "test_*.py"`
Expected: OK (all tests pass). If a test still references the old model/shape, update it per Tasks 2-4.

- [ ] **Step 4: Verify the app boots without old keys**

Run:
```bash
env -u OPENAI_API_KEY -u ANTHROPIC_API_KEY ./venv/bin/python -c "import main; print('boot OK')"
```
Expected: prints `boot OK` (no `KeyError` from a mandatory OPENAI key).

- [ ] **Step 5: Commit**

```bash
git add requirements.txt
git commit -m "chore(llm): drop anthropic dependency after DeepSeek migration"
```

---

### Task 6: Live verification (DEFERRED — requires user's DeepSeek key)

This task is **not code**; it is the State-2 acceptance gate. Do it only after the user sets `DEEPSEEK_API_KEY`. Do not block code-complete on it.

- [ ] **Step 1: Set the key locally**

Add `DEEPSEEK_API_KEY=<real key>` to a local `.env` (never commit it) and export it for the shell.

- [ ] **Step 2: Run one real scan end-to-end**

Trigger a scan for one competitor (via the app's scan endpoint or a small script calling `scan_competitor`). Confirm the brief/classification is real model output, and that `note_degraded` did NOT fire (grep logs for `degraded`).

- [ ] **Step 3: Generate one battlecard**

Call the authenticated `/battlecard/generate?force=true` for an owned competitor. Confirm the response parses into all four quadrants (executive_summary, what_changed, strategic_signals, playbook) with non-empty content.

- [ ] **Step 4: Record the result**

Note pass/fail in the PR description. If JSON parsing fails, confirm `response_format={"type":"json_object"}` is set and the tolerant backstop is intact.

- [ ] **Step 5: Add the key to Railway**

Set `DEEPSEEK_API_KEY` in the Railway service env vars before deploying `main`.

---

## Self-Review

**Spec coverage:**
- `app/llm.py` module → Task 1 ✓
- Config (DeepSeek vars, drop mandatory OpenAI key) → Task 1 ✓
- OpenAI-shape conversions (classifier, synthesizer, action_generator, geo) → Task 2 ✓
- Anthropic-shape scanner conversions (5 files) → Task 3 ✓
- Battlecard + planner + JSON mode → Task 4 ✓
- Keep heuristic guards / `ai_available` centralization → invariant repeated in Tasks 2-4 ✓
- Drop anthropic dep, grep verification, boot check → Task 5 ✓
- Two verification states (code-complete vs live) → Task 5 (State 1) + Task 6 (State 2) ✓
- `deepseek-v4-pro` defined-but-unused → Task 1 Step 4 ✓

**Placeholder scan:** No TBD/TODO. Each code step shows the code. The scanner conversion uses a single explicit recipe applied per file (paths + line numbers given) rather than repeating identical blocks — acceptable since the recipe is fully spelled out.

**Type consistency:** `client` module variable preserved across all files (test patch points). `llm.MODEL` / `llm.get_async_client` / `llm.get_sync_client` / `llm.ai_available` names match Task 1's Produces block throughout. Mock shape (`response.choices[0].message.content`) consistent in Tasks 2-4.
