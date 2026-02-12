/**
 * Test factories for creating test data
 * These functions create minimal valid objects that can be overridden as needed
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Part,
  Stock,
  Group,
  GroupMember,
  Project,
  Assembly,
  CutList,
  StockConstraintSettings,
  CustomShoppingItem
} from '../../src/renderer/src/types';

// ============================================================
// Part Factory
// ============================================================

export function createTestPart(overrides?: Partial<Part>): Part {
  return {
    id: uuidv4(),
    name: 'Test Part',
    length: 24,
    width: 12,
    thickness: 0.75,
    position: { x: 0, y: 0.375, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: true,
    grainDirection: 'length',
    color: '#d4a574',
    ...overrides
  };
}

export function createTestPartWithStock(stockId: string, overrides?: Partial<Part>): Part {
  return createTestPart({
    stockId,
    ...overrides
  });
}

// ============================================================
// Stock Factory
// ============================================================

export function createTestStock(overrides?: Partial<Stock>): Stock {
  return {
    id: uuidv4(),
    name: 'Test Stock',
    length: 96,
    width: 48,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'board_foot',
    pricePerUnit: 5.50,
    color: '#d4a574',
    ...overrides
  };
}

export function createPlywoodStock(overrides?: Partial<Stock>): Stock {
  return createTestStock({
    name: '3/4" Plywood',
    length: 96,
    width: 48,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 45.00,
    ...overrides
  });
}

export function createBoardStock(overrides?: Partial<Stock>): Stock {
  return createTestStock({
    name: '1x6 Pine',
    length: 96,
    width: 5.5,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'board_foot',
    pricePerUnit: 3.50,
    ...overrides
  });
}

// ============================================================
// Group Factory
// ============================================================

export function createTestGroup(overrides?: Partial<Group>): Group {
  return {
    id: uuidv4(),
    name: 'Test Group',
    ...overrides
  };
}

export function createTestGroupMember(
  groupId: string,
  memberId: string,
  memberType: 'part' | 'group' = 'part'
): GroupMember {
  return {
    id: uuidv4(),
    groupId,
    memberId,
    memberType
  };
}

// ============================================================
// Assembly Factory
// ============================================================

export function createTestAssembly(overrides?: Partial<Assembly>): Assembly {
  return {
    id: uuidv4(),
    name: 'Test Assembly',
    description: 'A test assembly',
    parts: [],
    groups: [],
    groupMembers: [],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    ...overrides
  };
}

// ============================================================
// Project Factory
// ============================================================

export function createTestProject(overrides?: Partial<Project>): Project {
  return {
    version: '1.0',
    name: 'Test Project',
    stocks: [],
    parts: [],
    groups: [],
    groupMembers: [],
    assemblies: [],
    units: 'imperial',
    gridSize: 0.0625,
    kerfWidth: 0.125,
    overageFactor: 0.1,
    projectNotes: '',
    stockConstraints: createDefaultStockConstraints(),
    snapGuides: [],
    customShoppingItems: [],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    ...overrides
  };
}

export function createProjectWithParts(partCount: number = 3): Project {
  const stock = createTestStock();
  const parts = Array.from({ length: partCount }, (_, i) =>
    createTestPart({
      name: `Part ${i + 1}`,
      stockId: stock.id,
      position: { x: i * 10, y: 0.375, z: 0 }
    })
  );

  return createTestProject({
    stocks: [stock],
    parts
  });
}

// ============================================================
// Stock Constraints Factory
// ============================================================

export function createDefaultStockConstraints(): StockConstraintSettings {
  return {
    constrainDimensions: true,
    constrainGrain: true,
    constrainColor: true,
    preventOverlap: true
  };
}

// ============================================================
// Custom Shopping Item Factory
// ============================================================

export function createTestCustomShoppingItem(
  overrides?: Partial<CustomShoppingItem>
): CustomShoppingItem {
  return {
    id: uuidv4(),
    name: 'Test Item',
    quantity: 1,
    unitPrice: 5.99,
    description: 'Test description',
    category: 'Hardware',
    ...overrides
  };
}

// ============================================================
// Cut List Test Data
// ============================================================

export function createSimpleCutListScenario() {
  const stock = createPlywoodStock();
  const parts = [
    createTestPart({
      name: 'Shelf 1',
      length: 24,
      width: 12,
      stockId: stock.id
    }),
    createTestPart({
      name: 'Shelf 2',
      length: 24,
      width: 12,
      stockId: stock.id
    }),
    createTestPart({
      name: 'Side Panel',
      length: 36,
      width: 12,
      stockId: stock.id
    })
  ];

  return { stock, parts };
}

export function createComplexCutListScenario() {
  const plywood = createPlywoodStock({ id: 'plywood-1' });
  const pine = createBoardStock({ id: 'pine-1' });

  const parts = [
    // Plywood parts
    createTestPart({
      name: 'Top',
      length: 48,
      width: 24,
      stockId: plywood.id
    }),
    createTestPart({
      name: 'Bottom',
      length: 48,
      width: 24,
      stockId: plywood.id
    }),
    createTestPart({
      name: 'Back',
      length: 48,
      width: 36,
      stockId: plywood.id
    }),
    // Pine parts
    createTestPart({
      name: 'Face Frame Rail',
      length: 44,
      width: 2,
      stockId: pine.id
    }),
    createTestPart({
      name: 'Face Frame Stile',
      length: 34,
      width: 2,
      stockId: pine.id
    })
  ];

  return { stocks: [plywood, pine], parts };
}

// ============================================================
// Helpers for testing group hierarchies
// ============================================================

export function createNestedGroupStructure() {
  // Creates: Group A (contains Part 1, Group B), Group B (contains Part 2, Part 3)
  const groupA = createTestGroup({ name: 'Group A' });
  const groupB = createTestGroup({ name: 'Group B' });

  const part1 = createTestPart({ name: 'Part 1' });
  const part2 = createTestPart({ name: 'Part 2' });
  const part3 = createTestPart({ name: 'Part 3' });

  const groupMembers: GroupMember[] = [
    createTestGroupMember(groupA.id, part1.id, 'part'),
    createTestGroupMember(groupA.id, groupB.id, 'group'),
    createTestGroupMember(groupB.id, part2.id, 'part'),
    createTestGroupMember(groupB.id, part3.id, 'part')
  ];

  return {
    groups: [groupA, groupB],
    parts: [part1, part2, part3],
    groupMembers,
    groupA,
    groupB,
    part1,
    part2,
    part3
  };
}
