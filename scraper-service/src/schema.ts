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
