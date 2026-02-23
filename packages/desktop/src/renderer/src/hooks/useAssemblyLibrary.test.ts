import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Mock builtInAssemblies
vi.mock('../templates/builtInAssemblies', () => ({
  getBuiltInAssemblies: vi
    .fn()
    .mockReturnValue([{ id: 'built-in-1', name: 'Built-in Assembly', parts: [], groups: [], groupMembers: [] }]),
  isBuiltInAssembly: vi.fn().mockImplementation((id: string) => id.startsWith('built-in'))
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid')
}));

import { useAssemblyLibrary } from './useAssemblyLibrary';
import { isBuiltInAssembly, getBuiltInAssemblies } from '../templates/builtInAssemblies';
import { v4 as uuidv4 } from 'uuid';
import type { Assembly } from '../types';

// ============================================================
// Setup
// ============================================================

const createTestAssembly = (overrides: Partial<Assembly> = {}): Assembly =>
  ({
    id: 'a1',
    name: 'Test Assembly',
    description: 'A test assembly',
    thumbnail: '📦',
    parts: [{ name: 'Part 1', length: 24, width: 12, thickness: 0.75 }],
    groups: [],
    groupMembers: [],
    createdAt: '2026-01-01',
    modifiedAt: '2026-01-01',
    ...overrides
  }) as unknown as Assembly;

beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn().mockResolvedValue([]),
    setPreference: vi.fn().mockResolvedValue(undefined),
    onSettingsChanged: vi.fn().mockReturnValue(() => {}),
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    writeBinaryFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    addRecentProject: vi.fn(),
    getRecentProjects: vi.fn(),
    clearRecentProjects: vi.fn(),
    setWindowTitle: vi.fn()
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
  // Re-establish mock return values
  (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.setPreference as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (window.electronAPI.onSettingsChanged as ReturnType<typeof vi.fn>).mockReturnValue(() => {});
  // Re-establish builtInAssembly mocks
  (getBuiltInAssemblies as ReturnType<typeof vi.fn>).mockReturnValue([
    { id: 'built-in-1', name: 'Built-in Assembly', parts: [], groups: [], groupMembers: [] }
  ]);
  (isBuiltInAssembly as ReturnType<typeof vi.fn>).mockImplementation((id: string) => id.startsWith('built-in'));
  (uuidv4 as ReturnType<typeof vi.fn>).mockReturnValue('mock-uuid');
});

// ============================================================
// Tests
// ============================================================

describe('useAssemblyLibrary', () => {
  describe('initial state', () => {
    it('includes built-in assemblies in the list', () => {
      const { result } = renderHook(() => useAssemblyLibrary());
      // Built-in assemblies should be present
      const builtIn = result.current.assemblies.find((a) => a.id === 'built-in-1');
      expect(builtIn).toBeDefined();
      expect(builtIn!.name).toBe('Built-in Assembly');
    });

    it('provides CRUD functions', () => {
      const { result } = renderHook(() => useAssemblyLibrary());
      expect(typeof result.current.addAssembly).toBe('function');
      expect(typeof result.current.updateAssembly).toBe('function');
      expect(typeof result.current.deleteAssembly).toBe('function');
      expect(typeof result.current.duplicateAssembly).toBe('function');
      expect(typeof result.current.findAssembly).toBe('function');
    });
  });

  describe('addAssembly', () => {
    it('adds assembly to library and persists', async () => {
      const assembly = createTestAssembly();
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useAssemblyLibrary());

      await act(async () => {
        await result.current.addAssembly(assembly);
      });

      expect(window.electronAPI.setPreference).toHaveBeenCalledWith('assemblyLibrary', [assembly]);
    });

    it('appends to existing assemblies', async () => {
      const existing = createTestAssembly({ id: 'a-existing', name: 'Existing' });
      const newAssembly = createTestAssembly({ id: 'a-new', name: 'New' });
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([existing]);

      const { result } = renderHook(() => useAssemblyLibrary());

      await act(async () => {
        await result.current.addAssembly(newAssembly);
      });

      expect(window.electronAPI.setPreference).toHaveBeenCalledWith('assemblyLibrary', [existing, newAssembly]);
    });
  });

  describe('updateAssembly', () => {
    it('updates assembly properties', async () => {
      const assembly = createTestAssembly({ id: 'a1', name: 'Original' });
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([assembly]);

      const { result } = renderHook(() => useAssemblyLibrary());

      await act(async () => {
        await result.current.updateAssembly('a1', { name: 'Updated' });
      });

      expect(window.electronAPI.setPreference).toHaveBeenCalledWith('assemblyLibrary', [
        expect.objectContaining({ id: 'a1', name: 'Updated' })
      ]);
    });

    it('blocks modification of built-in assemblies', async () => {
      const { result } = renderHook(() => useAssemblyLibrary());

      await act(async () => {
        await result.current.updateAssembly('built-in-1', { name: 'Hacked' });
      });

      expect(window.electronAPI.setPreference).not.toHaveBeenCalled();
    });
  });

  describe('deleteAssembly', () => {
    it('removes assembly by id', async () => {
      const a1 = createTestAssembly({ id: 'a1' });
      const a2 = createTestAssembly({ id: 'a2' });
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([a1, a2]);

      const { result } = renderHook(() => useAssemblyLibrary());

      await act(async () => {
        await result.current.deleteAssembly('a1');
      });

      expect(window.electronAPI.setPreference).toHaveBeenCalledWith('assemblyLibrary', [a2]);
    });

    it('blocks deletion of built-in assemblies', async () => {
      const { result } = renderHook(() => useAssemblyLibrary());

      await act(async () => {
        await result.current.deleteAssembly('built-in-1');
      });

      expect(window.electronAPI.setPreference).not.toHaveBeenCalled();
    });
  });

  describe('duplicateAssembly', () => {
    it('creates a copy with new ID and name suffix', async () => {
      const original = createTestAssembly({ id: 'a1', name: 'My Assembly' });
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useAssemblyLibrary());

      let duplicated: Assembly;
      await act(async () => {
        duplicated = await result.current.duplicateAssembly(original);
      });

      expect(duplicated!.name).toBe('My Assembly (Copy)');
      expect(duplicated!.id).toBe('mock-uuid');
      expect(window.electronAPI.setPreference).toHaveBeenCalled();
    });
  });

  describe('findAssembly', () => {
    it('finds built-in assembly by id', () => {
      const { result } = renderHook(() => useAssemblyLibrary());
      const found = result.current.findAssembly('built-in-1');
      expect(found).toBeDefined();
      expect(found!.name).toBe('Built-in Assembly');
    });

    it('returns undefined for non-existent id', () => {
      const { result } = renderHook(() => useAssemblyLibrary());
      const found = result.current.findAssembly('nonexistent');
      expect(found).toBeUndefined();
    });
  });
});
