import { Billboard, Line, Text } from '@react-three/drei';
import { Suspense } from 'react';
import { memo } from 'react';
import * as THREE from 'three';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import labelFontUrl from '../../assets/fonts/NotoSans-Variable.ttf?url';

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

// Blueprint-style dimension label component
export const DimensionLabel = memo(
  function DimensionLabel({
    start,
    end,
    value,
    offsetDir,
    offset = 1.5,
    color = '#ffffff',
    units,
    fontSize = 0.42,
    lineWidth = 1.5,
    tickLength = 0.3,
    billboard = true,
    hidden = false
  }: {
    start: [number, number, number];
    end: [number, number, number];
    value: number;
    offsetDir: [number, number, number]; // Direction to offset the dimension line (should point away from part)
    offset?: number;
    color?: string;
    units: 'imperial' | 'metric';
    fontSize?: number;
    lineWidth?: number;
    tickLength?: number;
    billboard?: boolean;
    hidden?: boolean;
  }) {
    if (hidden) return null;

    // Calculate the midpoint for the label
    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;
    const midZ = (start[2] + end[2]) / 2;

    // Normalize the offset direction and scale by offset amount
    const dirLen = Math.sqrt(offsetDir[0] ** 2 + offsetDir[1] ** 2 + offsetDir[2] ** 2);
    const offsetVec: [number, number, number] = [
      (offsetDir[0] / dirLen) * offset,
      (offsetDir[1] / dirLen) * offset,
      (offsetDir[2] / dirLen) * offset
    ];

    // Offset positions for the dimension line
    const offsetStart: [number, number, number] = [
      start[0] + offsetVec[0],
      start[1] + offsetVec[1],
      start[2] + offsetVec[2]
    ];
    const offsetEnd: [number, number, number] = [end[0] + offsetVec[0], end[1] + offsetVec[1], end[2] + offsetVec[2]];
    const labelPos: [number, number, number] = [midX + offsetVec[0], midY + offsetVec[1], midZ + offsetVec[2]];
    const labelText = formatMeasurementWithUnit(value, units);
    const lineLength = Math.sqrt(
      (offsetEnd[0] - offsetStart[0]) ** 2 + (offsetEnd[1] - offsetStart[1]) ** 2 + (offsetEnd[2] - offsetStart[2]) ** 2
    );
    const lineDir: [number, number, number] = [
      (offsetEnd[0] - offsetStart[0]) / Math.max(lineLength, 1e-6),
      (offsetEnd[1] - offsetStart[1]) / Math.max(lineLength, 1e-6),
      (offsetEnd[2] - offsetStart[2]) / Math.max(lineLength, 1e-6)
    ];
    const estimatedTextWidth = fontSize * (1.9 + labelText.length * 0.34);
    const labelGap = Math.min(Math.max(estimatedTextWidth, fontSize * 2.35), lineLength * 0.72);
    const halfGap = Math.min(labelGap * 0.5, lineLength * 0.45);
    const lineLeftEnd: [number, number, number] = [
      labelPos[0] - lineDir[0] * halfGap,
      labelPos[1] - lineDir[1] * halfGap,
      labelPos[2] - lineDir[2] * halfGap
    ];
    const lineRightStart: [number, number, number] = [
      labelPos[0] + lineDir[0] * halfGap,
      labelPos[1] + lineDir[1] * halfGap,
      labelPos[2] + lineDir[2] * halfGap
    ];
    const textQuaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(offsetVec[0], offsetVec[1], offsetVec[2]).normalize()
    );

    // Calculate tick direction (perpendicular to both the line and offset direction)
    const dimDir: [number, number, number] = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
    // Cross product of line direction and offset direction gives tick direction
    const tickDir: [number, number, number] = [
      dimDir[1] * offsetVec[2] - dimDir[2] * offsetVec[1],
      dimDir[2] * offsetVec[0] - dimDir[0] * offsetVec[2],
      dimDir[0] * offsetVec[1] - dimDir[1] * offsetVec[0]
    ];
    const tickLen = Math.sqrt(tickDir[0] ** 2 + tickDir[1] ** 2 + tickDir[2] ** 2);
    const normalizedTick: [number, number, number] =
      tickLen > 0
        ? [
            ((tickDir[0] / tickLen) * tickLength) / 2,
            ((tickDir[1] / tickLen) * tickLength) / 2,
            ((tickDir[2] / tickLen) * tickLength) / 2
          ]
        : [0, tickLength / 2, 0]; // Fallback

    return (
      <group>
        {/* Main dimension line with centered gap at the label */}
        <Line raycast={NOOP_RAYCAST} points={[offsetStart, lineLeftEnd]} color={color} lineWidth={lineWidth} />
        <Line raycast={NOOP_RAYCAST} points={[lineRightStart, offsetEnd]} color={color} lineWidth={lineWidth} />

        {/* Start extension line */}
        <Line
          raycast={NOOP_RAYCAST}
          points={[
            [start[0] + offsetVec[0] * 0.2, start[1] + offsetVec[1] * 0.2, start[2] + offsetVec[2] * 0.2],
            [
              offsetStart[0] + offsetVec[0] * 0.15,
              offsetStart[1] + offsetVec[1] * 0.15,
              offsetStart[2] + offsetVec[2] * 0.15
            ]
          ]}
          color={color}
          lineWidth={Math.max(1, lineWidth * 0.66)}
        />

        {/* End extension line */}
        <Line
          raycast={NOOP_RAYCAST}
          points={[
            [end[0] + offsetVec[0] * 0.2, end[1] + offsetVec[1] * 0.2, end[2] + offsetVec[2] * 0.2],
            [offsetEnd[0] + offsetVec[0] * 0.15, offsetEnd[1] + offsetVec[1] * 0.15, offsetEnd[2] + offsetVec[2] * 0.15]
          ]}
          color={color}
          lineWidth={Math.max(1, lineWidth * 0.66)}
        />

        {/* Start tick mark (perpendicular to dimension line) */}
        <Line
          raycast={NOOP_RAYCAST}
          points={[
            [
              offsetStart[0] - normalizedTick[0],
              offsetStart[1] - normalizedTick[1],
              offsetStart[2] - normalizedTick[2]
            ],
            [offsetStart[0] + normalizedTick[0], offsetStart[1] + normalizedTick[1], offsetStart[2] + normalizedTick[2]]
          ]}
          color={color}
          lineWidth={lineWidth}
        />

        {/* End tick mark */}
        <Line
          raycast={NOOP_RAYCAST}
          points={[
            [offsetEnd[0] - normalizedTick[0], offsetEnd[1] - normalizedTick[1], offsetEnd[2] - normalizedTick[2]],
            [offsetEnd[0] + normalizedTick[0], offsetEnd[1] + normalizedTick[1], offsetEnd[2] + normalizedTick[2]]
          ]}
          color={color}
          lineWidth={lineWidth}
        />

        {/* Dimension text (3D mesh so depth/occlusion is consistent with scene geometry) */}
        <Suspense fallback={null}>
          {billboard ? (
            <Billboard position={labelPos} follow lockX={false} lockY={false} lockZ={false}>
              <Text
                raycast={NOOP_RAYCAST}
                font={labelFontUrl}
                fontSize={fontSize}
                color={color}
                anchorX="center"
                anchorY="middle"
                outlineWidth={Math.max(0.016, fontSize * 0.05)}
                outlineColor="#000000"
              >
                {labelText}
              </Text>
            </Billboard>
          ) : (
            <Text
              raycast={NOOP_RAYCAST}
              position={labelPos}
              quaternion={textQuaternion}
              font={labelFontUrl}
              fontSize={fontSize}
              color={color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={Math.max(0.016, fontSize * 0.05)}
              outlineColor="#000000"
            >
              {labelText}
            </Text>
          )}
        </Suspense>
      </group>
    );
  },
  (prev, next) =>
    prev.value === next.value &&
    prev.offset === next.offset &&
    prev.color === next.color &&
    prev.units === next.units &&
    prev.fontSize === next.fontSize &&
    prev.lineWidth === next.lineWidth &&
    prev.tickLength === next.tickLength &&
    prev.billboard === next.billboard &&
    prev.hidden === next.hidden &&
    prev.start[0] === next.start[0] &&
    prev.start[1] === next.start[1] &&
    prev.start[2] === next.start[2] &&
    prev.end[0] === next.end[0] &&
    prev.end[1] === next.end[1] &&
    prev.end[2] === next.end[2] &&
    prev.offsetDir[0] === next.offsetDir[0] &&
    prev.offsetDir[1] === next.offsetDir[1] &&
    prev.offsetDir[2] === next.offsetDir[2]
);
