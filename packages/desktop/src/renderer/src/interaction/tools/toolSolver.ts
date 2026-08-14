// ADR-004: Every transform tool implements one shared ToolSolver interface.
//
// Tools are pure math. They have no React, no Three.js viewport, no DOM. The
// pointer-event shell (the hook) reads pointer state, calls
// solver.begin/update/commit/cancel, and applies the resulting commit
// instructions to the project store.
//
// The transform hooks keep DOM/R3F lifecycle concerns at the edge. Transform
// preview and commit work is delegated through these tools and the shared
// interaction movement helpers so tool math stays reusable and testable.

import type { Rotation3D } from '../../types';

export type Vec3 = { x: number; y: number; z: number };

export interface PartDimensions {
  length: number;
  width: number;
  thickness: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CommitInstruction — the universal output of `ToolSolver.commit`.
//
// Each variant maps 1:1 onto an existing projectStore action so the host can
// apply the commit without inventing a new mutator. Tools that need to write
// multiple fields (e.g. resize writes both dimensions and position) emit a
// dimensions variant that includes both.
// ─────────────────────────────────────────────────────────────────────────────

export type CommitInstruction =
  | { kind: 'updatePartPosition'; partId: string; position: Vec3 }
  | { kind: 'updatePartRotation'; partId: string; rotation: Rotation3D }
  | {
      kind: 'updatePartDimensions';
      partId: string;
      dimensions: PartDimensions;
      position: Vec3;
    }
  | {
      kind: 'updateGroupPositions';
      updates: Array<{ partId: string; position: Vec3 }>;
    };

// ─────────────────────────────────────────────────────────────────────────────
// ToolSolver — the contract every tool implements.
//
// Type parameters:
//   Input    — what the host passes per call (e.g. pointer delta, modifiers)
//   State    — session-scoped state the tool keeps between calls
//              (e.g. latched snap arbitration, initial positions)
//   Preview  — what the host renders during drag (e.g. computed positions
//              + snap lines)
//
// Lifecycle:
//   begin   → returns initial State (and typically an initial Preview via a
//             zero-delta update call from the host)
//   update  → applies Input, returns updated Preview + State
//   commit  → converts the final State+Preview into CommitInstructions
//   cancel  → discards the session; tool returns nothing
//
// Invariant: `commit(state, preview)` produces the same transform that the
// most recent `update` produced. Preview and commit are not allowed to
// diverge.
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolSolver<Input, State, Preview> {
  begin(input: Input): State;
  update(input: Input, state: State): { preview: Preview; state: State };
  commit(state: State, preview: Preview): CommitInstruction[];
  cancel(state: State): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: applyCommitInstructions
//
// The session controller dispatches `dragcommit`; the host then calls
// `applyCommitInstructions(instructions, store)` to write them. Centralizing
// the projectStore call site means every tool's commit path produces a
// single, predictable history entry.
//
// Note: this helper takes a store interface so it can be tested without
// importing the real Zustand store directly.
// ─────────────────────────────────────────────────────────────────────────────

export interface CommitTarget {
  updatePart: (
    partId: string,
    updates: Partial<{
      position: Vec3;
      rotation: Rotation3D;
      length: number;
      width: number;
      thickness: number;
    }>
  ) => void;
  batchUpdateParts?: (updates: Array<{ id: string; changes: Partial<{ position: Vec3 }> }>) => void;
  moveSelectedParts?: (delta: Vec3) => void;
}

export function applyCommitInstructions(instructions: ReadonlyArray<CommitInstruction>, target: CommitTarget): void {
  for (const ins of instructions) {
    switch (ins.kind) {
      case 'updatePartPosition':
        target.updatePart(ins.partId, { position: ins.position });
        break;
      case 'updatePartRotation':
        target.updatePart(ins.partId, { rotation: ins.rotation });
        break;
      case 'updatePartDimensions':
        target.updatePart(ins.partId, {
          length: ins.dimensions.length,
          width: ins.dimensions.width,
          thickness: ins.dimensions.thickness,
          position: ins.position
        });
        break;
      case 'updateGroupPositions':
        if (target.batchUpdateParts) {
          target.batchUpdateParts(
            ins.updates.map((update) => ({ id: update.partId, changes: { position: update.position } }))
          );
        } else {
          for (const update of ins.updates) {
            target.updatePart(update.partId, { position: update.position });
          }
        }
        break;
    }
  }
}
