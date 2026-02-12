import { describe, it, expect } from 'vitest';
import {
  serializeProject,
  deserializeToProject,
  validateCarvdFile,
  parseCarvdFile,
  stringifyCarvdFile,
  getProjectNameFromPath,
  CARVD_FILE_EXTENSION,
  CARVD_FILE_FILTER
} from './fileFormat';
import { CARVD_FILE_VERSION, GroupMember } from '../types';
import {
  createTestPart,
  createTestStock,
  createTestGroup,
  createTestGroupMember,
  createTestProject,
  createTestAssembly,
  createDefaultStockConstraints,
  createTestCustomShoppingItem
} from '../../../../tests/helpers/factories';

// ============================================================
// Helper to create valid CarvdFile structure
// ============================================================

function createValidCarvdFile(overrides?: Partial<ReturnType<typeof serializeProject>>) {
  const defaults = {
    projectName: 'Test Project',
    createdAt: '2024-01-01T00:00:00.000Z',
    modifiedAt: '2024-01-01T12:00:00.000Z',
    units: 'imperial' as const,
    gridSize: 0.0625,
    kerfWidth: 0.125,
    overageFactor: 0.1,
    projectNotes: '',
    stockConstraints: createDefaultStockConstraints(),
    parts: [],
    stocks: [],
    groups: [],
    groupMembers: [],
    assemblies: [],
    snapGuides: [],
    customShoppingItems: [],
    cutList: null,
    thumbnail: null
  };

  return serializeProject({ ...defaults, ...overrides });
}

describe('fileFormat', () => {
  // ============================================================
  // Serialization
  // ============================================================

  describe('serializeProject', () => {
    it('creates valid CarvdFile structure', () => {
      const file = createValidCarvdFile();

      expect(file.version).toBe(CARVD_FILE_VERSION);
      expect(file.project).toBeDefined();
      expect(file.parts).toEqual([]);
      expect(file.stocks).toEqual([]);
      expect(file.groups).toEqual([]);
      expect(file.groupMembers).toEqual([]);
    });

    it('includes project metadata', () => {
      const file = createValidCarvdFile({
        projectName: 'My Bookshelf',
        units: 'metric',
        gridSize: 1,
        kerfWidth: 0.125,
        overageFactor: 0.15,
        projectNotes: 'Test notes'
      });

      expect(file.project.name).toBe('My Bookshelf');
      expect(file.project.units).toBe('metric');
      expect(file.project.gridSize).toBe(1);
      expect(file.project.kerfWidth).toBe(0.125);
      expect(file.project.overageFactor).toBe(0.15);
      expect(file.project.projectNotes).toBe('Test notes');
    });

    it('includes parts and stocks', () => {
      const stock = createTestStock({ name: 'Plywood' });
      const part = createTestPart({ name: 'Shelf', stockId: stock.id });

      const file = createValidCarvdFile({
        parts: [part],
        stocks: [stock]
      });

      expect(file.parts).toHaveLength(1);
      expect(file.parts[0].name).toBe('Shelf');
      expect(file.stocks).toHaveLength(1);
      expect(file.stocks[0].name).toBe('Plywood');
    });

    it('includes groups and group members', () => {
      const part = createTestPart();
      const group = createTestGroup({ name: 'Drawer' });
      const member = createTestGroupMember(group.id, part.id);

      const file = createValidCarvdFile({
        parts: [part],
        groups: [group],
        groupMembers: [member]
      });

      expect(file.groups).toHaveLength(1);
      expect(file.groupMembers).toHaveLength(1);
    });

    it('omits empty optional arrays', () => {
      const file = createValidCarvdFile({
        assemblies: [],
        snapGuides: [],
        customShoppingItems: []
      });

      expect(file.assemblies).toBeUndefined();
      expect(file.snapGuides).toBeUndefined();
      expect(file.customShoppingItems).toBeUndefined();
    });

    it('includes optional arrays when non-empty', () => {
      const assembly = createTestAssembly();
      const customItem = createTestCustomShoppingItem();

      const file = createValidCarvdFile({
        assemblies: [assembly],
        customShoppingItems: [customItem],
        snapGuides: [{ id: 'guide-1', axis: 'x', position: 10 }]
      });

      expect(file.assemblies).toHaveLength(1);
      expect(file.customShoppingItems).toHaveLength(1);
      expect(file.snapGuides).toHaveLength(1);
    });

    it('updates modifiedAt timestamp on serialize', () => {
      const oldTimestamp = '2020-01-01T00:00:00.000Z';
      const file = createValidCarvdFile({
        modifiedAt: oldTimestamp
      });

      // modifiedAt should be updated to current time
      expect(file.project.modifiedAt).not.toBe(oldTimestamp);
      expect(new Date(file.project.modifiedAt).getTime()).toBeGreaterThan(new Date(oldTimestamp).getTime());
    });
  });

  // ============================================================
  // Deserialization
  // ============================================================

  describe('deserializeToProject', () => {
    it('converts CarvdFile to Project format', () => {
      const file = createValidCarvdFile({
        projectName: 'Test Project',
        units: 'imperial'
      });

      const project = deserializeToProject(file);

      expect(project.name).toBe('Test Project');
      expect(project.units).toBe('imperial');
      expect(project.version).toBe(String(CARVD_FILE_VERSION));
    });

    it('preserves all project data', () => {
      const stock = createTestStock();
      const part = createTestPart({ stockId: stock.id });
      const group = createTestGroup();
      const member = createTestGroupMember(group.id, part.id);

      const file = createValidCarvdFile({
        parts: [part],
        stocks: [stock],
        groups: [group],
        groupMembers: [member]
      });

      const project = deserializeToProject(file);

      expect(project.parts).toHaveLength(1);
      expect(project.stocks).toHaveLength(1);
      expect(project.groups).toHaveLength(1);
      expect(project.groupMembers).toHaveLength(1);
    });

    it('preserves optional fields', () => {
      const assembly = createTestAssembly();
      const customItem = createTestCustomShoppingItem();

      const file = createValidCarvdFile({
        assemblies: [assembly],
        customShoppingItems: [customItem]
      });

      const project = deserializeToProject(file);

      expect(project.assemblies).toHaveLength(1);
      expect(project.customShoppingItems).toHaveLength(1);
    });
  });

  // ============================================================
  // Round-Trip
  // ============================================================

  describe('round-trip', () => {
    it('serialize then deserialize preserves data', () => {
      const stock = createTestStock({ name: 'Oak' });
      const part = createTestPart({
        name: 'Side Panel',
        stockId: stock.id,
        length: 36,
        width: 24,
        thickness: 0.75,
        notes: 'Edge band front'
      });

      const original = {
        projectName: 'Test Roundtrip',
        createdAt: '2024-01-01T00:00:00.000Z',
        modifiedAt: '2024-01-01T12:00:00.000Z',
        units: 'imperial' as const,
        gridSize: 0.0625,
        kerfWidth: 0.125,
        overageFactor: 0.1,
        projectNotes: 'Project notes here',
        stockConstraints: createDefaultStockConstraints(),
        parts: [part],
        stocks: [stock],
        groups: [],
        groupMembers: [],
        assemblies: [],
        snapGuides: [],
        customShoppingItems: [],
        cutList: null,
        thumbnail: null
      };

      const serialized = serializeProject(original);
      const deserialized = deserializeToProject(serialized);

      expect(deserialized.name).toBe(original.projectName);
      expect(deserialized.parts[0].name).toBe(part.name);
      expect(deserialized.parts[0].length).toBe(part.length);
      expect(deserialized.parts[0].notes).toBe(part.notes);
      expect(deserialized.stocks[0].name).toBe(stock.name);
    });

    it('handles special characters in names', () => {
      const part = createTestPart({ name: 'Panel "Top" (3/4")' });
      const stock = createTestStock({ name: 'Plywood - 3/4" Birch' });

      const file = createValidCarvdFile({
        projectName: 'Project: "Test" [Special]',
        parts: [part],
        stocks: [stock]
      });

      const json = stringifyCarvdFile(file);
      const result = parseCarvdFile(json);

      expect(result.valid).toBe(true);
      expect(result.data?.project.name).toBe('Project: "Test" [Special]');
      expect(result.data?.parts[0].name).toBe('Panel "Top" (3/4")');
    });

    it('handles Unicode characters', () => {
      const part = createTestPart({ name: '棚板 (たないた)' });

      const file = createValidCarvdFile({
        projectName: '本棚プロジェクト',
        parts: [part]
      });

      const json = stringifyCarvdFile(file);
      const result = parseCarvdFile(json);

      expect(result.valid).toBe(true);
      expect(result.data?.project.name).toBe('本棚プロジェクト');
      expect(result.data?.parts[0].name).toBe('棚板 (たないた)');
    });
  });

  // ============================================================
  // Validation
  // ============================================================

  describe('validateCarvdFile', () => {
    it('validates a correct file', () => {
      const file = createValidCarvdFile();
      const result = validateCarvdFile(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects non-object input', () => {
      expect(validateCarvdFile(null).valid).toBe(false);
      expect(validateCarvdFile(undefined).valid).toBe(false);
      expect(validateCarvdFile('string').valid).toBe(false);
      expect(validateCarvdFile(123).valid).toBe(false);
      expect(validateCarvdFile([]).valid).toBe(false);
    });

    it('rejects missing version', () => {
      const file = { ...createValidCarvdFile() } as any;
      delete file.version;

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid version number');
    });

    it('rejects future version numbers', () => {
      const file = createValidCarvdFile();
      (file as any).version = CARVD_FILE_VERSION + 1;

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('newer than supported');
    });

    it('rejects missing project metadata', () => {
      const file = { ...createValidCarvdFile() } as any;
      delete file.project;

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing project metadata');
    });

    it('rejects missing project name', () => {
      const file = createValidCarvdFile();
      (file.project as any).name = undefined;

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing project name');
    });

    it('warns about invalid units', () => {
      const file = createValidCarvdFile();
      (file.project as any).units = 'invalid';

      const result = validateCarvdFile(file);

      expect(result.warnings).toContain('Invalid units, defaulting to imperial');
    });

    it('rejects missing required arrays', () => {
      const file = createValidCarvdFile();

      const testCases = [
        { field: 'parts', error: 'Missing parts array' },
        { field: 'stocks', error: 'Missing stocks array' },
        { field: 'groups', error: 'Missing groups array' },
        { field: 'groupMembers', error: 'Missing groupMembers array' }
      ];

      for (const { field, error } of testCases) {
        const testFile = { ...file } as any;
        delete testFile[field];

        const result = validateCarvdFile(testFile);
        expect(result.errors).toContain(error);
      }
    });
  });

  // ============================================================
  // Referential Integrity
  // ============================================================

  describe('referential integrity', () => {
    it('warns about parts referencing non-existent stocks', () => {
      const part = createTestPart({
        stockId: 'non-existent-stock',
        name: 'Orphan Part'
      });

      const file = createValidCarvdFile({
        parts: [part],
        stocks: []
      });

      const result = validateCarvdFile(file);

      expect(result.warnings.some((w) => w.includes('non-existent stock'))).toBe(true);
    });

    it('errors on group members referencing non-existent groups', () => {
      const part = createTestPart();
      const member = createTestGroupMember('non-existent-group', part.id);

      const file = createValidCarvdFile({
        parts: [part],
        groupMembers: [member]
      });

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('non-existent group'))).toBe(true);
    });

    it('errors on group members referencing non-existent parts', () => {
      const group = createTestGroup();
      const member = createTestGroupMember(group.id, 'non-existent-part');

      const file = createValidCarvdFile({
        groups: [group],
        groupMembers: [member]
      });

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('non-existent part'))).toBe(true);
    });

    it('validates correct references', () => {
      const stock = createTestStock();
      const part = createTestPart({ stockId: stock.id });
      const group = createTestGroup();
      const member = createTestGroupMember(group.id, part.id);

      const file = createValidCarvdFile({
        stocks: [stock],
        parts: [part],
        groups: [group],
        groupMembers: [member]
      });

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('errors on group members referencing non-existent nested groups', () => {
      const group = createTestGroup();
      // Create a group member that references a non-existent nested group
      const member: GroupMember = {
        id: 'member-1',
        groupId: group.id,
        memberType: 'group',
        memberId: 'non-existent-nested-group'
      };

      const file = createValidCarvdFile({
        groups: [group],
        groupMembers: [member]
      });

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('non-existent group'))).toBe(true);
    });

    it('warns about assembly parts referencing non-existent stocks', () => {
      const file = createValidCarvdFile();
      // Add an assembly with a part that references a non-existent stock
      (file as any).assemblies = [
        {
          id: 'assembly-1',
          name: 'Test Assembly',
          parts: [
            {
              name: 'Assembly Part',
              length: 12,
              width: 6,
              thickness: 0.75,
              relativePosition: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              stockId: 'non-existent-stock',
              grainSensitive: true,
              grainDirection: 'length',
              color: '#c4a574'
            }
          ],
          groups: [],
          groupMembers: [],
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString()
        }
      ];

      const result = validateCarvdFile(file);

      expect(result.warnings.some((w) => w.includes('non-existent stock'))).toBe(true);
    });
  });

  // ============================================================
  // JSON Parsing
  // ============================================================

  describe('parseCarvdFile', () => {
    it('parses valid JSON string', () => {
      const file = createValidCarvdFile();
      const json = JSON.stringify(file);

      const result = parseCarvdFile(json);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('rejects invalid JSON', () => {
      const result = parseCarvdFile('not json');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid JSON');
    });

    it('rejects malformed JSON', () => {
      const result = parseCarvdFile('{"incomplete":');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid JSON');
    });

    it('rejects empty JSON', () => {
      const result = parseCarvdFile('{}');

      expect(result.valid).toBe(false);
    });
  });

  // ============================================================
  // Migration
  // ============================================================

  describe('migration', () => {
    it('adds default kerfWidth if missing', () => {
      const file = createValidCarvdFile();
      delete (file.project as any).kerfWidth;

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(true);
      expect(result.data?.project.kerfWidth).toBe(0.125);
    });

    it('adds default overageFactor if missing', () => {
      const file = createValidCarvdFile();
      delete (file.project as any).overageFactor;

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(true);
      expect(result.data?.project.overageFactor).toBe(0.1);
    });

    it('adds default stockConstraints if missing', () => {
      const file = createValidCarvdFile();
      delete (file.project as any).stockConstraints;

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(true);
      expect(result.data?.project.stockConstraints).toBeDefined();
      expect(result.data?.project.stockConstraints.constrainDimensions).toBe(true);
    });

    it('adds default grainSensitive to parts if missing', () => {
      const part = createTestPart();
      delete (part as any).grainSensitive;

      const file = createValidCarvdFile({ parts: [part] });

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(true);
      expect(result.data?.parts[0].grainSensitive).toBe(true);
    });

    it('adds default grainDirection to parts if missing', () => {
      const part = createTestPart();
      delete (part as any).grainDirection;

      const file = createValidCarvdFile({ parts: [part] });

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(true);
      expect(result.data?.parts[0].grainDirection).toBe('length');
    });

    it('adds default rotation to parts if missing', () => {
      const part = createTestPart();
      delete (part as any).rotation;

      const file = createValidCarvdFile({ parts: [part] });

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(true);
      expect(result.data?.parts[0].rotation).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('adds default pricingUnit to stocks if missing', () => {
      const stock = createTestStock();
      delete (stock as any).pricingUnit;

      const file = createValidCarvdFile({ stocks: [stock] });

      const result = validateCarvdFile(file);

      expect(result.valid).toBe(true);
      expect(result.data?.stocks[0].pricingUnit).toBe('per_item');
    });
  });

  // ============================================================
  // Utility Functions
  // ============================================================

  describe('stringifyCarvdFile', () => {
    it('produces formatted JSON', () => {
      const file = createValidCarvdFile();
      const json = stringifyCarvdFile(file);

      // Should be pretty-printed with indentation
      expect(json).toContain('\n');
      expect(json).toContain('  '); // 2-space indentation
    });

    it('produces parseable JSON', () => {
      const file = createValidCarvdFile();
      const json = stringifyCarvdFile(file);

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('getProjectNameFromPath', () => {
    it('extracts name from Unix path', () => {
      expect(getProjectNameFromPath('/Users/name/Documents/MyProject.carvd')).toBe('MyProject');
    });

    it('extracts name from Windows path', () => {
      expect(getProjectNameFromPath('C:\\Users\\name\\Documents\\MyProject.carvd')).toBe('MyProject');
    });

    it('handles paths without extension', () => {
      expect(getProjectNameFromPath('/path/to/MyProject')).toBe('MyProject');
    });

    it('handles filename only', () => {
      expect(getProjectNameFromPath('Project.carvd')).toBe('Project');
    });

    it('returns Untitled for empty path', () => {
      expect(getProjectNameFromPath('')).toBe('Untitled');
    });

    it('handles spaces in filename', () => {
      expect(getProjectNameFromPath('/path/to/My Bookshelf Project.carvd')).toBe('My Bookshelf Project');
    });
  });

  describe('constants', () => {
    it('exports correct file extension', () => {
      expect(CARVD_FILE_EXTENSION).toBe('carvd');
    });

    it('exports correct file filter', () => {
      expect(CARVD_FILE_FILTER.name).toBe('Carvd Studio Project');
      expect(CARVD_FILE_FILTER.extensions).toContain('carvd');
    });
  });
});
