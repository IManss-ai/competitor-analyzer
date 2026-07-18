#!/usr/bin/env node
/**
 * Design-token lint: fails on NEW off-8pt-scale spacing utilities and arbitrary
 * px/rem/em/clamp font sizes in frontend/src (see DESIGN.md "Spacing (8pt scale)").
 *
 * Rules
 * - Spacing utilities (gap-, space-, p-*, m-*) must use the 8pt scale:
 *     4 8 12 16 24 32 48 64 px  ->  Tailwind units 1 2 3 4 6 8 12 16
 *   Also allowed: 0, px (1px hairline), 0.5 (2px hairline micro-gap), and whole
 *   units > 16 (page/section rhythm above the component scale, e.g. py-20/py-24).
 *   Arbitrary spacing values (p-[13px], mt-[1.2rem]) are never allowed.
 * - Font sizes must use the standard text-* scale (smallest sanctioned: text-xs).
 *   Arbitrary length sizes (text-[10px], text-[0.8rem], text-[clamp(...)]) are
 *   not allowed. Arbitrary var()/color text values are fine (that's a color).
 *   (Wording avoids a literal class-like token here: Tailwind v4 scans this
 *   untracked scripts/ dir and would emit any bracketed example as real CSS.)
 * - shadcn primitives in components/ui/ (DESIGN.md list) are upstream library
 *   code and are exempt.
 * - Accepted remnants (miniature product-mock illustrations whose sub-12px text
 *   is deliberately scaled chrome, input-affix alignment paddings, fluid hero
 *   clamp() sizes, and the untouchable pricing-demo) live in
 *   design-token-allowlist.json as per-file violation budgets. A file may not
 *   exceed its budget; files not listed must be clean. Shrink budgets as you
 *   clean up ("ratchet") — the script tells you when a budget is loose.
 *
 * Usage: npm run lint:tokens  (not wired into the build on purpose)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const SRC = path.join(FRONTEND, 'src');
const ALLOWLIST_PATH = path.join(HERE, 'design-token-allowlist.json');

const exts = new Set(['.tsx', '.ts', '.jsx', '.js']);

// DESIGN.md shadcn primitive set — upstream spacing is by design.
const SHADCN_PRIMITIVES = new Set([
  'button', 'input', 'label', 'textarea', 'card', 'dialog', 'alert-dialog', 'dropdown-menu',
  'select', 'tabs', 'badge', 'switch', 'checkbox', 'sonner', 'tooltip', 'separator', 'skeleton',
  'table', 'sheet', 'avatar', 'popover', 'scroll-area',
]);

// 8pt scale in Tailwind units + sanctioned extras (0, hairlines).
const ALLOWED_UNITS = new Set(['0', 'px', '0.5', '1', '2', '3', '4', '6', '8', '12', '16']);

const SPACING_PREFIX = '(?:gap(?:-[xy])?|space-[xy]|p[trblxyse]?|m[trblxyse]?)';
const spacingRe = new RegExp(
  `(?<![\\w/\\[-])((?:[\\w-]+:)*)(-?)(${SPACING_PREFIX})-(\\d+(?:\\.\\d+)?|\\[[^\\]]+\\])(?![\\w./%-])`,
  'g'
);
// Arbitrary text values that are lengths (font sizes). var()/color values are allowed.
const textArbRe = /(?<![\w/[-])((?:[\w-]+:)*)text-\[([^\]]+)\](?![\w./%-])/g;
const lengthLike = /^(?:[\d.]+(?:px|rem|em)|clamp\(|min\(|max\()/;

function spacingViolation(val) {
  if (val.startsWith('[')) {
    // layout variables/expressions (ml-[var(--sidebar-width)]) are fine; literal lengths are not
    return !/^\[(?:var\(|calc\()/.test(val);
  }
  if (ALLOWED_UNITS.has(val)) return false;
  const n = Number(val);
  return !(Number.isInteger(n) && n > 16); // >16 = section rhythm, allowed
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (exts.has(path.extname(e.name))) yield p;
  }
}

const allowlist = fs.existsSync(ALLOWLIST_PATH)
  ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'))
  : {};

const perFile = new Map(); // rel -> [{line, token}]
for (const file of walk(SRC)) {
  const rel = path.relative(FRONTEND, file).split(path.sep).join('/');
  const base = path.basename(file, path.extname(file));
  if (rel.startsWith('src/components/ui/') && SHADCN_PRIMITIVES.has(base)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const hits = [];
  const lineOf = (idx) => src.slice(0, idx).split('\n').length;
  let m;
  spacingRe.lastIndex = 0;
  while ((m = spacingRe.exec(src))) {
    const [, variants, neg, prefix, val] = m;
    if (spacingViolation(val)) hits.push({ line: lineOf(m.index), token: `${variants}${neg}${prefix}-${val}` });
  }
  textArbRe.lastIndex = 0;
  while ((m = textArbRe.exec(src))) {
    if (lengthLike.test(m[2].trim())) hits.push({ line: lineOf(m.index), token: `${m[1]}text-[${m[2]}]` });
  }
  if (hits.length) perFile.set(rel, hits);
}

let failed = false;
let total = 0;
const loose = [];
for (const [rel, hits] of [...perFile.entries()].sort()) {
  total += hits.length;
  const budget = allowlist[rel] ?? 0;
  if (hits.length > budget) {
    failed = true;
    console.error(`\nFAIL ${rel} — ${hits.length} off-scale token(s), allowlist budget ${budget}:`);
    for (const h of hits) console.error(`  L${h.line}: ${h.token}`);
  } else if (hits.length < budget) {
    loose.push(`${rel}: budget ${budget}, actual ${hits.length}`);
  }
}
for (const rel of Object.keys(allowlist)) {
  if (!perFile.has(rel) && allowlist[rel] > 0) loose.push(`${rel}: budget ${allowlist[rel]}, actual 0`);
}

if (loose.length) {
  console.log('\nRatchet opportunity — tighten these allowlist budgets:');
  for (const l of loose) console.log(`  ${l}`);
}
console.log(`\ndesign-token lint: ${total} accepted remnant(s) across ${perFile.size} file(s); allowlist ${Object.keys(allowlist).length} file(s).`);
if (failed) {
  console.error('\ndesign-token lint FAILED — use the 8pt scale (gap/p/m: 1 2 3 4 6 8 12 16) and standard text-* sizes (min text-xs).');
  console.error('If a remnant is genuinely deliberate, document it and adjust frontend/scripts/design-token-allowlist.json.');
  process.exit(1);
}
console.log('design-token lint OK');
