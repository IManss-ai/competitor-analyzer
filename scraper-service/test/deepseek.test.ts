import assert from 'node:assert';
import { withThinkingDisabled, aiAvailable } from '../src/deepseek.ts';

// --- withThinkingDisabled: injects thinking-off into JSON string bodies ---
{
  let captured: RequestInit | undefined;
  const stub = (async (_input: any, init?: RequestInit) => {
    captured = init;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  const wrapped = withThinkingDisabled(stub);
  await wrapped('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hi' }],
      response_format: { type: 'json_object' },
    }),
  });
  const body = JSON.parse(captured!.body as string);
  assert.deepStrictEqual(body.thinking, { type: 'disabled' }, 'thinking-off must be injected');
  assert.strictEqual(body.model, 'deepseek-v4-flash', 'model must survive');
  assert.deepStrictEqual(body.messages, [{ role: 'user', content: 'hi' }], 'messages must survive');
  assert.deepStrictEqual(body.response_format, { type: 'json_object' }, 'response_format must survive');
}

// --- withThinkingDisabled: non-JSON body passes through unchanged ---
{
  let captured: RequestInit | undefined;
  const stub = (async (_input: any, init?: RequestInit) => {
    captured = init;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  const wrapped = withThinkingDisabled(stub);
  await wrapped('https://api.deepseek.com/chat/completions', { method: 'POST', body: 'not json' });
  assert.strictEqual(captured!.body, 'not json', 'non-JSON body must pass through untouched');
}

// --- withThinkingDisabled: absent body/init passes through unchanged ---
{
  let capturedInit: RequestInit | undefined = { body: 'sentinel' };
  const stub = (async (_input: any, init?: RequestInit) => {
    capturedInit = init;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  const wrapped = withThinkingDisabled(stub);
  await wrapped('https://api.deepseek.com/health');
  assert.strictEqual(capturedInit, undefined, 'absent init must pass through untouched');
}

// --- aiAvailable: dummy-key matrix mirroring app/llm.py ---
{
  const saved = process.env.DEEPSEEK_API_KEY;
  try {
    for (const dummy of ['', 'dummy', 'dummy_key', 'dummy_anthropic_key', 'dummy_openai_key']) {
      process.env.DEEPSEEK_API_KEY = dummy;
      assert.strictEqual(aiAvailable(), false, `aiAvailable must be false for ${JSON.stringify(dummy)}`);
    }
    delete process.env.DEEPSEEK_API_KEY;
    assert.strictEqual(aiAvailable(), false, 'aiAvailable must be false when unset');
    process.env.DEEPSEEK_API_KEY = 'sk-real-key';
    assert.strictEqual(aiAvailable(), true, 'aiAvailable must be true for a real key');
  } finally {
    if (saved === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = saved;
  }
}

console.log('deepseek.test: PASS');
