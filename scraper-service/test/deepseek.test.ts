import assert from 'node:assert';
import { generateText } from 'ai';
import { withThinkingDisabled, aiAvailable, createDeepseekModel, DEEPSEEK_MODEL } from '../src/deepseek.ts';

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

// --- createDeepseekModel: thinking-off is WIRED into the provider, not just
// --- available as a helper. Drives a real generateText call through the model
// --- with a recording fetch and asserts the outgoing request body. This is the
// --- regression guard for the #1 stack gotcha at its integration point.
{
  let capturedBody: any;
  const recordingFetch = (async (_input: any, init?: RequestInit) => {
    capturedBody = JSON.parse(init!.body as string);
    return new Response(
      JSON.stringify({
        id: 'cmpl-test',
        object: 'chat.completion',
        created: 0,
        model: DEEPSEEK_MODEL,
        choices: [
          { index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  const model = createDeepseekModel(recordingFetch);
  const { text } = await generateText({ model, prompt: 'ping' });
  assert.strictEqual(text, 'ok', 'canned completion must round-trip');
  assert.deepStrictEqual(
    capturedBody.thinking,
    { type: 'disabled' },
    'provider-level fetch must inject thinking-off into real calls',
  );
  assert.strictEqual(capturedBody.model, DEEPSEEK_MODEL, 'model id must be deepseek-v4-flash');
}

console.log('deepseek.test: PASS');
