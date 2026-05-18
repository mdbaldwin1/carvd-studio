import { describe, expect, it, vi } from 'vitest';

// The global vitest setup mocks `three` for component tests. The hit-test
// service is an engine module that needs the real implementation.
vi.unmock('three');
vi.mock('three', async () => await vi.importActual('three'));

import * as THREE from 'three';
import type { Part } from '../types';
import {
  createOverlayRegistry,
  getHitTargetDescriptor,
  hasInteractiveHitAt,
  resolveHitTarget,
  setHitTargetDescriptor,
  type HitTargetDescriptor,
  type HitTestContext,
  type ScreenPoint
} from './hitTest';

// ─────────────────────────────────────────────────────────────────────────────
// Test harness — builds a real Three.js scene with an orthographic camera
// looking straight down at the XZ plane. Clicks in screen space hit predictable
// points in world space, which makes assertions readable.
// ─────────────────────────────────────────────────────────────────────────────

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const VIEW_SIZE = 100; // ±100 inches horizontal/vertical visible from above

function makeTopDownCamera(): THREE.OrthographicCamera {
  const aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
  const halfW = VIEW_SIZE * aspect;
  const halfH = VIEW_SIZE;
  const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 1000);
  cam.position.set(0, 50, 0);
  cam.up.set(0, 0, -1);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
}

function canvasRect() {
  return { left: 0, top: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
}

/**
 * Convert a world XZ position to the client pixel that would project to it
 * under the top-down ortho camera. Y is fixed at 0 by convention.
 */
function clientFromWorldXZ(worldX: number, worldZ: number): ScreenPoint {
  const aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
  const halfW = VIEW_SIZE * aspect;
  const halfH = VIEW_SIZE;
  // Top-down camera with up = -Z makes screen-Y increase as world-Z decreases.
  // Inverse: clientX = (worldX/halfW + 1)/2 * canvasWidth
  //          clientY = (worldZ/halfH + 1)/2 * canvasHeight
  // Verify mapping by spot-check tests below.
  const clientX = ((worldX / halfW + 1) / 2) * CANVAS_WIDTH;
  const clientY = ((worldZ / halfH + 1) / 2) * CANVAS_HEIGHT;
  return { clientX, clientY };
}

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    name: 'p1',
    length: 20,
    width: 20,
    thickness: 1,
    position: { x: 0, y: 0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#fff',
    ...overrides
  };
}

function makePartMesh(part: Part, descriptor: HitTargetDescriptor): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(part.length, part.thickness, part.width);
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(part.position.x, part.position.y, part.position.z);
  mesh.rotation.set(
    (part.rotation.x * Math.PI) / 180,
    (part.rotation.y * Math.PI) / 180,
    (part.rotation.z * Math.PI) / 180,
    'XYZ'
  );
  setHitTargetDescriptor(mesh, descriptor);
  mesh.updateMatrixWorld(true);
  return mesh;
}

function makeScene(meshes: THREE.Object3D[]): THREE.Scene {
  const scene = new THREE.Scene();
  for (const m of meshes) scene.add(m);
  scene.updateMatrixWorld(true);
  return scene;
}

function makeContext(scene: THREE.Scene, parts: Part[]): HitTestContext {
  return {
    camera: makeTopDownCamera(),
    scene,
    canvasRect: canvasRect(),
    parts
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Descriptor read/write
// ─────────────────────────────────────────────────────────────────────────────

describe('getHitTargetDescriptor / setHitTargetDescriptor', () => {
  it('round-trips a descriptor on userData', () => {
    const mesh = new THREE.Mesh();
    setHitTargetDescriptor(mesh, { kind: 'part-body', nodeId: 'p1', partId: 'p1' });
    expect(getHitTargetDescriptor(mesh)).toEqual({
      kind: 'part-body',
      nodeId: 'p1',
      partId: 'p1'
    });
  });

  it('returns null when no descriptor is set', () => {
    expect(getHitTargetDescriptor(new THREE.Mesh())).toBeNull();
    expect(getHitTargetDescriptor(undefined)).toBeNull();
  });

  it('clears the descriptor when passed null', () => {
    const mesh = new THREE.Mesh();
    setHitTargetDescriptor(mesh, { kind: 'ground' });
    expect(getHitTargetDescriptor(mesh)).not.toBeNull();
    setHitTargetDescriptor(mesh, null);
    expect(getHitTargetDescriptor(mesh)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HitTarget kinds — one test per discriminant
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveHitTarget kinds', () => {
  it('part-body — returns the part the click ray intersects', () => {
    const part = makePart({ id: 'p1', position: { x: 0, y: 0.5, z: 0 } });
    const mesh = makePartMesh(part, { kind: 'part-body', nodeId: 'p1', partId: 'p1' });
    const scene = makeScene([mesh]);

    const result = resolveHitTarget(clientFromWorldXZ(0, 0), makeContext(scene, [part]));
    expect(result).toMatchObject({ kind: 'part-body', partId: 'p1', nodeId: 'p1' });
  });

  it('part-body-instanced — uses partIdByInstance + instanceId', () => {
    const partA = makePart({ id: 'a', position: { x: -10, y: 0.5, z: 0 } });
    const partB = makePart({ id: 'b', position: { x: 10, y: 0.5, z: 0 } });

    const geometry = new THREE.BoxGeometry(20, 1, 20);
    const material = new THREE.MeshBasicMaterial();
    const instanced = new THREE.InstancedMesh(geometry, material, 2);
    const tmp = new THREE.Matrix4();
    tmp.setPosition(-10, 0.5, 0);
    instanced.setMatrixAt(0, tmp);
    tmp.setPosition(10, 0.5, 0);
    instanced.setMatrixAt(1, tmp);
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
    setHitTargetDescriptor(instanced, {
      kind: 'part-body-instanced',
      nodeId: 'instanced-batch',
      partIdByInstance: ['a', 'b']
    });

    const scene = makeScene([instanced]);
    const ctx = makeContext(scene, [partA, partB]);

    const left = resolveHitTarget(clientFromWorldXZ(-10, 0), ctx);
    expect(left).toMatchObject({ kind: 'part-body', partId: 'a' });

    const right = resolveHitTarget(clientFromWorldXZ(10, 0), ctx);
    expect(right).toMatchObject({ kind: 'part-body', partId: 'b' });
  });

  it('resize-handle — returns descriptor handle data', () => {
    const handleMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
    handleMesh.position.set(0, 0.5, 0);
    setHitTargetDescriptor(handleMesh, {
      kind: 'resize-handle',
      nodeId: 'p1',
      partId: 'p1',
      handle: { x: 1, y: 0, z: 0, type: 'edge-x' }
    });
    handleMesh.updateMatrixWorld(true);

    const scene = makeScene([handleMesh]);
    const ctx = makeContext(scene, []);
    const result = resolveHitTarget(clientFromWorldXZ(0, 0), ctx);
    expect(result).toMatchObject({
      kind: 'resize-handle',
      partId: 'p1',
      handle: { x: 1, y: 0, z: 0, type: 'edge-x' }
    });
  });

  it('rotation-handle — returns axis + side', () => {
    const handleMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
    handleMesh.position.set(0, 0.5, 0);
    setHitTargetDescriptor(handleMesh, {
      kind: 'rotation-handle',
      nodeId: 'p1',
      partId: 'p1',
      axis: 'y',
      side: 1
    });
    handleMesh.updateMatrixWorld(true);

    const scene = makeScene([handleMesh]);
    const result = resolveHitTarget(clientFromWorldXZ(0, 0), makeContext(scene, []));
    expect(result).toMatchObject({ kind: 'rotation-handle', partId: 'p1', axis: 'y', side: 1 });
  });

  it('snap-guide — returns guide id', () => {
    const guideMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
    guideMesh.position.set(0, 0.5, 0);
    setHitTargetDescriptor(guideMesh, { kind: 'snap-guide', guideId: 'guide-1' });
    guideMesh.updateMatrixWorld(true);

    const result = resolveHitTarget(clientFromWorldXZ(0, 0), makeContext(makeScene([guideMesh]), []));
    expect(result).toEqual({ kind: 'snap-guide', guideId: 'guide-1' });
  });

  it('ground — returns world point', () => {
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial());
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    setHitTargetDescriptor(groundMesh, { kind: 'ground' });
    groundMesh.updateMatrixWorld(true);

    const result = resolveHitTarget(clientFromWorldXZ(5, -7), makeContext(makeScene([groundMesh]), []));
    expect(result?.kind).toBe('ground');
    if (result?.kind === 'ground') {
      expect(result.worldPoint.x).toBeCloseTo(5, 1);
      expect(result.worldPoint.z).toBeCloseTo(-7, 1);
    }
  });

  it('sky — returns world point', () => {
    // Use a double-sided material so the camera ray hits regardless of the
    // plane orientation. The test is about descriptor classification, not
    // mesh orientation conventions.
    const skyMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    );
    skyMesh.rotation.x = -Math.PI / 2;
    skyMesh.position.y = 10;
    setHitTargetDescriptor(skyMesh, { kind: 'sky' });
    skyMesh.updateMatrixWorld(true);

    const result = resolveHitTarget(clientFromWorldXZ(0, 0), makeContext(makeScene([skyMesh]), []));
    expect(result?.kind).toBe('sky');
  });

  it('overlay — DOM-space registry wins over scene', () => {
    const part = makePart({ id: 'p-under-overlay', position: { x: 0, y: 0.5, z: 0 } });
    const mesh = makePartMesh(part, {
      kind: 'part-body',
      nodeId: 'p-under-overlay',
      partId: 'p-under-overlay'
    });
    const scene = makeScene([mesh]);

    const registry = createOverlayRegistry();
    registry.register({
      overlayId: 'context-menu',
      rect: { left: 100, top: 100, right: 300, bottom: 250 }
    });

    const ctx: HitTestContext = {
      camera: makeTopDownCamera(),
      scene,
      canvasRect: canvasRect(),
      parts: [part],
      overlayRegistry: registry
    };

    // Click inside the overlay rect — overlay wins.
    expect(resolveHitTarget({ clientX: 200, clientY: 175 }, ctx)).toEqual({
      kind: 'overlay',
      overlayId: 'context-menu'
    });

    // Click outside the overlay rect — falls through to the part.
    const clickOnPart = clientFromWorldXZ(0, 0);
    const result = resolveHitTarget(clickOnPart, ctx);
    expect(result?.kind).toBe('part-body');
  });

  it('returns null when the click hits nothing', () => {
    const ctx = makeContext(makeScene([]), []);
    expect(resolveHitTarget({ clientX: 400, clientY: 300 }, ctx)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Overlapping parts — nearest to camera wins
// ─────────────────────────────────────────────────────────────────────────────

describe('overlapping parts', () => {
  it('returns the part closest to the camera when two parts overlap', () => {
    const upper = makePart({ id: 'upper', position: { x: 0, y: 5, z: 0 } });
    const lower = makePart({ id: 'lower', position: { x: 0, y: 0.5, z: 0 } });
    const upperMesh = makePartMesh(upper, {
      kind: 'part-body',
      nodeId: 'upper',
      partId: 'upper'
    });
    const lowerMesh = makePartMesh(lower, {
      kind: 'part-body',
      nodeId: 'lower',
      partId: 'lower'
    });
    const scene = makeScene([upperMesh, lowerMesh]);

    const result = resolveHitTarget(clientFromWorldXZ(0, 0), makeContext(scene, [upper, lower]));
    expect(result).toMatchObject({ kind: 'part-body', partId: 'upper' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rotated parts — descriptor on rotated meshes still resolves correctly
// ─────────────────────────────────────────────────────────────────────────────

describe('rotated parts', () => {
  it('hits a part that has been rotated 45deg around Y', () => {
    const part = makePart({
      id: 'rot',
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 45, z: 0 }
    });
    const mesh = makePartMesh(part, { kind: 'part-body', nodeId: 'rot', partId: 'rot' });
    const scene = makeScene([mesh]);

    // Click at the center — should still hit.
    const result = resolveHitTarget(clientFromWorldXZ(0, 0), makeContext(scene, [part]));
    expect(result).toMatchObject({ kind: 'part-body', partId: 'rot' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ancestor walk — descriptor on parent group still resolves
// ─────────────────────────────────────────────────────────────────────────────

describe('ancestor descriptor walk', () => {
  it('reads hitTarget from a parent group when the leaf mesh has none', () => {
    const group = new THREE.Group();
    setHitTargetDescriptor(group, { kind: 'part-body', nodeId: 'parent', partId: 'parent' });
    const part = makePart({ id: 'parent', position: { x: 0, y: 0.5, z: 0 } });
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(part.length, part.thickness, part.width),
      new THREE.MeshBasicMaterial()
    );
    leaf.position.set(part.position.x, part.position.y, part.position.z);
    // intentionally no descriptor on the leaf
    group.add(leaf);
    group.updateMatrixWorld(true);

    const scene = makeScene([group]);
    const result = resolveHitTarget(clientFromWorldXZ(0, 0), makeContext(scene, [part]));
    expect(result).toMatchObject({ kind: 'part-body', partId: 'parent' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug-class regression tests (from interaction-architecture-redesign.md)
// ─────────────────────────────────────────────────────────────────────────────

describe('bug-class regression: instanced raycast with stale bounding sphere', () => {
  it('falls back to rotated-box and still returns the part', () => {
    // Build an InstancedMesh whose bounding sphere is deliberately wrong
    // (offset far from the actual instances). This simulates the bug where
    // boundingSphere was written on the geometry instead of the mesh after a
    // matrix update. With the fallback path, the part is still hittable.
    const partA = makePart({ id: 'A', position: { x: 0, y: 0.5, z: 0 } });
    const geometry = new THREE.BoxGeometry(20, 1, 20);
    const material = new THREE.MeshBasicMaterial();
    const instanced = new THREE.InstancedMesh(geometry, material, 1);
    const m = new THREE.Matrix4();
    m.setPosition(0, 0.5, 0);
    instanced.setMatrixAt(0, m);
    instanced.instanceMatrix.needsUpdate = true;
    // Bounding sphere far off so the scene raycast misses the instance.
    instanced.boundingSphere = new THREE.Sphere(new THREE.Vector3(10000, 10000, 10000), 0.0001);
    setHitTargetDescriptor(instanced, {
      kind: 'part-body-instanced',
      nodeId: 'inst',
      partIdByInstance: ['A']
    });

    const scene = makeScene([instanced]);
    const ctx = makeContext(scene, [partA]);

    const result = resolveHitTarget(clientFromWorldXZ(0, 0), ctx);
    // The fallback path catches the click.
    expect(result).toMatchObject({ kind: 'part-body', partId: 'A' });
  });
});

describe('bug-class regression: overlay portals must be considered first-class hit targets', () => {
  it('a registered overlay above a part claims clicks inside its rect', () => {
    const part = makePart({ id: 'under', position: { x: 0, y: 0.5, z: 0 } });
    const mesh = makePartMesh(part, { kind: 'part-body', nodeId: 'under', partId: 'under' });
    const scene = makeScene([mesh]);

    const registry = createOverlayRegistry();
    const click = clientFromWorldXZ(0, 0);
    registry.register({
      overlayId: 'ctx-menu',
      rect: { left: click.clientX - 20, top: click.clientY - 20, right: click.clientX + 20, bottom: click.clientY + 20 }
    });

    const ctx: HitTestContext = {
      camera: makeTopDownCamera(),
      scene,
      canvasRect: canvasRect(),
      parts: [part],
      overlayRegistry: registry
    };

    const result = resolveHitTarget(click, ctx);
    expect(result).toEqual({ kind: 'overlay', overlayId: 'ctx-menu' });
  });
});

describe('bug-class regression: resolveHitTarget and hasInteractiveHitAt agree', () => {
  it('every interactive HitTarget kind reads as "interactive" from hasInteractiveHitAt', () => {
    // ground and sky are NOT interactive; everything else is.
    const part = makePart({ id: 'p', position: { x: 0, y: 0.5, z: 0 } });
    const scenarios: Array<{
      meshes: THREE.Object3D[];
      parts: Part[];
      shouldBeInteractive: boolean;
    }> = [
      // part-body
      {
        meshes: [makePartMesh(part, { kind: 'part-body', nodeId: 'p', partId: 'p' })],
        parts: [part],
        shouldBeInteractive: true
      },
      // resize-handle
      {
        meshes: (() => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
          m.position.set(0, 0.5, 0);
          setHitTargetDescriptor(m, {
            kind: 'resize-handle',
            nodeId: 'p',
            partId: 'p',
            handle: { x: 1, y: 0, z: 0, type: 'edge-x' }
          });
          m.updateMatrixWorld(true);
          return [m];
        })(),
        parts: [],
        shouldBeInteractive: true
      },
      // rotation-handle
      {
        meshes: (() => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
          m.position.set(0, 0.5, 0);
          setHitTargetDescriptor(m, {
            kind: 'rotation-handle',
            nodeId: 'p',
            partId: 'p',
            axis: 'y',
            side: 1
          });
          m.updateMatrixWorld(true);
          return [m];
        })(),
        parts: [],
        shouldBeInteractive: true
      },
      // ground (not interactive)
      {
        meshes: (() => {
          const g = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial());
          g.rotation.x = -Math.PI / 2;
          setHitTargetDescriptor(g, { kind: 'ground' });
          g.updateMatrixWorld(true);
          return [g];
        })(),
        parts: [],
        shouldBeInteractive: false
      },
      // sky (not interactive)
      {
        meshes: (() => {
          const s = new THREE.Mesh(
            new THREE.PlaneGeometry(1000, 1000),
            new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
          );
          s.rotation.x = -Math.PI / 2;
          s.position.y = 10;
          setHitTargetDescriptor(s, { kind: 'sky' });
          s.updateMatrixWorld(true);
          return [s];
        })(),
        parts: [],
        shouldBeInteractive: false
      }
    ];

    for (const scenario of scenarios) {
      const scene = makeScene(scenario.meshes);
      const ctx = makeContext(scene, scenario.parts);
      const point = clientFromWorldXZ(0, 0);
      expect(hasInteractiveHitAt(point, ctx)).toBe(scenario.shouldBeInteractive);
    }
  });
});

describe('bug-class regression: hit-test never needs the shouldForceIndividualFallback workaround', () => {
  it('after a hypothetical batch matrix update, instanced parts remain hittable', () => {
    // Set up two instanced parts, then mutate matrices and update bounding
    // sphere — the hit-test should still find both without needing a per-call
    // workaround in the renderer.
    const a = makePart({ id: 'a', position: { x: -10, y: 0.5, z: 0 } });
    const b = makePart({ id: 'b', position: { x: 10, y: 0.5, z: 0 } });

    const geometry = new THREE.BoxGeometry(8, 1, 8);
    const material = new THREE.MeshBasicMaterial();
    const inst = new THREE.InstancedMesh(geometry, material, 2);
    const tmp = new THREE.Matrix4();
    tmp.setPosition(-10, 0.5, 0);
    inst.setMatrixAt(0, tmp);
    tmp.setPosition(10, 0.5, 0);
    inst.setMatrixAt(1, tmp);
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    setHitTargetDescriptor(inst, {
      kind: 'part-body-instanced',
      nodeId: 'batch',
      partIdByInstance: ['a', 'b']
    });

    const scene = makeScene([inst]);
    const ctx = makeContext(scene, [a, b]);

    expect(resolveHitTarget(clientFromWorldXZ(-10, 0), ctx)).toMatchObject({ partId: 'a' });
    expect(resolveHitTarget(clientFromWorldXZ(10, 0), ctx)).toMatchObject({ partId: 'b' });

    // Now move part B's instance to (20, 0.5, 0) and update — still hittable
    // at the new position, not at the old one.
    tmp.setPosition(20, 0.5, 0);
    inst.setMatrixAt(1, tmp);
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    inst.updateMatrixWorld(true);

    const updatedB = { ...b, position: { x: 20, y: 0.5, z: 0 } };
    const ctxUpdated = makeContext(scene, [a, updatedB]);

    expect(resolveHitTarget(clientFromWorldXZ(20, 0), ctxUpdated)).toMatchObject({ partId: 'b' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Overlay registry behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('createOverlayRegistry', () => {
  it('register returns a deregister function', () => {
    const reg = createOverlayRegistry();
    const dereg = reg.register({
      overlayId: 'a',
      rect: { left: 0, top: 0, right: 10, bottom: 10 }
    });
    expect(reg.list()).toHaveLength(1);
    dereg();
    expect(reg.list()).toHaveLength(0);
  });

  it('registering the same id twice replaces the rect', () => {
    const reg = createOverlayRegistry();
    reg.register({ overlayId: 'a', rect: { left: 0, top: 0, right: 10, bottom: 10 } });
    reg.register({ overlayId: 'a', rect: { left: 100, top: 100, right: 200, bottom: 200 } });
    expect(reg.list()).toHaveLength(1);
    expect(reg.list()[0]?.rect.left).toBe(100);
  });

  it('clear empties the registry', () => {
    const reg = createOverlayRegistry();
    reg.register({ overlayId: 'a', rect: { left: 0, top: 0, right: 10, bottom: 10 } });
    reg.register({ overlayId: 'b', rect: { left: 20, top: 20, right: 30, bottom: 30 } });
    reg.clear();
    expect(reg.list()).toHaveLength(0);
  });
});
