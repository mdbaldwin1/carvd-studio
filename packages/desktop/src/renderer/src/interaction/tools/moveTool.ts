// ADR-004: moveTool — ToolSolver implementation for single-part move with snap.
//
// Wraps the existing `solvePartMoveSnapPreview` solver. Lifecycle:
//   begin   captures initial position + selection snapshot
//   update  applies the move delta + snap, returns positions for every
//           moving part and the snap lines to draw
//   commit  produces a single updatePartPosition per moving part
//   cancel  no-op
//
// This wrapper makes no behavior change vs. the existing usePartDrag inline
// path. Phase §4b will refactor usePartDrag to delegate to this tool.

import type { AppSettings, Part, SnapGuide, SnapLine } from '../../types';
import { solvePartMoveSnapPreview, type PartMovePreviewResult } from '../../utils/interactionMovePreview';
import type { LatchedFaceSnapState } from '../../utils/interactionSnap';
import type { SnapResult } from '../../utils/snapToPartsUtil';
import type { CandidateTransform } from '../constraints/types';
import type { CommitInstruction, ToolSolver, Vec3 } from './toolSolver';

export interface MoveToolInput {
  /** The part being directly dragged (primary). */
  part: Part;
  /** Candidate position for this part (after pointer projection + grid snap). */
  position: Vec3;
  /** Which axes the current drag plane allows movement on. */
  axes: { x: boolean; y: boolean; z: boolean };
  /** World half-height for the part (used to clamp y above ground). */
  worldHalfHeight: number;
  /** Other selected parts that move along with `part`. */
  alsoMoving: ReadonlyArray<Part>;
  /** Parts visible to the snap engine (i.e. not the moving ones). */
  referenceParts: ReadonlyArray<Part>;
  /** Persistent snap guides. */
  snapGuides: ReadonlyArray<SnapGuide>;
  /** Current app settings (which snap families are enabled, etc.). */
  settings: AppSettings;
  /** Camera-distance-derived snap threshold. */
  snapThreshold: number;
  /** Resolver for face-vs-feature stage arbitration. */
  resolveFeatureStage: (featureSnapResult: SnapResult, currentPosition: Vec3) => 'face' | 'feature';
}

export interface MoveToolState {
  /** Initial position of the directly-dragged part at gesture start. */
  initialPrimaryPosition: Vec3;
  /** Initial positions of every other moving part (for delta math). */
  initialOtherPositions: Map<string, Vec3>;
  /** Latched face-snap arbitration state — survives across updates. */
  latchedFaceSnap: LatchedFaceSnapState | null;
}

export interface MoveToolPreview {
  /** Final position for the primary part after snap. */
  primaryPosition: Vec3;
  /** Delta applied to every moving part (primary + alsoMoving). */
  delta: Vec3;
  /** Final positions for every moving part. */
  positions: Map<string, Vec3>;
  /** Snap lines to render in the overlay layer. */
  snapLines: SnapLine[];
  /** Which axes ended up snapped. */
  snappedAxes: { x: boolean; y: boolean; z: boolean };
  /** Latched face-snap state after this update. */
  nextLatchedFaceSnap: LatchedFaceSnapState | null;
  /** Constraint-pipeline input that exactly matches this preview. */
  candidate: Extract<CandidateTransform, { kind: 'move' }>;
}

export function createMoveCommitState({ primaryPosition }: { primaryPosition: Vec3 }): MoveToolState {
  return {
    initialPrimaryPosition: primaryPosition,
    initialOtherPositions: new Map(),
    latchedFaceSnap: null
  };
}

function buildPreviewFromSolve(
  input: MoveToolInput,
  state: MoveToolState,
  solverResult: PartMovePreviewResult,
  nextLatchedFaceSnap: LatchedFaceSnapState | null
): MoveToolPreview {
  const delta = {
    x: solverResult.position.x - state.initialPrimaryPosition.x,
    y: solverResult.position.y - state.initialPrimaryPosition.y,
    z: solverResult.position.z - state.initialPrimaryPosition.z
  };
  const positions = new Map<string, Vec3>();
  positions.set(input.part.id, solverResult.position);
  for (const other of input.alsoMoving) {
    const initial = state.initialOtherPositions.get(other.id);
    if (!initial) continue;
    positions.set(other.id, {
      x: initial.x + delta.x,
      y: initial.y + delta.y,
      z: initial.z + delta.z
    });
  }
  return {
    primaryPosition: solverResult.position,
    delta,
    positions,
    snapLines: solverResult.snapLines,
    snappedAxes: solverResult.snappedAxes,
    nextLatchedFaceSnap,
    candidate: { kind: 'move', delta, positions }
  };
}

export function createMoveCommitPreview({
  partId,
  position,
  state
}: {
  partId: string;
  position: Vec3;
  state: MoveToolState;
}): MoveToolPreview {
  const delta = {
    x: position.x - state.initialPrimaryPosition.x,
    y: position.y - state.initialPrimaryPosition.y,
    z: position.z - state.initialPrimaryPosition.z
  };
  const positions = new Map<string, Vec3>([[partId, position]]);
  return {
    primaryPosition: position,
    delta,
    positions,
    snapLines: [],
    snappedAxes: { x: false, y: false, z: false },
    nextLatchedFaceSnap: state.latchedFaceSnap,
    candidate: { kind: 'move', delta, positions }
  };
}

export const moveTool: ToolSolver<MoveToolInput, MoveToolState, MoveToolPreview> = {
  begin(input) {
    const initialOtherPositions = new Map<string, Vec3>();
    for (const other of input.alsoMoving) {
      initialOtherPositions.set(other.id, {
        x: other.position.x,
        y: other.position.y,
        z: other.position.z
      });
    }
    return {
      initialPrimaryPosition: {
        x: input.part.position.x,
        y: input.part.position.y,
        z: input.part.position.z
      },
      initialOtherPositions,
      latchedFaceSnap: null
    };
  },

  update(input, state) {
    const referenceParts = input.referenceParts.length > 0 ? [...input.referenceParts] : [];
    const solverResult = solvePartMoveSnapPreview({
      part: input.part,
      position: input.position,
      axes: input.axes,
      worldHalfHeight: input.worldHalfHeight,
      referenceParts,
      movingPartIds: [input.part.id, ...input.alsoMoving.map((p) => p.id)],
      snapGuides: [...input.snapGuides],
      settings: input.settings,
      snapThreshold: input.snapThreshold,
      latchedFaceSnap: state.latchedFaceSnap,
      resolveFeatureStage: input.resolveFeatureStage
    });

    const nextState: MoveToolState = {
      ...state,
      latchedFaceSnap: solverResult.nextLatchedFaceSnap
    };
    const preview = buildPreviewFromSolve(input, nextState, solverResult, nextState.latchedFaceSnap);
    return { preview, state: nextState };
  },

  commit(_state, preview): CommitInstruction[] {
    const instructions: CommitInstruction[] = [];
    for (const [partId, position] of preview.positions) {
      instructions.push({ kind: 'updatePartPosition', partId, position });
    }
    return instructions;
  },

  cancel(_state) {
    // No mutations to undo. Host clears its own preview overlay.
  }
};
