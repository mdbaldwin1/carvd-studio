/**
 * Component to render distance indicators between selected parts and reference parts.
 * Shows edge-to-edge gaps (cyan) and edge alignment offsets (yellow).
 * Clicking a distance makes it editable - entering a new value moves the selected parts.
 */

import React, { useState } from 'react';
import { Line, Html } from '@react-three/drei';
import { useProjectStore } from '../../store/projectStore';
import { useSnapStore } from '../../store/snapStore';
import { useCameraStore } from '../../store/cameraStore';
import { formatMeasurementWithUnit, parseInput } from '../../utils/fractions';
import { ReferenceDistanceIndicator } from '../../types';
import { Input } from '@renderer/components/ui/input';

export function ReferenceDistanceIndicators(): React.ReactElement | null {
  const activeReferenceDistances = useSnapStore((s) => s.activeReferenceDistances);
  const units = useProjectStore((s) => s.units);
  const moveSelectedParts = useProjectStore((s) => s.moveSelectedParts);
  const displayMode = useCameraStore((s) => s.displayMode);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (activeReferenceDistances.length === 0) return null;

  const handleStartEdit = (indicator: ReferenceDistanceIndicator) => {
    setEditingId(indicator.id);
    setEditValue(formatMeasurementWithUnit(indicator.distance, units));
  };

  const handleEditSubmit = (indicator: ReferenceDistanceIndicator) => {
    const newDist = parseInput(editValue, units);
    if (newDist !== null && newDist !== indicator.distance) {
      const delta = newDist - indicator.distance;
      // Move along the measured vector so editing works for angled indicators too.
      const vx = indicator.end.x - indicator.start.x;
      const vy = indicator.end.y - indicator.start.y;
      const vz = indicator.end.z - indicator.start.z;
      const len = Math.hypot(vx, vy, vz);
      if (len < 1e-6) {
        setEditingId(null);
        return;
      }

      // start is selected side; to increase distance, move start away from end.
      const movement = {
        x: (-vx / len) * delta,
        y: (-vy / len) * delta,
        z: (-vz / len) * delta
      };

      moveSelectedParts(movement);
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, indicator: ReferenceDistanceIndicator) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit(indicator);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <group>
      {activeReferenceDistances.map((indicator) => {
        // Cyan for edge-to-edge gaps, yellow for edge alignment offsets
        const color = indicator.type === 'edge-to-edge' ? '#00d9ff' : '#ffcc00';
        const isEditing = editingId === indicator.id;

        return (
          <group key={indicator.id}>
            {/* Distance line */}
            <Line
              points={[
                [indicator.start.x, indicator.start.y, indicator.start.z],
                [indicator.end.x, indicator.end.y, indicator.end.z]
              ]}
              color={color}
              lineWidth={1.5}
              depthTest={displayMode === 'solid'}
              dashed={indicator.type === 'edge-offset'}
              dashSize={0.2}
              gapSize={0.1}
            />

            {/* Distance label */}
            <Html
              position={[indicator.labelPosition.x, indicator.labelPosition.y, indicator.labelPosition.z]}
              center
              occlude={displayMode === 'solid' ? 'blending' : false}
              style={{ pointerEvents: 'auto' }}
            >
              {isEditing ? (
                <Input
                  type="text"
                  className="w-[70px] py-0.5 px-1.5 text-[11px] font-medium rounded-[3px] border-2 border-accent bg-surface text-text text-center outline-none focus:shadow-[0_0_0_2px_rgba(0,127,255,0.3)]"
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleEditSubmit(indicator)}
                  onKeyDown={(e) => handleKeyDown(e, indicator)}
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
                  className={`py-0.5 px-1.5 text-[11px] font-medium rounded-[3px] cursor-pointer whitespace-nowrap select-none transition-all duration-100 hover:scale-105 ${indicator.type === 'edge-to-edge' ? 'bg-[rgba(0,217,255,0.9)] text-black' : 'bg-[rgba(255,204,0,0.9)] text-black'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(indicator);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                  title="Click to edit distance"
                >
                  {formatMeasurementWithUnit(indicator.distance, units)}
                </div>
              )}
            </Html>
          </group>
        );
      })}
    </group>
  );
}
