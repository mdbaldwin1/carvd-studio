import { describe, it, expect } from 'vitest';
import {
  generateStocks,
  generateParts,
  generateGroups,
  generateSeedProject,
  generateStockLibraryItems
} from './seedData';

describe('seedData', () => {
  describe('generateStocks', () => {
    it('returns an array of stocks', () => {
      const stocks = generateStocks();

      expect(Array.isArray(stocks)).toBe(true);
      expect(stocks.length).toBeGreaterThan(0);
    });

    it('includes plywood stock', () => {
      const stocks = generateStocks();
      const plywood = stocks.find((s) => s.name.includes('Plywood'));

      expect(plywood).toBeDefined();
      expect(plywood!.thickness).toBe(0.75);
      expect(plywood!.pricingUnit).toBe('per_item');
    });

    it('includes maple stock', () => {
      const stocks = generateStocks();
      const maple = stocks.find((s) => s.name.includes('Maple'));

      expect(maple).toBeDefined();
      expect(maple!.pricingUnit).toBe('board_foot');
      expect(maple!.grainDirection).toBe('length');
    });

    it('all stocks have required properties', () => {
      const stocks = generateStocks();

      stocks.forEach((stock) => {
        expect(stock.id).toBeDefined();
        expect(stock.name).toBeDefined();
        expect(stock.length).toBeGreaterThan(0);
        expect(stock.width).toBeGreaterThan(0);
        expect(stock.thickness).toBeGreaterThan(0);
        expect(stock.grainDirection).toMatch(/^(length|width|none)$/);
        expect(stock.pricingUnit).toMatch(/^(per_item|board_foot|linear_foot|square_foot)$/);
        expect(typeof stock.pricePerUnit).toBe('number');
        expect(stock.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('each stock has a unique ID', () => {
      const stocks = generateStocks();
      const ids = stocks.map((s) => s.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('generateParts', () => {
    it('returns an array of parts', () => {
      const parts = generateParts();

      expect(Array.isArray(parts)).toBe(true);
      expect(parts.length).toBeGreaterThan(0);
    });

    it('includes desktop part', () => {
      const parts = generateParts();
      const desktop = parts.find((p) => p.name === 'Desktop');

      expect(desktop).toBeDefined();
      expect(desktop!.length).toBe(48); // DESK_WIDTH
      expect(desktop!.width).toBe(24); // DESK_DEPTH
      expect(desktop!.thickness).toBe(0.75); // TOP_THICKNESS
    });

    it('includes 4 legs', () => {
      const parts = generateParts();
      const legs = parts.filter((p) => p.name.includes('Leg'));

      expect(legs).toHaveLength(4);
      expect(legs.some((l) => l.name === 'Front Left Leg')).toBe(true);
      expect(legs.some((l) => l.name === 'Front Right Leg')).toBe(true);
      expect(legs.some((l) => l.name === 'Back Left Leg')).toBe(true);
      expect(legs.some((l) => l.name === 'Back Right Leg')).toBe(true);
    });

    it('includes stretchers', () => {
      const parts = generateParts();
      const stretchers = parts.filter((p) => p.name.includes('Stretcher'));

      expect(stretchers.length).toBeGreaterThan(0);
      expect(stretchers.some((s) => s.name === 'Back Stretcher')).toBe(true);
      expect(stretchers.some((s) => s.name === 'Left Stretcher')).toBe(true);
      expect(stretchers.some((s) => s.name === 'Right Stretcher')).toBe(true);
    });

    it('all parts have required properties', () => {
      const parts = generateParts();

      parts.forEach((part) => {
        expect(part.id).toBeDefined();
        expect(part.name).toBeDefined();
        expect(part.length).toBeGreaterThan(0);
        expect(part.width).toBeGreaterThan(0);
        expect(part.thickness).toBeGreaterThan(0);
        expect(part.position).toBeDefined();
        expect(typeof part.position.x).toBe('number');
        expect(typeof part.position.y).toBe('number');
        expect(typeof part.position.z).toBe('number');
        expect(part.rotation).toBeDefined();
        expect(part.stockId).toBeDefined();
        expect(part.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('each part has a unique ID', () => {
      const parts = generateParts();
      const ids = parts.map((p) => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('parts reference valid stock IDs', () => {
      const stocks = generateStocks();
      const stockIds = new Set(stocks.map((s) => s.id));
      const parts = generateParts();

      parts.forEach((part) => {
        expect(stockIds.has(part.stockId!)).toBe(true);
      });
    });

    it('legs are rotated to stand vertically', () => {
      const parts = generateParts();
      const legs = parts.filter((p) => p.name.includes('Leg'));

      legs.forEach((leg) => {
        // Legs should be rotated 90 degrees around Z axis to stand up
        expect(leg.rotation.z).toBe(90);
      });
    });
  });

  describe('generateGroups', () => {
    it('creates groups for legs and stretchers', () => {
      const parts = generateParts();
      const { groups } = generateGroups(parts);

      expect(groups.length).toBeGreaterThan(0);
      expect(groups.some((g) => g.name === 'Legs')).toBe(true);
      expect(groups.some((g) => g.name === 'Stretchers')).toBe(true);
    });

    it('groups have unique IDs', () => {
      const parts = generateParts();
      const { groups } = generateGroups(parts);
      const ids = groups.map((g) => g.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('group members reference valid groups', () => {
      const parts = generateParts();
      const { groups, groupMembers } = generateGroups(parts);
      const groupIds = new Set(groups.map((g) => g.id));

      groupMembers.forEach((gm) => {
        expect(groupIds.has(gm.groupId)).toBe(true);
      });
    });

    it('group members reference valid parts', () => {
      const parts = generateParts();
      const { groupMembers } = generateGroups(parts);
      const partIds = new Set(parts.map((p) => p.id));

      groupMembers.forEach((gm) => {
        if (gm.memberType === 'part') {
          expect(partIds.has(gm.memberId)).toBe(true);
        }
      });
    });

    it('all legs are in the Legs group', () => {
      const parts = generateParts();
      const legs = parts.filter((p) => p.name.includes('Leg'));
      const { groups, groupMembers } = generateGroups(parts);
      const legsGroup = groups.find((g) => g.name === 'Legs')!;

      const legMemberIds = groupMembers.filter((gm) => gm.groupId === legsGroup.id).map((gm) => gm.memberId);

      legs.forEach((leg) => {
        expect(legMemberIds).toContain(leg.id);
      });
    });

    it('all stretchers are in the Stretchers group', () => {
      const parts = generateParts();
      const stretchers = parts.filter((p) => p.name.includes('Stretcher'));
      const { groups, groupMembers } = generateGroups(parts);
      const stretchersGroup = groups.find((g) => g.name === 'Stretchers')!;

      const stretcherMemberIds = groupMembers
        .filter((gm) => gm.groupId === stretchersGroup.id)
        .map((gm) => gm.memberId);

      stretchers.forEach((stretcher) => {
        expect(stretcherMemberIds).toContain(stretcher.id);
      });
    });
  });

  describe('generateSeedProject', () => {
    it('returns a complete project', () => {
      const project = generateSeedProject();

      expect(project).toBeDefined();
      expect(project.name).toBe('Simple Writing Desk');
      expect(project.version).toBe('1.0');
    });

    it('includes all required project properties', () => {
      const project = generateSeedProject();

      expect(project.stocks).toBeDefined();
      expect(project.parts).toBeDefined();
      expect(project.groups).toBeDefined();
      expect(project.groupMembers).toBeDefined();
      expect(project.assemblies).toBeDefined();
      expect(project.units).toBe('imperial');
      expect(project.gridSize).toBe(0.0625);
      expect(project.kerfWidth).toBe(0.125);
      expect(project.overageFactor).toBe(0.1);
      expect(project.projectNotes).toBeDefined();
      expect(project.stockConstraints).toBeDefined();
      expect(project.createdAt).toBeDefined();
      expect(project.modifiedAt).toBeDefined();
    });

    it('has consistent stock references', () => {
      const project = generateSeedProject();
      const stockIds = new Set(project.stocks.map((s) => s.id));

      project.parts.forEach((part) => {
        if (part.stockId) {
          expect(stockIds.has(part.stockId)).toBe(true);
        }
      });
    });

    it('has consistent group references', () => {
      const project = generateSeedProject();
      const groupIds = new Set(project.groups.map((g) => g.id));
      const partIds = new Set(project.parts.map((p) => p.id));

      project.groupMembers.forEach((gm) => {
        expect(groupIds.has(gm.groupId)).toBe(true);
        if (gm.memberType === 'part') {
          expect(partIds.has(gm.memberId)).toBe(true);
        }
      });
    });

    it('has valid timestamp format', () => {
      const project = generateSeedProject();

      expect(new Date(project.createdAt).toString()).not.toBe('Invalid Date');
      expect(new Date(project.modifiedAt).toString()).not.toBe('Invalid Date');
    });

    it('has appropriate stock constraints', () => {
      const project = generateSeedProject();

      expect(project.stockConstraints.constrainDimensions).toBe(true);
      expect(project.stockConstraints.constrainGrain).toBe(true);
      expect(project.stockConstraints.constrainColor).toBe(true);
      // preventOverlap is false for the tutorial to allow free placement
      expect(project.stockConstraints.preventOverlap).toBe(false);
    });
  });

  describe('generateStockLibraryItems', () => {
    it('returns an array of stock library items', () => {
      const items = generateStockLibraryItems();

      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    it('includes common plywood options', () => {
      const items = generateStockLibraryItems();
      const plywoodItems = items.filter((i) => i.name.includes('Plywood'));

      expect(plywoodItems.length).toBeGreaterThan(0);
      expect(plywoodItems.some((p) => p.thickness === 0.75)).toBe(true);
      expect(plywoodItems.some((p) => p.thickness === 0.5)).toBe(true);
    });

    it('includes hardwood options', () => {
      const items = generateStockLibraryItems();

      expect(items.some((i) => i.name.includes('Walnut'))).toBe(true);
      expect(items.some((i) => i.name.includes('Oak'))).toBe(true);
      expect(items.some((i) => i.name.includes('Maple'))).toBe(true);
    });

    it('includes MDF option', () => {
      const items = generateStockLibraryItems();
      const mdf = items.find((i) => i.name.includes('MDF'));

      expect(mdf).toBeDefined();
      expect(mdf!.grainDirection).toBe('none');
    });

    it('includes construction lumber', () => {
      const items = generateStockLibraryItems();
      const lumber = items.find((i) => i.name.includes('2x4'));

      expect(lumber).toBeDefined();
      expect(lumber!.thickness).toBe(1.5); // Actual 2x4 thickness
      expect(lumber!.width).toBe(3.5); // Actual 2x4 width
    });

    it('all items have required properties', () => {
      const items = generateStockLibraryItems();

      items.forEach((item) => {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(item.length).toBeGreaterThan(0);
        expect(item.width).toBeGreaterThan(0);
        expect(item.thickness).toBeGreaterThan(0);
        expect(item.grainDirection).toMatch(/^(length|width|none)$/);
        expect(item.pricingUnit).toMatch(/^(per_item|board_foot|linear_foot|square_foot)$/);
        expect(typeof item.pricePerUnit).toBe('number');
        expect(item.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('each item has a unique ID', () => {
      const items = generateStockLibraryItems();
      const ids = items.map((i) => i.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all 4/4 lumber has correct thickness', () => {
      const items = generateStockLibraryItems();
      const fourQuarterItems = items.filter((i) => i.name.includes('4/4'));

      fourQuarterItems.forEach((item) => {
        expect(item.thickness).toBe(0.75); // Surfaced 4/4 = 3/4"
      });
    });

    it('all 8/4 lumber has correct thickness', () => {
      const items = generateStockLibraryItems();
      const eightQuarterItems = items.filter((i) => i.name.includes('8/4'));

      eightQuarterItems.forEach((item) => {
        expect(item.thickness).toBe(1.75); // Surfaced 8/4 = 1-3/4"
      });
    });

    it('sheet goods use per_item pricing', () => {
      const items = generateStockLibraryItems();
      const sheetGoods = items.filter((i) => i.name.includes('Plywood') || i.name.includes('MDF'));

      sheetGoods.forEach((item) => {
        expect(item.pricingUnit).toBe('per_item');
      });
    });

    it('solid wood uses board_foot pricing', () => {
      const items = generateStockLibraryItems();
      const solidWood = items.filter(
        (i) => i.name.includes('Walnut') || i.name.includes('Oak') || i.name.includes('Maple')
      );

      solidWood.forEach((item) => {
        expect(item.pricingUnit).toBe('board_foot');
      });
    });
  });
});
