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
