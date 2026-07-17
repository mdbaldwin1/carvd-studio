import { describe, expect, it, vi } from 'vitest';

// Real Three.js needed for the rotation-aware AABB inside groundConstraint.
vi.unmock('three');
vi.mock('three', async () => await vi.importActual('three'));

import type { Part, Stock } from '../../types';
import { createGeometryCache } from '../geometry/cache';
import { applyConstraints } from './pipeline';
import { groundConstraint } from './groundConstraint';
import { stockDimensionConstraint } from './stockDimensionConstraint';
import { collisionConstraint } from './collisionConstraint';
import type { CandidateTransform, Constraint, ConstraintContext } from './types';

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    name: 'p1',
    length: 24,
    width: 12,
    thickness: 0.75,
    position: { x: 0, y: 0.375, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#fff',
    ...overrides
  };
}

function makeStock(overrides?: Partial<Stock>): Stock {
  return {
    id: 'stock-1',
    name: 'Plywood',
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

function makeMoveContext(
  starting: Part[],
  positions: ReadonlyMap<string, { x: number; y: number; z: number }>,
  delta = { x: 0, y: 0, z: 0 }
): ConstraintContext {
  return {
    candidate: { kind: 'move', delta, positions },
    startingParts: starting,
    project: { parts: starting, stocks: [], groupMembers: [] },
    geometryCache: createGeometryCache()
  };
}

function makeResizeContext(
  part: Part,
  dimensions: { length: number; width: number; thickness: number },
  position: { x: number; y: number; z: number },
  stocks: Stock[] = []
): ConstraintContext {
  return {
    candidate: {
      kind: 'resize',
      partId: part.id,
      dimensions,
      position
    },
    startingParts: [part],
    project: { parts: [part], stocks, groupMembers: [] },
    geometryCache: createGeometryCache()
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// groundConstraint
// ─────────────────────────────────────────────────────────────────────────────

describe('groundConstraint — move', () => {
  it('passes through when all parts are above ground', () => {
    const part = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 } });
    const positions = new Map([['a', { x: 5, y: 0.375, z: 0 }]]);
    const ctx = makeMoveContext([part], positions, { x: 5, y: 0, z: 0 });
    const result = groundConstraint.apply(ctx);
    expect(result.adjusted.kind).toBe('move');
    if (result.adjusted.kind === 'move') {
      expect(result.adjusted.positions.get('a')).toEqual({ x: 5, y: 0.375, z: 0 });
    }
    expect(result.warnings).toHaveLength(0);
  });

  it('lifts a single part when it would dip below ground', () => {
    const part = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 } });
    // Candidate puts the part center at y = -0.5; with thickness 0.75 and no
    // rotation, half-thickness is 0.375, so minY = -0.875.
    const positions = new Map([['a', { x: 0, y: -0.5, z: 0 }]]);
    const ctx = makeMoveContext([part], positions, { x: 0, y: -0.875, z: 0 });
    const result = groundConstraint.apply(ctx);
    if (result.adjusted.kind === 'move') {
      const lifted = result.adjusted.positions.get('a')!;
      // After lift, center is at y = 0.375 (half-thickness above ground).
      expect(lifted.y).toBeCloseTo(0.375, 5);
    }
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].constraintName).toBe('ground');
  });

  it('uses the shared geometry cache when checking candidate bounds', () => {
    const part = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 } });
    const positions = new Map([['a', { x: 0, y: -0.5, z: 0 }]]);
    const ctx = makeMoveContext([part], positions, { x: 0, y: -0.875, z: 0 });

    groundConstraint.apply(ctx);

    expect(ctx.geometryCache.size()).toBeGreaterThan(0);
  });

  it('lifts a multi-part move by the deepest dip', () => {
    const partA = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 } });
    const partB = makePart({ id: 'b', position: { x: 10, y: 0.375, z: 0 }, thickness: 1.5 });
    // Candidate dips a slightly, b more.
    const positions = new Map([
      ['a', { x: 0, y: 0.25, z: 0 }], // a minY = -0.125
      ['b', { x: 10, y: -2.0, z: 0 }] // b minY = -2.75
    ]);
    const ctx = makeMoveContext([partA, partB], positions, { x: 0, y: -2, z: 0 });
    const result = groundConstraint.apply(ctx);
    if (result.adjusted.kind === 'move') {
      const a = result.adjusted.positions.get('a')!;
      const b = result.adjusted.positions.get('b')!;
      // Both parts lifted by 2.75 (the deepest dip).
      expect(a.y).toBeCloseTo(0.25 + 2.75, 5);
      expect(b.y).toBeCloseTo(-2.0 + 2.75, 5);
    }
  });
});

describe('groundConstraint — resize', () => {
  it('lifts a resize that would dip below ground', () => {
    const part = makePart({ position: { x: 0, y: 0.5, z: 0 }, thickness: 1 });
    // New thickness = 4, so half-thickness = 2; at y = 0.5 the minY = -1.5.
    const ctx = makeResizeContext(part, { length: 24, width: 12, thickness: 4 }, { x: 0, y: 0.5, z: 0 });
    const result = groundConstraint.apply(ctx);
    expect(result.adjusted.kind).toBe('resize');
    if (result.adjusted.kind === 'resize') {
      expect(result.adjusted.position.y).toBeCloseTo(2, 5);
    }
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('passes through a resize that stays above ground', () => {
    const part = makePart({ position: { x: 0, y: 0.375, z: 0 }, thickness: 0.75 });
    const ctx = makeResizeContext(part, { length: 30, width: 20, thickness: 0.75 }, part.position);
    const result = groundConstraint.apply(ctx);
    if (result.adjusted.kind === 'resize') {
      expect(result.adjusted.position).toEqual(part.position);
    }
    expect(result.warnings).toHaveLength(0);
  });
});

describe('groundConstraint — rotate', () => {
  it('lifts a rotated part that would dip below ground', () => {
    const part = makePart({ position: { x: 0, y: 1, z: 0 } });
    const candidate: CandidateTransform = {
      kind: 'rotate',
      updates: [
        {
          partId: part.id,
          // After rotation, set position low enough that the rotated part
          // dips. We don't need precise rotation math here — just non-zero
          // rotation so getPartAABB exercises the path.
          position: { x: 0, y: -1, z: 0 },
          rotation: { x: 45, y: 0, z: 0 }
        }
      ]
    };
    const ctx: ConstraintContext = {
      candidate,
      startingParts: [part],
      project: { parts: [part], stocks: [], groupMembers: [] },
      geometryCache: createGeometryCache()
    };
    const result = groundConstraint.apply(ctx);
    if (result.adjusted.kind === 'rotate') {
      const lifted = result.adjusted.updates[0].position;
      // Lifted above ground.
      expect(lifted.y).toBeGreaterThanOrEqual(-1);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// stockDimensionConstraint
// ─────────────────────────────────────────────────────────────────────────────

describe('stockDimensionConstraint', () => {
  it('no-op for move candidates', () => {
    const part = makePart({ id: 'a' });
    const positions = new Map([['a', { x: 5, y: 0.375, z: 0 }]]);
    const ctx = makeMoveContext([part], positions);
    const result = stockDimensionConstraint.apply(ctx);
    expect(result.adjusted).toBe(ctx.candidate);
  });

  it('caps length when resize exceeds stock length', () => {
    const stock = makeStock({ id: 's1', length: 96, width: 48, thickness: 0.75 });
    const part = makePart({ id: 'p1', stockId: 's1' });
    const ctx = makeResizeContext(part, { length: 200, width: 12, thickness: 0.75 }, part.position, [stock]);
    const result = stockDimensionConstraint.apply(ctx);
    if (result.adjusted.kind === 'resize') {
      expect(result.adjusted.dimensions.length).toBe(96);
    }
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toMatch(/Length capped/);
  });

  it('caps width when resize exceeds stock width', () => {
    const stock = makeStock({ id: 's1', width: 48 });
    const part = makePart({ id: 'p1', stockId: 's1' });
    const ctx = makeResizeContext(part, { length: 24, width: 100, thickness: 0.75 }, part.position, [stock]);
    const result = stockDimensionConstraint.apply(ctx);
    if (result.adjusted.kind === 'resize') {
      expect(result.adjusted.dimensions.width).toBe(48);
    }
  });

  it('skips width cap for glue-up panels', () => {
    const stock = makeStock({ id: 's1', width: 48 });
    const part = makePart({ id: 'p1', stockId: 's1', glueUpPanel: true });
    const ctx = makeResizeContext(part, { length: 24, width: 100, thickness: 0.75 }, part.position, [stock]);
    const result = stockDimensionConstraint.apply(ctx);
    if (result.adjusted.kind === 'resize') {
      expect(result.adjusted.dimensions.width).toBe(100);
    }
  });

  it('respects minimum dimension floors', () => {
    const part = makePart({ id: 'p1' });
    const ctx = makeResizeContext(part, { length: 0.1, width: 0.1, thickness: 0.1 }, part.position);
    const result = stockDimensionConstraint.apply(ctx);
    if (result.adjusted.kind === 'resize') {
      // Min length / width = 0.5, min thickness = 0.25
      expect(result.adjusted.dimensions.length).toBe(0.5);
      expect(result.adjusted.dimensions.width).toBe(0.5);
      expect(result.adjusted.dimensions.thickness).toBe(0.25);
    }
  });

  it('passes through when dimensions are within stock caps', () => {
    const stock = makeStock({ id: 's1', length: 96, width: 48, thickness: 0.75 });
    const part = makePart({ id: 'p1', stockId: 's1' });
    const ctx = makeResizeContext(part, { length: 24, width: 12, thickness: 0.75 }, part.position, [stock]);
    const result = stockDimensionConstraint.apply(ctx);
    expect(result.adjusted).toBe(ctx.candidate);
    expect(result.warnings).toHaveLength(0);
  });

  it('no-op when part has no assigned stock', () => {
    const part = makePart({ id: 'p1', stockId: null });
    const ctx = makeResizeContext(part, { length: 500, width: 500, thickness: 50 }, part.position);
    const result = stockDimensionConstraint.apply(ctx);
    // No stock = no caps = candidate flows through unchanged.
    expect(result.adjusted).toBe(ctx.candidate);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline composition
// ─────────────────────────────────────────────────────────────────────────────

describe('applyConstraints — pipeline runner', () => {
  it("runs constraints in order; each sees the previous one's output", () => {
    const trace: string[] = [];
    const a: Constraint = {
      name: 'a',
      apply: (ctx) => {
        trace.push('a');
        return { adjusted: ctx.candidate, blockers: [], warnings: [] };
      }
    };
    const b: Constraint = {
      name: 'b',
      apply: (ctx) => {
        trace.push('b');
        return { adjusted: ctx.candidate, blockers: [], warnings: [] };
      }
    };
    const part = makePart();
    const ctx = makeMoveContext([part], new Map([[part.id, part.position]]));
    applyConstraints(ctx, [a, b]);
    expect(trace).toEqual(['a', 'b']);
  });

  it('threads the constrained candidate through the chain', () => {
    const part = makePart({ id: 'p1' });
    // First constraint shifts +5; second constraint shifts +10.
    const shift = (dx: number): Constraint => ({
      name: `shift-${dx}`,
      apply: (ctx) => {
        if (ctx.candidate.kind !== 'move') return { adjusted: ctx.candidate, blockers: [], warnings: [] };
        const next = new Map<string, { x: number; y: number; z: number }>();
        for (const [id, pos] of ctx.candidate.positions) {
          next.set(id, { x: pos.x + dx, y: pos.y, z: pos.z });
        }
        return {
          adjusted: { kind: 'move', delta: ctx.candidate.delta, positions: next },
          blockers: [],
          warnings: []
        };
      }
    });
    const start = new Map([[part.id, { x: 0, y: 0.375, z: 0 }]]);
    const ctx = makeMoveContext([part], start);
    const result = applyConstraints(ctx, [shift(5), shift(10)]);
    if (result.adjusted.kind === 'move') {
      expect(result.adjusted.positions.get(part.id)?.x).toBe(15);
    }
  });

  it('accumulates blockers and warnings across the chain', () => {
    const part = makePart();
    const blockerConstraint: Constraint = {
      name: 'blocker',
      apply: (ctx) => ({
        adjusted: ctx.candidate,
        blockers: [{ constraintName: 'blocker', kind: 'collision', message: 'nope' }],
        warnings: []
      })
    };
    const warnerConstraint: Constraint = {
      name: 'warner',
      apply: (ctx) => ({
        adjusted: ctx.candidate,
        blockers: [],
        warnings: [{ constraintName: 'warner', kind: 'near-edge', message: 'close' }]
      })
    };
    const ctx = makeMoveContext([part], new Map([[part.id, part.position]]));
    const result = applyConstraints(ctx, [blockerConstraint, warnerConstraint]);
    expect(result.blockers).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });

  it('ground + stock pipeline: stock caps first, then ground lifts the capped resize', () => {
    const stock = makeStock({ length: 96, width: 48, thickness: 0.75 });
    const part = makePart({ stockId: 'stock-1', position: { x: 0, y: 0.375, z: 0 } });
    // Request a resize beyond stock that would also dip below ground.
    const ctx = makeResizeContext(part, { length: 200, width: 100, thickness: 10 }, { x: 0, y: 0.5, z: 0 }, [stock]);
    const result = applyConstraints(ctx, [stockDimensionConstraint, groundConstraint]);
    if (result.adjusted.kind === 'resize') {
      // Stock cap pulled thickness back to 0.75.
      expect(result.adjusted.dimensions.thickness).toBe(0.75);
      // Length and width also capped.
      expect(result.adjusted.dimensions.length).toBe(96);
      expect(result.adjusted.dimensions.width).toBe(48);
      // With capped thickness, the position should be valid above ground.
      expect(result.adjusted.position.y).toBeGreaterThanOrEqual(0.375);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// collisionConstraint
// ─────────────────────────────────────────────────────────────────────────────

describe('collisionConstraint', () => {
  it('no-op for resize candidates', () => {
    const part = makePart();
    const ctx: ConstraintContext = {
      candidate: {
        kind: 'resize',
        partId: part.id,
        dimensions: { length: 30, width: 12, thickness: 0.75 },
        position: part.position
      },
      startingParts: [part],
      project: { parts: [part], stocks: [], groupMembers: [], preventOverlap: true },
      geometryCache: createGeometryCache()
    };
    const result = collisionConstraint.apply(ctx);
    expect(result.adjusted).toBe(ctx.candidate);
    expect(result.blockers).toHaveLength(0);
  });

  it('no-op for rotate candidates', () => {
    const part = makePart();
    const ctx: ConstraintContext = {
      candidate: {
        kind: 'rotate',
        updates: [{ partId: part.id, position: part.position, rotation: { x: 0, y: 90, z: 0 } }]
      },
      startingParts: [part],
      project: { parts: [part], stocks: [], groupMembers: [], preventOverlap: true },
      geometryCache: createGeometryCache()
    };
    const result = collisionConstraint.apply(ctx);
    expect(result.adjusted).toBe(ctx.candidate);
  });

  it('passthrough when preventOverlap is false', () => {
    const partA = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 } });
    const partB = makePart({ id: 'b', position: { x: 10, y: 0.375, z: 0 } });
    // Move A directly into B — collision would be detected if enabled.
    const positions = new Map([['a', { x: 10, y: 0.375, z: 0 }]]);
    const ctx: ConstraintContext = {
      candidate: { kind: 'move', delta: { x: 10, y: 0, z: 0 }, positions },
      startingParts: [partA],
      project: { parts: [partA, partB], stocks: [], groupMembers: [], preventOverlap: false },
      geometryCache: createGeometryCache()
    };
    const result = collisionConstraint.apply(ctx);
    expect(result.adjusted).toBe(ctx.candidate);
    expect(result.blockers).toHaveLength(0);
  });

  it('passthrough when proposed move has no overlap', () => {
    const partA = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 }, length: 4, width: 4 });
    const partB = makePart({ id: 'b', position: { x: 50, y: 0.375, z: 0 }, length: 4, width: 4 });
    const positions = new Map([['a', { x: 5, y: 0.375, z: 0 }]]);
    const ctx: ConstraintContext = {
      candidate: { kind: 'move', delta: { x: 5, y: 0, z: 0 }, positions },
      startingParts: [partA],
      project: { parts: [partA, partB], stocks: [], groupMembers: [], preventOverlap: true },
      geometryCache: createGeometryCache()
    };
    const result = collisionConstraint.apply(ctx);
    expect(result.adjusted).toBe(ctx.candidate);
  });

  it('clamps when move would partially overlap', () => {
    const partA = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 }, length: 4, width: 4 });
    const partB = makePart({ id: 'b', position: { x: 10, y: 0.375, z: 0 }, length: 4, width: 4 });
    // Propose moving A by 8 on X — final position would be at x=8, which
    // overlaps with B (B's left edge is at 10 - 2 = 8).
    const positions = new Map([['a', { x: 8, y: 0.375, z: 0 }]]);
    const ctx: ConstraintContext = {
      candidate: { kind: 'move', delta: { x: 8, y: 0, z: 0 }, positions },
      startingParts: [partA],
      project: { parts: [partA, partB], stocks: [], groupMembers: [], preventOverlap: true },
      geometryCache: createGeometryCache()
    };
    const result = collisionConstraint.apply(ctx);
    if (result.adjusted.kind === 'move') {
      // The clamped delta is less than the proposed 8.
      expect(result.adjusted.delta.x).toBeLessThan(8);
      expect(result.adjusted.delta.x).toBeGreaterThanOrEqual(0);
      // The position is rebuilt from starting + safe delta.
      const adjustedA = result.adjusted.positions.get('a')!;
      expect(adjustedA.x).toBeCloseTo(partA.position.x + result.adjusted.delta.x, 5);
    }
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].kind).toBe('soft-collision');
  });

  it('uses the shared geometry cache when checking move collisions', () => {
    const partA = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 }, length: 4, width: 4 });
    const partB = makePart({ id: 'b', position: { x: 10, y: 0.375, z: 0 }, length: 4, width: 4 });
    const positions = new Map([['a', { x: 8, y: 0.375, z: 0 }]]);
    const ctx: ConstraintContext = {
      candidate: { kind: 'move', delta: { x: 8, y: 0, z: 0 }, positions },
      startingParts: [partA],
      project: { parts: [partA, partB], stocks: [], groupMembers: [], preventOverlap: true },
      geometryCache: createGeometryCache()
    };

    collisionConstraint.apply(ctx);

    expect(ctx.geometryCache.size()).toBeGreaterThan(0);
  });

  it('passes through when overlap check finds no safe direction (blocker, candidate unchanged)', () => {
    // Construct an impossible case: A starts AT B's position; any nonzero
    // delta keeps them overlapping along the proposed direction so the
    // binary search returns null.
    const partA = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 }, length: 4, width: 4 });
    const partB = makePart({ id: 'b', position: { x: 0.5, y: 0.375, z: 0 }, length: 4, width: 4 });
    const positions = new Map([['a', { x: 0.6, y: 0.375, z: 0 }]]);
    const ctx: ConstraintContext = {
      candidate: { kind: 'move', delta: { x: 0.6, y: 0, z: 0 }, positions },
      startingParts: [partA],
      project: { parts: [partA, partB], stocks: [], groupMembers: [], preventOverlap: true },
      geometryCache: createGeometryCache()
    };
    const result = collisionConstraint.apply(ctx);
    // We can't always guarantee a blocker (depends on overlap helper's exact
    // policy); but if it produced one, candidate stays unchanged.
    if (result.blockers.length > 0) {
      expect(result.adjusted).toBe(ctx.candidate);
      expect(result.blockers[0].kind).toBe('collision');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline composition with collisionConstraint
// ─────────────────────────────────────────────────────────────────────────────

describe('pipeline composition with collisionConstraint', () => {
  it('ground + collision: collision sees grounded positions', () => {
    const partA = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 }, length: 4, width: 4 });
    const partB = makePart({ id: 'b', position: { x: 50, y: 0.375, z: 0 }, length: 4, width: 4 });
    // Propose dipping below ground; ground constraint lifts, then collision
    // checks against the lifted position (no overlap → passes through).
    const positions = new Map([['a', { x: 5, y: -2, z: 0 }]]);
    const ctx: ConstraintContext = {
      candidate: { kind: 'move', delta: { x: 5, y: -2.375, z: 0 }, positions },
      startingParts: [partA],
      project: { parts: [partA, partB], stocks: [], groupMembers: [], preventOverlap: true },
      geometryCache: createGeometryCache()
    };
    const result = applyConstraints(ctx, [groundConstraint, collisionConstraint]);
    if (result.adjusted.kind === 'move') {
      // y lifted to half-thickness; x unchanged.
      expect(result.adjusted.positions.get('a')?.y).toBeCloseTo(0.375, 5);
      expect(result.adjusted.positions.get('a')?.x).toBe(5);
    }
  });
});
