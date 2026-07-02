import { createOpenAI } from '@ai-sdk/openai';

/**
 * Single source of truth for the sidecar's AI provider (DeepSeek, OpenAI-compatible).
 * Mirrors app/llm.py: same model id, same thinking-off requirement, same dummy-key
 * set, same env vars (DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL — inherited from the
 * backend container, see scripts/start.sh).
 */
export const DEEPSEEK_MODEL = 'deepseek-v4-flash';

// Mirrors app/llm.py _DUMMY_KEYS.
const DUMMY_KEYS = new Set(['', 'dummy', 'dummy_key', 'dummy_anthropic_key', 'dummy_openai_key']);

/** True when a real (non-placeholder) DeepSeek key is configured. */
export function aiAvailable(): boolean {
  return !DUMMY_KEYS.has(process.env.DEEPSEEK_API_KEY ?? '');
}

/**
 * deepseek-v4-flash defaults to THINKING mode — reasoning tokens eat the budget
 * before content is emitted (app/llm.py THINKING_OFF). llm-scraper 1.6.0 forwards
 * no providerOptions to generateObject, so the only injection point is a
 * provider-level fetch wrapper that merges `thinking: {type: 'disabled'}` into
 * every outgoing JSON request body. Non-JSON bodies pass through untouched.
 */
export function withThinkingDisabled(baseFetch: typeof fetch = globalThis.fetch): typeof fetch {
  return ((input: any, init?: RequestInit) => {
    if (init && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        if (body && typeof body === 'object' && !Array.isArray(body)) {
          body.thinking = { type: 'disabled' };
          init = { ...init, body: JSON.stringify(body) };
        }
      } catch {
        // not JSON — leave untouched
      }
    }
    return baseFetch(input, init);
  }) as typeof fetch;
}

/**
 * DeepSeek chat model via the OpenAI-compatible client (no new dependency).
 * Explicit apiKey with 'dummy' fallback so construction never throws when the
 * key is absent — callers gate real usage on aiAvailable() (crash-guard, same
 * as app/llm.py get_*_client).
 */
export function createDeepseekModel(baseFetch: typeof fetch = globalThis.fetch) {
  const provider = createOpenAI({
    name: 'deepseek',
    baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY || 'dummy',
    fetch: withThinkingDisabled(baseFetch),
  });
  return provider(DEEPSEEK_MODEL);
}
