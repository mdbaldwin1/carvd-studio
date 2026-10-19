import { useMemo } from 'react';
import type { BufferGeometry } from 'three';
import { buildCleanOutlineGeometry } from '@renderer/utils/cleanOutline';

const cache = new WeakMap<BufferGeometry, BufferGeometry>();

export function PartOutline({
  geometry,
  color = '#433225',
  scale = 1,
  renderOrder = 4
}: {
  geometry: BufferGeometry;
  color?: string;
  scale?: number;
  renderOrder?: number;
}) {
  const outline = useMemo(() => {
    let result = cache.get(geometry);
    if (!result) {
      result = buildCleanOutlineGeometry(geometry);
      cache.set(geometry, result);
    }
    return result;
  }, [geometry]);
  if (!outline.getAttribute('position').count) return null;
  return (
    <lineSegments geometry={outline} dispose={null} raycast={() => {}} scale={scale} renderOrder={renderOrder}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}
