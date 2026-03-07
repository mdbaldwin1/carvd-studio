import { Edges, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { FeatureDraft } from '@renderer/components/part-features/partFeatureEditorState';
import { CardDescription } from '@renderer/components/ui/card';
import { Part, PartFeatureTarget } from '@renderer/types';
import {
  getPickableTargetLabel,
  getValidPickableTargets,
  partFeatureTargetEquals
} from '@renderer/utils/partCutPicking';
import { getPartRenderGeometry } from '@renderer/utils/partFeatureGeometry';
import { useMemo } from 'react';

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
}

function shouldUseFallbackPreview(): boolean {
  return typeof window !== 'undefined' && window.navigator.userAgent.includes('jsdom');
}

function PartCutsPreviewScene({
  previewPart,
  draft,
  hoveredTarget,
  pendingTarget,
  onHoverTarget,
  onActivateTarget
}: {
  previewPart: Part;
  draft: FeatureDraft | null;
  hoveredTarget: PartFeatureTarget | null;
  pendingTarget: PartFeatureTarget | null;
  onHoverTarget: (target: PartFeatureTarget | null) => void;
  onActivateTarget: (target: PartFeatureTarget | null) => void;
}) {
  const geometry = useMemo(() => getPartRenderGeometry(previewPart), [previewPart]);
  const pickTargets = useMemo(() => getValidPickableTargets(previewPart, draft), [draft, previewPart]);
  const maxDimension = Math.max(previewPart.length, previewPart.width, previewPart.thickness, 1);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[maxDimension * 1.6, maxDimension * 2.1, maxDimension * 1.4]} intensity={1.1} />
      <directionalLight position={[-maxDimension * 1.2, maxDimension * 0.8, -maxDimension * 1.2]} intensity={0.45} />

      <group rotation={[-0.35, 0.68, 0]}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#d6c3a1" metalness={0.05} roughness={0.82} />
          <Edges geometry={geometry} threshold={15} color="#433225" raycast={() => {}} renderOrder={4} scale={1.002} />
        </mesh>

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
  onActivateTarget
}: PartCutsPreviewCanvasProps) {
  const previewPart = useMemo(
    () => ({
      ...part,
      features: draftFeatures ?? []
    }),
    [draftFeatures, part]
  );
  const maxDimension = Math.max(part.length, part.width, part.thickness, 1);
  const activeTargetLabel = getPickableTargetLabel(hoveredTarget) ?? getPickableTargetLabel(pendingTarget);
  const fallback = shouldUseFallbackPreview();

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
              <div className="font-medium">Selected Operation</div>
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
        />
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
        {selectedFeatureSummary && (
          <div className="rounded-md border border-accent/30 bg-bg/90 px-3 py-2 text-left text-sm text-text shadow-sm backdrop-blur">
            <div className="font-medium">Selected Operation</div>
            <div className="mt-1">{selectedFeatureSummary}</div>
            {selectedFeatureTargetLabel && (
              <div className="mt-1 text-xs text-text-muted">Target: {selectedFeatureTargetLabel}</div>
            )}
          </div>
        )}

        {draft && (
          <div className="rounded-md border border-border/80 bg-bg/90 px-3 py-2 text-left text-xs text-text-muted shadow-sm backdrop-blur">
            Hover or click a highlighted target to resolve a canonical face, edge, or corner for this operation.
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
