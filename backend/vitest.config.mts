import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC instead of esbuild/oxc so Nest decorator metadata is emitted.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: {
      '@drh/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
