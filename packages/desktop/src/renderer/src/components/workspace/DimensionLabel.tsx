import { Html, Line } from '@react-three/drei';
import { memo } from 'react';
import { formatMeasurementWithUnit } from '../../utils/fractions';

// Blueprint-style dimension label component
export const DimensionLabel = memo(
  function DimensionLabel({
    start,
    end,
    value,
    offsetDir,
    offset = 1.5,
    color = '#ffffff',
    units
  }: {
    start: [number, number, number];
    end: [number, number, number];
    value: number;
    offsetDir: [number, number, number]; // Direction to offset the dimension line (should point away from part)
    offset?: number;
    color?: string;
    units: 'imperial' | 'metric';
  }) {
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

    // Calculate tick direction (perpendicular to both the line and offset direction)
    const lineDir: [number, number, number] = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
    // Cross product of line direction and offset direction gives tick direction
    const tickDir: [number, number, number] = [
      lineDir[1] * offsetVec[2] - lineDir[2] * offsetVec[1],
      lineDir[2] * offsetVec[0] - lineDir[0] * offsetVec[2],
      lineDir[0] * offsetVec[1] - lineDir[1] * offsetVec[0]
    ];
    const tickLen = Math.sqrt(tickDir[0] ** 2 + tickDir[1] ** 2 + tickDir[2] ** 2);
    const tickLength = 0.3;
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
        {/* Main dimension line */}
        <Line points={[offsetStart, offsetEnd]} color={color} lineWidth={1.5} />

        {/* Start extension line */}
        <Line
          points={[
            [start[0] + offsetVec[0] * 0.2, start[1] + offsetVec[1] * 0.2, start[2] + offsetVec[2] * 0.2],
            [
              offsetStart[0] + offsetVec[0] * 0.15,
              offsetStart[1] + offsetVec[1] * 0.15,
              offsetStart[2] + offsetVec[2] * 0.15
            ]
          ]}
          color={color}
          lineWidth={1}
        />

        {/* End extension line */}
        <Line
          points={[
            [end[0] + offsetVec[0] * 0.2, end[1] + offsetVec[1] * 0.2, end[2] + offsetVec[2] * 0.2],
            [offsetEnd[0] + offsetVec[0] * 0.15, offsetEnd[1] + offsetVec[1] * 0.15, offsetEnd[2] + offsetVec[2] * 0.15]
          ]}
          color={color}
          lineWidth={1}
        />

        {/* Start tick mark (perpendicular to dimension line) */}
        <Line
          points={[
            [
              offsetStart[0] - normalizedTick[0],
              offsetStart[1] - normalizedTick[1],
              offsetStart[2] - normalizedTick[2]
            ],
            [offsetStart[0] + normalizedTick[0], offsetStart[1] + normalizedTick[1], offsetStart[2] + normalizedTick[2]]
          ]}
          color={color}
          lineWidth={1.5}
        />

        {/* End tick mark */}
        <Line
          points={[
            [offsetEnd[0] - normalizedTick[0], offsetEnd[1] - normalizedTick[1], offsetEnd[2] - normalizedTick[2]],
            [offsetEnd[0] + normalizedTick[0], offsetEnd[1] + normalizedTick[1], offsetEnd[2] + normalizedTick[2]]
          ]}
          color={color}
          lineWidth={1.5}
        />

        {/* Dimension text */}
        <Html position={labelPos} center zIndexRange={[0, 50]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              color: color,
              fontSize: '13px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '2px 6px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
              userSelect: 'none'
            }}
          >
            {formatMeasurementWithUnit(value, units)}
          </div>
        </Html>
      </group>
    );
  },
  (prev, next) =>
    prev.value === next.value &&
    prev.offset === next.offset &&
    prev.color === next.color &&
    prev.units === next.units &&
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
