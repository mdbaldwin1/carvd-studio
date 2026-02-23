import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

const LOG_INTERVAL_MS = 5000;

export function RendererInfoLogger() {
  const { gl, scene } = useThree();
  const lastLogTime = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (now - lastLogTime.current < LOG_INTERVAL_MS) return;
    lastLogTime.current = now;

    let objectCount = 0;
    scene.traverse(() => {
      objectCount++;
    });

    const { render, memory } = gl.info;
    console.info(
      `[Perf] Draw calls: ${render.calls}  Triangles: ${render.triangles}  ` +
        `Geometries: ${memory.geometries}  Textures: ${memory.textures}  ` +
        `Scene objects: ${objectCount}`
    );
  });

  return null;
}
