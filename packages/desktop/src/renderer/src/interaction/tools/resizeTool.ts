// ADR-004: resizeTool — ToolSolver implementation for single-part resize.
//
// Wraps the existing `solveResizePreview` solver. Resize differs from move:
// the solver consumes a handle position + local delta and returns both new
// dimensions and a new position (because resizing an edge shifts the part's
// center along the resize axis).

import type * as THREE from 'three';
import type { AppSettings, GroupMember, Part, SnapLine, Stock } from '../../types';
import { solveResizePreview, type ResizePreviewResult } from '../../utils/interactionResizePreview';
import type { HandlePosition } from '../../components/workspace/partTypes';
import type { CandidateTransform } from '../constraints/types';
import type { CommitInstruction, ToolSolver, Vec3, PartDimensions } from './toolSolver';

export interface ResizeToolInput {
  /** The part being resized. */
  part: Part;
  /** Which handle is being dragged (corner/edge + axis sign). */
  handlePos: HandlePosition;
  /** Pointer delta in part-local coordinates (after rotation inverse). */
  localDelta: Vec3;
  /** Anchor position of the part at gesture start. */
  partPosition: Vec3;
  /** Dimensions of the part at gesture start. */
  startingDimensions: PartDimensions;
  /** Assigned stock (for max-dimension constraints), if any. */
  assignedStock?: Stock;
  /** Whether dimension constraints from stock are enabled. */
  constrainDimensions: boolean;
  /** Part's rotation as a quaternion (for world-space reference math). */
  rotationQuaternion: THREE.Quaternion;
  /** Reference parts visible to the snap engine. */
  referenceParts: ReadonlyArray<Part>;
  /** Reference part IDs (paired with referenceParts). */
  referencePartIds: ReadonlyArray<string>;
  /** Group membership for the project (selection resolution). */
  groupMembers: ReadonlyArray<GroupMember>;
  /** Latched reference relation id (for hysteresis across updates). */
  latchedRelationId?: string | null;
  /** Latched axis (for hysteresis across updates). */
  latchedAxis?: 'x' | 'y' | 'z' | null;
  /** Whether snap-to-parts is enabled. */
  snapToPartsEnabled: boolean;
  /** Current app settings. */
  appSettings: AppSettings;
  /** Display units. */
  units: 'imperial' | 'metric';
  /** Camera distance from the part (drives snap threshold scaling). */
  cameraDistance: number;
}

export interface ResizeToolState {
  /** Dimensions at gesture start, captured so update can keep absolute math. */
  startingDimensions: PartDimensions;
  /** Part position at gesture start. */
  startingPosition: Vec3;
  /** Latched reference relation id (mutates across update calls). */
  latchedRelationId: string | null;
  /** Latched reference axis (mutates across update calls). */
  latchedAxis: 'x' | 'y' | 'z' | null;
}

export interface ResizeToolPreview {
  partId: string;
  dimensions: PartDimensions;
  position: Vec3;
  snapLines: SnapLine[];
  /** Active resize reference/ruler state for overlay publishing. */
  referenceState: ResizePreviewResult['referenceState'];
  /** Which dimensions are currently being adjusted by the active handle. */
  resizingDimensions: ResizePreviewResult['resizingDimensions'];
  /** Which dimensions snapped (vs. user-driven). */
  snappedDimensions: ResizePreviewResult['snappedDimensions'];
  /** Constraint-pipeline input that exactly matches this preview. */
  candidate: Extract<CandidateTransform, { kind: 'resize' }>;
}

export function createResizeCommitState({
  startingDimensions,
  startingPosition
}: {
  startingDimensions: PartDimensions;
  startingPosition: Vec3;
}): ResizeToolState {
  return {
    startingDimensions,
    startingPosition,
    latchedRelationId: null,
    latchedAxis: null
  };
}

export function createResizeCommitPreview({
  partId,
  dimensions,
  position,
  snappedDimensions
}: {
  partId: string;
  dimensions: PartDimensions;
  position: Vec3;
  snappedDimensions: ResizePreviewResult['snappedDimensions'];
}): ResizeToolPreview {
  return {
    partId,
    dimensions,
    position,
    snapLines: [],
    referenceState: undefined,
    resizingDimensions: { length: true, width: true, thickness: true },
    snappedDimensions,
    candidate: {
      kind: 'resize',
      partId,
      dimensions,
      position
    }
  };
}

export const resizeTool: ToolSolver<ResizeToolInput, ResizeToolState, ResizeToolPreview> = {
  begin(input) {
    return {
      startingDimensions: { ...input.startingDimensions },
      startingPosition: { ...input.partPosition },
      latchedRelationId: input.latchedRelationId ?? null,
      latchedAxis: input.latchedAxis ?? null
    };
  },

  update(input, state) {
    const result = solveResizePreview({
      part: input.part,
      handlePos: input.handlePos,
      localDelta: input.localDelta,
      partPosition: input.partPosition,
      startingDimensions: input.startingDimensions,
      assignedStock: input.assignedStock,
      constrainDimensions: input.constrainDimensions,
      rotationQuaternion: input.rotationQuaternion,
      referenceParts: [...input.referenceParts],
      referencePartIds: [...input.referencePartIds],
      groupMembers: [...input.groupMembers],
      latchedRelationId: state.latchedRelationId,
      latchedAxis: state.latchedAxis,
      snapToPartsEnabled: input.snapToPartsEnabled,
      appSettings: input.appSettings,
      units: input.units,
      cameraDistance: input.cameraDistance
    });

    const nextState: ResizeToolState = {
      ...state,
      latchedRelationId: result.referenceState?.activeRelationId ?? state.latchedRelationId,
      latchedAxis: result.referenceState?.latchedAxis ?? state.latchedAxis
    };

    const preview: ResizeToolPreview = {
      partId: input.part.id,
      dimensions: {
        length: result.dimensions.length,
        width: result.dimensions.width,
        thickness: result.dimensions.thickness
      },
      position: result.position,
      snapLines: result.snapLines,
      referenceState: result.referenceState,
      resizingDimensions: result.resizingDimensions,
      snappedDimensions: result.snappedDimensions,
      candidate: {
        kind: 'resize',
        partId: input.part.id,
        dimensions: {
          length: result.dimensions.length,
          width: result.dimensions.width,
          thickness: result.dimensions.thickness
        },
        position: result.position
      }
    };

    return { preview, state: nextState };
  },

  commit(_state, preview): CommitInstruction[] {
    return [
      {
        kind: 'updatePartDimensions',
        partId: preview.partId,
        dimensions: preview.dimensions,
        position: preview.position
      }
    ];
  },

  cancel(_state) {
    // No mutations to undo. Host clears its own preview overlay.
  }
};
