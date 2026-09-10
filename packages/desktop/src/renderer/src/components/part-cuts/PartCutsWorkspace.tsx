import { PartCutsPreviewCanvas } from '@renderer/components/part-cuts/PartCutsPreviewCanvas';
import { DowelJointDialog } from '@renderer/components/part-cuts/DowelJointDialog';
import { useProjectStore } from '@renderer/store/projectStore';
import { useSelectionStore } from '@renderer/store/selectionStore';
import { normalizeRectCutDraft } from '@renderer/components/part-features/partFeatureEditorState';
import {} from '@renderer/utils/endCutUtils';
import { usePartCutsEditor } from './PartCutsEditorContext';
import { AddCutDialog } from './AddCutDialog';
import { HotkeyHints } from '@renderer/components/common/HotkeyHints';
import { CanvasControlHints } from '@renderer/components/common/CanvasControlHints';
import { useAppSettings } from '@renderer/hooks/useAppSettings';
import {} from '@renderer/utils/rectCutUtils';
import {} from '@renderer/components/ui/dropdown-menu';

/**
 * The cut editor's viewport. The list, the type picker, and the inspector live
 * in the sidebar, a dialog, and the properties panel, sharing state through
 * PartCutsEditorProvider.
 */
export function PartCutsWorkspace() {
  const {
    part,
    draftFeatures,
    hoveredTarget,
    pendingTarget,
    onDraftFeaturesChange,
    onHoveredTargetChange,
    onExit,
    setDraft,
    setPanelMode,
    showDowelDialog,
    setShowDowelDialog,
    workspaceRootRef,
    projectParts,
    addDowelJoint,
    featureConflicts,
    inspectorDraft,
    handlePreviewTargetActivation,
    selectedFeatureSummary,
    selectedFeatureTargetLabel
  } = usePartCutsEditor();
  const { settings: appSettings } = useAppSettings();

  return (
    <div
      ref={workspaceRootRef}
      tabIndex={-1}
      role="region"
      aria-label={`Part cuts for ${part.name}`}
      className="app-main flex min-h-0 flex-1 bg-bg outline-none"
    >
      {/* Same container as CanvasWithDrop: the preview reaches the panels, the
          header, and the bottom of the window with no padding, frame, or
          radius of its own. */}
      <div className="canvas-container relative min-w-0 flex-1 overflow-hidden bg-bg">
        <PartCutsPreviewCanvas
          part={part}
          draftFeatures={draftFeatures}
          draft={inspectorDraft}
          selectedFeatureSummary={selectedFeatureSummary}
          selectedFeatureTargetLabel={selectedFeatureTargetLabel}
          hoveredTarget={hoveredTarget}
          pendingTarget={pendingTarget}
          onHoverTarget={onHoveredTargetChange}
          onActivateTarget={handlePreviewTargetActivation}
          onDraftChange={(nextDraft) =>
            setDraft(
              nextDraft.mode === 'rect_cut'
                ? normalizeRectCutDraft(nextDraft, {
                    partLength: part.length,
                    partWidth: part.width,
                    partThickness: part.thickness
                  })
                : nextDraft
            )
          }
        />

        <HotkeyHints show={appSettings.showHotkeyHints} />
        {appSettings.showHotkeyHints && <CanvasControlHints />}

        {featureConflicts.length > 0 && (
          <div className="absolute left-3 top-3 z-40 max-w-[min(88%,26rem)] rounded-md border border-warning/40 bg-warning/10 px-3 py-3 text-left backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-wide text-warning">Cut Conflicts</div>
            <ul className="mt-2 space-y-1 text-sm text-warning">
              {featureConflicts.slice(0, 3).map((conflict, index) => (
                <li key={`${conflict.featureId}-${conflict.relatedFeatureId ?? 'none'}-${index}`}>
                  {conflict.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* The inspector only; the cut list is a sidebar section and the type
            picker is a dialog. */}
      {showDowelDialog && (
        <DowelJointDialog
          open
          firstPart={part}
          candidateParts={projectParts.filter((candidate) => candidate.id !== part.id)}
          onClose={() => {
            setShowDowelDialog(false);
            setPanelMode('list');
          }}
          onCreate={(input) => {
            const jointId = addDowelJoint(input);
            if (!jointId) return null;
            const refreshedPart = useProjectStore.getState().parts.find((candidate) => candidate.id === part.id);
            if (refreshedPart) onDraftFeaturesChange(refreshedPart.features ?? []);
            return jointId;
          }}
          onAlignRequested={({ firstPartId, secondPartId }) => {
            setShowDowelDialog(false);
            setPanelMode('list');
            useSelectionStore.getState().selectParts([firstPartId, secondPartId]);
            onExit();
          }}
        />
      )}
      <AddCutDialog />
    </div>
  );
}
