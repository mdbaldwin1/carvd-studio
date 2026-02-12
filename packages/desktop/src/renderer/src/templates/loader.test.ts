import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadTemplateFromJSON,
  loadAssemblyFromJSON,
  getTemplateMetadata,
  getAssemblyMetadata,
  TemplateDefinition,
  AssemblyDefinition
} from './loader';

// Mock uuid to have predictable IDs in tests
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9))
}));

describe('loader', () => {
  describe('loadTemplateFromJSON', () => {
    const minimalTemplate: TemplateDefinition = {
      id: 'test-template',
      name: 'Test Template',
      description: 'A test template',
      category: 'furniture',
      thumbnail: '🪑',
      dimensions: { width: 24, depth: 18, height: 30 },
      projectSettings: {
        units: 'imperial',
        gridSize: 0.25,
        kerfWidth: 0.125,
        overageFactor: 1.1,
        projectNotes: 'Test notes',
        stockConstraints: {
          maxLength: 96,
          maxWidth: 48,
          maxBoardFeet: 50,
          maxTotalCost: 500,
          useGlobalDefaults: true,
          preferBoardOverSheet: false
        }
      },
      stocks: [],
      parts: [],
      groups: [],
      groupMembers: []
    };

    it('creates a project with correct name', () => {
      const project = loadTemplateFromJSON(minimalTemplate);
      expect(project.name).toBe('Test Template');
    });

    it('sets project version to 1.0', () => {
      const project = loadTemplateFromJSON(minimalTemplate);
      expect(project.version).toBe('1.0');
    });

    it('applies project settings', () => {
      const project = loadTemplateFromJSON(minimalTemplate);
      expect(project.units).toBe('imperial');
      expect(project.gridSize).toBe(0.25);
      expect(project.kerfWidth).toBe(0.125);
      expect(project.overageFactor).toBe(1.1);
      expect(project.projectNotes).toBe('Test notes');
    });

    it('applies stock constraints', () => {
      const project = loadTemplateFromJSON(minimalTemplate);
      expect(project.stockConstraints).toEqual({
        maxLength: 96,
        maxWidth: 48,
        maxBoardFeet: 50,
        maxTotalCost: 500,
        useGlobalDefaults: true,
        preferBoardOverSheet: false
      });
    });

    it('sets createdAt and modifiedAt to current time', () => {
      const before = new Date().toISOString();
      const project = loadTemplateFromJSON(minimalTemplate);
      const after = new Date().toISOString();

      expect(project.createdAt).toBeDefined();
      expect(project.createdAt >= before).toBe(true);
      expect(project.createdAt <= after).toBe(true);
      expect(project.modifiedAt).toBe(project.createdAt);
    });

    it('creates empty assemblies array', () => {
      const project = loadTemplateFromJSON(minimalTemplate);
      expect(project.assemblies).toEqual([]);
    });

    describe('with stocks', () => {
      const templateWithStocks: TemplateDefinition = {
        ...minimalTemplate,
        stocks: [
          {
            _refId: 'stock-ref-1',
            name: '3/4" Plywood',
            length: 48,
            width: 24,
            thickness: 0.75,
            grainDirection: 'length',
            pricingUnit: 'per_item',
            pricePerUnit: 50,
            color: '#c4a574'
          },
          {
            _refId: 'stock-ref-2',
            name: '2x4 Pine',
            length: 96,
            width: 3.5,
            thickness: 1.5,
            grainDirection: 'length',
            pricingUnit: 'board_foot',
            pricePerUnit: 5,
            color: '#deb887'
          }
        ]
      };

      it('transforms stocks with fresh UUIDs', () => {
        const project = loadTemplateFromJSON(templateWithStocks);
        expect(project.stocks).toHaveLength(2);
        expect(project.stocks[0].id).not.toBe('stock-ref-1');
        expect(project.stocks[1].id).not.toBe('stock-ref-2');
      });

      it('preserves stock properties', () => {
        const project = loadTemplateFromJSON(templateWithStocks);
        expect(project.stocks[0].name).toBe('3/4" Plywood');
        expect(project.stocks[0].length).toBe(48);
        expect(project.stocks[0].width).toBe(24);
        expect(project.stocks[0].thickness).toBe(0.75);
        expect(project.stocks[0].grainDirection).toBe('length');
        expect(project.stocks[0].pricingUnit).toBe('per_item');
        expect(project.stocks[0].pricePerUnit).toBe(50);
        expect(project.stocks[0].color).toBe('#c4a574');
      });
    });

    describe('with parts', () => {
      const templateWithParts: TemplateDefinition = {
        ...minimalTemplate,
        stocks: [
          {
            _refId: 'stock-ref-1',
            name: 'Plywood',
            length: 48,
            width: 24,
            thickness: 0.75,
            grainDirection: 'length',
            pricingUnit: 'per_item',
            pricePerUnit: 50,
            color: '#c4a574'
          }
        ],
        parts: [
          {
            _refId: 'part-ref-1',
            name: 'Side Panel',
            length: 24,
            width: 18,
            thickness: 0.75,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockRefId: 'stock-ref-1',
            grainSensitive: true,
            grainDirection: 'length',
            color: '#c4a574',
            notes: 'Test note',
            extraLength: 0.5,
            extraWidth: 0.25,
            glueUpPanel: true,
            ignoreOverlap: false
          }
        ]
      };

      it('transforms parts with fresh UUIDs', () => {
        const project = loadTemplateFromJSON(templateWithParts);
        expect(project.parts).toHaveLength(1);
        expect(project.parts[0].id).not.toBe('part-ref-1');
      });

      it('preserves part properties', () => {
        const project = loadTemplateFromJSON(templateWithParts);
        const part = project.parts[0];
        expect(part.name).toBe('Side Panel');
        expect(part.length).toBe(24);
        expect(part.width).toBe(18);
        expect(part.thickness).toBe(0.75);
        expect(part.grainSensitive).toBe(true);
        expect(part.grainDirection).toBe('length');
        expect(part.color).toBe('#c4a574');
        expect(part.notes).toBe('Test note');
        expect(part.extraLength).toBe(0.5);
        expect(part.extraWidth).toBe(0.25);
        expect(part.glueUpPanel).toBe(true);
        expect(part.ignoreOverlap).toBe(false);
      });

      it('copies position object', () => {
        const project = loadTemplateFromJSON(templateWithParts);
        expect(project.parts[0].position).toEqual({ x: 0, y: 0, z: 0 });
        // Ensure it's a copy, not the same reference
        expect(project.parts[0].position).not.toBe(templateWithParts.parts[0].position);
      });

      it('copies rotation object', () => {
        const project = loadTemplateFromJSON(templateWithParts);
        expect(project.parts[0].rotation).toEqual({ x: 0, y: 0, z: 0 });
        expect(project.parts[0].rotation).not.toBe(templateWithParts.parts[0].rotation);
      });

      it('maps stockRefId to new stock UUID', () => {
        const project = loadTemplateFromJSON(templateWithParts);
        expect(project.parts[0].stockId).toBe(project.stocks[0].id);
      });

      it('handles null stockRefId', () => {
        const templateNoStock: TemplateDefinition = {
          ...minimalTemplate,
          parts: [
            {
              _refId: 'part-ref-1',
              name: 'Unassigned Part',
              length: 24,
              width: 18,
              thickness: 0.75,
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              stockRefId: '',
              grainSensitive: false,
              grainDirection: 'length',
              color: '#808080'
            }
          ]
        };

        const project = loadTemplateFromJSON(templateNoStock);
        expect(project.parts[0].stockId).toBeNull();
      });

      it('handles missing stockRefId reference', () => {
        const templateMissingRef: TemplateDefinition = {
          ...minimalTemplate,
          parts: [
            {
              _refId: 'part-ref-1',
              name: 'Part',
              length: 24,
              width: 18,
              thickness: 0.75,
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              stockRefId: 'non-existent-ref',
              grainSensitive: false,
              grainDirection: 'length',
              color: '#808080'
            }
          ]
        };

        const project = loadTemplateFromJSON(templateMissingRef);
        expect(project.parts[0].stockId).toBeNull();
      });
    });

    describe('with groups', () => {
      const templateWithGroups: TemplateDefinition = {
        ...minimalTemplate,
        parts: [
          {
            _refId: 'part-ref-1',
            name: 'Part 1',
            length: 24,
            width: 18,
            thickness: 0.75,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockRefId: '',
            grainSensitive: false,
            grainDirection: 'length',
            color: '#808080'
          },
          {
            _refId: 'part-ref-2',
            name: 'Part 2',
            length: 18,
            width: 12,
            thickness: 0.75,
            position: { x: 30, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockRefId: '',
            grainSensitive: false,
            grainDirection: 'length',
            color: '#808080'
          }
        ],
        groups: [
          { _refId: 'group-ref-1', name: 'Cabinet Box' },
          { _refId: 'group-ref-2', name: 'Sub Group' }
        ],
        groupMembers: [
          { groupRefId: 'group-ref-1', memberType: 'part', memberRefId: 'part-ref-1' },
          { groupRefId: 'group-ref-1', memberType: 'group', memberRefId: 'group-ref-2' },
          { groupRefId: 'group-ref-2', memberType: 'part', memberRefId: 'part-ref-2' }
        ]
      };

      it('transforms groups with fresh UUIDs', () => {
        const project = loadTemplateFromJSON(templateWithGroups);
        expect(project.groups).toHaveLength(2);
        expect(project.groups[0].id).not.toBe('group-ref-1');
        expect(project.groups[1].id).not.toBe('group-ref-2');
      });

      it('preserves group names', () => {
        const project = loadTemplateFromJSON(templateWithGroups);
        expect(project.groups[0].name).toBe('Cabinet Box');
        expect(project.groups[1].name).toBe('Sub Group');
      });

      it('creates group members with fresh UUIDs', () => {
        const project = loadTemplateFromJSON(templateWithGroups);
        expect(project.groupMembers).toHaveLength(3);
        project.groupMembers.forEach((gm) => {
          expect(gm.id).toBeDefined();
        });
      });

      it('maps group member references to new UUIDs', () => {
        const project = loadTemplateFromJSON(templateWithGroups);

        // First group member: part in first group
        const gm1 = project.groupMembers[0];
        expect(gm1.groupId).toBe(project.groups[0].id);
        expect(gm1.memberType).toBe('part');
        expect(gm1.memberId).toBe(project.parts[0].id);

        // Second group member: nested group in first group
        const gm2 = project.groupMembers[1];
        expect(gm2.groupId).toBe(project.groups[0].id);
        expect(gm2.memberType).toBe('group');
        expect(gm2.memberId).toBe(project.groups[1].id);

        // Third group member: part in second group
        const gm3 = project.groupMembers[2];
        expect(gm3.groupId).toBe(project.groups[1].id);
        expect(gm3.memberType).toBe('part');
        expect(gm3.memberId).toBe(project.parts[1].id);
      });
    });

    describe('with metric units', () => {
      const metricTemplate: TemplateDefinition = {
        ...minimalTemplate,
        projectSettings: {
          ...minimalTemplate.projectSettings,
          units: 'metric'
        }
      };

      it('sets metric units', () => {
        const project = loadTemplateFromJSON(metricTemplate);
        expect(project.units).toBe('metric');
      });
    });
  });

  describe('loadAssemblyFromJSON', () => {
    const minimalAssembly: AssemblyDefinition = {
      id: 'test-assembly',
      name: 'Test Assembly',
      description: 'A test assembly',
      thumbnail: '📦',
      category: 'furniture',
      parts: [],
      groups: [],
      groupMembers: []
    };

    it('creates assembly with correct name', () => {
      const assembly = loadAssemblyFromJSON(minimalAssembly);
      expect(assembly.name).toBe('Test Assembly');
    });

    it('preserves assembly id', () => {
      const assembly = loadAssemblyFromJSON(minimalAssembly);
      expect(assembly.id).toBe('test-assembly');
    });

    it('preserves description and thumbnail', () => {
      const assembly = loadAssemblyFromJSON(minimalAssembly);
      expect(assembly.description).toBe('A test assembly');
      expect(assembly.thumbnail).toBe('📦');
    });

    it('sets createdAt and modifiedAt', () => {
      const before = new Date().toISOString();
      const assembly = loadAssemblyFromJSON(minimalAssembly);
      const after = new Date().toISOString();

      expect(assembly.createdAt).toBeDefined();
      expect(assembly.createdAt >= before).toBe(true);
      expect(assembly.createdAt <= after).toBe(true);
      expect(assembly.modifiedAt).toBe(assembly.createdAt);
    });

    describe('with parts', () => {
      const assemblyWithParts: AssemblyDefinition = {
        ...minimalAssembly,
        parts: [
          {
            _refId: 'part-ref-1',
            name: 'Top Panel',
            length: 24,
            width: 18,
            thickness: 0.75,
            relativePosition: { x: 0, y: 18.75, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            grainSensitive: true,
            grainDirection: 'length',
            color: '#c4a574',
            notes: 'Grain runs front to back',
            extraLength: 0.5,
            extraWidth: 0.25
          },
          {
            _refId: 'part-ref-2',
            name: 'Side Panel',
            length: 18,
            width: 12,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 90, z: 0 },
            grainSensitive: false,
            grainDirection: 'width',
            color: '#deb887'
          }
        ]
      };

      it('transforms parts to AssemblyPart format', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithParts);
        expect(assembly.parts).toHaveLength(2);
      });

      it('preserves part properties', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithParts);
        const part = assembly.parts[0];
        expect(part.name).toBe('Top Panel');
        expect(part.length).toBe(24);
        expect(part.width).toBe(18);
        expect(part.thickness).toBe(0.75);
        expect(part.grainSensitive).toBe(true);
        expect(part.grainDirection).toBe('length');
        expect(part.color).toBe('#c4a574');
        expect(part.notes).toBe('Grain runs front to back');
        expect(part.extraLength).toBe(0.5);
        expect(part.extraWidth).toBe(0.25);
      });

      it('copies relativePosition object', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithParts);
        expect(assembly.parts[0].relativePosition).toEqual({ x: 0, y: 18.75, z: 0 });
        expect(assembly.parts[0].relativePosition).not.toBe(assemblyWithParts.parts[0].relativePosition);
      });

      it('copies rotation object', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithParts);
        expect(assembly.parts[1].rotation).toEqual({ x: 0, y: 90, z: 0 });
        expect(assembly.parts[1].rotation).not.toBe(assemblyWithParts.parts[1].rotation);
      });

      it('sets stockId to null', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithParts);
        expect(assembly.parts[0].stockId).toBeNull();
        expect(assembly.parts[1].stockId).toBeNull();
      });
    });

    describe('with embedded stock', () => {
      const assemblyWithEmbeddedStock: AssemblyDefinition = {
        ...minimalAssembly,
        parts: [
          {
            _refId: 'part-ref-1',
            name: 'Drawer Front',
            length: 12,
            width: 6,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            grainSensitive: true,
            grainDirection: 'length',
            color: '#c4a574',
            embeddedStock: {
              name: 'Walnut Veneer',
              length: 48,
              width: 24,
              thickness: 0.75,
              grainDirection: 'length',
              pricingUnit: 'per_item',
              pricePerUnit: 75,
              color: '#5c4033'
            }
          }
        ]
      };

      it('includes embedded stock in assembly part', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithEmbeddedStock);
        expect(assembly.parts[0].embeddedStock).toBeDefined();
      });

      it('preserves embedded stock properties', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithEmbeddedStock);
        const stock = assembly.parts[0].embeddedStock!;
        expect(stock.name).toBe('Walnut Veneer');
        expect(stock.length).toBe(48);
        expect(stock.width).toBe(24);
        expect(stock.thickness).toBe(0.75);
        expect(stock.grainDirection).toBe('length');
        expect(stock.pricingUnit).toBe('per_item');
        expect(stock.pricePerUnit).toBe(75);
        expect(stock.color).toBe('#5c4033');
      });
    });

    describe('with groups', () => {
      const assemblyWithGroups: AssemblyDefinition = {
        ...minimalAssembly,
        parts: [
          {
            _refId: 'part-ref-1',
            name: 'Part A',
            length: 12,
            width: 6,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            grainSensitive: false,
            grainDirection: 'length',
            color: '#808080'
          },
          {
            _refId: 'part-ref-2',
            name: 'Part B',
            length: 12,
            width: 6,
            thickness: 0.75,
            relativePosition: { x: 12, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            grainSensitive: false,
            grainDirection: 'length',
            color: '#808080'
          }
        ],
        groups: [
          { _refId: 'group-ref-1', name: 'Main Group' },
          { _refId: 'group-ref-2', name: 'Sub Group' }
        ],
        groupMembers: [
          { groupRefId: 'group-ref-1', memberType: 'part', memberRefId: 'part-ref-1' },
          { groupRefId: 'group-ref-1', memberType: 'group', memberRefId: 'group-ref-2' },
          { groupRefId: 'group-ref-2', memberType: 'part', memberRefId: 'part-ref-2' }
        ]
      };

      it('transforms groups to AssemblyGroup format', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithGroups);
        expect(assembly.groups).toHaveLength(2);
        expect(assembly.groups[0].name).toBe('Main Group');
        expect(assembly.groups[1].name).toBe('Sub Group');
      });

      it('generates originalId for groups', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithGroups);
        expect(assembly.groups[0].originalId).toBeDefined();
        expect(assembly.groups[1].originalId).toBeDefined();
      });

      it('transforms group members with index references', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithGroups);
        expect(assembly.groupMembers).toHaveLength(3);

        // First: part in main group
        expect(assembly.groupMembers[0]).toEqual({
          groupIndex: 0,
          memberType: 'part',
          memberIndex: 0
        });

        // Second: nested group in main group
        expect(assembly.groupMembers[1]).toEqual({
          groupIndex: 0,
          memberType: 'group',
          memberIndex: 1
        });

        // Third: part in sub group
        expect(assembly.groupMembers[2]).toEqual({
          groupIndex: 1,
          memberType: 'part',
          memberIndex: 1
        });
      });
    });

    describe('with invalid references', () => {
      const assemblyWithInvalidRefs: AssemblyDefinition = {
        ...minimalAssembly,
        parts: [
          {
            _refId: 'part-ref-1',
            name: 'Part A',
            length: 12,
            width: 6,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            grainSensitive: false,
            grainDirection: 'length',
            color: '#808080'
          }
        ],
        groups: [{ _refId: 'group-ref-1', name: 'Group' }],
        groupMembers: [
          { groupRefId: 'group-ref-1', memberType: 'part', memberRefId: 'part-ref-1' },
          { groupRefId: 'invalid-group', memberType: 'part', memberRefId: 'part-ref-1' },
          { groupRefId: 'group-ref-1', memberType: 'part', memberRefId: 'invalid-part' }
        ]
      };

      it('filters out group members with invalid references', () => {
        const assembly = loadAssemblyFromJSON(assemblyWithInvalidRefs);
        // Only the first valid group member should remain
        expect(assembly.groupMembers).toHaveLength(1);
        expect(assembly.groupMembers[0]).toEqual({
          groupIndex: 0,
          memberType: 'part',
          memberIndex: 0
        });
      });
    });
  });

  describe('getTemplateMetadata', () => {
    const template: TemplateDefinition = {
      id: 'test-template',
      name: 'Test Template',
      description: 'A wonderful template',
      category: 'furniture',
      thumbnail: '🛋️',
      dimensions: { width: 72, depth: 36, height: 30 },
      projectSettings: {
        units: 'imperial',
        gridSize: 0.25,
        kerfWidth: 0.125,
        overageFactor: 1.1,
        projectNotes: '',
        stockConstraints: {
          maxLength: 96,
          maxWidth: 48,
          maxBoardFeet: 50,
          maxTotalCost: 500,
          useGlobalDefaults: true,
          preferBoardOverSheet: false
        }
      },
      stocks: [
        {
          _refId: 'stock-1',
          name: 'Stock',
          length: 48,
          width: 24,
          thickness: 0.75,
          grainDirection: 'length',
          pricingUnit: 'per_item',
          pricePerUnit: 50,
          color: '#c4a574'
        },
        {
          _refId: 'stock-2',
          name: 'Stock 2',
          length: 96,
          width: 3.5,
          thickness: 1.5,
          grainDirection: 'length',
          pricingUnit: 'board_foot',
          pricePerUnit: 5,
          color: '#deb887'
        }
      ],
      parts: [
        {
          _refId: 'part-1',
          name: 'Part',
          length: 24,
          width: 18,
          thickness: 0.75,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          stockRefId: 'stock-1',
          grainSensitive: false,
          grainDirection: 'length',
          color: '#c4a574'
        }
      ],
      groups: [],
      groupMembers: []
    };

    it('extracts template id', () => {
      const metadata = getTemplateMetadata(template);
      expect(metadata.id).toBe('test-template');
    });

    it('extracts template name', () => {
      const metadata = getTemplateMetadata(template);
      expect(metadata.name).toBe('Test Template');
    });

    it('extracts template description', () => {
      const metadata = getTemplateMetadata(template);
      expect(metadata.description).toBe('A wonderful template');
    });

    it('extracts template category', () => {
      const metadata = getTemplateMetadata(template);
      expect(metadata.category).toBe('furniture');
    });

    it('extracts template thumbnail', () => {
      const metadata = getTemplateMetadata(template);
      expect(metadata.thumbnail).toBe('🛋️');
    });

    it('extracts dimensions', () => {
      const metadata = getTemplateMetadata(template);
      expect(metadata.dimensions).toEqual({ width: 72, depth: 36, height: 30 });
    });

    it('counts parts', () => {
      const metadata = getTemplateMetadata(template);
      expect(metadata.partCount).toBe(1);
    });

    it('counts stocks', () => {
      const metadata = getTemplateMetadata(template);
      expect(metadata.stockCount).toBe(2);
    });
  });

  describe('getAssemblyMetadata', () => {
    const assembly: AssemblyDefinition = {
      id: 'test-assembly',
      name: 'Test Assembly',
      description: 'A useful assembly',
      thumbnail: '🔧',
      category: 'hardware',
      parts: [
        {
          _refId: 'part-1',
          name: 'Part 1',
          length: 12,
          width: 6,
          thickness: 0.75,
          relativePosition: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          grainSensitive: false,
          grainDirection: 'length',
          color: '#808080'
        },
        {
          _refId: 'part-2',
          name: 'Part 2',
          length: 12,
          width: 6,
          thickness: 0.75,
          relativePosition: { x: 12, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          grainSensitive: false,
          grainDirection: 'length',
          color: '#808080'
        },
        {
          _refId: 'part-3',
          name: 'Part 3',
          length: 12,
          width: 6,
          thickness: 0.75,
          relativePosition: { x: 24, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          grainSensitive: false,
          grainDirection: 'length',
          color: '#808080'
        }
      ],
      groups: [],
      groupMembers: []
    };

    it('extracts assembly id', () => {
      const metadata = getAssemblyMetadata(assembly);
      expect(metadata.id).toBe('test-assembly');
    });

    it('extracts assembly name', () => {
      const metadata = getAssemblyMetadata(assembly);
      expect(metadata.name).toBe('Test Assembly');
    });

    it('extracts assembly description', () => {
      const metadata = getAssemblyMetadata(assembly);
      expect(metadata.description).toBe('A useful assembly');
    });

    it('extracts assembly category', () => {
      const metadata = getAssemblyMetadata(assembly);
      expect(metadata.category).toBe('hardware');
    });

    it('extracts assembly thumbnail', () => {
      const metadata = getAssemblyMetadata(assembly);
      expect(metadata.thumbnail).toBe('🔧');
    });

    it('counts parts', () => {
      const metadata = getAssemblyMetadata(assembly);
      expect(metadata.partCount).toBe(3);
    });

    it('handles undefined optional fields', () => {
      const minimalAssembly: AssemblyDefinition = {
        id: 'minimal',
        name: 'Minimal',
        parts: [],
        groups: [],
        groupMembers: []
      };

      const metadata = getAssemblyMetadata(minimalAssembly);
      expect(metadata.description).toBeUndefined();
      expect(metadata.category).toBeUndefined();
      expect(metadata.thumbnail).toBeUndefined();
    });
  });
});
