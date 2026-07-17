import { describe, it, expect, vi } from 'vitest';

// Use real Three.js so rotation math actually works in getPartAABB tests
vi.unmock('three');

import {
  LIGHTING_PRESETS,
  isOrbitControls,
  getPartAABB,
  bindWindowPointerSession,
  createPointerRafQueue
} from './workspaceUtils';
import { createGeometryCache } from '../../interaction/geometry/cache';
import { createTestPart } from '../../../../../tests/helpers/factories';

// ============================================================
// Tests
// ============================================================

describe('workspaceUtils', () => {
  describe('LIGHTING_PRESETS', () => {
    it('defines all four lighting modes', () => {
      expect(LIGHTING_PRESETS.default).toBeDefined();
      expect(LIGHTING_PRESETS.bright).toBeDefined();
      expect(LIGHTING_PRESETS.studio).toBeDefined();
      expect(LIGHTING_PRESETS.dramatic).toBeDefined();
    });

    it('each preset has required properties', () => {
      for (const [, preset] of Object.entries(LIGHTING_PRESETS)) {
        expect(typeof preset.ambient).toBe('number');
        expect(preset.mainLight.position).toHaveLength(3);
        expect(typeof preset.mainLight.intensity).toBe('number');
        expect(preset.fillLight.position).toHaveLength(3);
        expect(typeof preset.fillLight.intensity).toBe('number');
        expect(typeof preset.description).toBe('string');
      }
    });

    it('dramatic has lower ambient than bright', () => {
      expect(LIGHTING_PRESETS.dramatic.ambient).toBeLessThan(LIGHTING_PRESETS.bright.ambient);
    });
  });

  describe('isOrbitControls', () => {
    it('returns false for null', () => {
      expect(isOrbitControls(null)).toBe(false);
    });

    it('returns false for object without enabled property', () => {
      const notControls = { addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false };
      expect(isOrbitControls(notControls as never)).toBe(false);
    });

    it('returns true for object with enabled property', () => {
      const controls = {
        enabled: true,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      };
      expect(isOrbitControls(controls as never)).toBe(true);
    });
  });

  describe('bindWindowPointerSession', () => {
    it('binds pointer move and terminal listeners and removes them on cleanup', () => {
      const listeners = new Map<string, unknown>();
      const target = {
        addEventListener: vi.fn((type: string, listener: unknown) => {
          listeners.set(type, listener);
        }),
        removeEventListener: vi.fn((type: string, listener: unknown) => {
          expect(listeners.get(type)).toBe(listener);
          listeners.delete(type);
        })
      };
      const onMove = vi.fn();
      const onEnd = vi.fn();

      const cleanup = bindWindowPointerSession(target, { onMove, onEnd });

      expect(target.addEventListener).toHaveBeenCalledWith('pointermove', onMove);
      expect(target.addEventListener).toHaveBeenCalledWith('pointerup', onEnd);
      expect(target.addEventListener).toHaveBeenCalledWith('pointercancel', onEnd);
      expect(target.addEventListener).toHaveBeenCalledWith('blur', onEnd);

      cleanup();

      expect(listeners.size).toBe(0);
      expect(target.removeEventListener).toHaveBeenCalledWith('pointermove', onMove);
      expect(target.removeEventListener).toHaveBeenCalledWith('pointerup', onEnd);
      expect(target.removeEventListener).toHaveBeenCalledWith('pointercancel', onEnd);
      expect(target.removeEventListener).toHaveBeenCalledWith('blur', onEnd);
    });
  });

  describe('createPointerRafQueue', () => {
    it('coalesces pointer moves to one animation frame and cancels pending work', () => {
      let nextFrameId = 1;
      const frames = new Map<number, () => void>();
      const target = {
        requestAnimationFrame: vi.fn((callback: () => void) => {
          const frameId = nextFrameId++;
          frames.set(frameId, callback);
          return frameId;
        }),
        cancelAnimationFrame: vi.fn((frameId: number) => {
          frames.delete(frameId);
        })
      };
      const onFrame = vi.fn();
      const firstEvent = { clientX: 1 } as PointerEvent;
      const latestEvent = { clientX: 2 } as PointerEvent;

      const queue = createPointerRafQueue(target, onFrame);

      queue.schedule(firstEvent);
      queue.schedule(latestEvent);

      expect(target.requestAnimationFrame).toHaveBeenCalledTimes(1);

      frames.get(1)?.();

      expect(onFrame).toHaveBeenCalledWith(latestEvent);

      const canceledEvent = { clientX: 3 } as PointerEvent;
      queue.schedule(canceledEvent);
      queue.cancel();

      expect(target.cancelAnimationFrame).toHaveBeenCalledWith(2);
      expect(frames.has(2)).toBe(false);
      expect(onFrame).not.toHaveBeenCalledWith(canceledEvent);
    });
  });

  // Right-click target globals were removed in Phase 3b cleanup — context
  // menu routing now flows through the session controller and hit-test
  // service. See ADR-002 + ADR-003.

  describe('getPartAABB', () => {
    it('calculates AABB for un-rotated part at origin', () => {
      const part = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        length: 10,
        width: 6,
        thickness: 2
      };

      const aabb = getPartAABB(part);

      expect(aabb.minX).toBeCloseTo(-5);
      expect(aabb.maxX).toBeCloseTo(5);
      expect(aabb.minY).toBeCloseTo(-1);
      expect(aabb.maxY).toBeCloseTo(1);
      expect(aabb.minZ).toBeCloseTo(-3);
      expect(aabb.maxZ).toBeCloseTo(3);
    });

    it('calculates AABB for un-rotated part at offset position', () => {
      const part = {
        position: { x: 10, y: 5, z: 3 },
        rotation: { x: 0, y: 0, z: 0 },
        length: 4,
        width: 2,
        thickness: 1
      };

      const aabb = getPartAABB(part);

      expect(aabb.minX).toBeCloseTo(8);
      expect(aabb.maxX).toBeCloseTo(12);
      expect(aabb.minY).toBeCloseTo(4.5);
      expect(aabb.maxY).toBeCloseTo(5.5);
      expect(aabb.minZ).toBeCloseTo(2);
      expect(aabb.maxZ).toBeCloseTo(4);
    });

    it('calculates AABB for 90-degree Y rotation', () => {
      const part = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 90, z: 0 },
        length: 10,
        width: 4,
        thickness: 2
      };

      const aabb = getPartAABB(part);

      // After 90° Y rotation, length (X) becomes Z and width (Z) becomes X
      expect(aabb.minX).toBeCloseTo(-2); // was width/2
      expect(aabb.maxX).toBeCloseTo(2);
      expect(aabb.minY).toBeCloseTo(-1); // thickness unchanged
      expect(aabb.maxY).toBeCloseTo(1);
      expect(aabb.minZ).toBeCloseTo(-5); // was length/2
      expect(aabb.maxZ).toBeCloseTo(5);
    });

    it('calculates AABB for 90-degree X rotation', () => {
      const part = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 90, y: 0, z: 0 },
        length: 6,
        width: 4,
        thickness: 2
      };

      const aabb = getPartAABB(part);

      // After 90° X rotation, thickness (Y) becomes Z and width (Z) becomes Y
      expect(aabb.minX).toBeCloseTo(-3); // length unchanged
      expect(aabb.maxX).toBeCloseTo(3);
      expect(aabb.minY).toBeCloseTo(-2); // was width/2
      expect(aabb.maxY).toBeCloseTo(2);
      expect(aabb.minZ).toBeCloseTo(-1); // was thickness/2
      expect(aabb.maxZ).toBeCloseTo(1);
    });

    it('AABB is always >= the un-rotated size', () => {
      const part = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 45, y: 30, z: 15 },
        length: 8,
        width: 4,
        thickness: 2
      };

      const aabb = getPartAABB(part);
      const xSize = aabb.maxX - aabb.minX;
      const ySize = aabb.maxY - aabb.minY;
      const zSize = aabb.maxZ - aabb.minZ;

      // AABB should contain the original dimensions
      // (diagonal of the un-rotated box is the minimum possible AABB extent)
      expect(xSize).toBeGreaterThan(0);
      expect(ySize).toBeGreaterThan(0);
      expect(zSize).toBeGreaterThan(0);
    });

    it('works with very small dimensions', () => {
      const part = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        length: 0.125,
        width: 0.0625,
        thickness: 0.03125
      };

      const aabb = getPartAABB(part);

      expect(aabb.maxX - aabb.minX).toBeCloseTo(0.125);
      expect(aabb.maxY - aabb.minY).toBeCloseTo(0.03125);
      expect(aabb.maxZ - aabb.minZ).toBeCloseTo(0.0625);
    });

    it('handles 180-degree rotation (same dimensions, different corners)', () => {
      const part = {
        position: { x: 5, y: 3, z: 2 },
        rotation: { x: 0, y: 180, z: 0 },
        length: 10,
        width: 4,
        thickness: 2
      };

      const aabb = getPartAABB(part);

      // 180° rotation should not change AABB size
      expect(aabb.minX).toBeCloseTo(0);
      expect(aabb.maxX).toBeCloseTo(10);
      expect(aabb.minY).toBeCloseTo(2);
      expect(aabb.maxY).toBeCloseTo(4);
      expect(aabb.minZ).toBeCloseTo(0);
      expect(aabb.maxZ).toBeCloseTo(4);
    });

    it('can derive local bounds from the geometry bundle cache', () => {
      const part = createTestPart({
        id: 'cached-part',
        position: { x: 3, y: 4, z: 5 },
        rotation: { x: 45, y: 30, z: 15 },
        length: 8,
        width: 4,
        thickness: 2
      });
      const cache = createGeometryCache();

      const legacyAabb = getPartAABB(part);
      const cachedAabb = getPartAABB(part, cache);

      expect(cachedAabb).toEqual(legacyAabb);
      expect(cache.size()).toBe(1);
    });
  });
});
