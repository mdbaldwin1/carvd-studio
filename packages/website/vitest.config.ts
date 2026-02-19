import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

function changelogPlugin() {
  const virtualModuleId = 'virtual:changelog';
  const resolvedId = '\0' + virtualModuleId;

  return {
    name: 'changelog',
    resolveId(id: string) {
      if (id === virtualModuleId) return resolvedId;
    },
    load(id: string) {
      if (id === resolvedId) {
        const content = fs.readFileSync(
          path.resolve(__dirname, '../../CHANGELOG.md'),
          'utf-8'
        );
        return `export default ${JSON.stringify(content)};`;
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), changelogPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
