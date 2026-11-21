import { defineConfig } from 'vitest/config';
import base from './vitest.config.mjs';

// Spread, not mergeConfig: mergeConfig would concatenate `include` with the unit globs.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['test/**/*.db.test.ts'],
    testTimeout: 30_000,
  },
});
