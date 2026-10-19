import { Button } from '@renderer/components/ui/button';
import { useCameraStore } from '@renderer/store/cameraStore';
import { useSnapStore } from '@renderer/store/snapStore';
import { Sun } from 'lucide-react';
import { useState } from 'react';
import { BrightnessPopup } from './BrightnessPopup';

export function DisplayToolbar() {
  const displayMode = useCameraStore((s) => s.displayMode);
  const showGrid = useCameraStore((s) => s.showGrid);
  const showGrainDirection = useCameraStore((s) => s.showGrainDirection);
  const snapToPartsEnabled = useSnapStore((s) => s.snapToPartsEnabled);
  const referencePartIds = useSnapStore((s) => s.referencePartIds);
  const setDisplayMode = useCameraStore((s) => s.setDisplayMode);
  const setShowGrid = useCameraStore((s) => s.setShowGrid);
  const toggleGrainDirection = useCameraStore((s) => s.toggleGrainDirection);
  const setSnapToPartsEnabled = useSnapStore((s) => s.setSnapToPartsEnabled);
  const clearReferences = useSnapStore((s) => s.clearReferences);
  const [brightnessOpen, setBrightnessOpen] = useState(false);
  const toolbarTextButtonClass = 'h-7 px-2.5 text-xs';

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface border border-border rounded-md p-1 z-10">
      <div className="flex items-center gap-0.5">
        <Button
          size="xs"
          variant={displayMode === 'solid' ? 'default' : 'ghost'}
          className={toolbarTextButtonClass}
          onClick={() => setDisplayMode('solid')}
          title="Solid view"
        >
          Solid
        </Button>
        <Button
          size="xs"
          variant={displayMode === 'wireframe' ? 'default' : 'ghost'}
          className={toolbarTextButtonClass}
          onClick={() => setDisplayMode('wireframe')}
          title="Wireframe view"
        >
          Wire
        </Button>
        <Button
          size="xs"
          variant={displayMode === 'translucent' ? 'default' : 'ghost'}
          className={toolbarTextButtonClass}
          onClick={() => setDisplayMode('translucent')}
          title="Translucent view"
        >
          Ghost
        </Button>
      </div>
      <div className="w-px h-6 bg-border mx-1" />
      <div className="flex items-center gap-0.5 relative">
        <Button
          size="icon-xs"
          variant={brightnessOpen ? 'default' : 'ghost'}
          onClick={() => setBrightnessOpen(!brightnessOpen)}
          title="Adjust lighting"
        >
          <Sun size={14} />
        </Button>
        <BrightnessPopup isOpen={brightnessOpen} onClose={() => setBrightnessOpen(false)} />
      </div>
      <div className="w-px h-6 bg-border mx-1" />
      <div className="flex items-center gap-0.5">
        <Button
          size="xs"
          variant={showGrid ? 'default' : 'ghost'}
          className={toolbarTextButtonClass}
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle grid"
        >
          Grid
        </Button>
        <Button
          size="xs"
          variant={showGrainDirection ? 'default' : 'ghost'}
          className={toolbarTextButtonClass}
          onClick={toggleGrainDirection}
          title="Toggle grain direction arrows"
        >
          Grain
        </Button>
        <Button
          size="xs"
          variant={snapToPartsEnabled ? 'default' : 'ghost'}
          className={toolbarTextButtonClass}
          onClick={() => setSnapToPartsEnabled(!snapToPartsEnabled)}
          title="Snap to parts (align edges and centers)"
        >
          Snap
        </Button>
        {referencePartIds.length > 0 && (
          <Button
            size="xs"
            variant="outline"
            className="h-7 px-2.5 text-xs font-medium border-primary bg-reference-bg text-primary hover:bg-primary-bg"
            onClick={clearReferences}
            title={`${referencePartIds.length} reference part${referencePartIds.length === 1 ? '' : 's'} - Click to clear (Esc)`}
          >
            Ref: {referencePartIds.length}
          </Button>
        )}
      </div>
    </div>
  );
}
