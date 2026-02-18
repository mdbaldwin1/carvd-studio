import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/tests/e2e/**', 'src/main/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/types.ts',
        'src/main/index.ts', // Electron main entry
        'src/preload/index.ts' // Preload script
      ],
      // Coverage thresholds
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    },
    // Mock Electron APIs
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, './src/renderer/src'),
      '@': resolve(__dirname, './src')
    }
  }
});
