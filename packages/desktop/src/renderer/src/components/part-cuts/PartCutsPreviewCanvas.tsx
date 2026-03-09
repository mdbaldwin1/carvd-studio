import { Edges, OrbitControls } from '@react-three/drei';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import {
  buildFeatureFromDraft,
  FeatureDraft,
  getFeatureDraftTarget
} from '@renderer/components/part-features/partFeatureEditorState';
import { Button } from '@renderer/components/ui/button';
import { CardDescription } from '@renderer/components/ui/card';
import { Part, PartFeatureTarget } from '@renderer/types';
import {
  getPickableTargetLabel,
  getValidPickableTargets,
  partFeatureTargetEquals
} from '@renderer/utils/partCutPicking';
import { getPartRenderGeometry } from '@renderer/utils/partFeatureGeometry';
import { getResolvedRectCutFeature } from '@renderer/utils/rectCutUtils';
import { useMemo, useRef } from 'react';
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

type HandleKind = 'move' | 'length' | 'width' | 'reference';

interface EditableHandleOverlay {
  mode: 'rect' | 'end';
  operationLabel: string;
  center?: [number, number, number];
  lengthHandle?: [number, number, number];
  widthHandle?: [number, number, number] | null;
  areaPosition?: [number, number, number];
  areaSize?: [number, number, number];
  referenceHandle?: [number, number, number];
  guidePosition?: [number, number, number];
  guideSize?: [number, number, number];
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
  if (draft.mode === 'end_cut') return true;
  return (
    SUPPORTED_HANDLE_TYPES.has(draft.cutType) && (draft.faceTarget === 'top_face' || draft.faceTarget === 'bottom_face')
  );
}

function getEditableHandleOverlay(part: Part, draft: FeatureDraft | null): EditableHandleOverlay | null {
  if (!supportsPreviewHandles(draft)) return null;

  if (draft.mode === 'end_cut') {
    const x =
      draft.targetFace === 'left_end'
        ? part.length / 2 - draft.referenceValue
        : -part.length / 2 + draft.referenceValue;
    const guideStartX = draft.targetFace === 'left_end' ? -part.length / 2 : x;
    const guideEndX = draft.targetFace === 'left_end' ? x : part.length / 2;
    return {
      mode: 'end',
      operationLabel: 'End-cut reference handle',
      referenceHandle: [x, 0, 0],
      guidePosition: [(guideStartX + guideEndX) / 2, 0, 0],
      guideSize: [Math.max(MIN_DIMENSION, Math.abs(guideEndX - guideStartX)), 0.02, 0.02]
    };
  }

  const feature = buildFeatureFromDraft(draft);
  if (feature.kind !== 'rect_cut') return null;
  const resolved = getResolvedRectCutFeature(feature, part);
  if (resolved.target.type !== 'face') return null;

  const x0 = -part.length / 2 + resolved.placement.x;
  const z0 = -part.width / 2 + resolved.placement.z;
  const x1 = x0 + resolved.parameters.size.length;
  const z1 = z0 + resolved.parameters.size.width;
  const y =
    resolved.target.face === 'top_face' ? part.thickness / 2 + HANDLE_EPSILON : -part.thickness / 2 - HANDLE_EPSILON;

  return {
    mode: 'rect',
    center: [(x0 + x1) / 2, y, (z0 + z1) / 2],
    lengthHandle: [x1, y, (z0 + z1) / 2],
    widthHandle: resolved.cutType === 'stopped_dado' ? null : [(x0 + x1) / 2, y, z1],
    areaPosition: [(x0 + x1) / 2, y, (z0 + z1) / 2],
    areaSize: [resolved.parameters.size.length, 0.02, resolved.parameters.size.width],
    operationLabel:
      resolved.cutType === 'stopped_dado'
        ? 'Stopped dado handles'
        : resolved.cutType === 'stopped_groove'
          ? 'Stopped groove handles'
          : resolved.cutType === 'mortise'
            ? 'Mortise handles'
            : 'Cutout handles'
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

  if (startDraft.mode === 'end_cut') {
    if (kind !== 'reference') return startDraft;
    return {
      ...startDraft,
      referenceValue: clamp(
        startDraft.referenceValue + (startDraft.targetFace === 'left_end' ? -deltaX : deltaX),
        MIN_DIMENSION,
        startDraft.cutType === 'square' ? part.length : part.length * 2
      )
    };
  }

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
  if (draft.mode === 'end_cut') {
    return {
      ...draft,
      referenceValue: clamp(
        draft.referenceValue + step,
        MIN_DIMENSION,
        draft.cutType === 'square' ? part.length : part.length * 2
      )
    };
  }
  return applyHandleDelta(
    part,
    draft,
    kind,
    kind === 'move' || kind === 'length' ? step : 0,
    kind === 'move' || kind === 'width' ? step : 0
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
  const handleOverlay = useMemo(() => getEditableHandleOverlay(previewPart, draft), [draft, previewPart]);
  const groupRef = useRef<THREE.Group>(null);
  const activeDragRef = useRef<ActiveDragState | null>(null);

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
    event.target.setPointerCapture?.(event.pointerId);
  };

  const updateDrag = (event: ThreeEvent<PointerEvent>) => {
    const activeDrag = activeDragRef.current;
    const group = groupRef.current;
    if (!activeDrag || !group || !supportsPreviewHandles(activeDrag.startDraft)) return;
    event.stopPropagation();
    _localPoint.copy(event.point);
    group.worldToLocal(_localPoint);
    const deltaX = _localPoint.x - activeDrag.startPoint.x;
    const deltaZ = _localPoint.z - activeDrag.startPoint.z;
    onDraftChange(applyHandleDelta(previewPart, activeDrag.startDraft, activeDrag.kind, deltaX, deltaZ));
  };

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    const activeDrag = activeDragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    event.target.releasePointerCapture?.(event.pointerId);
    activeDragRef.current = null;
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

        {handleOverlay && (
          <>
            {handleOverlay.mode === 'rect' && handleOverlay.areaPosition && handleOverlay.areaSize && (
              <mesh position={handleOverlay.areaPosition} renderOrder={6}>
                <boxGeometry args={handleOverlay.areaSize} />
                <meshBasicMaterial color={AREA_COLOR} transparent opacity={0.18} depthWrite={false} />
              </mesh>
            )}
            {handleOverlay.mode === 'rect' && handleOverlay.center && (
              <mesh
                position={handleOverlay.center}
                renderOrder={7}
                onPointerDown={(event) => beginDrag('move', event)}
                onPointerMove={updateDrag}
                onPointerUp={endDrag}
              >
                <sphereGeometry args={[HANDLE_SIZE * 0.55, 18, 18]} />
                <meshBasicMaterial color={HANDLE_COLOR} />
              </mesh>
            )}
            {handleOverlay.mode === 'rect' && handleOverlay.lengthHandle && (
              <mesh
                position={handleOverlay.lengthHandle}
                renderOrder={7}
                onPointerDown={(event) => beginDrag('length', event)}
                onPointerMove={updateDrag}
                onPointerUp={endDrag}
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
                onPointerMove={updateDrag}
                onPointerUp={endDrag}
              >
                <boxGeometry args={[HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE]} />
                <meshBasicMaterial color={HANDLE_COLOR} />
              </mesh>
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
          const opacity = isPending ? 0.7 : isHovered ? 0.52 : 0.2;
          const scale = isPending ? 1.12 : isHovered ? 1.06 : 1;

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

      <OrbitControls enablePan={false} minDistance={maxDimension * 0.8} maxDistance={maxDimension * 6} />
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
  const handleOverlay = useMemo(() => getEditableHandleOverlay(previewPart, draft), [draft, previewPart]);
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
                  onClick={() =>
                    onDraftChange(nudgeDraft(part, draft, draft.mode === 'end_cut' ? 'reference' : 'move', -1))
                  }
                >
                  {draft.mode === 'end_cut' ? 'Shorten Ref' : 'Move Left'}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    onDraftChange(nudgeDraft(part, draft, draft.mode === 'end_cut' ? 'reference' : 'move', 1))
                  }
                >
                  {draft.mode === 'end_cut' ? 'Lengthen Ref' : 'Move Right'}
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
              Adjust this operation in the inspector. Direct preview handles are currently available for face pockets ,
              stopped channels, and end-cut reference values.
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
