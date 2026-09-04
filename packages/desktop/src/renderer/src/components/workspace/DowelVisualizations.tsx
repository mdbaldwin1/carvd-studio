import type { DowelVisualization } from '@renderer/utils/dowelJointUtils';
import * as THREE from 'three';

interface DowelVisualizationsProps {
  visualizations: DowelVisualization[];
}

export function DowelVisualizations({ visualizations }: DowelVisualizationsProps) {
  return (
    <group name="dowel-visualizations">
      {visualizations.map((visual) => {
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(visual.axis.x, visual.axis.y, visual.axis.z).normalize()
        );
        return (
          <mesh
            key={`${visual.jointId}:${visual.memberIndex}`}
            name={`dowel-${visual.jointId}-${visual.memberIndex}`}
            data-aligned={String(visual.aligned)}
            position={[visual.center.x, visual.center.y, visual.center.z]}
            quaternion={quaternion}
            raycast={() => undefined}
          >
            <cylinderGeometry args={[visual.diameter / 2, visual.diameter / 2, visual.length, 24]} />
            <meshStandardMaterial
              color={visual.aligned ? '#c89b5b' : '#ef4444'}
              roughness={0.7}
              metalness={0}
              transparent={!visual.aligned}
              opacity={visual.aligned ? 1 : 0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}
