import { Html, Line } from '@react-three/drei';

// Axis indicator at origin showing X (red), Y (green), Z (blue) with labels
export function AxisIndicator() {
  const axisLength = 10;
  const labelOffset = axisLength + 1.5;

  return (
    <group>
      {/* X axis - Red */}
      <Line
        points={[
          [0, 0, 0],
          [axisLength, 0, 0]
        ]}
        color="#ff4444"
        lineWidth={2}
      />
      <Html position={[labelOffset, 0, 0]} center zIndexRange={[0, 50]}>
        <div
          style={{
            color: '#ff4444',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          X
        </div>
      </Html>

      {/* Y axis - Green */}
      <Line
        points={[
          [0, 0, 0],
          [0, axisLength, 0]
        ]}
        color="#44ff44"
        lineWidth={2}
      />
      <Html position={[0, labelOffset, 0]} center zIndexRange={[0, 50]}>
        <div
          style={{
            color: '#44ff44',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          Y
        </div>
      </Html>

      {/* Z axis - Blue */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, axisLength]
        ]}
        color="#4444ff"
        lineWidth={2}
      />
      <Html position={[0, 0, labelOffset]} center zIndexRange={[0, 50]}>
        <div
          style={{
            color: '#4444ff',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          Z
        </div>
      </Html>
    </group>
  );
}
