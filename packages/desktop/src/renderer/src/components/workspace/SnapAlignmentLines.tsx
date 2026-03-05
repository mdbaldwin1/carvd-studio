import { Html, Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useProjectStore } from '../../store/projectStore';
import { useSnapStore } from '../../store/snapStore';
import { useCameraStore } from '../../store/cameraStore';
import { SnapLine } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';

// Component that renders snap alignment lines during drag operations
export function SnapAlignmentLines() {
  const { camera } = useThree();
  const activeSnapLines = useSnapStore((s) => s.activeSnapLines);
  const units = useProjectStore((s) => s.units);
  const displayMode = useCameraStore((s) => s.displayMode);

  if (activeSnapLines.length === 0) return null;

  // Colors for different snap types
  const getLineColor = (line: SnapLine) => {
    if (line.type === 'dimension-match') {
      // Different colors for standard vs part-matched dimensions
      if (line.dimensionMatchInfo?.isStandard) {
        return '#40c057'; // Green for standard dimensions
      }
      return '#ffa94d'; // Orange for part-matched dimensions
    }
    if (line.type === 'equal-spacing') {
      return '#da77f2'; // Magenta/purple for equal spacing
    }
    if (line.type === 'center') {
      return '#ffd43b'; // Yellow for center alignment
    }
    // Colors for edge alignment by axis
    switch (line.axis) {
      case 'x':
        return '#ff6b6b'; // Red for X
      case 'y':
        return '#69db7c'; // Green for Y
      case 'z':
        return '#4dabf7'; // Blue for Z
      default:
        return '#ffffff';
    }
  };

  // Distance indicator color (cyan/teal for visibility)
  const distanceColor = '#00d9ff';
  const connectorColor = '#888888'; // Gray for connector lines

  // Format the source info for dimension match labels
  const formatDimensionMatchLabel = (line: SnapLine, distance: number) => {
    const value = formatMeasurementWithUnit(distance, units);

    if (!line.dimensionMatchInfo) {
      return value;
    }

    if (line.dimensionMatchInfo.isStandard) {
      return `${value} (standard)`;
    }

    if (line.dimensionMatchInfo.sourcePart && line.dimensionMatchInfo.sourceDimension) {
      // Abbreviate dimension names
      const dimAbbrev = {
        length: 'L',
        width: 'W',
        thickness: 'T'
      };
      const abbrev = dimAbbrev[line.dimensionMatchInfo.sourceDimension];
      // Truncate part name if too long
      const partName =
        line.dimensionMatchInfo.sourcePart.length > 12
          ? line.dimensionMatchInfo.sourcePart.substring(0, 12) + '...'
          : line.dimensionMatchInfo.sourcePart;
      return `${value} = ${partName} (${abbrev})`;
    }

    return value;
  };

  const getCapPoints = (point: { x: number; y: number; z: number }, other: { x: number; y: number; z: number }) => {
    const p = new THREE.Vector3(point.x, point.y, point.z);
    const q = new THREE.Vector3(other.x, other.y, other.z);
    const lineDir = q.sub(p).normalize();
    const viewDir = new THREE.Vector3().subVectors(camera.position, p).normalize();
    let capDir = new THREE.Vector3().crossVectors(viewDir, lineDir);
    if (capDir.lengthSq() < 1e-6) {
      capDir = new THREE.Vector3().crossVectors(lineDir, new THREE.Vector3(0, 1, 0));
      if (capDir.lengthSq() < 1e-6) {
        capDir = new THREE.Vector3().crossVectors(lineDir, new THREE.Vector3(1, 0, 0));
      }
    }
    capDir.normalize().multiplyScalar(0.2);
    return [
      [p.x + capDir.x, p.y + capDir.y, p.z + capDir.z] as [number, number, number],
      [p.x - capDir.x, p.y - capDir.y, p.z - capDir.z] as [number, number, number]
    ];
  };

  return (
    <group>
      {activeSnapLines.map((line, index) => (
        <group key={`snap-group-${index}`}>
          {/* Main snap alignment line */}
          <Line
            points={[
              [line.start.x, line.start.y, line.start.z],
              [line.end.x, line.end.y, line.end.z]
            ]}
            color={getLineColor(line)}
            lineWidth={2}
            depthTest={displayMode === 'solid'}
            dashed
            dashSize={0.5}
            gapSize={0.25}
          />

          {/* Connector line to matched part (for dimension-match only) */}
          {line.connectorLine && (
            <Line
              points={[
                [line.connectorLine.start.x, line.connectorLine.start.y, line.connectorLine.start.z],
                [line.connectorLine.end.x, line.connectorLine.end.y, line.connectorLine.end.z]
              ]}
              color={connectorColor}
              lineWidth={1}
              depthTest={displayMode === 'solid'}
              dashed
              dashSize={0.3}
              gapSize={0.2}
            />
          )}

          {/* Distance indicator lines and labels */}
          {line.distanceIndicators?.map((indicator, distIndex) => {
            const isDimensionMatch = line.type === 'dimension-match';
            const labelColor = isDimensionMatch ? getLineColor(line) : distanceColor;

            return (
              <group key={`distance-${index}-${distIndex}`}>
                {/* Distance line */}
                <Line
                  points={[
                    [indicator.start.x, indicator.start.y, indicator.start.z],
                    [indicator.end.x, indicator.end.y, indicator.end.z]
                  ]}
                  color={isDimensionMatch ? getLineColor(line) : distanceColor}
                  lineWidth={1.5}
                  depthTest={displayMode === 'solid'}
                />
                {/* End caps (short perpendicular lines) */}
                <Line
                  points={getCapPoints(indicator.start, indicator.end)}
                  color={isDimensionMatch ? getLineColor(line) : distanceColor}
                  lineWidth={1.5}
                  depthTest={displayMode === 'solid'}
                />
                <Line
                  points={getCapPoints(indicator.end, indicator.start)}
                  color={isDimensionMatch ? getLineColor(line) : distanceColor}
                  lineWidth={1.5}
                  depthTest={displayMode === 'solid'}
                />
                {/* Distance label (enhanced for dimension matching) */}
                <Html
                  position={[indicator.labelPosition.x, indicator.labelPosition.y, indicator.labelPosition.z]}
                  center
                  occlude={displayMode === 'solid' ? 'blending' : false}
                  zIndexRange={[0, 50]}
                  style={{ pointerEvents: 'none' }}
                >
                  <div
                    style={{
                      color: labelColor,
                      fontSize: '11px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(0, 0, 0, 0.85)',
                      padding: isDimensionMatch ? '3px 8px' : '2px 5px',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                      border: `1px solid ${labelColor}`,
                      boxShadow: isDimensionMatch ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                    }}
                  >
                    {isDimensionMatch
                      ? formatDimensionMatchLabel(line, indicator.distance)
                      : formatMeasurementWithUnit(indicator.distance, units)}
                  </div>
                </Html>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}
