import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/main-setup.ts'],
    include: ['src/main/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/main/**/*.ts'],
      exclude: ['src/main/index.ts', 'src/main/**/*.test.ts'],
      thresholds: {
        statements: 73,
        branches: 70,
        functions: 66,
        lines: 74
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
