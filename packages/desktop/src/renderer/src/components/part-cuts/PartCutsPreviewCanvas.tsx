import { Edges, Html, Line, OrbitControls } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import {
  buildFeatureFromDraft,
  FeatureDraft,
  getFeatureDraftTarget
} from '@renderer/components/part-features/partFeatureEditorState';
import { Button } from '@renderer/components/ui/button';
import { CardDescription } from '@renderer/components/ui/card';
import { Part, PartFeature, PartFeatureTarget } from '@renderer/types';
import { getPartEndCutProfiles } from '@renderer/utils/endCutUtils';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import {
  getPickableTargetLabel,
  getValidPickableTargets,
  partFeatureTargetEquals
} from '@renderer/utils/partCutPicking';
import { getPartRenderGeometry } from '@renderer/utils/partFeatureGeometry';
import { getRectCutDepth, getResolvedRectCutFeature } from '@renderer/utils/rectCutUtils';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

interface PartCutsPreviewCanvasProps {
  part: Part;
  draftFeatures: Part['features'];
  draft: FeatureDraft | null;
  selectedFeatureSummary: string | null;
  selectedFeatureTargetLabel: string | null;
  hoveredTarget: PartFeatureTarget | null;
  pendingTarget: PartFeatureTarget | null;
  onHoverTarget: (target: PartFeatureTarget | null) => void;
  onActivateTarget: (target: PartFeatureTarget | null) => void;
  onDraftChange: (draft: FeatureDraft) => void;
}

export function buildPreviewPart(part: Part, draftFeatures: Part['features'], draft: FeatureDraft | null): Part {
  if (!draft) {
    return {
      ...part,
      features: draftFeatures ?? []
    };
  }

  const draftFeature = buildFeatureFromDraft(draft);
  const nextFeatures = draft.featureId
    ? (draftFeatures ?? []).map((feature) => (feature.id === draft.featureId ? draftFeature : feature))
    : [...(draftFeatures ?? []), draftFeature];

  return {
    ...part,
    features: nextFeatures
  };
}

type HandleKind = 'move' | 'length' | 'width';

interface DimensionLine {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  color: string;
}

interface AngleArc {
  center: [number, number, number];
  /** Points along the arc (polyline) */
  points: [number, number, number][];
  /** Label position (midpoint of the arc) */
  labelPosition: [number, number, number];
  label: string;
  color: string;
}

interface DepthInfo {
  corners: [number, number, number][]; // 4 corners of the cutout at top Y
  topY: number;
  bottomY: number;
  label: string;
  color: string;
}

interface EditableHandleOverlay {
  mode: 'rect';
  operationLabel: string;
  center?: [number, number, number];
  lengthHandle?: [number, number, number];
  widthHandle?: [number, number, number] | null;
  areaPosition?: [number, number, number];
  areaSize?: [number, number, number];
  dimensionLines?: DimensionLine[];
  angleArcs?: AngleArc[];
  depthInfo?: DepthInfo;
}

interface ActiveDragState {
  kind: HandleKind;
  pointerId: number;
  startPoint: THREE.Vector3;
  startDraft: FeatureDraft;
}

const _localPoint = new THREE.Vector3();
const HANDLE_EPSILON = 0.08;
const HANDLE_SIZE = 0.24;
const MIN_DIMENSION = 0.125;
const HANDLE_COLOR = '#f59e0b';
const AREA_COLOR = '#2563eb';
const SUPPORTED_HANDLE_TYPES = new Set(['cutout', 'mortise', 'stopped_dado', 'stopped_groove']);

function shouldUseFallbackPreview(): boolean {
  return (
    typeof window !== 'undefined' && (import.meta.env.MODE === 'test' || window.navigator.userAgent.includes('jsdom'))
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function supportsPreviewHandles(draft: FeatureDraft | null): boolean {
  if (!draft) return false;
  if (draft.mode === 'end_cut') return false;
  return (
    SUPPORTED_HANDLE_TYPES.has(draft.cutType) && (draft.faceTarget === 'top_face' || draft.faceTarget === 'bottom_face')
  );
}

/**
 * Build dimension lines, area overlay, and depth info for any rect_cut feature.
 * Works for ALL rect_cut types (face-targeted and edge-targeted).
 * Returns null for end cuts or features without a resolved rect position.
 */
function buildRectDimensionOverlay(
  part: Part,
  draft: FeatureDraft
): {
  lines: DimensionLine[];
  depthData: DepthInfo;
  x0: number;
  x1: number;
  cz0: number;
  cz1: number;
  y: number;
} | null {
  const feature = buildFeatureFromDraft(draft);
  if (feature.kind !== 'rect_cut') return null;
  const resolved = getResolvedRectCutFeature(feature, part);

  const x0 = -part.length / 2 + resolved.placement.x;
  const z0 = -part.width / 2 + resolved.placement.z;
  const x1 = x0 + resolved.parameters.size.length;
  const z1 = z0 + resolved.parameters.size.width;

  // Y level: above the top face (or below bottom face for bottom-targeted features)
  const targetFace = resolved.target.type === 'face' ? resolved.target.face : 'top_face';
  const isTop = targetFace === 'top_face' || targetFace === 'front_face' || targetFace === 'left_end';
  const y = isTop ? part.thickness / 2 + HANDLE_EPSILON : -part.thickness / 2 - HANDLE_EPSILON;

  // Negate Z to match the rendered geometry (rotateX(-π/2) negates contour Z)
  const cz0 = -z0;
  const cz1 = -z1;

  const fmt = (v: number) => formatMeasurementWithUnit(Math.abs(v), 'imperial');
  const cutLength = resolved.parameters.size.length;
  const cutWidth = resolved.parameters.size.width;
  const offsetLeft = resolved.placement.x;
  const offsetRight = part.length - resolved.placement.x - cutLength;
  const offsetFront = resolved.placement.z;
  const offsetBack = part.width - resolved.placement.z - cutWidth;

  const partLeftX = -part.length / 2;
  const partRightX = part.length / 2;
  const partFrontZ = part.width / 2;
  const partBackZ = -part.width / 2;
  const dimY = y + HANDLE_EPSILON;
  const cutColor = '#3b82f6';
  const offsetColor = '#a855f7';

  const midX = (x0 + x1) / 2;
  const midZ = (cz0 + cz1) / 2;
  const dimOffset = 0.15;

  const lines: DimensionLine[] = [];
  // Cut length — outside front edge
  lines.push({
    start: [x0, dimY, cz0 + dimOffset],
    end: [x1, dimY, cz0 + dimOffset],
    label: fmt(cutLength),
    color: cutColor
  });
  // Cut width — outside left edge (skip if width = part width, e.g. dado)
  if (Math.abs(cutWidth - part.width) > 0.01) {
    lines.push({
      start: [x0 - dimOffset, dimY, cz0],
      end: [x0 - dimOffset, dimY, cz1],
      label: fmt(cutWidth),
      color: cutColor
    });
  }
  // Left offset
  if (offsetLeft > 0.01) {
    lines.push({ start: [partLeftX, dimY, midZ], end: [x0, dimY, midZ], label: fmt(offsetLeft), color: offsetColor });
  }
  // Right offset
  if (offsetRight > 0.01) {
    lines.push({ start: [x1, dimY, midZ], end: [partRightX, dimY, midZ], label: fmt(offsetRight), color: offsetColor });
  }
  // Front offset (skip if width = part width)
  if (offsetFront > 0.01 && Math.abs(cutWidth - part.width) > 0.01) {
    lines.push({
      start: [midX, dimY, partFrontZ],
      end: [midX, dimY, cz0],
      label: fmt(offsetFront),
      color: offsetColor
    });
  }
  // Back offset (skip if width = part width)
  if (offsetBack > 0.01 && Math.abs(cutWidth - part.width) > 0.01) {
    lines.push({ start: [midX, dimY, cz1], end: [midX, dimY, partBackZ], label: fmt(offsetBack), color: offsetColor });
  }

  // Depth
  const depth = getRectCutDepth(resolved, part.thickness);
  const depthTopY = isTop ? part.thickness / 2 : -part.thickness / 2;
  const depthBottomY = isTop ? depthTopY - depth : depthTopY + depth;
  const depthData: DepthInfo = {
    corners: [
      [x0, depthTopY, cz0],
      [x1, depthTopY, cz0],
      [x0, depthTopY, cz1],
      [x1, depthTopY, cz1]
    ],
    topY: depthTopY,
    bottomY: depthBottomY,
    label: depth >= part.thickness - 0.001 ? `${fmt(depth)} (thru)` : fmt(depth),
    color: '#f97316'
  };

  return { lines, depthData, x0, x1, cz0, cz1, y };
}

function buildEndCutDimensionLines(
  part: Part,
  draft: FeatureDraft,
  allFeatures?: PartFeature[]
): { lines: DimensionLine[]; arcs: AngleArc[] } {
  if (draft.mode !== 'end_cut') return { lines: [], arcs: [] };

  const fmt = (v: number) => formatMeasurementWithUnit(Math.abs(v), 'imperial');
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;
  const halfThickness = part.thickness / 2;
  const dimY = halfThickness + HANDLE_EPSILON * 2;
  const angleColor = '#10b981'; // green for angles
  const cutColor = '#3b82f6';

  const isLeft = draft.targetFace === 'left_end';
  const endX = isLeft ? -halfLength : halfLength;

  // Get the actual inset profile for this end
  const profiles = getPartEndCutProfiles({
    length: part.length,
    width: part.width,
    thickness: part.thickness,
    features: allFeatures
  });
  const profile = isLeft ? profiles.left : profiles.right;

  // Rendered Z is negated from contour Z (rotateX(-π/2)):
  // contour front (z=-halfWidth) renders at +halfWidth, back (z=+halfWidth) renders at -halfWidth
  const renderFrontZ = halfWidth;
  const renderBackZ = -halfWidth;

  const lines: DimensionLine[] = [];
  const arcs: AngleArc[] = [];

  // Horizontal angle indicator (mitre) — arc at the long point corner on the top surface.
  // The arc sits where the saw blade enters: at the long point, between the original
  // straight end edge and the angled cut line.
  if (draft.horizontalAngle > 0 && draft.cutType !== 'bevel') {
    const inset = profile.horizontalInset;
    if (inset > 0.01) {
      // Short point is where the saw blade exits — put the arc there
      const longZ = profile.horizontalFlip ? renderBackZ : renderFrontZ;
      const shortZ = profile.horizontalFlip ? renderFrontZ : renderBackZ;
      const shortX = isLeft ? endX + inset : endX - inset;
      const topY = halfThickness;

      // Arc at the short point corner — where the cut meets the original edge.
      // Two direction vectors from the short point (in XZ plane):
      // 1. Along the straight end edge (toward the long-point side, along Z)
      const edgeDz = longZ - shortZ;
      const edgeAngle = Math.atan2(edgeDz, 0);
      // 2. Along the angled cut line (toward the long point)
      const cutDx = endX - shortX;
      const cutDz = longZ - shortZ;
      const cutAngle = Math.atan2(cutDz, cutDx);

      const arcRadius = Math.min(inset * 0.6, halfWidth * 0.35, 1.0);
      const ARC_SEGMENTS = 20;
      let sweep = cutAngle - edgeAngle;
      if (sweep > Math.PI) sweep -= 2 * Math.PI;
      if (sweep < -Math.PI) sweep += 2 * Math.PI;

      const arcPoints: [number, number, number][] = [];
      for (let i = 0; i <= ARC_SEGMENTS; i++) {
        const a = edgeAngle + sweep * (i / ARC_SEGMENTS);
        arcPoints.push([shortX + Math.cos(a) * arcRadius, topY, shortZ + Math.sin(a) * arcRadius]);
      }

      const midA = edgeAngle + sweep * 0.5;
      const labelR = arcRadius + 0.2;
      arcs.push({
        center: [shortX, topY, shortZ],
        points: arcPoints,
        labelPosition: [shortX + Math.cos(midA) * labelR, topY + 0.1, shortZ + Math.sin(midA) * labelR],
        label: `${draft.horizontalAngle}°`,
        color: angleColor
      });
    }
  }

  // Vertical angle indicator (bevel) — arc at the long-point edge on the end face.
  // Shows the angle between the straight thickness edge and the beveled cut.
  if (draft.verticalAngle > 0 && draft.cutType !== 'mitre') {
    const inset = profile.verticalInset;
    if (inset > 0.01) {
      // Origin: top (or bottom if flipped) of the end face at center Z
      const originY = profile.verticalFlip ? -halfThickness : halfThickness;
      const inward = isLeft ? 1 : -1;
      const downDir = profile.verticalFlip ? 1 : -1;

      // Two direction vectors from origin (in XY plane at z=0):
      // 1. Along the straight thickness edge (downward)
      const edgeAngle = Math.atan2(downDir, 0);
      // 2. Along the beveled cut (inward + down)
      const cutAngle = Math.atan2(
        downDir * Math.cos((draft.verticalAngle * Math.PI) / 180),
        inward * Math.sin((draft.verticalAngle * Math.PI) / 180)
      );

      const arcRadius = Math.min(inset * 0.6, halfThickness * 0.5, 0.6);
      const ARC_SEGMENTS = 20;
      let sweep = cutAngle - edgeAngle;
      if (sweep > Math.PI) sweep -= 2 * Math.PI;
      if (sweep < -Math.PI) sweep += 2 * Math.PI;

      const arcPoints: [number, number, number][] = [];
      for (let i = 0; i <= ARC_SEGMENTS; i++) {
        const a = edgeAngle + sweep * (i / ARC_SEGMENTS);
        arcPoints.push([endX + Math.cos(a) * arcRadius, originY + Math.sin(a) * arcRadius, 0]);
      }

      const midA = edgeAngle + sweep * 0.5;
      const labelR = arcRadius + 0.15;
      arcs.push({
        center: [endX, originY, 0],
        points: arcPoints,
        labelPosition: [endX + Math.cos(midA) * labelR, originY + Math.sin(midA) * labelR, 0],
        label: `${draft.verticalAngle}°`,
        color: angleColor
      });
    }
  }

  // Long point / short point inset dimension — outside the front edge
  if (profile.maxInset > 0.01) {
    const longX = endX;
    const shortX = isLeft ? endX + profile.maxInset : endX - profile.maxInset;
    const dimZ = renderFrontZ + 0.2; // just outside the front edge
    lines.push({
      start: [longX, dimY, dimZ],
      end: [shortX, dimY, dimZ],
      label: fmt(profile.maxInset),
      color: cutColor
    });
  }

  return { lines, arcs };
}

function getEditableHandleOverlay(
  part: Part,
  draft: FeatureDraft | null,
  allFeatures?: PartFeature[]
): EditableHandleOverlay | null {
  if (!draft) return null;

  // End cuts: dimension-only overlay (no interactive handles)
  if (draft.mode === 'end_cut') {
    const { lines, arcs } = buildEndCutDimensionLines(part, draft, allFeatures);
    if (lines.length === 0 && arcs.length === 0) return null;
    return {
      mode: 'rect',
      dimensionLines: lines,
      angleArcs: arcs.length > 0 ? arcs : undefined,
      operationLabel: draft.cutType
    };
  }

  const dims = buildRectDimensionOverlay(part, draft);
  if (!dims) return null;

  const { lines, depthData, x0, x1, cz0, cz1, y } = dims;
  const cutLength = Math.abs(x1 - x0);
  const cutWidth = Math.abs(cz0 - cz1);

  // Interactive handles only for supported face-targeted types
  const hasHandles = supportsPreviewHandles(draft);

  return {
    mode: 'rect',
    center: hasHandles ? [(x0 + x1) / 2, y, (cz0 + cz1) / 2] : undefined,
    lengthHandle: hasHandles ? [x1, y, (cz0 + cz1) / 2] : undefined,
    widthHandle: hasHandles ? (draft.cutType === 'stopped_dado' ? null : [(x0 + x1) / 2, y, cz1]) : undefined,
    areaPosition: [(x0 + x1) / 2, y, (cz0 + cz1) / 2],
    areaSize: [cutLength, 0.02, cutWidth],
    dimensionLines: lines,
    depthInfo: depthData,
    operationLabel: draft.cutType.replace('_', ' ')
  };
}

function applyHandleDelta(
  part: Part,
  startDraft: FeatureDraft,
  kind: HandleKind,
  deltaX: number,
  deltaZ: number
): FeatureDraft {
  if (!supportsPreviewHandles(startDraft)) return startDraft;

  const nextDraft: FeatureDraft = { ...startDraft };
  const maxLength = Math.max(MIN_DIMENSION, part.length - startDraft.placementX);
  const maxWidth = Math.max(MIN_DIMENSION, part.width - startDraft.placementZ);

  if (kind === 'move') {
    nextDraft.placementX = clamp(startDraft.placementX + deltaX, 0, Math.max(0, part.length - startDraft.sizeLength));
    nextDraft.placementZ =
      startDraft.cutType === 'stopped_dado'
        ? 0
        : clamp(startDraft.placementZ + deltaZ, 0, Math.max(0, part.width - startDraft.sizeWidth));
    return nextDraft;
  }

  if (kind === 'length') {
    nextDraft.sizeLength = clamp(startDraft.sizeLength + deltaX, MIN_DIMENSION, maxLength);
    return nextDraft;
  }

  if (startDraft.cutType === 'stopped_dado') return nextDraft;
  nextDraft.sizeWidth = clamp(startDraft.sizeWidth + deltaZ, MIN_DIMENSION, maxWidth);
  return nextDraft;
}

function nudgeDraft(part: Part, draft: FeatureDraft, kind: HandleKind, direction: 1 | -1): FeatureDraft {
  const step = 0.25 * direction;
  return applyHandleDelta(
    part,
    draft,
    kind,
    kind === 'move' || kind === 'length' ? step : 0,
    kind === 'move' || kind === 'width' ? step : 0
  );
}

const _camLocal = new THREE.Vector3();

const DEPTH_INSET = 0.25; // how far inside the cutout to place the depth line

/** Renders the depth indicator inside the cutout at the corner furthest from the camera. */
function DepthIndicator({
  depthInfo,
  groupRef
}: {
  depthInfo: DepthInfo;
  groupRef: React.RefObject<THREE.Group | null>;
}) {
  const { camera } = useThree();
  const [corner, setCorner] = useState<[number, number, number]>(depthInfo.corners[0]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    _camLocal.copy(camera.position);
    group.worldToLocal(_camLocal);
    // Find the cutout corner furthest from the camera (projected in XZ)
    let maxDist = -Infinity;
    let best = depthInfo.corners[0];
    for (const c of depthInfo.corners) {
      const dx = c[0] - _camLocal.x;
      const dz = c[2] - _camLocal.z;
      const dist = dx * dx + dz * dz;
      if (dist > maxDist) {
        maxDist = dist;
        best = c;
      }
    }
    setCorner(best);
  });

  // Compute center of the cutout to determine the inset direction
  const cx = (depthInfo.corners[0][0] + depthInfo.corners[3][0]) / 2;
  const cz = (depthInfo.corners[0][2] + depthInfo.corners[3][2]) / 2;
  // Inset toward the center of the cutout
  const dx = cx - corner[0];
  const dz = cz - corner[2];
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  const insetX = corner[0] + (dx / len) * DEPTH_INSET;
  const insetZ = corner[2] + (dz / len) * DEPTH_INSET;

  const topCorner: [number, number, number] = [corner[0], depthInfo.topY, corner[2]];
  const bottomCorner: [number, number, number] = [corner[0], depthInfo.bottomY, corner[2]];
  const topInset: [number, number, number] = [insetX, depthInfo.topY, insetZ];
  const bottomInset: [number, number, number] = [insetX, depthInfo.bottomY, insetZ];
  const mid: [number, number, number] = [insetX, (depthInfo.topY + depthInfo.bottomY) / 2, insetZ];

  return (
    <group>
      {/* Vertical depth line (inset from corner) */}
      <Line
        points={[topInset, bottomInset]}
        color={depthInfo.color}
        lineWidth={1.5}
        renderOrder={8}
        depthWrite={false}
      />
      {/* Connecting lines from inset line ends to the actual corner edges */}
      <Line points={[topCorner, topInset]} color={depthInfo.color} lineWidth={1} renderOrder={8} depthWrite={false} />
      <Line
        points={[bottomCorner, bottomInset]}
        color={depthInfo.color}
        lineWidth={1}
        renderOrder={8}
        depthWrite={false}
      />
      <Html position={mid} center style={{ pointerEvents: 'none' }}>
        <div
          className="whitespace-nowrap rounded px-1 py-0.5 text-[9px] font-semibold shadow-sm"
          style={{ backgroundColor: depthInfo.color, color: '#fff' }}
        >
          {depthInfo.label}
        </div>
      </Html>
    </group>
  );
}

function PartCutsPreviewScene({
  previewPart,
  draft,
  hoveredTarget,
  pendingTarget,
  onHoverTarget,
  onActivateTarget,
  onDraftChange
}: {
  previewPart: Part;
  draft: FeatureDraft | null;
  hoveredTarget: PartFeatureTarget | null;
  pendingTarget: PartFeatureTarget | null;
  onHoverTarget: (target: PartFeatureTarget | null) => void;
  onActivateTarget: (target: PartFeatureTarget | null) => void;
  onDraftChange: (draft: FeatureDraft) => void;
}) {
  const geometry = useMemo(() => getPartRenderGeometry(previewPart), [previewPart]);
  const pickTargets = useMemo(() => getValidPickableTargets(previewPart, draft), [draft, previewPart]);
  const maxDimension = Math.max(previewPart.length, previewPart.width, previewPart.thickness, 1);
  const handleOverlay = useMemo(
    () => getEditableHandleOverlay(previewPart, draft, previewPart.features ?? []),
    [draft, previewPart]
  );
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<{ enabled: boolean } | null>(null);
  const activeDragRef = useRef<ActiveDragState | null>(null);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);

  const beginDrag = (kind: HandleKind, event: ThreeEvent<PointerEvent>) => {
    if (!supportsPreviewHandles(draft)) return;
    event.stopPropagation();
    const group = groupRef.current;
    if (!group) return;
    _localPoint.copy(event.point);
    group.worldToLocal(_localPoint);
    activeDragRef.current = {
      kind,
      pointerId: event.pointerId,
      startPoint: _localPoint.clone(),
      startDraft: { ...draft }
    };
    setIsDraggingHandle(true);
    if (controlsRef.current) controlsRef.current.enabled = false;
  };

  const updateDrag = (event: ThreeEvent<PointerEvent>) => {
    const activeDrag = activeDragRef.current;
    const group = groupRef.current;
    if (!activeDrag || !group || !supportsPreviewHandles(activeDrag.startDraft)) return;
    event.stopPropagation();
    _localPoint.copy(event.point);
    group.worldToLocal(_localPoint);
    const deltaX = _localPoint.x - activeDrag.startPoint.x;
    // Negate Z delta: rendered geometry has Z negated from rotateX(-π/2),
    // but draft placement uses contour Z (positive = back).
    const deltaZ = -(_localPoint.z - activeDrag.startPoint.z);
    onDraftChange(applyHandleDelta(previewPart, activeDrag.startDraft, activeDrag.kind, deltaX, deltaZ));
  };

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    const activeDrag = activeDragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    activeDragRef.current = null;
    setIsDraggingHandle(false);
    if (controlsRef.current) controlsRef.current.enabled = true;
  };

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[maxDimension * 1.6, maxDimension * 2.1, maxDimension * 1.4]} intensity={1.1} />
      <directionalLight position={[-maxDimension * 1.2, maxDimension * 0.8, -maxDimension * 1.2]} intensity={0.45} />

      <group ref={groupRef} rotation={[-0.35, 0.68, 0]}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#d6c3a1" metalness={0.05} roughness={0.82} />
          <Edges geometry={geometry} threshold={15} color="#433225" raycast={() => {}} renderOrder={4} scale={1.002} />
        </mesh>

        {/* Invisible drag plane — only appears during handle drags so pointer events
            keep firing even when the cursor moves off the part geometry.
            Rotated to lie flat in XZ (horizontal) at the handle Y level. */}
        {isDraggingHandle && (
          <mesh
            position={[0, handleOverlay?.center?.[1] ?? 0, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={10}
            onPointerMove={updateDrag}
            onPointerUp={endDrag}
          >
            <planeGeometry args={[maxDimension * 10, maxDimension * 10]} />
            <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
          </mesh>
        )}

        {handleOverlay && (
          <>
            {handleOverlay.mode === 'rect' && handleOverlay.areaPosition && handleOverlay.areaSize && (
              <mesh position={handleOverlay.areaPosition} renderOrder={6}>
                <boxGeometry args={handleOverlay.areaSize} />
                <meshBasicMaterial color={AREA_COLOR} transparent opacity={0.18} depthWrite={false} />
              </mesh>
            )}
            {handleOverlay.mode === 'rect' && handleOverlay.center && (
              <mesh position={handleOverlay.center} renderOrder={7} onPointerDown={(event) => beginDrag('move', event)}>
                <sphereGeometry args={[HANDLE_SIZE * 0.55, 18, 18]} />
                <meshBasicMaterial color={HANDLE_COLOR} />
              </mesh>
            )}
            {handleOverlay.mode === 'rect' && handleOverlay.lengthHandle && (
              <mesh
                position={handleOverlay.lengthHandle}
                renderOrder={7}
                onPointerDown={(event) => beginDrag('length', event)}
              >
                <boxGeometry args={[HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE]} />
                <meshBasicMaterial color={HANDLE_COLOR} />
              </mesh>
            )}
            {handleOverlay.mode === 'rect' && handleOverlay.widthHandle && (
              <mesh
                position={handleOverlay.widthHandle}
                renderOrder={7}
                onPointerDown={(event) => beginDrag('width', event)}
              >
                <boxGeometry args={[HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE]} />
                <meshBasicMaterial color={HANDLE_COLOR} />
              </mesh>
            )}
            {handleOverlay.mode === 'rect' &&
              handleOverlay.dimensionLines?.map((dim, i) => {
                const mid: [number, number, number] = [
                  (dim.start[0] + dim.end[0]) / 2,
                  (dim.start[1] + dim.end[1]) / 2,
                  (dim.start[2] + dim.end[2]) / 2
                ];
                return (
                  <group key={i}>
                    <Line
                      points={[dim.start, dim.end]}
                      color={dim.color}
                      lineWidth={1.5}
                      renderOrder={8}
                      depthWrite={false}
                    />
                    <Html position={mid} center style={{ pointerEvents: 'none' }}>
                      <div
                        className="whitespace-nowrap rounded px-1 py-0.5 text-[9px] font-semibold shadow-sm"
                        style={{ backgroundColor: dim.color, color: '#fff' }}
                      >
                        {dim.label}
                      </div>
                    </Html>
                  </group>
                );
              })}
            {handleOverlay.angleArcs?.map((arc, i) => (
              <group key={`arc-${i}`}>
                <Line points={arc.points} color={arc.color} lineWidth={2} renderOrder={8} depthWrite={false} />
                <Html position={arc.labelPosition} center style={{ pointerEvents: 'none' }}>
                  <div
                    className="whitespace-nowrap rounded px-1 py-0.5 text-[9px] font-semibold shadow-sm"
                    style={{ backgroundColor: arc.color, color: '#fff' }}
                  >
                    {arc.label}
                  </div>
                </Html>
              </group>
            ))}
            {handleOverlay.mode === 'rect' && handleOverlay.depthInfo && (
              <DepthIndicator depthInfo={handleOverlay.depthInfo} groupRef={groupRef} />
            )}
            {handleOverlay.mode === 'end' && handleOverlay.guidePosition && handleOverlay.guideSize && (
              <mesh position={handleOverlay.guidePosition} renderOrder={6}>
                <boxGeometry args={handleOverlay.guideSize} />
                <meshBasicMaterial color={AREA_COLOR} transparent opacity={0.22} depthWrite={false} />
              </mesh>
            )}
            {handleOverlay.mode === 'end' && handleOverlay.referenceHandle && (
              <mesh
                position={handleOverlay.referenceHandle}
                renderOrder={7}
                onPointerDown={(event) => beginDrag('reference', event)}
                onPointerMove={updateDrag}
                onPointerUp={endDrag}
              >
                <sphereGeometry args={[HANDLE_SIZE * 0.6, 18, 18]} />
                <meshBasicMaterial color={HANDLE_COLOR} />
              </mesh>
            )}
          </>
        )}

        {pickTargets.map((pickTarget) => {
          const isHovered = partFeatureTargetEquals(hoveredTarget, pickTarget.target);
          const isPending = partFeatureTargetEquals(pendingTarget, pickTarget.target);
          // Hide the selected target's pane, and hide ALL panes when interactive handles are active
          // (handles take over the interaction — pick planes would steal clicks)
          if (isPending || (handleOverlay && handleOverlay.center)) return null;
          const opacity = isHovered ? 0.52 : 0.2;
          const scale = isHovered ? 1.06 : 1;

          return (
            <mesh
              key={pickTarget.key}
              position={pickTarget.position}
              rotation={pickTarget.rotation}
              scale={scale}
              renderOrder={pickTarget.priority}
              onPointerOver={(event) => {
                event.stopPropagation();
                onHoverTarget(pickTarget.target);
              }}
              onPointerOut={(event) => {
                event.stopPropagation();
                onHoverTarget(null);
              }}
              onClick={(event) => {
                event.stopPropagation();
                onActivateTarget(pickTarget.target);
              }}
            >
              <boxGeometry args={pickTarget.size} />
              <meshBasicMaterial color={pickTarget.color} transparent opacity={opacity} depthWrite={false} />
            </mesh>
          );
        })}
      </group>

      <OrbitControls
        ref={controlsRef as any}
        enablePan={false}
        minDistance={maxDimension * 0.8}
        maxDistance={maxDimension * 6}
      />
    </>
  );
}

export function PartCutsPreviewCanvas({
  part,
  draftFeatures,
  draft,
  selectedFeatureSummary,
  selectedFeatureTargetLabel,
  hoveredTarget,
  pendingTarget,
  onHoverTarget,
  onActivateTarget,
  onDraftChange
}: PartCutsPreviewCanvasProps) {
  const previewPart = useMemo(() => buildPreviewPart(part, draftFeatures, draft), [draft, draftFeatures, part]);
  const maxDimension = Math.max(part.length, part.width, part.thickness, 1);
  const activeTargetLabel = getPickableTargetLabel(hoveredTarget) ?? getPickableTargetLabel(pendingTarget);
  const fallback = shouldUseFallbackPreview();
  const validTargets = useMemo(() => getValidPickableTargets(previewPart, draft), [draft, previewPart]);
  const draftTarget = draft ? getFeatureDraftTarget(draft) : null;
  const handleOverlay = useMemo(
    () => getEditableHandleOverlay(previewPart, draft, previewPart.features ?? []),
    [draft, previewPart]
  );
  const supportsHandles = supportsPreviewHandles(draft);

  if (fallback) {
    return (
      <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-gradient-to-br from-bg-secondary to-bg px-6 py-8 text-center">
        <div className="max-w-xl space-y-4">
          <div className="text-lg font-semibold text-text">{part.name}</div>
          <CardDescription>
            Direct 3D picking is active in the app runtime. The test fallback keeps target state readable without a
            WebGL canvas.
          </CardDescription>
          {selectedFeatureSummary && (
            <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-left text-sm text-text">
              <div className="font-medium">Preview Selection</div>
              <div className="mt-1">{selectedFeatureSummary}</div>
              {selectedFeatureTargetLabel && (
                <div className="mt-1 text-xs text-text-muted">Target: {selectedFeatureTargetLabel}</div>
              )}
            </div>
          )}
          {activeTargetLabel && (
            <div className="rounded-md border border-border bg-bg px-3 py-2 text-left text-sm text-text">
              Active target: <span className="font-medium">{activeTargetLabel}</span>
            </div>
          )}
          {validTargets.length > 0 && (
            <div className="rounded-md border border-border bg-bg px-3 py-3 text-left">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Preview Targets</div>
              <div className="flex flex-wrap gap-2">
                {validTargets.map((target) => (
                  <Button
                    key={target.key}
                    type="button"
                    size="xs"
                    variant="outline"
                    active={partFeatureTargetEquals(draftTarget, target.target)}
                    onClick={() => onActivateTarget(target.target)}
                  >
                    {target.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {supportsHandles && draft && handleOverlay && (
            <div className="rounded-md border border-border bg-bg px-3 py-3 text-left">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Preview Handles</div>
              <div className="mb-2 text-sm text-text">{handleOverlay.operationLabel}</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => onDraftChange(nudgeDraft(part, draft, 'move', -1))}
                >
                  Move Left
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => onDraftChange(nudgeDraft(part, draft, 'move', 1))}
                >
                  Move Right
                </Button>
                {draft.mode === 'rect_cut' && (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => onDraftChange(nudgeDraft(part, draft, 'length', 1))}
                  >
                    Extend Run
                  </Button>
                )}
                {draft.mode === 'rect_cut' && draft.cutType !== 'stopped_dado' && (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => onDraftChange(nudgeDraft(part, draft, 'width', 1))}
                  >
                    Widen
                  </Button>
                )}
              </div>
            </div>
          )}
          {draft && !supportsHandles && (
            <div className="rounded-md border border-border bg-bg px-3 py-3 text-left text-sm text-text-muted">
              Adjust this operation in the inspector. Direct preview handles are currently available for face pockets
              and stopped channels.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_40%),linear-gradient(180deg,_rgba(24,24,27,0.12),_rgba(12,12,14,0.02))]">
      <Canvas camera={{ position: [maxDimension * 2.2, maxDimension * 1.6, maxDimension * 2.4], fov: 38 }}>
        <PartCutsPreviewScene
          previewPart={previewPart}
          draft={draft}
          hoveredTarget={hoveredTarget}
          pendingTarget={pendingTarget}
          onHoverTarget={onHoverTarget}
          onActivateTarget={onActivateTarget}
          onDraftChange={onDraftChange}
        />
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
        {selectedFeatureSummary && (
          <div className="rounded-md border border-accent/30 bg-bg/90 px-3 py-2 text-left text-sm text-text shadow-sm backdrop-blur">
            <div className="font-medium">Preview Selection</div>
            <div className="mt-1">{selectedFeatureSummary}</div>
            {selectedFeatureTargetLabel && (
              <div className="mt-1 text-xs text-text-muted">Target: {selectedFeatureTargetLabel}</div>
            )}
          </div>
        )}

        {draft && (
          <div className="rounded-md border border-border/80 bg-bg/90 px-3 py-2 text-left text-xs text-text-muted shadow-sm backdrop-blur">
            {supportsHandles
              ? 'Click a highlighted target first, then drag the preview handles to adjust this operation.'
              : 'Hover or click a highlighted target to resolve a canonical face, edge, or corner for this operation.'}
          </div>
        )}
      </div>

      {activeTargetLabel && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-border/80 bg-bg/90 px-3 py-2 text-sm text-text shadow-sm backdrop-blur">
          Active target: <span className="font-medium">{activeTargetLabel}</span>
        </div>
      )}
    </div>
  );
}
