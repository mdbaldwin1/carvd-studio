import { describe, it, expect } from 'vitest';
import { getBuiltInAssemblies, isBuiltInAssembly, getBuiltInAssembly } from './builtInAssemblies';

describe('builtInAssemblies', () => {
  describe('getBuiltInAssemblies', () => {
    it('returns 2 built-in assemblies', () => {
      const assemblies = getBuiltInAssemblies();
      expect(assemblies).toHaveLength(2);
    });

    it('includes drawer box and face frame', () => {
      const assemblies = getBuiltInAssemblies();
      const ids = assemblies.map((a) => a.id);
      expect(ids).toContain('built-in-drawer-box');
      expect(ids).toContain('built-in-face-frame');
    });

    it('all assemblies have required fields', () => {
      const assemblies = getBuiltInAssemblies();
      for (const assembly of assemblies) {
        expect(assembly.id).toBeTruthy();
        expect(assembly.name).toBeTruthy();
        expect(assembly.parts).toBeDefined();
        expect(assembly.parts.length).toBeGreaterThan(0);
      }
    });

    it('returns fresh instances each call', () => {
      const first = getBuiltInAssemblies();
      const second = getBuiltInAssemblies();
      expect(first[0]).not.toBe(second[0]);
      expect(first[0].id).toBe(second[0].id);
    });
  });

  describe('isBuiltInAssembly', () => {
    it('returns true for drawer-box', () => {
      expect(isBuiltInAssembly('built-in-drawer-box')).toBe(true);
    });

    it('returns true for face-frame', () => {
      expect(isBuiltInAssembly('built-in-face-frame')).toBe(true);
    });

    it('returns false for unknown id', () => {
      expect(isBuiltInAssembly('unknown')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isBuiltInAssembly('')).toBe(false);
    });

    it('returns false for partial match', () => {
      expect(isBuiltInAssembly('built-in-drawer')).toBe(false);
    });
  });

  describe('getBuiltInAssembly', () => {
    it('returns drawer box assembly by id', () => {
      const assembly = getBuiltInAssembly('built-in-drawer-box');
      expect(assembly).toBeDefined();
      expect(assembly?.name).toBeTruthy();
      expect(assembly?.id).toBe('built-in-drawer-box');
    });

    it('returns face frame assembly by id', () => {
      const assembly = getBuiltInAssembly('built-in-face-frame');
      expect(assembly).toBeDefined();
      expect(assembly?.id).toBe('built-in-face-frame');
    });

    it('returns undefined for unknown id', () => {
      expect(getBuiltInAssembly('non-existent')).toBeUndefined();
    });

    it('returns fresh instance each call', () => {
      const first = getBuiltInAssembly('built-in-drawer-box');
      const second = getBuiltInAssembly('built-in-drawer-box');
      expect(first).not.toBe(second);
      expect(first?.id).toBe(second?.id);
    });
  });
});
