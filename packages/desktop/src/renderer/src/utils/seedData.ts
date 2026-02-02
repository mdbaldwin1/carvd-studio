/**
 * Seed data for testing - Computer Desk with Drawer Pedestal
 *
 * Design: 60"W x 30"D x 30"H computer desk with:
 * - Left-side drawer pedestal (3 drawers)
 * - Open right side with support panel
 * - Cable management area at back
 * - Optional keyboard tray
 */

import { v4 as uuidv4 } from 'uuid';
import { Part, Stock, Group, GroupMember, Project, Rotation3D } from '../types';

// Stock IDs (generated once for consistency)
const PLYWOOD_3_4_ID = uuidv4();
const PLYWOOD_1_2_ID = uuidv4();
const WALNUT_ID = uuidv4();

// Colors from constants
const LIGHT_OAK = '#c4a574';
const MAPLE = '#d4a574';
const DARK_WALNUT = '#8b5a2b';

// Default rotation (no rotation)
const NO_ROTATION: Rotation3D = { x: 0, y: 0, z: 0 };
// Rotated to stand vertically (panel on edge)
const VERTICAL_XZ: Rotation3D = { x: 90, y: 0, z: 0 };
const VERTICAL_YZ: Rotation3D = { x: 0, y: 0, z: 90 };

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
      id: PLYWOOD_1_2_ID,
      name: '1/2" Baltic Birch Plywood',
      length: 96,
      width: 48,
      thickness: 0.5,
      grainDirection: 'length',
      pricingUnit: 'per_item',
      pricePerUnit: 45,
      color: MAPLE
    },
    {
      id: WALNUT_ID,
      name: '4/4 Walnut Board',
      length: 96,
      width: 8,
      thickness: 0.75,
      grainDirection: 'length',
      pricingUnit: 'board_foot',
      pricePerUnit: 12,
      color: DARK_WALNUT
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
    glueUpPanel?: boolean;
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
    notes: options?.notes,
    glueUpPanel: options?.glueUpPanel
  };
}

/**
 * Generate all desk parts with proper positioning
 */
export function generateParts(): Part[] {
  const parts: Part[] = [];

  // ============================================
  // DESKTOP
  // ============================================
  // Desktop top at Y=30", so center Y = 30 - 0.375 = 29.625
  parts.push(
    createPart('Desktop', 60, 30, 0.75, { x: 0, y: 29.625, z: 0 }, PLYWOOD_3_4_ID, LIGHT_OAK, {
      notes: 'Main work surface - edge band front edge'
    })
  );

  // ============================================
  // LEFT PEDESTAL (Drawer Cabinet)
  // Pedestal: 16" wide x 26" deep x 28.5" tall
  // Positioned at left side of desk
  // Left edge at X = -30 (edge of 60" desk)
  // Pedestal center X = -30 + 8 = -22
  // ============================================

  // Pedestal Left Side (outer) - stands vertically
  // Panel is 26"L x 28.5"W x 0.75"T, rotated to stand up
  // After rotation: 26" deep (Z), 28.5" tall (Y), 0.75" thick (X)
  // Position: X = -29.625 (against left edge), Y = 14.25, Z = 0
  parts.push(
    createPart(
      'Pedestal Left Side',
      26,
      28.5,
      0.75,
      { x: -29.625, y: 14.25, z: 0 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { rotation: VERTICAL_YZ, notes: 'Outer pedestal panel' }
    )
  );

  // Pedestal Right Side (inner) - stands vertically
  // Position: X = -14.375 (16" from left side minus thickness)
  parts.push(
    createPart(
      'Pedestal Right Side',
      26,
      28.5,
      0.75,
      { x: -14.375, y: 14.25, z: 0 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { rotation: VERTICAL_YZ, notes: 'Inner pedestal panel - drill for shelf pins' }
    )
  );

  // Pedestal Bottom - horizontal
  // Width between sides: 16 - 1.5 = 14.5"
  // Position: X = -22, Y = 0.375, Z = 0
  parts.push(
    createPart(
      'Pedestal Bottom',
      14.5,
      26,
      0.75,
      { x: -22, y: 0.375, z: 0 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { notes: 'Pedestal floor panel' }
    )
  );

  // Pedestal Top Rail - horizontal, under desktop
  parts.push(
    createPart(
      'Pedestal Top Rail',
      14.5,
      4,
      0.75,
      { x: -22, y: 28.125, z: 11 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { notes: 'Front support rail' }
    )
  );

  // Pedestal Back - vertical panel
  parts.push(
    createPart(
      'Pedestal Back',
      14.5,
      27.75,
      0.75,
      { x: -22, y: 14.25, z: -12.625 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { rotation: VERTICAL_XZ, notes: 'Back panel - drill cable hole' }
    )
  );

  // ============================================
  // DRAWERS (3 drawers in pedestal)
  // Each drawer opening ~8.5" tall
  // Drawer box: 13.5"W x 24"D x 7"H (inside)
  // ============================================

  const drawerOpeningHeight = 8.5;
  const drawerBoxHeight = 7;
  const drawerBoxWidth = 13.5;
  const drawerBoxDepth = 24;

  for (let i = 0; i < 3; i++) {
    const drawerNum = i + 1;
    const drawerBottomY = 1.5 + i * drawerOpeningHeight; // Starting 1.5" from bottom
    const drawerCenterY = drawerBottomY + drawerBoxHeight / 2;
    const drawerCenterX = -22;
    const drawerCenterZ = 1; // Slightly forward of pedestal center

    // Drawer Front (box front, not face)
    parts.push(
      createPart(
        `Drawer ${drawerNum} Front`,
        drawerBoxWidth,
        drawerBoxHeight,
        0.75,
        { x: drawerCenterX, y: drawerCenterY, z: drawerCenterZ + drawerBoxDepth / 2 - 0.375 },
        PLYWOOD_3_4_ID,
        LIGHT_OAK,
        { rotation: VERTICAL_XZ }
      )
    );

    // Drawer Back
    parts.push(
      createPart(
        `Drawer ${drawerNum} Back`,
        drawerBoxWidth,
        drawerBoxHeight,
        0.75,
        { x: drawerCenterX, y: drawerCenterY, z: drawerCenterZ - drawerBoxDepth / 2 + 0.375 },
        PLYWOOD_3_4_ID,
        LIGHT_OAK,
        { rotation: VERTICAL_XZ }
      )
    );

    // Drawer Left Side
    parts.push(
      createPart(
        `Drawer ${drawerNum} Left Side`,
        drawerBoxDepth - 1.5,
        drawerBoxHeight,
        0.75,
        { x: drawerCenterX - drawerBoxWidth / 2 + 0.375, y: drawerCenterY, z: drawerCenterZ },
        PLYWOOD_3_4_ID,
        LIGHT_OAK,
        { rotation: { x: 90, y: 90, z: 0 } }
      )
    );

    // Drawer Right Side
    parts.push(
      createPart(
        `Drawer ${drawerNum} Right Side`,
        drawerBoxDepth - 1.5,
        drawerBoxHeight,
        0.75,
        { x: drawerCenterX + drawerBoxWidth / 2 - 0.375, y: drawerCenterY, z: drawerCenterZ },
        PLYWOOD_3_4_ID,
        LIGHT_OAK,
        { rotation: { x: 90, y: 90, z: 0 } }
      )
    );

    // Drawer Bottom (1/2" plywood)
    parts.push(
      createPart(
        `Drawer ${drawerNum} Bottom`,
        drawerBoxWidth - 1,
        drawerBoxDepth - 1,
        0.5,
        { x: drawerCenterX, y: drawerBottomY + 0.5, z: drawerCenterZ },
        PLYWOOD_1_2_ID,
        MAPLE,
        { grainSensitive: false }
      )
    );

    // Drawer Face (walnut - visible front, glue-up panel since walnut boards are 8" wide)
    parts.push(
      createPart(
        `Drawer ${drawerNum} Face`,
        15,
        drawerOpeningHeight - 0.25,
        0.75,
        { x: drawerCenterX, y: drawerCenterY + 0.25, z: 13.375 },
        WALNUT_ID,
        DARK_WALNUT,
        { rotation: VERTICAL_XZ, notes: 'Glue-up from 2 boards, sand to 220 grit', glueUpPanel: true }
      )
    );
  }

  // ============================================
  // RIGHT SIDE SUPPORT
  // ============================================

  // Right Support Panel - stands vertically
  parts.push(
    createPart(
      'Right Support Panel',
      26,
      28.5,
      0.75,
      { x: 29.625, y: 14.25, z: 0 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { rotation: VERTICAL_YZ, notes: 'Right side support' }
    )
  );

  // ============================================
  // BACK STRETCHER / CABLE MANAGEMENT
  // ============================================

  // Back Stretcher (connects pedestal to right panel)
  parts.push(
    createPart(
      'Back Stretcher',
      42.5,
      6,
      0.75,
      { x: 7.25, y: 26, z: -12.625 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { rotation: VERTICAL_XZ, notes: 'Drill 2" hole for cables' }
    )
  );

  // Front Stretcher (under desktop, for rigidity)
  parts.push(
    createPart('Front Stretcher', 42.5, 4, 0.75, { x: 7.25, y: 28.125, z: 11 }, PLYWOOD_3_4_ID, LIGHT_OAK)
  );

  // ============================================
  // KEYBOARD TRAY
  // ============================================

  parts.push(
    createPart(
      'Keyboard Tray',
      26,
      12,
      0.75,
      { x: 7.25, y: 25.5, z: 6 },
      PLYWOOD_3_4_ID,
      LIGHT_OAK,
      { notes: 'Mount on slides for pull-out' }
    )
  );

  // ============================================
  // DECORATIVE TRIM (Walnut)
  // ============================================

  // Desktop Front Edge Trim
  parts.push(
    createPart(
      'Desktop Front Edge',
      60,
      1.5,
      0.75,
      { x: 0, y: 29.625, z: 15.375 },
      WALNUT_ID,
      DARK_WALNUT,
      { rotation: VERTICAL_XZ, notes: 'Glue and brad nail to desktop front' }
    )
  );

  // Desktop Side Edge Trim (left)
  parts.push(
    createPart(
      'Desktop Left Edge',
      30,
      1.5,
      0.75,
      { x: -30.375, y: 29.625, z: 0 },
      WALNUT_ID,
      DARK_WALNUT,
      { rotation: { x: 90, y: 90, z: 0 }, notes: 'Glue and brad nail to desktop side' }
    )
  );

  // Desktop Side Edge Trim (right)
  parts.push(
    createPart(
      'Desktop Right Edge',
      30,
      1.5,
      0.75,
      { x: 30.375, y: 29.625, z: 0 },
      WALNUT_ID,
      DARK_WALNUT,
      { rotation: { x: 90, y: 90, z: 0 }, notes: 'Glue and brad nail to desktop side' }
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
  const desktopGroupId = uuidv4();
  const pedestalGroupId = uuidv4();
  const drawer1GroupId = uuidv4();
  const drawer2GroupId = uuidv4();
  const drawer3GroupId = uuidv4();
  const supportGroupId = uuidv4();
  const trimGroupId = uuidv4();

  groups.push(
    { id: desktopGroupId, name: 'Desktop Assembly' },
    { id: pedestalGroupId, name: 'Left Pedestal' },
    { id: drawer1GroupId, name: 'Drawer 1' },
    { id: drawer2GroupId, name: 'Drawer 2' },
    { id: drawer3GroupId, name: 'Drawer 3' },
    { id: supportGroupId, name: 'Right Support & Stretchers' },
    { id: trimGroupId, name: 'Edge Trim' }
  );

  // Helper to add part to group by name pattern
  const addPartsToGroup = (groupId: string, namePattern: RegExp | string) => {
    parts.forEach((part) => {
      const matches =
        typeof namePattern === 'string' ? part.name === namePattern : namePattern.test(part.name);
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

  // Desktop Assembly
  addPartsToGroup(desktopGroupId, 'Desktop');
  addPartsToGroup(desktopGroupId, 'Keyboard Tray');

  // Pedestal Structure (not drawers)
  addPartsToGroup(pedestalGroupId, /^Pedestal/);

  // Individual Drawers
  addPartsToGroup(drawer1GroupId, /^Drawer 1/);
  addPartsToGroup(drawer2GroupId, /^Drawer 2/);
  addPartsToGroup(drawer3GroupId, /^Drawer 3/);

  // Nest drawer groups inside pedestal
  groupMembers.push(
    { id: uuidv4(), groupId: pedestalGroupId, memberType: 'group', memberId: drawer1GroupId },
    { id: uuidv4(), groupId: pedestalGroupId, memberType: 'group', memberId: drawer2GroupId },
    { id: uuidv4(), groupId: pedestalGroupId, memberType: 'group', memberId: drawer3GroupId }
  );

  // Right Support & Stretchers
  addPartsToGroup(supportGroupId, 'Right Support Panel');
  addPartsToGroup(supportGroupId, /Stretcher/);

  // Edge Trim
  addPartsToGroup(trimGroupId, /Edge$/);

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
    name: 'Computer Desk with Drawers',
    stocks,
    parts,
    groups,
    groupMembers,
    assemblies: [],
    units: 'imperial',
    gridSize: 0.0625, // 1/16"
    kerfWidth: 0.125, // 1/8" kerf
    overageFactor: 0.1, // 10% overage
    projectNotes: `Computer Desk Design

Dimensions: 60"W x 30"D x 30"H

Features:
- 3-drawer pedestal on left side
- Open leg room on right
- Keyboard tray (mount on slides)
- Cable management hole in back stretcher
- Walnut edge banding for premium look

Materials:
- 3/4" Baltic Birch Plywood for structure
- 1/2" Baltic Birch for drawer bottoms
- 4/4 Walnut for drawer faces and trim

Assembly Notes:
1. Build pedestal box first
2. Assemble drawer boxes, test fit slides
3. Attach drawer faces with adjustable screws
4. Connect pedestal to right panel with stretchers
5. Attach desktop from below
6. Apply edge trim with glue and brad nails
7. Sand and finish`,
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
      color: MAPLE
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
      color: DARK_WALNUT
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
