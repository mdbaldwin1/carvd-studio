/**
 * Component to render distance indicators between selected parts and reference parts.
 * Shows edge-to-edge gaps (cyan) and edge alignment offsets (yellow).
 * Clicking a distance makes it editable - entering a new value moves the selected parts.
 */

import React, { useState } from 'react';
import { Line, Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useProjectStore } from '../../store/projectStore';
import { formatMeasurementWithUnit, parseInput } from '../../utils/fractions';
import { getProjectedMeasurementLength, resolveMeasurementOverlayLayout } from '../../utils/measurementOverlayLayout';
import { getReferenceLabelPosition } from '../../utils/measurementPlacement';
import { getReferenceDistancePriority } from '../../utils/measurementPriority';
import { ReferenceRuler } from '../../types';
import { Input } from '@renderer/components/ui/input';
import { calculateMoveDeltaForReferenceRelation } from '../../utils/referenceRelations';
import { resolveResizePositionFromDimensions } from '../../utils/interactionResizePreview';
import { clearTransformInteractionPreviewKeepingSelectionDelta } from '../../utils/interactionSession';
import * as THREE from 'three';
import type { ReferenceOverlayInputs } from '../../interaction/overlayModel';

interface ReferenceDistanceIndicatorsProps {
  /** References slot from the OverlayModel. `null` hides the overlay. */
  data: ReferenceOverlayInputs | null;
}

// ADR-005: ReferenceDistanceIndicators is a (mostly) pure prop consumer. The
// slot in OverlayModel carries every piece of state the component reads. The
// component still reads `moveSelectedParts` / `updatePart` from projectStore
// because those are imperative action references (stable, do not trigger
// re-renders) used inside the inline edit submit handler.
export function ReferenceDistanceIndicators({ data }: ReferenceDistanceIndicatorsProps): React.ReactElement | null {
  const { camera, size } = useThree();
  // Stable action references — reading these does not subscribe to state.
  const moveSelectedParts = useProjectStore((s) => s.moveSelectedParts);
  const updatePart = useProjectStore((s) => s.updatePart);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!data) return null;

  const { rulers, legacyIndicators, activeSession, parts, units, displayMode } = data;
  const sessionRelationsById = new Map(
    activeSession?.referenceState.candidateRelations.map((relation) => [relation.id, relation] as const) ?? []
  );
  const legacyIndicatorsById = new Map(legacyIndicators.map((indicator) => [indicator.id, indicator] as const));
  const activeRuler = rulers.find((ruler) => ruler.kind === 'active') ?? rulers[0] ?? null;
  const hasEditableRuler = rulers.some((ruler) => {
    if (ruler.editMode === 'move') return true;
    if (activeSession?.kind !== 'resize' || !ruler.axis) return false;
    const handleAxisValue =
      ruler.axis === 'x'
        ? activeSession.handle?.x
        : ruler.axis === 'y'
          ? activeSession.handle?.y
          : activeSession.handle?.z;
    return Boolean(handleAxisValue);
  });

  const viewport = { width: size.width, height: size.height };
  const labelLayout = resolveMeasurementOverlayLayout(
    rulers
      .map((ruler) => {
        const labelPosition = getReferenceLabelPosition({
          start: [ruler.start.x, ruler.start.y, ruler.start.z],
          end: [ruler.end.x, ruler.end.y, ruler.end.z],
          axis: ruler.axis ?? 'x',
          cameraUp: [camera.up.x, camera.up.y, camera.up.z],
          cameraRight: [camera.matrixWorld.elements[0], camera.matrixWorld.elements[1], camera.matrixWorld.elements[2]]
        });

        const projectedLength = getProjectedMeasurementLength(ruler.start, ruler.end, camera, viewport);
        if (projectedLength < 36) {
          return null;
        }

        return {
          id: ruler.id,
          worldPosition: { x: labelPosition[0], y: labelPosition[1], z: labelPosition[2] },
          priority:
            getReferenceDistancePriority({
              type: ruler.type,
              distance: ruler.distance,
              isEditing: editingId === ruler.id
            }) + (ruler.kind === 'active' ? 40 : 0)
        };
      })
      .filter(
        (item): item is { id: string; worldPosition: { x: number; y: number; z: number }; priority: number } =>
          item !== null
      ),
    camera,
    viewport,
    54,
    3
  );

  const handleStartEdit = (ruler: ReferenceRuler) => {
    const canEditResizeRuler =
      activeSession?.kind === 'resize' &&
      ruler.axis !== null &&
      ((ruler.editMode === 'resize-size' &&
        ((ruler.axis === 'x' && activeSession.handle?.x) ||
          (ruler.axis === 'y' && activeSession.handle?.y) ||
          (ruler.axis === 'z' && activeSession.handle?.z))) ||
        (ruler.editMode === 'resize-gap' &&
          ((ruler.axis === 'x' && activeSession.handle?.x) ||
            (ruler.axis === 'y' && activeSession.handle?.y) ||
            (ruler.axis === 'z' && activeSession.handle?.z))));
    if (ruler.editMode !== 'move' && !canEditResizeRuler) return;
    setEditingId(ruler.id);
    setEditValue(formatMeasurementWithUnit(ruler.distance, units));
  };

  const handleEditSubmit = (ruler: ReferenceRuler) => {
    const newDist = parseInput(editValue, units);
    if (newDist === null || newDist === ruler.distance) {
      setEditingId(null);
      return;
    }

    const sessionRelation = sessionRelationsById.get(ruler.relationId);
    if (ruler.editMode === 'move') {
      const movement =
        sessionRelation && sessionRelation.editMode === 'move'
          ? calculateMoveDeltaForReferenceRelation(sessionRelation, newDist)
          : null;

      if (movement) {
        moveSelectedParts(movement);
      } else {
        const delta = newDist - ruler.distance;
        const vx = ruler.end.x - ruler.start.x;
        const vy = ruler.end.y - ruler.start.y;
        const vz = ruler.end.z - ruler.start.z;
        const len = Math.hypot(vx, vy, vz);
        if (len < 1e-6) {
          setEditingId(null);
          return;
        }

        moveSelectedParts({
          x: (-vx / len) * delta,
          y: (-vy / len) * delta,
          z: (-vz / len) * delta
        });
      }
      setEditingId(null);
      return;
    }

    if (
      activeSession?.kind !== 'resize' ||
      !activeSession.primaryPartId ||
      !activeSession.handle ||
      !activeSession.dimensions ||
      !activeSession.position ||
      !ruler.axis
    ) {
      setEditingId(null);
      return;
    }

    const part = parts.find((entry) => entry.id === activeSession.primaryPartId);
    if (!part) {
      setEditingId(null);
      return;
    }

    const rotationQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        (part.rotation.x * Math.PI) / 180,
        (part.rotation.y * Math.PI) / 180,
        (part.rotation.z * Math.PI) / 180,
        'XYZ'
      )
    );
    const nextDimensions = { ...activeSession.dimensions };
    const axisToDimensionKey = ruler.axis === 'x' ? 'length' : ruler.axis === 'y' ? 'thickness' : 'width';
    const handleAxisValue =
      ruler.axis === 'x'
        ? activeSession.handle.x
        : ruler.axis === 'y'
          ? activeSession.handle.y
          : activeSession.handle.z;

    if (ruler.editMode === 'resize-size') {
      nextDimensions[axisToDimensionKey] =
        axisToDimensionKey === 'thickness' ? Math.max(0.25, newDist) : Math.max(0.5, newDist);
    } else if (ruler.editMode === 'resize-gap' && sessionRelation && handleAxisValue !== 0) {
      const movement = calculateMoveDeltaForReferenceRelation(sessionRelation, newDist);
      if (!movement) {
        setEditingId(null);
        return;
      }
      const faceMovement = ruler.axis === 'x' ? movement.x : ruler.axis === 'y' ? movement.y : movement.z;
      const nextDimensionValue = activeSession.dimensions[axisToDimensionKey] + handleAxisValue * faceMovement;
      nextDimensions[axisToDimensionKey] =
        axisToDimensionKey === 'thickness' ? Math.max(0.25, nextDimensionValue) : Math.max(0.5, nextDimensionValue);
    } else {
      setEditingId(null);
      return;
    }

    const nextPosition = resolveResizePositionFromDimensions({
      basePosition: activeSession.position,
      baseDimensions: activeSession.dimensions,
      nextDimensions,
      handlePos: activeSession.handle,
      rotationQuaternion
    });

    updatePart(part.id, {
      length: nextDimensions.length,
      width: nextDimensions.width,
      thickness: nextDimensions.thickness,
      position: nextPosition
    });
    clearTransformInteractionPreviewKeepingSelectionDelta();
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, ruler: ReferenceRuler) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit(ruler);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <group>
      {activeSession && activeRuler && hasEditableRuler ? (
        <Html
          position={[activeRuler.labelPosition.x, activeRuler.labelPosition.y + 0.9, activeRuler.labelPosition.z]}
          center
          occlude={displayMode === 'solid'}
          style={{ pointerEvents: 'none' }}
        >
          <div className="rounded-[6px] border border-white/18 bg-[rgba(15,20,30,0.85)] px-2.5 py-1 text-[11px] font-medium text-white/92 shadow-[0_4px_14px_rgba(0,0,0,0.25)] whitespace-nowrap">
            {activeSession.kind === 'resize'
              ? 'Click a ruler to type exact size or gap'
              : 'Click the active ruler to type an exact distance'}
          </div>
        </Html>
      ) : null}
      {rulers.map((ruler) => {
        const legacyIndicator = legacyIndicatorsById.get(ruler.id);
        const color =
          ruler.kind === 'active'
            ? ruler.type === 'edge-to-edge'
              ? '#00f0ff'
              : '#ffd84d'
            : ruler.type === 'edge-to-edge'
              ? '#00d9ff'
              : '#ffcc00';
        const isEditing = editingId === ruler.id;
        const labelPosition = getReferenceLabelPosition({
          start: [ruler.start.x, ruler.start.y, ruler.start.z],
          end: [ruler.end.x, ruler.end.y, ruler.end.z],
          axis: ruler.axis ?? 'x',
          cameraUp: [camera.up.x, camera.up.y, camera.up.z],
          cameraRight: [camera.matrixWorld.elements[0], camera.matrixWorld.elements[1], camera.matrixWorld.elements[2]],
          offsetDistance: 0.95 + (labelLayout.get(ruler.id)?.lane ?? 0) * 0.7
        });
        const isEditable =
          ruler.editMode === 'move' ||
          (activeSession?.kind === 'resize' &&
            ruler.axis !== null &&
            ((ruler.editMode === 'resize-size' &&
              ((ruler.axis === 'x' && activeSession.handle?.x) ||
                (ruler.axis === 'y' && activeSession.handle?.y) ||
                (ruler.axis === 'z' && activeSession.handle?.z))) ||
              (ruler.editMode === 'resize-gap' &&
                ((ruler.axis === 'x' && activeSession.handle?.x) ||
                  (ruler.axis === 'y' && activeSession.handle?.y) ||
                  (ruler.axis === 'z' && activeSession.handle?.z)))));

        return (
          <group key={ruler.id}>
            {/* Distance line */}
            <Line
              points={[
                [ruler.start.x, ruler.start.y, ruler.start.z],
                [ruler.end.x, ruler.end.y, ruler.end.z]
              ]}
              color={color}
              lineWidth={ruler.kind === 'active' ? 2.25 : 1.5}
              depthTest={displayMode === 'solid'}
              dashed={ruler.type === 'edge-offset'}
              dashSize={0.2}
              gapSize={0.1}
            />

            {/* Distance label */}
            <Html position={labelPosition} center occlude={displayMode === 'solid'} style={{ pointerEvents: 'auto' }}>
              {!labelLayout.get(ruler.id)?.visible ? null : isEditing ? (
                <Input
                  type="text"
                  className="w-[84px] py-1 px-2 text-[12px] font-semibold rounded-[4px] border-2 border-accent bg-surface text-text text-center outline-none focus:shadow-[0_0_0_2px_rgba(0,127,255,0.3)]"
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleEditSubmit(ruler)}
                  onKeyDown={(e) => handleKeyDown(e, ruler)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                />
              ) : (
                <div
                  className={`py-1 px-2 text-[12px] font-semibold rounded-[4px] whitespace-nowrap select-none transition-all duration-100 ${isEditable ? 'cursor-pointer hover:scale-105' : 'cursor-default'} ${ruler.kind === 'active' ? 'ring-2 ring-white/70' : ''} ${ruler.type === 'edge-to-edge' ? 'bg-[rgba(0,217,255,0.92)] text-black' : 'bg-[rgba(255,204,0,0.92)] text-black'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(ruler);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                  title={
                    isEditable
                      ? ruler.editMode === 'resize-size'
                        ? 'Click to edit size'
                        : ruler.editMode === 'resize-gap'
                          ? 'Click to edit gap'
                          : 'Click to edit distance'
                      : legacyIndicator
                        ? undefined
                        : 'Reference ruler'
                  }
                >
                  {formatMeasurementWithUnit(ruler.distance, units)}
                </div>
              )}
            </Html>
          </group>
        );
      })}
    </group>
  );
}
