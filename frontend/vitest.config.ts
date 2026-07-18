import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Pure-logic node tests only (no jsdom, no React rendering this wave —
// .test.tsx files assert on React element trees as plain objects).
// globals: false is deliberate: tests must use explicit `import { describe,
// it, expect } from 'vitest'` — tsconfig.json includes '**/*.ts', so test
// files are type-checked by `next build` (the real Vercel deploy gate) and
// implicit globals would break that build.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: false,
  },
});
