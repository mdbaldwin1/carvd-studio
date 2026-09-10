import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { usePartCutsEditor } from './PartCutsEditorContext';
import {
  getPresetHint as getOperationPresetHint,
  getPresetLabel as getOperationPresetLabel,
  type OperationPreset
} from '@renderer/components/part-features/partFeatureEditorState';
import { cn } from '@renderer/lib/utils';

/**
 * Choosing a cut type is a one-time branching decision, so it belongs in a
 * dialog like New Project rather than as a third state of a side panel.
 */
export function AddCutDialog() {
  const { panelMode, draft, handleStartPreset, handleCancelEditor, setShowDowelDialog, hasUnsavedChanges } =
    usePartCutsEditor();
  const open = panelMode === 'add' && !draft;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : handleCancelEditor())}>
      {/* Same shell as the app's other dialogs: a fixed width with a viewport
          cap, a header that owns its padding, and a body that supplies its own
          and does the scrolling. */}
      <DialogContent className="w-[620px] max-w-[94vw]" onClose={handleCancelEditor}>
        <DialogHeader>
          <div>
            <DialogTitle>What kind of cut?</DialogTitle>
            <DialogDescription>
              Pick the cut type first. The next step walks through the target and measurements.
            </DialogDescription>
          </div>
          <DialogClose onClose={handleCancelEditor} />
        </DialogHeader>
        {/* A long chooser: cap the body so the dialog does not fill the
            window, and let it scroll rather than the page. */}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-3">
            {(
              [
                { group: 'Ends & Edges', presets: ['end_cut', 'edge_bevel', 'tenon'] },
                {
                  group: 'Channels & Laps',
                  presets: ['dado', 'stopped_dado', 'groove', 'stopped_groove', 'half_lap']
                },
                { group: 'Edges & Corners', presets: ['rabbet', 'edge_notch', 'corner_notch'] },
                { group: 'Pockets & Openings', presets: ['mortise', 'cutout'] },
                { group: 'Round Cuts', presets: ['round_hole', 'countersink', 'counterbore'] },
                { group: 'Rounded Openings', presets: ['rounded_slot', 'rounded_rectangle'] }
              ] as Array<{ group: string; presets: OperationPreset[] }>
            ).map(({ group, presets }) => (
              <div key={group}>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{group}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {presets.map((preset, presetIndex) => (
                    <button
                      key={preset}
                      type="button"
                      className={cn(
                        'rounded-md border border-border bg-bg px-3 py-2 text-left transition-colors hover:border-accent hover:bg-accent/5',
                        // Let an odd trailing tile fill the row instead of
                        // leaving a hole beside it.
                        presets.length % 2 === 1 && presetIndex === presets.length - 1 && 'col-span-2'
                      )}
                      onClick={() => handleStartPreset(preset)}
                    >
                      <div className="text-sm font-semibold text-text">{getOperationPresetLabel(preset)}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-text-muted">
                        {getOperationPresetHint(preset)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Joinery</div>
              <button
                type="button"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-left transition-colors hover:enabled:border-accent hover:enabled:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setShowDowelDialog(true)}
                disabled={hasUnsavedChanges}
                aria-describedby={hasUnsavedChanges ? 'dowel-joint-dirty-draft-message' : undefined}
              >
                <div className="text-sm font-semibold text-text">Create Dowel Joint</div>
                <div
                  id={hasUnsavedChanges ? 'dowel-joint-dirty-draft-message' : undefined}
                  className="mt-0.5 text-[11px] leading-snug text-text-muted"
                >
                  {hasUnsavedChanges
                    ? 'Save or discard part changes first'
                    : 'Add matching holes to this part and a mating part in one step.'}
                </div>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
