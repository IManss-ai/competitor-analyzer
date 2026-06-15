import express from 'express';
import { chromium, type Browser } from 'playwright';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { openai } from '@ai-sdk/openai';
import LLMScraper from 'llm-scraper';
import { homepageSchema, serialize } from './src/schema.js';

const PORT = Number(process.env.SCRAPER_PORT ?? 3001);
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

// Bound any promise (e.g. the LLM extraction) so a hung upstream can't leak a
// browser context or hold the HTTP request open forever.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

// Cap concurrent Chromium work. Each scrape opens a browser context + page,
// which is memory-heavy; an unbounded burst (e.g. 80 sign-ups scanning at once)
// would spawn 80 contexts in the single shared browser and OOM the container.
// Extra requests queue; once the queue is full we fail fast with 503 rather
// than let work pile up unboundedly. Tunable via env without a redeploy.
const MAX_CONCURRENT = Number(process.env.SCRAPER_MAX_CONCURRENT ?? 4);
const MAX_QUEUE = Number(process.env.SCRAPER_MAX_QUEUE ?? 40);
let active = 0;
const waiters: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) { active++; return; }
  if (waiters.length >= MAX_QUEUE) throw new Error('scraper overloaded');
  // Slot is handed over directly by releaseSlot() (count stays reserved),
  // so the cap can't be exceeded by a race between release and re-acquire.
  await new Promise<void>((resolve) => waiters.push(resolve));
}
function releaseSlot(): void {
  const next = waiters.shift();
  if (next) next();
  else active--;
}

let browser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  }
  return browser;
}

// llm-scraper 1.6.0: `new LLMScraper(client)` takes a Vercel AI SDK LanguageModelV1.
// `openai('gpt-4o-mini')` returns a LanguageModelV1 (equivalent to openai.chat(...)).
const scraper = new LLMScraper(openai('gpt-4o-mini'));

async function renderHtml(url: string): Promise<string> {
  const b = await getBrowser();
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (compatible; RivalscopeBot/1.0)' });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200);
    return await page.content();
  } finally {
    await ctx.close();
  }
}

function htmlToMarkdown(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document as any).parse();
  const contentHtml = article?.content ?? html;
  return turndown.turndown(contentHtml).trim();
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (_req, res) => {
  try { await getBrowser(); res.json({ ok: true }); }
  catch (e) { res.status(503).json({ ok: false, error: String(e) }); }
});

app.post('/scrape-raw', async (req, res) => {
  const url = req.body?.url;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });
  try { await acquireSlot(); } catch { return res.status(503).json({ error: 'scraper overloaded, retry shortly' }); }
  try { const html = await renderHtml(url); res.json({ text: htmlToMarkdown(html, url) }); }
  catch (e) { res.status(502).json({ error: `scrape-raw failed: ${String(e)}` }); }
  finally { releaseSlot(); }
});

app.post('/scrape', async (req, res) => {
  const url = req.body?.url;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });
  try { await acquireSlot(); } catch { return res.status(503).json({ error: 'scraper overloaded, retry shortly' }); }
  try {
    const b = await getBrowser();
    const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (compatible; RivalscopeBot/1.0)' });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1200);
      // llm-scraper 1.6.0: scraper.run(page, schema, options) -> { data: T[], url }.
      // homepageSchema is a single object (no output:'array'), so data is a one-element
      // array; serialize() takes a single Partial<Homepage>, hence data[0].
      // format 'markdown' pre-processes the page; temperature 0 for determinism.
      const { data } = await withTimeout(
        scraper.run(page, homepageSchema, {
          format: 'markdown',
          temperature: 0,
        } as any),
        45000,
        'llm-scrape',
      );
      const record = Array.isArray(data) ? data[0] : data;
      res.json({ text: serialize((record ?? {}) as any) });
    } finally { await ctx.close(); }
  } catch (e) { res.status(502).json({ error: `scrape failed: ${String(e)}` }); }
  finally { releaseSlot(); }
});

app.listen(PORT, () => console.log(`[scraper] listening on :${PORT}`));
