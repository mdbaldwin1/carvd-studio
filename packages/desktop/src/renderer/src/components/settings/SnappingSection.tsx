import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Select } from '@renderer/components/ui/select';
import { AppSettings, SnapSensitivity, AdvancedSnapPreset } from '../../types';
import { HelpTooltip } from '../common/HelpTooltip';

interface SnappingSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function SnappingSection({ formData, onSettingChange }: SnappingSectionProps) {
  const handlePresetChange = (preset: AdvancedSnapPreset) => {
    onSettingChange('advancedSnapPreset', preset);
    if (preset === 'simple') {
      onSettingChange('enableSurfaceAnchors', true);
      onSettingChange('enableFractionalAnchors', true);
      onSettingChange('enableGoldenRatioAnchors', false);
      onSettingChange('enableFeatureAnchors', false);
      onSettingChange('enableLayoutSnaps', false);
      onSettingChange('enableEqualSpacingSnap', false);
      onSettingChange('enableDistributionSnap', false);
      onSettingChange('enablePatternSnap', false);
      onSettingChange('enableAxisLegacySnaps', true);
      onSettingChange('showSnapCandidates', false);
      return;
    }
    if (preset === 'layout') {
      onSettingChange('enableSurfaceAnchors', true);
      onSettingChange('enableFractionalAnchors', true);
      onSettingChange('enableGoldenRatioAnchors', true);
      onSettingChange('enableFeatureAnchors', true);
      onSettingChange('enableLayoutSnaps', true);
      onSettingChange('enableEqualSpacingSnap', true);
      onSettingChange('enableDistributionSnap', true);
      onSettingChange('enablePatternSnap', true);
      onSettingChange('enableAxisLegacySnaps', true);
      onSettingChange('showSnapCandidates', true);
      return;
    }

    // precision
    onSettingChange('enableSurfaceAnchors', true);
    onSettingChange('enableFractionalAnchors', true);
    onSettingChange('enableGoldenRatioAnchors', false);
    onSettingChange('enableFeatureAnchors', true);
    onSettingChange('enableLayoutSnaps', true);
    onSettingChange('enableEqualSpacingSnap', true);
    onSettingChange('enableDistributionSnap', false);
    onSettingChange('enablePatternSnap', false);
    onSettingChange('enableAxisLegacySnaps', true);
    onSettingChange('showSnapCandidates', false);
  };

  return (
    <Card className="settings-section mb-6 last:mb-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Snapping
          <HelpTooltip
            text="Configure how parts snap to other parts, guides, and the grid. Hold Alt/Option while dragging to temporarily bypass snapping."
            docsSection="snapping"
            inline
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Snap Sensitivity</label>
            <HelpTooltip
              text="How close parts need to be before snapping. Tight requires closer proximity."
              docsSection="snapping"
            />
          </div>
          <Select
            className="w-auto"
            value={formData.snapSensitivity ?? 'normal'}
            onChange={(e) => onSettingChange('snapSensitivity', e.target.value as SnapSensitivity)}
          >
            <option value="tight">Tight (precise)</option>
            <option value="normal">Normal</option>
            <option value="loose">Loose (easier)</option>
          </Select>
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Advanced Snap Preset</label>
            <HelpTooltip
              text="Simple favors clean primary snaps. Precision enables richer anchor snapping. Layout emphasizes spacing and alignment workflows."
              docsSection="snapping"
            />
          </div>
          <Select
            className="w-auto"
            value={formData.advancedSnapPreset ?? 'precision'}
            onChange={(e) => handlePresetChange(e.target.value as AdvancedSnapPreset)}
          >
            <option value="simple">Simple</option>
            <option value="precision">Precision</option>
            <option value="layout">Layout</option>
          </Select>
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Live Grid Snapping</label>
            <HelpTooltip
              text="Snap to grid continuously while dragging (instead of only when releasing)."
              docsSection="snapping"
            />
          </div>
          <Checkbox
            checked={formData.liveGridSnap ?? false}
            onChange={(e) => onSettingChange('liveGridSnap', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Snap to Origin</label>
            <HelpTooltip text="Snap parts to workspace origin planes (X=0, Y=0, Z=0)." docsSection="snapping" />
          </div>
          <Checkbox
            checked={formData.snapToOrigin ?? true}
            onChange={(e) => onSettingChange('snapToOrigin', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Surface Anchors</label>
            <HelpTooltip text="Enable center, midline, and quarter-line snapping on compatible faces." docsSection="snapping" />
          </div>
          <Checkbox
            checked={formData.enableSurfaceAnchors ?? true}
            onChange={(e) => onSettingChange('enableSurfaceAnchors', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Fractional Face Anchors</label>
            <HelpTooltip text="Enable 0/25/50/75/100 face anchor snapping for precision alignment." docsSection="snapping" />
          </div>
          <Checkbox
            checked={formData.enableFractionalAnchors ?? true}
            onChange={(e) => onSettingChange('enableFractionalAnchors', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Show Candidate Indicators</label>
            <HelpTooltip
              text="Show nearby candidate snap lines in addition to the active winner indicator."
              docsSection="snapping"
            />
          </div>
          <Checkbox
            checked={formData.showSnapCandidates ?? false}
            onChange={(e) => onSettingChange('showSnapCandidates', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Golden Ratio Anchors</label>
            <HelpTooltip
              text="Enable 38.2% and 61.8% face anchors for proportional layout snapping."
              docsSection="snapping"
            />
          </div>
          <Checkbox
            checked={formData.enableGoldenRatioAnchors ?? false}
            onChange={(e) => onSettingChange('enableGoldenRatioAnchors', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Feature Anchors</label>
            <HelpTooltip
              text="Enable edge-edge, vertex, midpoint, and extension-line feature snapping."
              docsSection="snapping"
            />
          </div>
          <Checkbox
            checked={formData.enableFeatureAnchors ?? true}
            onChange={(e) => onSettingChange('enableFeatureAnchors', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Layout Snaps</label>
            <HelpTooltip
              text="Master toggle for equal spacing, distribution, and pattern snapping."
              docsSection="snapping"
            />
          </div>
          <Checkbox
            checked={formData.enableLayoutSnaps ?? true}
            onChange={(e) => onSettingChange('enableLayoutSnaps', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Equal Spacing Snaps</label>
            <HelpTooltip text="Snap between two parts to maintain equal spacing on an axis." docsSection="snapping" />
          </div>
          <Checkbox
            checked={formData.enableEqualSpacingSnap ?? true}
            onChange={(e) => onSettingChange('enableEqualSpacingSnap', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Distribution Snaps</label>
            <HelpTooltip text="Snap to evenly distributed slots across multiple parts." docsSection="snapping" />
          </div>
          <Checkbox
            checked={formData.enableDistributionSnap ?? true}
            onChange={(e) => onSettingChange('enableDistributionSnap', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Pattern Snaps</label>
            <HelpTooltip text="Snap to repeated spacing patterns inferred from existing parts." docsSection="snapping" />
          </div>
          <Checkbox
            checked={formData.enablePatternSnap ?? true}
            onChange={(e) => onSettingChange('enablePatternSnap', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Axis Edge/Center Snaps</label>
            <HelpTooltip text="Enable legacy axis-aligned edge and center snapping behavior." docsSection="snapping" />
          </div>
          <Checkbox
            checked={formData.enableAxisLegacySnaps ?? true}
            onChange={(e) => onSettingChange('enableAxisLegacySnaps', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Match Same Dimensions Only</label>
            <HelpTooltip
              text="During resize, only match same dimension types (length to length, width to width)."
              docsSection="snapping"
            />
          </div>
          <Checkbox
            checked={formData.dimensionSnapSameTypeOnly ?? false}
            onChange={(e) => onSettingChange('dimensionSnapSameTypeOnly', e.target.checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
