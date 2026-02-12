/**
 * Seed data for tutorial - Simple Writing Desk
 *
 * Design: 48"W x 24"D x 30"H simple desk with:
 * - Flat desktop
 * - 4 legs
 * - Front and back stretchers
 * - Side stretchers
 *
 * This design is intentionally simple to demonstrate the app without
 * overwhelming new users with complex geometry.
 */

import { v4 as uuidv4 } from 'uuid';
import { Part, Stock, Group, GroupMember, Project, Rotation3D } from '../types';

// Stock IDs (generated once for consistency)
const PLYWOOD_3_4_ID = uuidv4();
const MAPLE_ID = uuidv4();

// Colors
const LIGHT_OAK = '#c4a574';
const MAPLE_COLOR = '#f5deb3';

// Default rotation (no rotation)
const NO_ROTATION: Rotation3D = { x: 0, y: 0, z: 0 };

/**
 * Generate the stock materials for the desk
 */
export function generateStocks(): Stock[] {
  return [
    {
      id: PLYWOOD_3_4_ID,
      name: '3/4" Baltic Birch Plywood',
      length: 96,
      width: 48,
      thickness: 0.75,
      grainDirection: 'length',
      pricingUnit: 'per_item',
      pricePerUnit: 65,
      color: LIGHT_OAK
    },
    {
      id: MAPLE_ID,
      name: '8/4 Hard Maple',
      length: 96,
      width: 6,
      thickness: 1.75,
      grainDirection: 'length',
      pricingUnit: 'board_foot',
      pricePerUnit: 8,
      color: MAPLE_COLOR
    }
  ];
}

/**
 * Helper to create a part with defaults
 */
function createPart(
  name: string,
  length: number,
  width: number,
  thickness: number,
  position: { x: number; y: number; z: number },
  stockId: string,
  color: string,
  options?: {
    rotation?: Rotation3D;
    notes?: string;
    grainSensitive?: boolean;
    grainDirection?: 'length' | 'width';
  }
): Part {
  return {
    id: uuidv4(),
    name,
    length,
    width,
    thickness,
    position,
    rotation: options?.rotation || NO_ROTATION,
    stockId,
    grainSensitive: options?.grainSensitive ?? true,
    grainDirection: options?.grainDirection || 'length',
    color,
    notes: options?.notes
  };
}

/**
 * Generate all desk parts with proper positioning
 */
export function generateParts(): Part[] {
  const parts: Part[] = [];

  // Desk dimensions
  const DESK_WIDTH = 48; // X axis
  const DESK_DEPTH = 24; // Z axis
  const DESK_HEIGHT = 30; // Y axis
  const TOP_THICKNESS = 0.75;
  const LEG_SIZE = 1.75; // Square legs

  // Leg positions (inset 2" from edges)
  const LEG_INSET = 2;
  const LEG_X_OFFSET = DESK_WIDTH / 2 - LEG_INSET - LEG_SIZE / 2;
  const LEG_Z_OFFSET = DESK_DEPTH / 2 - LEG_INSET - LEG_SIZE / 2;
  const LEG_HEIGHT = DESK_HEIGHT - TOP_THICKNESS;

  // Stretcher dimensions
  const STRETCHER_WIDTH = 3;
  const STRETCHER_THICKNESS = 0.75;
  const STRETCHER_HEIGHT = 6; // Height from floor to stretcher center

  // ============================================
  // DESKTOP
  // ============================================
  // Desktop top at Y=30", center Y = 30 - 0.375 = 29.625
  parts.push(
    createPart(
      'Desktop',
      DESK_WIDTH,
      DESK_DEPTH,
      TOP_THICKNESS,
      { x: 0, y: DESK_HEIGHT - TOP_THICKNESS / 2, z: 0 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { notes: 'Main work surface' }
    )
  );

  // ============================================
  // LEGS (4)
  // ============================================
  // Legs are vertical, so we use rotation to stand them up
  // A 1.75" x 1.75" x leg_height piece, rotated to stand vertical

  // Front Left Leg
  parts.push(
    createPart(
      'Front Left Leg',
      LEG_HEIGHT,
      LEG_SIZE,
      LEG_SIZE,
      { x: -LEG_X_OFFSET, y: LEG_HEIGHT / 2, z: LEG_Z_OFFSET },
      MAPLE_ID,
      MAPLE_COLOR,
      { rotation: { x: 0, y: 0, z: 90 } }
    )
  );

  // Front Right Leg
  parts.push(
    createPart(
      'Front Right Leg',
      LEG_HEIGHT,
      LEG_SIZE,
      LEG_SIZE,
      { x: LEG_X_OFFSET, y: LEG_HEIGHT / 2, z: LEG_Z_OFFSET },
      MAPLE_ID,
      MAPLE_COLOR,
      { rotation: { x: 0, y: 0, z: 90 } }
    )
  );

  // Back Left Leg
  parts.push(
    createPart(
      'Back Left Leg',
      LEG_HEIGHT,
      LEG_SIZE,
      LEG_SIZE,
      { x: -LEG_X_OFFSET, y: LEG_HEIGHT / 2, z: -LEG_Z_OFFSET },
      MAPLE_ID,
      MAPLE_COLOR,
      { rotation: { x: 0, y: 0, z: 90 } }
    )
  );

  // Back Right Leg
  parts.push(
    createPart(
      'Back Right Leg',
      LEG_HEIGHT,
      LEG_SIZE,
      LEG_SIZE,
      { x: LEG_X_OFFSET, y: LEG_HEIGHT / 2, z: -LEG_Z_OFFSET },
      MAPLE_ID,
      MAPLE_COLOR,
      { rotation: { x: 0, y: 0, z: 90 } }
    )
  );

  // ============================================
  // STRETCHERS (3 sides - back and both sides, front open for legroom)
  // ============================================
  // Stretchers connect the legs for rigidity

  // Back Stretcher (connects back legs, runs left-right)
  const backStretcherLength = DESK_WIDTH - 2 * LEG_INSET - LEG_SIZE;
  parts.push(
    createPart(
      'Back Stretcher',
      backStretcherLength,
      STRETCHER_WIDTH,
      STRETCHER_THICKNESS,
      { x: 0, y: STRETCHER_HEIGHT, z: -LEG_Z_OFFSET },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { rotation: { x: 90, y: 0, z: 0 } }
    )
  );

  // Left Stretcher (connects left legs, runs front-back)
  const sideStretcherLength = DESK_DEPTH - 2 * LEG_INSET - LEG_SIZE;
  parts.push(
    createPart(
      'Left Stretcher',
      sideStretcherLength,
      STRETCHER_WIDTH,
      STRETCHER_THICKNESS,
      { x: -LEG_X_OFFSET, y: STRETCHER_HEIGHT, z: 0 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { rotation: { x: 90, y: 0, z: 90 } }
    )
  );

  // Right Stretcher (connects right legs, runs front-back)
  parts.push(
    createPart(
      'Right Stretcher',
      sideStretcherLength,
      STRETCHER_WIDTH,
      STRETCHER_THICKNESS,
      { x: LEG_X_OFFSET, y: STRETCHER_HEIGHT, z: 0 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { rotation: { x: 90, y: 0, z: 90 } }
    )
  );

  return parts;
}

/**
 * Generate groups for logical organization
 */
export function generateGroups(parts: Part[]): { groups: Group[]; groupMembers: GroupMember[] } {
  const groups: Group[] = [];
  const groupMembers: GroupMember[] = [];

  // Create main groups
  const legsGroupId = uuidv4();
  const stretchersGroupId = uuidv4();

  groups.push({ id: legsGroupId, name: 'Legs' }, { id: stretchersGroupId, name: 'Stretchers' });

  // Helper to add part to group by name pattern
  const addPartsToGroup = (groupId: string, namePattern: RegExp | string) => {
    parts.forEach((part) => {
      const matches = typeof namePattern === 'string' ? part.name === namePattern : namePattern.test(part.name);
      if (matches) {
        groupMembers.push({
          id: uuidv4(),
          groupId,
          memberType: 'part',
          memberId: part.id
        });
      }
    });
  };

  // Group legs together
  addPartsToGroup(legsGroupId, /Leg$/);

  // Group stretchers together
  addPartsToGroup(stretchersGroupId, /Stretcher$/);

  return { groups, groupMembers };
}

/**
 * Generate complete project with all seed data
 */
export function generateSeedProject(): Project {
  const stocks = generateStocks();
  const parts = generateParts();
  const { groups, groupMembers } = generateGroups(parts);

  const now = new Date().toISOString();

  return {
    version: '1.0',
    name: 'Simple Writing Desk',
    stocks,
    parts,
    groups,
    groupMembers,
    assemblies: [],
    units: 'imperial',
    gridSize: 0.0625, // 1/16"
    kerfWidth: 0.125, // 1/8" kerf
    overageFactor: 0.1, // 10% overage
    projectNotes: `Simple Writing Desk

Dimensions: 48"W x 24"D x 30"H

A clean, straightforward desk design perfect for learning Carvd Studio.

Materials:
- 3/4" Baltic Birch Plywood for desktop and stretchers
- 8/4 Hard Maple for legs

Features:
- Solid plywood top
- Four sturdy maple legs
- Cross stretchers for stability

Try these things:
1. Click parts to select them
2. Use X, Y, Z keys to rotate
3. Drag parts to move them
4. Press G to group selected parts
5. Generate a cut list to see the shopping list`,
    stockConstraints: {
      constrainDimensions: true,
      constrainGrain: true,
      constrainColor: true,
      preventOverlap: false
    },
    createdAt: now,
    modifiedAt: now
  };
}

/**
 * Stock library items to add to app-level library
 */
export function generateStockLibraryItems() {
  return [
    {
      id: uuidv4(),
      name: '3/4" Baltic Birch Plywood',
      length: 96,
      width: 48,
      thickness: 0.75,
      grainDirection: 'length' as const,
      pricingUnit: 'per_item' as const,
      pricePerUnit: 65,
      color: LIGHT_OAK
    },
    {
      id: uuidv4(),
      name: '1/2" Baltic Birch Plywood',
      length: 96,
      width: 48,
      thickness: 0.5,
      grainDirection: 'length' as const,
      pricingUnit: 'per_item' as const,
      pricePerUnit: 45,
      color: '#d4a574'
    },
    {
      id: uuidv4(),
      name: '3/4" MDF Sheet',
      length: 96,
      width: 48,
      thickness: 0.75,
      grainDirection: 'none' as const,
      pricingUnit: 'per_item' as const,
      pricePerUnit: 35,
      color: '#e8e0d5'
    },
    {
      id: uuidv4(),
      name: '4/4 Walnut Board',
      length: 96,
      width: 8,
      thickness: 0.75,
      grainDirection: 'length' as const,
      pricingUnit: 'board_foot' as const,
      pricePerUnit: 12,
      color: '#8b5a2b'
    },
    {
      id: uuidv4(),
      name: '4/4 White Oak Board',
      length: 96,
      width: 8,
      thickness: 0.75,
      grainDirection: 'length' as const,
      pricingUnit: 'board_foot' as const,
      pricePerUnit: 8,
      color: '#c4a574'
    },
    {
      id: uuidv4(),
      name: '4/4 Hard Maple Board',
      length: 96,
      width: 6,
      thickness: 0.75,
      grainDirection: 'length' as const,
      pricingUnit: 'board_foot' as const,
      pricePerUnit: 6,
      color: '#f5deb3'
    },
    {
      id: uuidv4(),
      name: '8/4 Hard Maple',
      length: 96,
      width: 6,
      thickness: 1.75,
      grainDirection: 'length' as const,
      pricingUnit: 'board_foot' as const,
      pricePerUnit: 10,
      color: '#f5deb3'
    },
    {
      id: uuidv4(),
      name: '8/4 Walnut Board',
      length: 72,
      width: 8,
      thickness: 1.75,
      grainDirection: 'length' as const,
      pricingUnit: 'board_foot' as const,
      pricePerUnit: 14,
      color: '#6b4423'
    },
    {
      id: uuidv4(),
      name: '2x4 Construction Lumber',
      length: 96,
      width: 3.5,
      thickness: 1.5,
      grainDirection: 'length' as const,
      pricingUnit: 'per_item' as const,
      pricePerUnit: 6,
      color: '#deb887'
    }
  ];
}
