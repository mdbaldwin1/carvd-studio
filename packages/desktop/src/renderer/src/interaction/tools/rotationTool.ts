// ADR-004: rotationTool — ToolSolver implementation for part rotation.
//
// Handles pure rotation math for click/keyboard-style part rotations. Pointer
// drag ring geometry remains in RotationHandle; this tool owns the
// preview/commit contract for the resulting rotation.

import type { Part, Rotation3D } from '../../types';
import { rotateAroundLocalAxis, rotateAroundWorldAxis } from '../../utils/rotation';
import type { CommitInstruction, ToolSolver } from './toolSolver';

export type RotationAxis = 'x' | 'y' | 'z';
export type RotationSpace = 'local' | 'world';

export interface RotationToolInput {
  part: Part;
  axis: RotationAxis;
  degrees: number;
  space: RotationSpace;
}

export interface RotationToolState {
  partId: string;
  initialRotation: Rotation3D;
}

export interface RotationToolPreview {
  partId: string;
  rotation: Rotation3D;
}

export const rotationTool: ToolSolver<RotationToolInput, RotationToolState, RotationToolPreview> = {
  begin(input) {
    return {
      partId: input.part.id,
      initialRotation: { ...input.part.rotation }
    };
  },

  update(input, state) {
    const rotate = input.space === 'local' ? rotateAroundLocalAxis : rotateAroundWorldAxis;
    return {
      preview: {
        partId: state.partId,
        rotation: rotate(state.initialRotation, input.axis, input.degrees)
      },
      state
    };
  },

  commit(_state, preview): CommitInstruction[] {
    return [
      {
        kind: 'updatePartRotation',
        partId: preview.partId,
        rotation: preview.rotation
      }
    ];
  },

  cancel(_state) {
    // No mutations to undo. Host clears its own preview/session state.
  }
};
