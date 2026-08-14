/**
 * Shared, deterministic test fixtures for interaction-architecture work.
 *
 * Every fixture is a `Project` builder that returns the same shape every time
 * (no `uuidv4()`, no `Date.now()` — IDs and timestamps are fixed strings).
 * Engine tests, session integration tests, and the perf-baseline procedure
 * (`.claude/docs/perf-baseline.md`) all share these scenes so results are
 * comparable across runs and across machines.
 *
 * Scene IDs match the table in `.claude/docs/perf-baseline.md`:
 *   S0  empty
 *   S1  5-part assembly
 *   S2  50-part with groups
 *   S3  500-part stress
 *   S4  nested groups (3 levels)
 *   S5  custom rotation / angled parts
 */

import type { Group, GroupMember, Part, Project, Stock, StockConstraintSettings } from '../../src/renderer/src/types';

const DEFAULT_STOCK_CONSTRAINTS: StockConstraintSettings = {
  constrainDimensions: true,
  constrainGrain: true,
  constrainColor: true,
  preventOverlap: true
};

const FIXTURE_ISO_DATE = '2026-01-01T00:00:00.000Z';

function makeStock(id: string, overrides?: Partial<Stock>): Stock {
  return {
    id,
    name: '3/4" Plywood',
    length: 96,
    width: 48,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 45,
    color: '#d4a574',
    ...overrides
  };
}

function makePart(id: string, overrides?: Partial<Part>): Part {
  return {
    id,
    name: id,
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

function makeGroup(id: string, name: string): Group {
  return { id, name };
}

function makeGroupMember(
  id: string,
  groupId: string,
  memberId: string,
  memberType: 'part' | 'group' = 'part'
): GroupMember {
  return { id, groupId, memberId, memberType };
}

function emptyProject(name: string): Project {
  return {
    version: '1.0',
    name,
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
    stockConstraints: { ...DEFAULT_STOCK_CONSTRAINTS },
    snapGuides: [],
    customShoppingItems: [],
    createdAt: FIXTURE_ISO_DATE,
    modifiedAt: FIXTURE_ISO_DATE
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// S0 — Empty project
// ─────────────────────────────────────────────────────────────────────────────

export function emptyScene(): Project {
  return emptyProject('S0: Empty');
}

// ─────────────────────────────────────────────────────────────────────────────
// S1 — 5 parts arranged like a simple box (top, bottom, two sides, back)
// ─────────────────────────────────────────────────────────────────────────────

export function fivePartAssembly(): Project {
  const stock = makeStock('stock-S1');
  const halfThickness = 0.75 / 2;

  const parts: Part[] = [
    makePart('S1-bottom', {
      name: 'Bottom',
      length: 24,
      width: 12,
      thickness: 0.75,
      position: { x: 0, y: halfThickness, z: 0 },
      stockId: stock.id
    }),
    makePart('S1-top', {
      name: 'Top',
      length: 24,
      width: 12,
      thickness: 0.75,
      position: { x: 0, y: 11.25, z: 0 },
      stockId: stock.id
    }),
    makePart('S1-left', {
      name: 'Left Side',
      length: 11.25,
      width: 12,
      thickness: 0.75,
      position: { x: -11.625, y: 6, z: 0 },
      rotation: { x: 0, y: 0, z: 90 },
      stockId: stock.id
    }),
    makePart('S1-right', {
      name: 'Right Side',
      length: 11.25,
      width: 12,
      thickness: 0.75,
      position: { x: 11.625, y: 6, z: 0 },
      rotation: { x: 0, y: 0, z: 90 },
      stockId: stock.id
    }),
    makePart('S1-back', {
      name: 'Back',
      length: 24,
      width: 11.25,
      thickness: 0.75,
      position: { x: 0, y: 6, z: -5.625 },
      rotation: { x: 90, y: 0, z: 0 },
      stockId: stock.id
    })
  ];

  return {
    ...emptyProject('S1: 5-part assembly'),
    stocks: [stock],
    parts
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// S2 — 50 parts in a 10×5 shelving array, grouped by row
// ─────────────────────────────────────────────────────────────────────────────

export function fiftyPartAssembly(): Project {
  const stock = makeStock('stock-S2');
  const parts: Part[] = [];
  const groups: Group[] = [];
  const groupMembers: GroupMember[] = [];

  const rows = 5;
  const cols = 10;

  for (let r = 0; r < rows; r++) {
    const rowGroup = makeGroup(`S2-row-${r}`, `Row ${r + 1}`);
    groups.push(rowGroup);
    for (let c = 0; c < cols; c++) {
      const partId = `S2-r${r}c${c}`;
      parts.push(
        makePart(partId, {
          name: `Shelf ${r + 1}-${c + 1}`,
          length: 12,
          width: 8,
          thickness: 0.75,
          position: { x: c * 14, y: 0.375 + r * 8, z: 0 },
          stockId: stock.id
        })
      );
      groupMembers.push(makeGroupMember(`S2-gm-${r}-${c}`, rowGroup.id, partId, 'part'));
    }
  }

  return {
    ...emptyProject('S2: 50-part with groups'),
    stocks: [stock],
    parts,
    groups,
    groupMembers
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// S3 — 500-part stress scene: 10 rows × 50 columns
// ─────────────────────────────────────────────────────────────────────────────

export function fiveHundredPartStress(): Project {
  const stock = makeStock('stock-S3');
  const parts: Part[] = [];
  const groups: Group[] = [];
  const groupMembers: GroupMember[] = [];

  const rows = 10;
  const cols = 50;

  for (let r = 0; r < rows; r++) {
    const rowGroup = makeGroup(`S3-row-${r}`, `Stress Row ${r + 1}`);
    groups.push(rowGroup);
    for (let c = 0; c < cols; c++) {
      const partId = `S3-r${r}c${c}`;
      parts.push(
        makePart(partId, {
          name: `Shelf ${r + 1}-${c + 1}`,
          length: 8,
          width: 6,
          thickness: 0.75,
          position: { x: c * 9, y: 0.375 + r * 7, z: 0 },
          stockId: stock.id
        })
      );
      // Every third part joins its row group to give 30 groups but not full coverage
      if (c % 3 === 0) {
        groupMembers.push(makeGroupMember(`S3-gm-${r}-${c}`, rowGroup.id, partId, 'part'));
      }
    }
  }

  return {
    ...emptyProject('S3: 500-part stress'),
    stocks: [stock],
    parts,
    groups,
    groupMembers
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// S4 — Nested groups, 3 levels deep. Mirrors the structure exercised by
// `interactionSelection` for "group inside group inside group" coverage.
// ─────────────────────────────────────────────────────────────────────────────

export function nestedGroupsScene(): Project {
  const stock = makeStock('stock-S4');

  const outer = makeGroup('S4-outer', 'Outer');
  const middle = makeGroup('S4-middle', 'Middle');
  const inner = makeGroup('S4-inner', 'Inner');
  const sibling = makeGroup('S4-sibling', 'Sibling at depth 2');

  const parts: Part[] = [];
  // 5 parts at the inner-most level
  for (let i = 0; i < 5; i++) {
    parts.push(
      makePart(`S4-inner-p${i}`, {
        name: `Inner ${i + 1}`,
        length: 6,
        width: 4,
        thickness: 0.75,
        position: { x: i * 7, y: 0.375, z: 0 },
        stockId: stock.id
      })
    );
  }
  // 5 parts at the sibling group at depth 2
  for (let i = 0; i < 5; i++) {
    parts.push(
      makePart(`S4-sibling-p${i}`, {
        name: `Sibling ${i + 1}`,
        length: 6,
        width: 4,
        thickness: 0.75,
        position: { x: i * 7, y: 0.375, z: 10 },
        stockId: stock.id
      })
    );
  }
  // 10 parts at the middle level (siblings of `inner` + `sibling` groups)
  for (let i = 0; i < 10; i++) {
    parts.push(
      makePart(`S4-middle-p${i}`, {
        name: `Middle ${i + 1}`,
        length: 6,
        width: 4,
        thickness: 0.75,
        position: { x: i * 7, y: 0.375, z: 20 },
        stockId: stock.id
      })
    );
  }
  // 10 parts at the outer level
  for (let i = 0; i < 10; i++) {
    parts.push(
      makePart(`S4-outer-p${i}`, {
        name: `Outer ${i + 1}`,
        length: 6,
        width: 4,
        thickness: 0.75,
        position: { x: i * 7, y: 0.375, z: 30 },
        stockId: stock.id
      })
    );
  }

  const groupMembers: GroupMember[] = [
    // outer contains middle + the 10 outer parts
    makeGroupMember('S4-gm-outer-middle', outer.id, middle.id, 'group'),
    ...Array.from({ length: 10 }, (_, i) => makeGroupMember(`S4-gm-outer-p${i}`, outer.id, `S4-outer-p${i}`, 'part')),
    // middle contains inner + sibling + the 10 middle parts
    makeGroupMember('S4-gm-middle-inner', middle.id, inner.id, 'group'),
    makeGroupMember('S4-gm-middle-sibling', middle.id, sibling.id, 'group'),
    ...Array.from({ length: 10 }, (_, i) =>
      makeGroupMember(`S4-gm-middle-p${i}`, middle.id, `S4-middle-p${i}`, 'part')
    ),
    // inner contains 5 parts
    ...Array.from({ length: 5 }, (_, i) => makeGroupMember(`S4-gm-inner-p${i}`, inner.id, `S4-inner-p${i}`, 'part')),
    // sibling contains 5 parts
    ...Array.from({ length: 5 }, (_, i) =>
      makeGroupMember(`S4-gm-sibling-p${i}`, sibling.id, `S4-sibling-p${i}`, 'part')
    )
  ];

  return {
    ...emptyProject('S4: Nested groups (3 levels)'),
    stocks: [stock],
    parts,
    groups: [outer, middle, inner, sibling],
    groupMembers
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// S5 — Custom rotation: 20 parts at varied rotations to exercise rotated bounds
// ─────────────────────────────────────────────────────────────────────────────

export function customRotationScene(): Project {
  const stock = makeStock('stock-S5');
  const parts: Part[] = [];

  for (let i = 0; i < 20; i++) {
    const yaw = (i * 17) % 360;
    const pitch = (i * 11) % 90;
    parts.push(
      makePart(`S5-p${i}`, {
        name: `Angled ${i + 1}`,
        length: 18,
        width: 4,
        thickness: 0.75,
        position: { x: (i % 5) * 25, y: 0.375 + Math.floor(i / 5) * 8, z: 0 },
        rotation: { x: pitch, y: yaw, z: 0 },
        stockId: stock.id
      })
    );
  }

  return {
    ...emptyProject('S5: Custom rotation'),
    stocks: [stock],
    parts
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helper
// ─────────────────────────────────────────────────────────────────────────────

export type FixtureId = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

const FIXTURES: Record<FixtureId, () => Project> = {
  S0: emptyScene,
  S1: fivePartAssembly,
  S2: fiftyPartAssembly,
  S3: fiveHundredPartStress,
  S4: nestedGroupsScene,
  S5: customRotationScene
};

export function fixtureProject(id: FixtureId): Project {
  return FIXTURES[id]();
}

export const ALL_FIXTURE_IDS: FixtureId[] = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
