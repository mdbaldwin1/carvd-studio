// ADR-004: groupMoveTool — ToolSolver implementation for group drag with snap.
//
// Wraps the existing `solveGroupMoveSnapPreview` solver. The group case differs
// from the single-part case: the solver operates on a working delta applied to
// the group's anchor + outer bounds (not on a single part's position), and the
// commit produces a single `updateGroupPositions` instruction listing every
// member's new absolute position.

import type { AppSettings, Part, SnapGuide, SnapLine } from '../../types';
import { solveGroupMoveSnapPreview } from '../../utils/interactionMovePreview';
import type { PartBounds } from '../../utils/snapToPartsUtil';
import type { CandidateTransform } from '../constraints/types';
import type { CommitInstruction, ToolSolver, Vec3 } from './toolSolver';

export interface GroupMoveToolInput {
  /** Aggregated bounding box of all moving parts at gesture start. */
  initialBounds: PartBounds;
  /** Anchor position used for the working-delta projection. */
  anchorPosition: Vec3;
  /** Current candidate delta (pointer projection + grid snap already applied). */
  delta: Vec3;
  /** Which axes the current drag plane allows movement on. */
  axes: { x: boolean; y: boolean; z: boolean };
  /** Every part participating in the group drag. */
  movingParts: ReadonlyArray<Part>;
  /** Parts visible to the snap engine (i.e. not the moving ones). */
  referenceParts: ReadonlyArray<Part>;
  /** Persistent snap guides. */
  snapGuides: ReadonlyArray<SnapGuide>;
  /** Current app settings. */
  settings: AppSettings;
  /** Camera-distance-derived snap threshold. */
  snapThreshold: number;
}

export interface GroupMoveToolState {
  /** Initial position of every moving part keyed by id. */
  initialPositions: Map<string, Vec3>;
}

export interface GroupMoveToolPreview {
  /** Snap-adjusted delta applied to every moving part. */
  delta: Vec3;
  /** Final positions for every moving part. */
  positions: Map<string, Vec3>;
  /** Snap lines to render in the overlay layer. */
  snapLines: SnapLine[];
  /** Which axes ended up snapped. */
  snappedAxes: { x: boolean; y: boolean; z: boolean };
  /** Constraint-pipeline input that exactly matches this preview. */
  candidate: Extract<CandidateTransform, { kind: 'move' }>;
}

export const groupMoveTool: ToolSolver<GroupMoveToolInput, GroupMoveToolState, GroupMoveToolPreview> = {
  begin(input) {
    const initialPositions = new Map<string, Vec3>();
    for (const part of input.movingParts) {
      initialPositions.set(part.id, {
        x: part.position.x,
        y: part.position.y,
        z: part.position.z
      });
    }
    return { initialPositions };
  },

  update(input, state) {
    const result = solveGroupMoveSnapPreview({
      initialBounds: input.initialBounds,
      anchorPosition: input.anchorPosition,
      delta: input.delta,
      axes: input.axes,
      referenceParts: [...input.referenceParts],
      movingPartIds: input.movingParts.map((p) => p.id),
      movingParts: [...input.movingParts],
      snapGuides: [...input.snapGuides],
      settings: input.settings,
      snapThreshold: input.snapThreshold
    });

    const positions = new Map<string, Vec3>();
    for (const [partId, initial] of state.initialPositions) {
      positions.set(partId, {
        x: initial.x + result.delta.x,
        y: initial.y + result.delta.y,
        z: initial.z + result.delta.z
      });
    }

    return {
      preview: {
        delta: result.delta,
        positions,
        snapLines: result.snapLines,
        snappedAxes: result.snappedAxes,
        candidate: { kind: 'move', delta: result.delta, positions }
      },
      state
    };
  },

  commit(_state, preview): CommitInstruction[] {
    const updates: Array<{ partId: string; position: Vec3 }> = [];
    for (const [partId, position] of preview.positions) {
      updates.push({ partId, position });
    }
    return [{ kind: 'updateGroupPositions', updates }];
  },

  cancel(_state) {
    // No mutations to undo. Host clears its own preview overlay.
  }
};
