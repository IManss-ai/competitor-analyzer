# llm-scraper Sidecar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Jina-based page fetching with a Node Playwright + llm-scraper sidecar that the FastAPI backend calls over HTTP (`localhost:3001`), removing Jina from both the homepage fetcher and the review scraper, deployed as a combined Docker container.

**Architecture:** A Node/Express sidecar holds one shared Playwright Chromium browser and exposes `/scrape` (llm-scraper structured extraction → canonical serialized text, for homepages), `/scrape-raw` (Playwright → Readability → Turndown markdown, deterministic, for reviews), and `/health`. Python's `fetcher.py` and `review_scraper.py` POST to it via `httpx`; `differ.py` gains a normalization step so LLM jitter can't trigger phantom change alerts. One Docker image runs `alembic` + the Node sidecar + `uvicorn`.

**Tech Stack:** Node 20+/TypeScript, Express, Playwright, llm-scraper, `@ai-sdk/openai` (`gpt-4o-mini`), Zod, `@mozilla/readability`, Turndown, jsdom; Python FastAPI, httpx; tests via `unittest` (Python) and a tsx script (Node); Docker on Railway.

---

## Pre-flight

- Branch already exists: `feat/llm-scraper-sidecar` (spec committed there).
- Backend tests: `./venv/bin/python -m unittest discover -s tests -p "test_*.py"` (147 currently pass). Single test: `./venv/bin/python -m unittest tests.test_pipeline -v`.
- Node available locally (v24). Sidecar dir is `scraper-service/` at repo root.
- **llm-scraper API caveat:** llm-scraper wraps the Vercel AI SDK and its surface has changed across versions. After `npm install`, the implementer MUST check the installed version's README / `node_modules/llm-scraper/README.md` (or its `dist` types) and adapt the exact `new LLMScraper(...)` / `scraper.run(page, schema, opts)` call. The shapes in Task 2 match llm-scraper v1.x; verify before trusting them. The **canonical serializer (Task 1) is fully deterministic and version-independent** — it is the real phantom-diff defense.

**File structure:**
- Create: `scraper-service/{package.json,tsconfig.json,index.ts,src/schema.ts,test/serialize.test.ts}`
- Create: `Dockerfile`, `scripts/start.sh`
- Modify: `app/config.py`, `app/pipeline/fetcher.py`, `app/pipeline/differ.py`, `app/pipeline/review_scraper.py`, `railway.toml`, `Procfile`, `README.md`
- Create tests: `tests/test_scraper_fetcher.py`, `tests/test_differ_normalize.py`, `tests/test_review_scraper_sidecar.py`

---

## Task 1: Sidecar scaffold + deterministic serializer (TDD)

**Files:**
- Create: `scraper-service/package.json`, `scraper-service/tsconfig.json`, `scraper-service/src/schema.ts`, `scraper-service/test/serialize.test.ts`

- [ ] **Step 1: `package.json`**
```json
{
  "name": "rivalscope-scraper-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch index.ts",
    "test": "tsx test/serialize.test.ts"
  },
  "dependencies": {
    "@ai-sdk/openai": "^1.3.0",
    "@mozilla/readability": "^0.5.0",
    "express": "^4.21.2",
    "jsdom": "^25.0.1",
    "llm-scraper": "^1.5.0",
    "playwright": "^1.48.2",
    "turndown": "^7.2.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/jsdom": "^21.1.7",
    "@types/node": "^22.10.2",
    "@types/turndown": "^5.0.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: `tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["index.ts", "src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: `src/schema.ts` — schema + deterministic serializer**
```ts
import { z } from 'zod';

export const homepageSchema = z.object({
  headline: z.string().describe('Main hero headline of the page'),
  pricing: z.string().describe('All pricing/plan information as plain text, or empty string if none'),
  features: z.array(z.string()).describe('Distinct product features or value props'),
  cta: z.string().describe('Primary call-to-action text'),
  main_content: z.string().describe('The primary body content of the page as plain text'),
});

export type Homepage = z.infer<typeof homepageSchema>;

/**
 * Deterministic serialization: identical field values MUST produce a byte-identical
 * string. features are trimmed, de-duplicated, and sorted; whitespace is normalized.
 * This is the primary defense against LLM jitter reaching the char-level differ.
 */
export function serialize(d: Partial<Homepage>): string {
  const features = Array.from(
    new Set((d.features ?? []).map((f) => f.trim()).filter(Boolean))
  ).sort();
  const lines = [
    `# ${(d.headline ?? '').trim()}`,
    '',
    '## Pricing',
    (d.pricing ?? '').trim(),
    '',
    '## Features',
    ...features.map((f) => `- ${f}`),
    '',
    '## CTA',
    (d.cta ?? '').trim(),
    '',
    '## Content',
    (d.main_content ?? '').trim(),
  ];
  return lines
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

- [ ] **Step 4: Write the failing serializer test `test/serialize.test.ts`**
```ts
import assert from 'node:assert';
import { serialize } from '../src/schema.ts';

// Determinism: feature order + whitespace must not change output.
const a = serialize({ headline: 'Acme', pricing: '$19', features: ['b', 'a', 'a'], cta: 'Buy', main_content: 'x' });
const b = serialize({ headline: 'Acme', pricing: '$19', features: ['a', 'b'], cta: 'Buy', main_content: 'x' });
assert.strictEqual(a, b, 'feature ordering/dedup must not affect output');

// Stable across calls.
const c = serialize({ headline: 'Acme', pricing: '$19', features: ['a', 'b'], cta: 'Buy', main_content: 'x' });
assert.strictEqual(a, c, 'serialize must be pure');

// Missing fields tolerated.
const empty = serialize({});
assert.ok(typeof empty === 'string', 'handles empty struct');

console.log('serialize.test: PASS');
```

- [ ] **Step 5: Install deps + run the test**

Run:
```bash
cd /var/www/html/competitor-analyzer/scraper-service && npm install && npm test
```
Expected: `npm install` succeeds; `serialize.test: PASS`. (If `npm install` fails on a package version, relax that one `^` version to the latest the registry offers and note it; do not change the code.)

- [ ] **Step 6: Commit**
```bash
cd /var/www/html/competitor-analyzer
echo "node_modules/" > scraper-service/.gitignore && echo "dist/" >> scraper-service/.gitignore
git add scraper-service/package.json scraper-service/package-lock.json scraper-service/tsconfig.json scraper-service/src/schema.ts scraper-service/test/serialize.test.ts scraper-service/.gitignore
git commit -m "feat(scraper): sidecar scaffold + deterministic homepage serializer"
```

---

## Task 2: Sidecar server — /health, /scrape-raw, /scrape

**Files:**
- Create: `scraper-service/index.ts`

- [ ] **Step 1: Verify the installed llm-scraper API**

Run:
```bash
cd /var/www/html/competitor-analyzer/scraper-service && cat node_modules/llm-scraper/README.md | head -80
```
Note the exact constructor and `run` signature for the installed version. Adapt Step 2's `/scrape` handler if it differs (constructor, `run(page, schema, { format, temperature })` vs `run(page, { schema, ... })`). Keep everything else.

- [ ] **Step 2: Write `index.ts`**
```ts
import express from 'express';
import { chromium, type Browser } from 'playwright';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { openai } from '@ai-sdk/openai';
import LLMScraper from 'llm-scraper';
import { homepageSchema, serialize } from './src/schema.ts';

const PORT = Number(process.env.SCRAPER_PORT ?? 3001);
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

let browser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  }
  return browser;
}

// llm-scraper instance (verify API per Task 2 Step 1).
const scraper = new LLMScraper(openai('gpt-4o-mini'));

async function renderHtml(url: string): Promise<string> {
  const b = await getBrowser();
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (compatible; RivalscopeBot/1.0)' });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200); // let client-rendered content settle
    return await page.content();
  } finally {
    await ctx.close();
  }
}

function htmlToMarkdown(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  const contentHtml = article?.content ?? html;
  return turndown.turndown(contentHtml).trim();
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (_req, res) => {
  try {
    await getBrowser();
    res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ ok: false, error: String(e) });
  }
});

// Deterministic markdown — for review pages (Claude extracts downstream).
app.post('/scrape-raw', async (req, res) => {
  const url = req.body?.url;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });
  try {
    const html = await renderHtml(url);
    res.json({ text: htmlToMarkdown(html, url) });
  } catch (e) {
    res.status(502).json({ error: `scrape-raw failed: ${String(e)}` });
  }
});

// llm-scraper structured extraction → canonical serialized text — for homepages.
app.post('/scrape', async (req, res) => {
  const url = req.body?.url;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });
  try {
    const b = await getBrowser();
    const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (compatible; RivalscopeBot/1.0)' });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1200);
      // NOTE: confirm this call against the installed llm-scraper README (Task 2 Step 1).
      const { data } = await scraper.run(page, homepageSchema, { format: 'markdown', temperature: 0 } as any);
      res.json({ text: serialize(data as any) });
    } finally {
      await ctx.close();
    }
  } catch (e) {
    res.status(502).json({ error: `scrape failed: ${String(e)}` });
  }
});

app.listen(PORT, () => console.log(`[scraper] listening on :${PORT}`));
```

- [ ] **Step 3: Install Playwright Chromium locally + typecheck/build**

Run:
```bash
cd /var/www/html/competitor-analyzer/scraper-service && npx playwright install chromium && npm run build
```
Expected: Chromium downloads; `tsc` compiles to `dist/` with no type errors. (If a type error comes from the `as any` llm-scraper call, that's intentional insulation against version drift — leave it.)

- [ ] **Step 4: Smoke test /health and /scrape-raw against a fixture**

Run:
```bash
cd /var/www/html/competitor-analyzer/scraper-service
printf '<html><head><title>T</title></head><body><article><h1>Hello</h1><p>%s</p></article></body></html>' "$(python3 -c 'print("word "*120)')" > /tmp/fixture.html
node dist/index.js & SVR=$!; sleep 3
curl -s localhost:3001/health
curl -s -X POST localhost:3001/scrape-raw -H 'Content-Type: application/json' -d "{\"url\":\"file:///tmp/fixture.html\"}" | head -c 200
kill $SVR
```
Expected: `{"ok":true}` then a JSON `{"text":"..."}` containing "Hello". (`/scrape` needs a real `OPENAI_API_KEY` + live URL, so it's exercised in Task 8 integration, not here.)

- [ ] **Step 5: Commit**
```bash
cd /var/www/html/competitor-analyzer
git add scraper-service/index.ts
git commit -m "feat(scraper): express sidecar with /health, /scrape-raw, /scrape"
```

---

## Task 3: config.py — SCRAPER_URL replaces JINA_API_KEY

**Files:**
- Modify: `app/config.py`

- [ ] **Step 1: Edit `app/config.py`**

Remove the line `JINA_API_KEY = os.environ.get("JINA_API_KEY", "")` and add in its place:
```python
SCRAPER_URL = os.environ.get("SCRAPER_URL", "")
```

- [ ] **Step 2: Verify nothing imports the removed name yet (fetcher/review_scraper fixed in later tasks)**

Run:
```bash
cd /var/www/html/competitor-analyzer && grep -rn "JINA_API_KEY" app/ | grep -v "os.getenv\|os.environ"
```
Expected: only `app/pipeline/fetcher.py:3` (the `from app.config import JINA_API_KEY` import) — that import is removed in Task 5. (`review_scraper.py` reads via `os.getenv`, handled in Task 6.) Do NOT run the full app yet.

- [ ] **Step 3: Commit**
```bash
git add app/config.py
git commit -m "feat(config): replace JINA_API_KEY with SCRAPER_URL"
```

---

## Task 4: differ.py normalization (TDD)

**Files:**
- Modify: `app/pipeline/differ.py`
- Create: `tests/test_differ_normalize.py`

- [ ] **Step 1: Write the failing test `tests/test_differ_normalize.py`**
```python
import unittest
from app.pipeline.differ import is_meaningful_change, compute_net_char_delta


class TestDifferNormalize(unittest.TestCase):
    def test_whitespace_and_case_jitter_is_zero_delta(self):
        a = "Acme Plan: $19 per month. Great features here."
        b = "  acme   plan: $19 PER month.\n\nGreat   features here.  "
        self.assertEqual(compute_net_char_delta(a, b), 0)
        changed, _ = is_meaningful_change(a, b)
        self.assertFalse(changed)

    def test_real_content_change_exceeds_threshold(self):
        a = "Acme Plan: $19 per month."
        b = "Acme Plan: $29 per month. " + ("New enterprise tier with SSO and audit logs. " * 4)
        changed, delta = is_meaningful_change(a, b)
        self.assertTrue(changed)
        self.assertGreater(delta, 100)
```

- [ ] **Step 2: Run it — verify it fails**

Run: `./venv/bin/python -m unittest tests.test_differ_normalize -v`
Expected: FAIL — `test_whitespace_and_case_jitter_is_zero_delta` fails because current `compute_net_char_delta` compares raw lengths (the normalized strings differ in length today).

- [ ] **Step 3: Implement normalization in `app/pipeline/differ.py`**

Replace the whole file with:
```python
import re

CHANGE_THRESHOLD = 100  # net character delta on normalized main content body

_WS = re.compile(r"\s+")


def _normalize(text: str) -> str:
    """Lowercase + collapse all whitespace runs to a single space + strip.

    Absorbs LLM/markdown formatting jitter (whitespace, casing) so the
    character-level differ only reacts to real content changes.
    """
    return _WS.sub(" ", (text or "").lower()).strip()


def compute_net_char_delta(text_before: str, text_after: str) -> int:
    """abs(len(after) - len(before)) on the NORMALIZED content body."""
    return abs(len(_normalize(text_after)) - len(_normalize(text_before)))


def is_meaningful_change(text_before: str, text_after: str) -> tuple[bool, int]:
    """Returns (is_meaningful, net_delta). Meaningful = net_delta > CHANGE_THRESHOLD."""
    delta = compute_net_char_delta(text_before, text_after)
    return delta > CHANGE_THRESHOLD, delta
```

- [ ] **Step 4: Run the new test + the existing pipeline/scanner tests**

Run:
```bash
./venv/bin/python -m unittest tests.test_differ_normalize tests.test_pipeline tests.test_scanner -v
```
Expected: all PASS. (If an existing test asserted an exact raw delta that normalization changes, read it; if it was asserting raw-length behavior, update it to the normalized expectation and note it. Do not loosen a test that checks real change detection.)

- [ ] **Step 5: Commit**
```bash
git add app/pipeline/differ.py tests/test_differ_normalize.py
git commit -m "feat(differ): normalize before char-delta to absorb LLM jitter"
```

---

## Task 5: fetcher.py → sidecar /scrape (TDD)

**Files:**
- Modify: `app/pipeline/fetcher.py`
- Create: `tests/test_scraper_fetcher.py`

- [ ] **Step 1: Write the failing test `tests/test_scraper_fetcher.py`**
```python
import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx
import app.pipeline.fetcher as fetcher


class TestScraperFetcher(unittest.IsolatedAsyncioTestCase):
    async def test_empty_scraper_url_returns_mock(self):
        with patch.object(fetcher, "SCRAPER_URL", ""):
            text, err = await fetcher.fetch_page_text("https://acme.com", snapshot_count=0)
        self.assertIsNone(err)
        self.assertIn("Acme", text)

    async def test_sidecar_success_returns_text(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json = MagicMock(return_value={"text": "# Hello\n\nstructured body"})
        post = AsyncMock(return_value=resp)
        with patch.object(fetcher, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", post):
            text, err = await fetcher.fetch_page_text("https://acme.com", snapshot_count=1)
        self.assertIsNone(err)
        self.assertEqual(text, "# Hello\n\nstructured body")
        post.assert_awaited()

    async def test_sidecar_failure_falls_back_to_direct_http(self):
        # Sidecar POST raises; direct GET returns simple HTML.
        get_resp = MagicMock()
        get_resp.raise_for_status = MagicMock()
        get_resp.text = "<html><body><p>Direct fallback content</p></body></html>"
        with patch.object(fetcher, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.ConnectError("down"))), \
             patch("httpx.AsyncClient.get", AsyncMock(return_value=get_resp)):
            text, err = await fetcher.fetch_page_text("https://acme.com", snapshot_count=1)
        self.assertIsNone(err)
        self.assertIn("Direct fallback content", text)
```

- [ ] **Step 2: Run it — verify it fails**

Run: `./venv/bin/python -m unittest tests.test_scraper_fetcher -v`
Expected: FAIL/ERROR — `fetcher` still imports `JINA_API_KEY` (removed in Task 3), so import errors or mock targets don't exist.

- [ ] **Step 3: Rewrite `app/pipeline/fetcher.py` fetch path**

Keep `generate_mock_webpage` and `extract_main_content` exactly as they are. Replace the top import and `fetch_page_text` with:
```python
import httpx
import re
from app.config import SCRAPER_URL

# generate_mock_webpage(...) UNCHANGED
# ... (leave the existing function body intact) ...


async def fetch_page_text(url: str, snapshot_count: int = 0) -> tuple[str, str | None]:
    """
    Fetch page text via the Playwright/llm-scraper sidecar, falling back to mock
    (local dev) or a direct HTTP + regex strip (sidecar down).
    Returns (text, error_message): (extracted_text, None) on success, ("", error) on failure.
    """
    is_dummy = (not SCRAPER_URL) or (SCRAPER_URL == "dummy")
    if is_dummy:
        return generate_mock_webpage(url, snapshot_count), None

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(f"{SCRAPER_URL}/scrape", json={"url": url})
            resp.raise_for_status()
            text = (resp.json().get("text") or "").strip()
            return text, None
    except Exception as scraper_err:
        # Sidecar down/failed → direct fetch + regex strip last resort.
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as d_client:
                d_resp = await d_client.get(url)
                d_resp.raise_for_status()
                html_content = d_resp.text
                text_content = re.sub(r'<script.*?</script>', ' ', html_content, flags=re.DOTALL)
                text_content = re.sub(r'<style.*?</style>', ' ', text_content, flags=re.DOTALL)
                text_content = re.sub(r'<[^>]+>', ' ', text_content)
                text_content = re.sub(r'\s+', ' ', text_content).strip()
                return text_content[:10000], None
        except Exception as e:
            return "", f"Scraper sidecar failed ({scraper_err}); direct fallback failed: {e}"
```

Keep `extract_main_content` below, unchanged.

- [ ] **Step 4: Run the new test + scanner/pipeline regression**

Run: `./venv/bin/python -m unittest tests.test_scraper_fetcher tests.test_pipeline tests.test_scanner -v`
Expected: all PASS.

- [ ] **Step 5: Commit**
```bash
git add app/pipeline/fetcher.py tests/test_scraper_fetcher.py
git commit -m "feat(fetcher): fetch via scraper sidecar; mock + direct-http fallbacks"
```

---

## Task 6: review_scraper.py → sidecar /scrape-raw (TDD)

**Files:**
- Modify: `app/pipeline/review_scraper.py`
- Create: `tests/test_review_scraper_sidecar.py`

- [ ] **Step 1: Write the failing test `tests/test_review_scraper_sidecar.py`**
```python
import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import app.pipeline.review_scraper as rs


class TestReviewScraperSidecar(unittest.IsolatedAsyncioTestCase):
    async def test_fetch_page_text_posts_to_scrape_raw(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json = MagicMock(return_value={"text": "rendered review markdown"})
        post = AsyncMock(return_value=resp)
        with patch.object(rs, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", post):
            text = await rs.fetch_page_text("https://www.g2.com/products/acme/reviews")
        self.assertEqual(text, "rendered review markdown")
        post.assert_awaited()
        # Assert it hit the /scrape-raw endpoint
        args, kwargs = post.call_args
        self.assertIn("/scrape-raw", args[0])

    async def test_empty_scraper_url_returns_empty(self):
        with patch.object(rs, "SCRAPER_URL", ""):
            text = await rs.fetch_page_text("https://www.g2.com/products/acme/reviews")
        self.assertEqual(text, "")
```

- [ ] **Step 2: Run it — verify it fails**

Run: `./venv/bin/python -m unittest tests.test_review_scraper_sidecar -v`
Expected: FAIL — `rs.SCRAPER_URL` doesn't exist and `fetch_page_text` still uses Jina.

- [ ] **Step 3: Edit `app/pipeline/review_scraper.py`**

Add the import near the top (after the existing imports):
```python
from app.config import SCRAPER_URL
```
Remove `JINA_BASE = "https://r.jina.ai/"`. Replace the existing `fetch_page_text` with:
```python
async def fetch_page_text(url: str) -> str:
    """Fetch a review page as deterministic markdown via the scraper sidecar.
    Returns "" when the sidecar is not configured (local dev/tests). Raises on
    sidecar failure so the per-platform caller skips that platform."""
    if not SCRAPER_URL or SCRAPER_URL == "dummy":
        return ""
    async with httpx.AsyncClient(timeout=35.0) as client:
        resp = await client.post(f"{SCRAPER_URL}/scrape-raw", json={"url": url})
        resp.raise_for_status()
        return (resp.json().get("text") or "").strip()
```
Leave `_extract_reviews_with_claude`, `_analyze_complaints_with_claude`, `scrape_competitor_reviews`, and everything else unchanged. Remove the now-unused `import os` ONLY if nothing else in the file uses it (check: `_extract_reviews_with_claude` uses `os.getenv("ANTHROPIC_API_KEY")` — so KEEP `import os`).

- [ ] **Step 4: Run the new test + reviews regression**

Run: `./venv/bin/python -m unittest tests.test_review_scraper_sidecar tests.test_reviews tests.test_review_url_overrides -v`
Expected: all PASS. (If `test_reviews` mocked the old Jina `fetch_page_text`, it still patches `rs.fetch_page_text` or the Claude extractor — verify; if it patched an `httpx.get` for Jina, update it to patch `httpx.AsyncClient.post` and note it.)

- [ ] **Step 5: Commit**
```bash
git add app/pipeline/review_scraper.py tests/test_review_scraper_sidecar.py
git commit -m "feat(reviews): fetch review pages via sidecar /scrape-raw; drop Jina"
```

---

## Task 7: Combined Docker container + Railway + README

**Files:**
- Create: `Dockerfile`, `scripts/start.sh`
- Modify: `railway.toml`, `Procfile`, `README.md`
- Delete (or leave unused): `nixpacks.toml`

- [ ] **Step 1: Create `scripts/start.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail

export SCRAPER_URL="${SCRAPER_URL:-http://localhost:3001}"

# DB migrations
alembic upgrade head

# Start the Node scraper sidecar in the background
node /app/scraper-service/dist/index.js &
SCRAPER_PID=$!

# Wait for the sidecar /health (max ~60s)
for i in $(seq 1 60); do
  if curl -fsS http://localhost:3001/health >/dev/null 2>&1; then
    echo "[start] scraper sidecar healthy"
    break
  fi
  if ! kill -0 "$SCRAPER_PID" 2>/dev/null; then
    echo "[start] scraper sidecar exited early" >&2
    break
  fi
  sleep 1
done

# Hand off to uvicorn (foreground / PID 1 work)
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
```
Then: `chmod +x scripts/start.sh`.

- [ ] **Step 2: Create `Dockerfile`**
```dockerfile
# Playwright base image ships Chromium + all system deps for the pinned version.
FROM mcr.microsoft.com/playwright:v1.48.2-jammy

# Python 3 (the base image is Node-based; add Python + pip)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Node sidecar ---
COPY scraper-service/package.json scraper-service/package-lock.json* ./scraper-service/
RUN cd scraper-service && npm ci --omit=dev || npm install --omit=dev
COPY scraper-service ./scraper-service
RUN cd scraper-service && npm install typescript tsx --no-save && npm run build

# --- Python backend ---
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt
COPY . .

RUN chmod +x scripts/start.sh
ENV SCRAPER_URL=http://localhost:3001
EXPOSE 8000
CMD ["bash", "scripts/start.sh"]
```
Note: the Playwright base image's Chromium matches `playwright@1.48.2` — keep the sidecar's `playwright` dep pinned to the same minor as the base tag. If Task 1 had to bump Playwright, bump this FROM tag to match.

- [ ] **Step 3: Update `railway.toml`**
```toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "bash scripts/start.sh"
healthcheckPath = "/health"
healthcheckTimeout = 180
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

- [ ] **Step 4: Update `Procfile`**
```
web: bash scripts/start.sh
```

- [ ] **Step 5: Update `README.md`**

Find the env-var table row for `JINA_API_KEY` and replace it with:
```
| `SCRAPER_URL` | URL of the Node Playwright/llm-scraper sidecar (combined container: `http://localhost:3001`). Unset → mock content in local dev. |
```
Add a short "Scraper sidecar" subsection under the backend docs noting: `scraper-service/` is a Node/Express service started inside the same container; needs `OPENAI_API_KEY` for llm-scraper; local dev `cd scraper-service && npm install && npx playwright install chromium && npm run build && SCRAPER_PORT=3001 npm start`, then run the backend with `SCRAPER_URL=http://localhost:3001`.

- [ ] **Step 6: Remove the now-unused nixpacks config**
```bash
git rm nixpacks.toml
```

- [ ] **Step 7: Verify the image builds locally (if Docker available)**

Run:
```bash
cd /var/www/html/competitor-analyzer && docker build -t rivalscope-test . 2>&1 | tail -20
```
Expected: image builds. If Docker is unavailable in this environment, SKIP and note it — the build will be validated on Railway; instead just sanity-check the Dockerfile/start.sh syntax (`bash -n scripts/start.sh`).

- [ ] **Step 8: Commit**
```bash
git add Dockerfile scripts/start.sh railway.toml Procfile README.md
git rm --cached nixpacks.toml 2>/dev/null || true
git commit -m "feat(deploy): combined Docker container runs sidecar + uvicorn"
```

---

## Task 8: Full regression + integration smoke + finish

**Files:** none (verification).

- [ ] **Step 1: Full backend suite**

Run: `./venv/bin/python -m unittest discover -s tests -p "test_*.py" 2>&1 | tail -5`
Expected: `OK` (was 147; now +3 new test modules). Fix any regression before proceeding.

- [ ] **Step 2: No Jina references remain in app code**

Run:
```bash
cd /var/www/html/competitor-analyzer && grep -rn "JINA\|r.jina.ai" app/ main.py | grep -v node_modules
```
Expected: empty.

- [ ] **Step 3: Live integration smoke for /scrape (needs OPENAI_API_KEY)**

Run (uses the local sidecar built in Task 2):
```bash
cd /var/www/html/competitor-analyzer/scraper-service
OPENAI_API_KEY="$OPENAI_API_KEY" node dist/index.js & SVR=$!; sleep 3
curl -s -X POST localhost:3001/scrape -H 'Content-Type: application/json' -d '{"url":"https://example.com"}' | head -c 300
echo
curl -s -X POST localhost:3001/scrape-raw -H 'Content-Type: application/json' -d '{"url":"https://example.com"}' | head -c 200
kill $SVR
```
Expected: `/scrape` returns `{"text":"# ...## Pricing..."}` (the canonical serialization); `/scrape-raw` returns markdown. If `OPENAI_API_KEY` is unset locally, note that `/scrape` can't be exercised here and will be validated post-deploy.

- [ ] **Step 4: Determinism spot-check (optional but recommended)**

Hit `/scrape` twice on the same stable URL; confirm the two `text` outputs are identical (or near-identical). If they differ by >100 normalized chars, record it — this is the residual-LLM-jitter risk the spec flagged; the escape hatch (diff on `/scrape-raw`) becomes the follow-up.

- [ ] **Step 5: Finish the branch**

Use the **superpowers:finishing-a-development-branch** skill to present merge/PR options. Do NOT auto-merge to `main` — this changes the production build system (Dockerfile) and must deploy deliberately. On deploy, set `SCRAPER_URL` is auto (combined container) and confirm Railway `/health` is green and a real scan produces a snapshot.

---

## Self-Review (completed by plan author)

- **Spec coverage:** sidecar `/scrape` + `/scrape-raw` + `/health` → Tasks 1–2. Canonical serializer + temp 0 + differ normalization → Tasks 1, 2, 4. fetcher → sidecar w/ mock + direct fallbacks, signature stable → Task 5. review_scraper → `/scrape-raw`, keep Claude, drop Jina → Task 6. config SCRAPER_URL replaces JINA → Task 3. Combined Docker + railway.toml + Procfile + README → Task 7. Jina fully removed / regression / integration → Task 8. No gaps.
- **Placeholder scan:** no TBD/TODO; every code step has full content; commands have expected output. The one deliberate `as any` (llm-scraper call) is documented insulation against version drift, with a Task-2-Step-1 verification gate.
- **Type/contract consistency:** `fetch_page_text(url, snapshot_count=0) -> (text, error)` unchanged; `serialize`/`homepageSchema` names consistent across schema.ts, index.ts, tests; `SCRAPER_URL` name consistent across config.py, fetcher.py, review_scraper.py, and all tests; endpoints `/scrape`, `/scrape-raw`, `/health` consistent across sidecar, Python callers, start.sh, and tests.
