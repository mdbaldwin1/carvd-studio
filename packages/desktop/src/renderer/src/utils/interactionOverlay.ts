import type { Part } from '../types';
import type { InteractionSession } from '../store/interactionStore';

export function shouldHideMeasurementOverlays(activeSession: InteractionSession | null): boolean {
  return activeSession !== null;
}

export function shouldHideGroupTransformHandles(activeSession: InteractionSession | null): boolean {
  return activeSession?.kind === 'move';
}

export function shouldHideReferenceDistanceIndicators(activeSession: InteractionSession | null): boolean {
  if (!activeSession) return false;
  return (activeSession.referenceState?.candidateRelations?.length ?? 0) === 0;
}

export function resolveInteractionAffectedPartIds(
  activeSession: InteractionSession | null,
  fallbackPartIds: string[]
): string[] {
  return activeSession ? activeSession.affectedPartIds : fallbackPartIds;
}

export function resolvePartInteractionPreview(
  part: Part,
  activeSession: InteractionSession | null
): {
  position: { x: number; y: number; z: number };
  dimensions: { length: number; width: number; thickness: number };
  affected: boolean;
} {
  const fallback = {
    position: part.position,
    dimensions: {
      length: part.length,
      width: part.width,
      thickness: part.thickness
    },
    affected: false
  };

  if (!activeSession || !activeSession.affectedPartIds.includes(part.id)) {
    return fallback;
  }

  if (activeSession.kind === 'move') {
    return {
      position: {
        x: part.position.x + activeSession.delta.x,
        y: part.position.y + activeSession.delta.y,
        z: part.position.z + activeSession.delta.z
      },
      dimensions: fallback.dimensions,
      affected: true
    };
  }

  if (
    activeSession.kind === 'resize' &&
    activeSession.primaryPartId === part.id &&
    activeSession.position &&
    activeSession.dimensions
  ) {
    return {
      position: activeSession.position,
      dimensions: activeSession.dimensions,
      affected: true
    };
  }

  return {
    ...fallback,
    affected: true
  };
}
