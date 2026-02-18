import { vi } from 'vitest';

// Mock electron-store with an in-memory implementation
// Each Store instance gets its own map, initialized with defaults
vi.mock('electron-store', () => {
  class MockStore {
    private data: Map<string, unknown>;

    constructor(opts?: { defaults?: Record<string, unknown>; name?: string; watch?: boolean }) {
      this.data = new Map();
      if (opts?.defaults) {
        for (const [key, value] of Object.entries(opts.defaults)) {
          this.data.set(key, structuredClone(value));
        }
      }
    }

    get(key: string, defaultValue?: unknown): unknown {
      if (this.data.has(key)) {
        return structuredClone(this.data.get(key));
      }
      return defaultValue;
    }

    set(key: string, value: unknown): void {
      this.data.set(key, structuredClone(value));
    }

    delete(key: string): void {
      this.data.delete(key);
    }

    has(key: string): boolean {
      return this.data.has(key);
    }

    clear(): void {
      this.data.clear();
    }
  }

  return { default: MockStore };
});

// Mock electron-log as no-op
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock electron app module
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/user/data'),
    getVersion: vi.fn().mockReturnValue('1.0.0')
  }
}));
