import { ThreeEvent, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCameraStore } from '../../store/cameraStore';
import { LiveDimensions, ROTATION_COLORS, ROTATION_HANDLE_SIZE, ROTATION_RING_THICKNESS } from './partTypes';
import {
  ROTATION_HIT_GEOMETRY,
  ROTATION_HIT_MATERIAL,
  ROTATION_MAIN_RING_GEOMETRY,
  ROTATION_ARROW_GEOMETRY,
  ROTATION_RING_ARC_START,
  ROTATION_RING_ARC_LENGTH
} from './partGeometry';
import { chooseBestRotationAxisCandidate } from './rotationAxisSelection';

export const RotationHandle = memo(
  function RotationHandle({
    liveDims,
    axis,
    side,
    onRotate,
    onRotateDelta,
    onRotateStart,
    onRotateEnd
  }: {
    liveDims: LiveDimensions;
    axis: 'x' | 'y' | 'z';
    side: 1 | -1; // Which side of the axis (+1 or -1)
    onRotate: (axis: 'x' | 'y' | 'z') => void;
    onRotateDelta: (axis: 'x' | 'y' | 'z', degrees: number) => void;
    onRotateStart: () => void;
    onRotateEnd: () => void;
  }) {
    const { gl, size, camera } = useThree();
    const displayMode = useCameraStore((s) => s.displayMode);
    const groupRef = useRef<THREE.Group>(null);
    const [ringHovered, setRingHovered] = useState(false);
    const [grabHovered, setGrabHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [displayAngle, setDisplayAngle] = useState(0);
    const draggingRef = useRef(false);
    const dragStartAngleRef = useRef(0);
    const dragModeRef = useRef<'plane' | 'screen'>('screen');
    const lastAppliedDegreesRef = useRef(0);
    const dragCenterRef = useRef<{ x: number; y: number } | null>(null);
    const activePointerIdRef = useRef<number | null>(null);
    const dragAxisRef = useRef<'x' | 'y' | 'z'>(axis);
    const axisLockedRef = useRef(false);
    const axisCandidatesRef = useRef<['x' | 'y' | 'z', 'x' | 'y' | 'z']>(['x', 'y']);
    const dragStartClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const dragStartWorldPointRef = useRef<THREE.Vector3 | null>(null);
    const dragStartVectorRef = useRef<THREE.Vector3 | null>(null);
    const rotationCenterWorldRef = useRef(new THREE.Vector3());
    const rotationAxisWorldRef = useRef(new THREE.Vector3(0, 1, 0));
    const _ndc = useRef(new THREE.Vector2());
    const _raycaster = useRef(new THREE.Raycaster());
    const _rotationPlane = useRef(new THREE.Plane());
    const _worldPos = useRef(new THREE.Vector3());
    const _projected = useRef(new THREE.Vector3());
    const _tmpVecA = useRef(new THREE.Vector3());
    const _tmpVecB = useRef(new THREE.Vector3());
    const _tmpVecC = useRef(new THREE.Vector3());
    const _tmpQuat = useRef(new THREE.Quaternion());

    const halfLength = liveDims.length / 2;
    const halfThickness = liveDims.thickness / 2;
    const halfWidth = liveDims.width / 2;
    const minPartDimension = Math.min(liveDims.length, liveDims.width, liveDims.thickness);
    const offset = 0.2; // Distance above the surface

    // Face-center position in part-local space
    let facePosition: [number, number, number];
    let faceNormal: THREE.Vector3;
    let ringEuler: THREE.Euler;
    if (axis === 'y') {
      // Top (+1) or bottom (-1) face - ring lies flat (parallel to XZ plane)
      facePosition = [0, side * (halfThickness + offset), 0];
      faceNormal = new THREE.Vector3(0, side, 0);
      ringEuler = new THREE.Euler(side === 1 ? Math.PI / 2 : -Math.PI / 2, 0, 0);
    } else if (axis === 'x') {
      // +X or -X side face - ring parallel to YZ plane
      facePosition = [side * (halfLength + offset), 0, 0];
      faceNormal = new THREE.Vector3(side, 0, 0);
      ringEuler = new THREE.Euler(0, side === 1 ? -Math.PI / 2 : Math.PI / 2, 0);
    } else {
      // +Z or -Z front/back face - ring parallel to XY plane
      facePosition = [0, 0, side * (halfWidth + offset)];
      faceNormal = new THREE.Vector3(0, 0, side);
      ringEuler = side === 1 ? new THREE.Euler(0, 0, 0) : new THREE.Euler(0, Math.PI, 0);
    }
    const faceQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), faceNormal);
    const ringQuaternion = new THREE.Quaternion().setFromEuler(ringEuler);

    const baseColor = ROTATION_COLORS[axis];
    const ringColor = ringHovered || isDragging ? ROTATION_COLORS.hover : baseColor;
    const grabColor = grabHovered || isDragging ? ROTATION_COLORS.hover : baseColor;
    const glyphRollZ = axis === 'z' ? Math.PI : 0;

    const zOffset = 0.02; // Z offset to sit on top of the ring and avoid z-fighting
    const arrowScale = THREE.MathUtils.clamp(0.68 + minPartDimension * 0.16, 0.62, 1.26);
    const arrowAnchorAngle =
      axis === 'z' ? ROTATION_RING_ARC_START : ROTATION_RING_ARC_START + ROTATION_RING_ARC_LENGTH;
    const arrowAngle = arrowAnchorAngle + glyphRollZ;
    const arrowRadius = ROTATION_HANDLE_SIZE - ROTATION_RING_THICKNESS * 0.14;
    const arrowPosition: [number, number, number] = [
      Math.cos(arrowAngle) * arrowRadius,
      Math.sin(arrowAngle) * arrowRadius,
      zOffset
    ];
    const arrowTangentSign = axis === 'z' ? -1 : 1;
    const arrowDirectionX = -Math.sin(arrowAngle) * arrowTangentSign;
    const arrowDirectionY = Math.cos(arrowAngle) * arrowTangentSign;
    const arrowRotationZ = Math.atan2(arrowDirectionY, arrowDirectionX);
    const stemDistance = ROTATION_HANDLE_SIZE + ROTATION_RING_THICKNESS + 0.9;
    const grabRadius = 0.16;
    const grabHitRadius = 0.5;
    const handleDirection = 1;
    // In ring-local space, +Z is face-normal; +X is tangent around the ring.
    const grabPosition: [number, number, number] = [0, 0, stemDistance * handleDirection];
    const connectorGeometry = useMemo(() => {
      const connectorStart = ROTATION_RING_THICKNESS * 0.5;
      const stemEndZ = (stemDistance - grabRadius * 0.55) * handleDirection;
      const geometry = new THREE.BufferGeometry();
      // Straight connector from ring edge to knob.
      geometry.setFromPoints([
        new THREE.Vector3(0, 0, connectorStart * handleDirection),
        new THREE.Vector3(0, 0, stemEndZ)
      ]);
      return geometry;
    }, [grabRadius, handleDirection, stemDistance]);

    const getProjectedScreenCenter = (fallbackClientX: number, fallbackClientY: number) => {
      const group = groupRef.current;
      const centerObject = group?.parent ?? group;
      if (!centerObject) return { x: fallbackClientX, y: fallbackClientY };

      centerObject.getWorldPosition(_worldPos.current);
      _projected.current.copy(_worldPos.current).project(camera);
      const canvasRect = gl.domElement.getBoundingClientRect();

      return {
        x: canvasRect.left + (_projected.current.x * 0.5 + 0.5) * size.width,
        y: canvasRect.top + (-_projected.current.y * 0.5 + 0.5) * size.height
      };
    };

    const getWorldPointOnRotationPlane = useCallback(
      (clientX: number, clientY: number): THREE.Vector3 | null => {
        const rect = gl.domElement.getBoundingClientRect();
        _ndc.current.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
        _raycaster.current.setFromCamera(_ndc.current, camera);
        if (_raycaster.current.ray.intersectPlane(_rotationPlane.current, _tmpVecA.current)) {
          return _tmpVecA.current.clone();
        }
        return null;
      },
      [camera, gl]
    );

    const getScreenAngle = (clientX: number, clientY: number, center: { x: number; y: number }) => {
      return Math.atan2(clientY - center.y, clientX - center.x);
    };

    const stopWorkspaceSelection = (e: ThreeEvent<MouseEvent | PointerEvent>) => {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    };

    const getProjectedScreenPoint = useCallback(
      (world: THREE.Vector3): { x: number; y: number } => {
        _projected.current.copy(world).project(camera);
        const canvasRect = gl.domElement.getBoundingClientRect();
        return {
          x: canvasRect.left + (_projected.current.x * 0.5 + 0.5) * size.width,
          y: canvasRect.top + (-_projected.current.y * 0.5 + 0.5) * size.height
        };
      },
      [camera, gl, size.height, size.width]
    );

    const shortestAngleDelta = (from: number, to: number): number => {
      let delta = to - from;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      return delta;
    };

    const setRotationAxisFromLocalAxis = useCallback((localAxis: 'x' | 'y' | 'z') => {
      _tmpVecA.current.set(localAxis === 'x' ? 1 : 0, localAxis === 'y' ? 1 : 0, localAxis === 'z' ? 1 : 0);
      rotationAxisWorldRef.current.copy(_tmpVecA.current).applyQuaternion(_tmpQuat.current).normalize();
      _rotationPlane.current.setFromNormalAndCoplanarPoint(
        rotationAxisWorldRef.current,
        rotationCenterWorldRef.current
      );
      dragAxisRef.current = localAxis;
    }, []);

    const lockAxisFromInitialDrag = useCallback(
      (clientX: number, clientY: number): boolean => {
        if (axisLockedRef.current) return true;

        const dx = clientX - dragStartClientRef.current.x;
        const dy = clientY - dragStartClientRef.current.y;
        const mag = Math.hypot(dx, dy);
        if (mag < 3) return false;
        const dragDirX = dx / mag;
        const dragDirY = dy / mag;

        const [candidateA, candidateB] = axisCandidatesRef.current;
        const viewDirToCenter = _tmpVecB.current.copy(rotationCenterWorldRef.current).sub(camera.position).normalize();
        const evaluateCandidate = (candidate: 'x' | 'y' | 'z') => {
          setRotationAxisFromLocalAxis(candidate);
          // Prefer the actual pointer-down world point projected onto the candidate rotation plane.
          const planeNormal = rotationAxisWorldRef.current;
          let startVector: THREE.Vector3;
          if (dragStartWorldPointRef.current) {
            const offset = _tmpVecB.current.copy(dragStartWorldPointRef.current).sub(rotationCenterWorldRef.current);
            const normalComp = offset.dot(planeNormal);
            startVector = offset.addScaledVector(planeNormal, -normalComp);
          } else {
            const startWorldPoint = getWorldPointOnRotationPlane(
              dragStartClientRef.current.x,
              dragStartClientRef.current.y
            );
            if (!startWorldPoint) return null;
            startVector = _tmpVecB.current.copy(startWorldPoint).sub(rotationCenterWorldRef.current);
          }
          if (startVector.lengthSq() < 1e-8) return null;
          startVector.normalize();

          const tangentWorld = _tmpVecC.current.copy(rotationAxisWorldRef.current).cross(startVector).normalize();
          const p0World = _tmpVecA.current.copy(rotationCenterWorldRef.current).add(startVector);
          const p0 = getProjectedScreenPoint(p0World);
          const p1 = getProjectedScreenPoint(_tmpVecA.current.copy(p0World).addScaledVector(tangentWorld, 0.25));
          const tx = p1.x - p0.x;
          const ty = p1.y - p0.y;
          const tmag = Math.hypot(tx, ty);
          if (tmag < 1e-6) return null;

          const tangentDirX = tx / tmag;
          const tangentDirY = ty / tmag;
          const dot = tangentDirX * dragDirX + tangentDirY * dragDirY;
          const tangentStrength = THREE.MathUtils.clamp(tmag / 24, 0, 1);
          const axisPerpendicularity = 1 - Math.abs(rotationAxisWorldRef.current.dot(viewDirToCenter));
          const alignment = Math.abs(dot);
          return {
            candidate,
            alignment,
            tangentStrength,
            axisPerpendicularity,
            startVector: startVector.clone()
          };
        };

        const resultA = evaluateCandidate(candidateA);
        const resultB = evaluateCandidate(candidateB);
        const best = chooseBestRotationAxisCandidate(resultA, resultB);
        if (!best) return false;

        setRotationAxisFromLocalAxis(best.candidate);
        dragStartVectorRef.current = best.startVector;
        dragModeRef.current = 'plane';
        axisLockedRef.current = true;
        return true;
      },
      [camera.position, getProjectedScreenPoint, getWorldPointOnRotationPlane, setRotationAxisFromLocalAxis]
    );

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
      if (e.nativeEvent.button !== 0) return;
      e.stopPropagation();
      if (typeof e.nativeEvent.stopImmediatePropagation === 'function') {
        e.nativeEvent.stopImmediatePropagation();
      }
      if (typeof e.target.setPointerCapture === 'function') {
        e.target.setPointerCapture(e.pointerId);
      }
      const group = groupRef.current;
      const centerObject = group?.parent ?? group;
      if (centerObject) {
        centerObject.getWorldPosition(rotationCenterWorldRef.current);
        centerObject.getWorldQuaternion(_tmpQuat.current);
      }
      // Each handle supports exactly two rotation axes:
      // the two axes orthogonal to the handle alignment (`axis`), never `axis` itself.
      const secondaryCandidates = (['x', 'y', 'z'] as const).filter((a) => a !== axis);
      axisCandidatesRef.current = [secondaryCandidates[0], secondaryCandidates[1]];
      axisLockedRef.current = false;
      dragAxisRef.current = secondaryCandidates[0];
      setRotationAxisFromLocalAxis(dragAxisRef.current);

      activePointerIdRef.current = e.pointerId;
      dragStartClientRef.current = { x: e.clientX, y: e.clientY };
      dragStartWorldPointRef.current = e.point ? e.point.clone() : null;
      const center = getProjectedScreenCenter(e.clientX, e.clientY);
      dragCenterRef.current = center;
      dragStartAngleRef.current = getScreenAngle(e.clientX, e.clientY, center);
      dragModeRef.current = 'screen';
      dragStartVectorRef.current = null;
      lastAppliedDegreesRef.current = 0;
      draggingRef.current = true;
      setDisplayAngle(0);
      setIsDragging(true);
      onRotateStart();
      document.body.style.cursor = 'grabbing';
    };

    const handleWindowPointerMove = useCallback(
      (e: PointerEvent) => {
        if (!draggingRef.current) return;
        if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

        lockAxisFromInitialDrag(e.clientX, e.clientY);
        let rawDegrees = 0;
        if (axisLockedRef.current && dragModeRef.current === 'plane' && dragStartVectorRef.current) {
          const currentWorldPoint = getWorldPointOnRotationPlane(e.clientX, e.clientY);
          if (!currentWorldPoint) return;
          const currentVector = _tmpVecC.current.copy(currentWorldPoint).sub(rotationCenterWorldRef.current);
          if (currentVector.lengthSq() < 1e-8) return;
          currentVector.normalize();

          const startVector = dragStartVectorRef.current;
          const cross = _tmpVecA.current.copy(startVector).cross(currentVector);
          const sin = rotationAxisWorldRef.current.dot(cross);
          const cos = THREE.MathUtils.clamp(startVector.dot(currentVector), -1, 1);
          const totalRadians = Math.atan2(sin, cos);
          const worldDegrees = Math.abs((totalRadians * 180) / Math.PI);
          const center = dragCenterRef.current;
          if (!center) return;
          const currentAngle = getScreenAngle(e.clientX, e.clientY, center);
          const screenDegrees = (shortestAngleDelta(dragStartAngleRef.current, currentAngle) * 180) / Math.PI;
          const screenSign = Math.abs(screenDegrees) < 0.01 ? 0 : Math.sign(screenDegrees);
          const viewDirToCenter = _tmpVecB.current
            .copy(rotationCenterWorldRef.current)
            .sub(camera.position)
            .normalize();
          const axisFacing = rotationAxisWorldRef.current.dot(viewDirToCenter);
          const viewSign = Math.abs(axisFacing) < 1e-6 ? 1 : Math.sign(axisFacing);
          rawDegrees = worldDegrees * (screenSign === 0 ? 1 : screenSign) * viewSign;
        } else {
          const center = dragCenterRef.current;
          if (!center) return;
          const currentAngle = getScreenAngle(e.clientX, e.clientY, center);
          const totalRadians = shortestAngleDelta(dragStartAngleRef.current, currentAngle);
          rawDegrees = (totalRadians * 180) / Math.PI;
        }

        const snappedDegrees = e.shiftKey ? rawDegrees : Math.round(rawDegrees / 15) * 15;
        const deltaToApply = snappedDegrees - lastAppliedDegreesRef.current;

        if (Math.abs(deltaToApply) >= 0.01) {
          onRotateDelta(dragAxisRef.current, deltaToApply);
          lastAppliedDegreesRef.current = snappedDegrees;
          setDisplayAngle(snappedDegrees);
        }
      },
      [camera.position, getWorldPointOnRotationPlane, lockAxisFromInitialDrag, onRotateDelta]
    );

    const finishDrag = useCallback(
      (pointerId?: number) => {
        if (!draggingRef.current) return;
        if (activePointerIdRef.current !== null && pointerId !== undefined && pointerId !== activePointerIdRef.current)
          return;

        draggingRef.current = false;
        axisLockedRef.current = false;
        dragCenterRef.current = null;
        dragStartVectorRef.current = null;
        dragStartWorldPointRef.current = null;
        activePointerIdRef.current = null;
        setIsDragging(false);
        onRotateEnd();
        document.body.style.cursor = ringHovered || grabHovered ? 'pointer' : 'auto';
      },
      [grabHovered, onRotateEnd, ringHovered]
    );

    useEffect(() => {
      if (!isDragging) return;

      const handleWindowPointerUp = (e: PointerEvent) => {
        finishDrag(e.pointerId);
      };
      const handleWindowPointerCancel = (e: PointerEvent) => {
        finishDrag(e.pointerId);
      };

      window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
      window.addEventListener('pointerup', handleWindowPointerUp, { passive: true });
      window.addEventListener('pointercancel', handleWindowPointerCancel, { passive: true });

      return () => {
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerUp);
        window.removeEventListener('pointercancel', handleWindowPointerCancel);
      };
    }, [finishDrag, handleWindowPointerMove, isDragging]);

    useEffect(() => {
      return () => {
        if (draggingRef.current) {
          draggingRef.current = false;
          axisLockedRef.current = false;
          dragCenterRef.current = null;
          dragStartVectorRef.current = null;
          dragStartWorldPointRef.current = null;
          activePointerIdRef.current = null;
          onRotateEnd();
          document.body.style.cursor = 'auto';
        }
      };
    }, [onRotateEnd]);

    const handleRingPointerOver = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setRingHovered(true);
      if (!isDragging && !grabHovered) {
        document.body.style.cursor = 'pointer';
      }
    };

    const handleRingPointerOut = () => {
      setRingHovered(false);
      if (!isDragging && !grabHovered) {
        document.body.style.cursor = 'auto';
      }
    };

    const handleGrabPointerOver = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setGrabHovered(true);
      if (!isDragging) {
        document.body.style.cursor = 'pointer';
      }
    };

    const handleGrabPointerOut = () => {
      setGrabHovered(false);
      if (!isDragging && !ringHovered) {
        document.body.style.cursor = 'auto';
      }
    };

    return (
      <group ref={groupRef} position={facePosition}>
        {/* Invisible ring hit area stays for easier click-to-rotate, but drag uses grab handle */}
        <group quaternion={ringQuaternion}>
          <mesh
            geometry={ROTATION_HIT_GEOMETRY}
            material={ROTATION_HIT_MATERIAL}
            rotation={[0, 0, glyphRollZ]}
            userData={{ blocksPartSelection: true }}
            onPointerOver={handleRingPointerOver}
            onPointerOut={handleRingPointerOut}
            onClick={(e) => {
              stopWorkspaceSelection(e);
              onRotate(axis);
            }}
          />

          {/* Main visible ring - 3/4 arc */}
          <mesh geometry={ROTATION_MAIN_RING_GEOMETRY} rotation={[0, 0, glyphRollZ]}>
            <meshStandardMaterial
              color={ringColor}
              side={THREE.DoubleSide}
              emissive={ringHovered ? baseColor : '#000000'}
              emissiveIntensity={ringHovered ? 0.4 : 0}
            />
          </mesh>

          {/* Flat arrow indicator at arc end, pointing toward arc start */}
          <mesh
            geometry={ROTATION_ARROW_GEOMETRY}
            position={arrowPosition}
            rotation={[0, 0, arrowRotationZ]}
            scale={[arrowScale, arrowScale, 1]}
          >
            <meshStandardMaterial
              color={ringColor}
              side={THREE.DoubleSide}
              emissive={ringHovered ? baseColor : '#000000'}
              emissiveIntensity={ringHovered ? 0.4 : 0}
            />
          </mesh>
        </group>

        <group quaternion={faceQuaternion}>
          {/* Connector from ring to external grab handle */}
          <line
            geometry={connectorGeometry}
            userData={{ blocksPartSelection: true }}
            onPointerDown={stopWorkspaceSelection}
            onClick={stopWorkspaceSelection}
          >
            <lineBasicMaterial color={grabColor} transparent opacity={0.85} />
          </line>

          {/* External grab handle for drag rotation */}
          <group position={grabPosition}>
            <mesh
              userData={{ blocksPartSelection: true }}
              onPointerDown={(e) => {
                stopWorkspaceSelection(e);
                handlePointerDown(e);
              }}
              onClick={stopWorkspaceSelection}
              onPointerOver={handleGrabPointerOver}
              onPointerOut={handleGrabPointerOut}
              renderOrder={1000}
            >
              <sphereGeometry args={[grabHitRadius, 16, 16]} />
              <meshBasicMaterial transparent opacity={0.001} depthTest={false} depthWrite={false} />
            </mesh>
            <mesh
              userData={{ blocksPartSelection: true }}
              onPointerDown={(e) => {
                stopWorkspaceSelection(e);
                handlePointerDown(e);
              }}
              onClick={stopWorkspaceSelection}
              onPointerOver={handleGrabPointerOver}
              onPointerOut={handleGrabPointerOut}
              renderOrder={1001}
            >
              <sphereGeometry args={[grabRadius, 18, 18]} />
              <meshStandardMaterial
                color={grabColor}
                depthTest={displayMode === 'solid'}
                emissive={grabHovered || isDragging ? baseColor : '#000000'}
                emissiveIntensity={grabHovered || isDragging ? 0.35 : 0}
              />
            </mesh>
          </group>
        </group>

        {isDragging && (
          <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-text">
              {Math.round(displayAngle)}°
            </div>
          </Html>
        )}
      </group>
    );
  },
  (prev, next) =>
    prev.liveDims.length === next.liveDims.length &&
    prev.liveDims.width === next.liveDims.width &&
    prev.liveDims.thickness === next.liveDims.thickness &&
    prev.axis === next.axis &&
    prev.side === next.side &&
    prev.onRotate === next.onRotate &&
    prev.onRotateDelta === next.onRotateDelta &&
    prev.onRotateStart === next.onRotateStart &&
    prev.onRotateEnd === next.onRotateEnd
);
