/**
 * Dev-only performance monitoring overlay for the 3D workspace.
 * Renders a Stats panel (FPS/MS/MB) and periodically logs renderer.info to console.
 * Only active when import.meta.env.DEV is true.
 */

import { Stats } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

const LOG_INTERVAL_MS = 5000;

function RendererInfoLogger() {
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

export function PerfMonitor() {
  if (!import.meta.env.DEV) return null;

  return (
    <>
      <Stats />
      <RendererInfoLogger />
    </>
  );
}
