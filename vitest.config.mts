import { defineConfig } from 'vitest/config';

// Unit tests for the plain-TypeScript parts of AyyurDB (spec section 14). They run in Node, with no
// React Native, so they never need a device or a development build.
export default defineConfig({
  test: {
    include: ['src/db/test/**/*.test.ts'],
    environment: 'node',
  },
});
