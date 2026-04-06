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
  const snapPulseAt = useSnapStore((s) => s.snapPulseAt);
  const snapLabelPosition = useSnapStore((s) => s.snapLabelPosition);
  const units = useProjectStore((s) => s.units);
  const displayMode = useCameraStore((s) => s.displayMode);

  if (activeSnapLines.length === 0) return null;

  const now = performance.now();
  const pulseAge = now - snapPulseAt;
  const pulseActive = pulseAge >= 0 && pulseAge <= 320;
  const pulseScale = pulseActive ? 0.35 + 0.65 * Math.sin((Math.PI * pulseAge) / 320) ** 2 : 0;

  const axisAccent = (axis: 'x' | 'y' | 'z') => (axis === 'x' ? '#ff6b6b' : axis === 'y' ? '#69db7c' : '#4dabf7');

  // Colors for different snap types
  const getLineColor = (line: SnapLine) => {
    switch (line.family) {
      case 'guide':
        return '#00d9ff';
      case 'origin':
        return '#ffffff';
      case 'face':
        return '#00d9ff';
      case 'surface-anchor':
        if (line.subtype?.includes('quarter')) return '#ff922b';
        if (line.subtype?.includes('midline')) return '#ff922b';
        return '#69db7c';
      case 'surface-fraction':
        if (line.subtype === 'corner-anchor') return '#69db7c';
        if (line.subtype?.includes('fraction-50')) return '#69db7c';
        return '#ff922b';
      case 'feature':
        return '#ffffff';
      default:
        break;
    }

    if (line.type === 'dimension-match') {
      // Different colors for standard vs part-matched dimensions
      if (line.dimensionMatchInfo?.isStandard) {
        return '#40c057'; // Green for standard dimensions
      }
      return '#ffa94d'; // Orange for part-matched dimensions
    }
    if (line.type === 'equal-spacing') return '#da77f2';
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

  const getSnapToken = (line: SnapLine) => {
    if (line.family === 'face') return 'FACE';
    if (line.family === 'surface-anchor') {
      if (line.subtype === 'center-2d') return 'Center-2D';
      if (line.subtype === 'center-1d') return `CENTER-${line.axis.toUpperCase()}`;
      if (line.subtype === 'edge-midline') return 'MIDLINE';
      if (line.subtype === 'edge-quarterline') return 'QUARTER';
    }
    if (line.family === 'surface-fraction') {
      if (line.subtype === 'fraction-25') return `25%-${line.axis.toUpperCase()}`;
      if (line.subtype === 'fraction-50') return '50%';
      if (line.subtype === 'fraction-75') return `75%-${line.axis.toUpperCase()}`;
      if (line.subtype === 'fraction-0') return '0%';
      if (line.subtype === 'fraction-100') return '100%';
      if (line.subtype === 'corner-anchor') return 'CORNER';
      return 'FRACTION';
    }
    if (line.family === 'feature') {
      if (line.subtype === 'vertex-face') return 'VTX->FACE';
      if (line.subtype === 'vertex-vertex') return 'VTX->VTX';
      if (line.subtype === 'vertex-edge') return 'VTX->EDGE';
      if (line.subtype === 'midpoint-midpoint') return 'MID->MID';
      if (line.subtype === 'edge-extension') return 'EXT-LINE';
      return 'EDGE';
    }
    if (line.type === 'equal-spacing') {
      if (line.subtype === 'distribution') return 'DISTR';
      if (line.subtype === 'pattern') return 'PATTERN';
      return 'EQUAL';
    }
    if (line.type === 'dimension-match') return 'MATCH';
    return null;
  };

  return (
    <group>
      {activeSnapLines.some((line) => line.state === 'latched') && (
        <Html
          position={
            snapLabelPosition
              ? [snapLabelPosition.x, snapLabelPosition.y + 0.5, snapLabelPosition.z]
              : [camera.position.x * 0.1, camera.position.y * 0.1, camera.position.z * 0.1]
          }
          center
        >
          <div
            style={{
              color: '#00d9ff',
              fontSize: '10px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(0,0,0,0.78)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #00d9ff'
            }}
          >
            SNAP LOCK
          </div>
        </Html>
      )}
      {activeSnapLines.map((line, index) => (
        <group key={`snap-group-${index}`}>
          {/* Main snap alignment line */}
          <Line
            points={[
              [line.start.x, line.start.y, line.start.z],
              [line.end.x, line.end.y, line.end.z]
            ]}
            color={getLineColor(line)}
            lineWidth={
              (line.family === 'feature' ? 1.1 : line.state === 'winner' || !line.state ? 2 : 1) +
              (line.state === 'winner' || !line.state ? pulseScale : 0)
            }
            depthTest={displayMode === 'solid'}
            transparent={line.state === 'candidate'}
            opacity={line.state === 'candidate' ? 0.3 : 1}
            dashed={
              line.subtype?.includes('quarter') === true ||
              line.subtype?.includes('fraction-25') === true ||
              line.subtype?.includes('fraction-75') === true
            }
            dashSize={line.state === 'winner' || !line.state ? 0.5 : 0.3}
            gapSize={line.state === 'winner' || !line.state ? 0.25 : 0.2}
          />

          {(line.state === 'winner' || !line.state) && (
            <>
              <mesh position={[line.start.x, line.start.y, line.start.z]}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshBasicMaterial color={axisAccent(line.axis)} />
              </mesh>
              <mesh position={[line.end.x, line.end.y, line.end.z]}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshBasicMaterial color={axisAccent(line.axis)} />
              </mesh>
            </>
          )}

          {getSnapToken(line) && (
            <Html
              position={
                snapLabelPosition
                  ? [snapLabelPosition.x, snapLabelPosition.y + 0.2 + index * 0.12, snapLabelPosition.z]
                  : [(line.start.x + line.end.x) / 2, (line.start.y + line.end.y) / 2, (line.start.z + line.end.z) / 2]
              }
              center
              occlude={displayMode === 'solid' ? 'blending' : false}
              zIndexRange={[0, 40]}
              style={{ pointerEvents: 'none' }}
            >
              <div
                style={{
                  color: getLineColor(line),
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  backgroundColor: 'rgba(0, 0, 0, 0.82)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  border: `1px solid ${getLineColor(line)}`
                }}
              >
                {getSnapToken(line)}
              </div>
            </Html>
          )}

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
