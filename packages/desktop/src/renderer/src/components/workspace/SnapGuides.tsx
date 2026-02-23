import { Line } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { useProjectStore } from '../../store/projectStore';
import { setRightClickTarget } from './workspaceUtils';

// Component that renders persistent snap guides
export function SnapGuides() {
  const snapGuides = useProjectStore((s) => s.snapGuides);

  if (snapGuides.length === 0) return null;

  // Guide plane size (extends from -50 to +50 on perpendicular axes)
  const GUIDE_SIZE = 100;
  const GUIDE_HALF = GUIDE_SIZE / 2;

  // Colors for each axis (matching snap colors but more transparent)
  const axisColors = {
    x: '#ff6b6b',
    y: '#69db7c',
    z: '#4dabf7'
  };

  // Track right-click on guide for context menu (shown on mouseup by Workspace)
  const handleGuidePointerDown = (e: ThreeEvent<PointerEvent>, guideId: string) => {
    if (e.nativeEvent.button === 2) {
      e.stopPropagation();
      setRightClickTarget({ type: 'guide', guideId });
    }
  };

  return (
    <group>
      {snapGuides.map((guide) => {
        let rotation: [number, number, number];
        let position: [number, number, number];

        switch (guide.axis) {
          case 'x':
            // YZ plane at X = position
            position = [guide.position, 0, 0];
            rotation = [0, Math.PI / 2, 0];
            break;
          case 'y':
            // XZ plane at Y = position
            position = [0, guide.position, 0];
            rotation = [-Math.PI / 2, 0, 0];
            break;
          case 'z':
          default:
            // XY plane at Z = position
            position = [0, 0, guide.position];
            rotation = [0, 0, 0];
            break;
        }

        return (
          <group key={guide.id}>
            {/* Semi-transparent plane - interactive for context menu */}
            <mesh position={position} rotation={rotation} onPointerDown={(e) => handleGuidePointerDown(e, guide.id)}>
              <planeGeometry args={[GUIDE_SIZE, GUIDE_SIZE]} />
              <meshBasicMaterial
                color={axisColors[guide.axis]}
                transparent
                opacity={0.05}
                side={2} // DoubleSide
                depthWrite={false}
              />
            </mesh>

            {/* Edge lines for visibility */}
            <Line
              points={
                guide.axis === 'x'
                  ? [
                      [guide.position, -GUIDE_HALF, -GUIDE_HALF],
                      [guide.position, -GUIDE_HALF, GUIDE_HALF],
                      [guide.position, GUIDE_HALF, GUIDE_HALF],
                      [guide.position, GUIDE_HALF, -GUIDE_HALF],
                      [guide.position, -GUIDE_HALF, -GUIDE_HALF]
                    ]
                  : guide.axis === 'y'
                    ? [
                        [-GUIDE_HALF, guide.position, -GUIDE_HALF],
                        [GUIDE_HALF, guide.position, -GUIDE_HALF],
                        [GUIDE_HALF, guide.position, GUIDE_HALF],
                        [-GUIDE_HALF, guide.position, GUIDE_HALF],
                        [-GUIDE_HALF, guide.position, -GUIDE_HALF]
                      ]
                    : [
                        [-GUIDE_HALF, -GUIDE_HALF, guide.position],
                        [GUIDE_HALF, -GUIDE_HALF, guide.position],
                        [GUIDE_HALF, GUIDE_HALF, guide.position],
                        [-GUIDE_HALF, GUIDE_HALF, guide.position],
                        [-GUIDE_HALF, -GUIDE_HALF, guide.position]
                      ]
              }
              color={axisColors[guide.axis]}
              lineWidth={1}
              dashed
              dashSize={2}
              gapSize={1}
            />
          </group>
        );
      })}
    </group>
  );
}
