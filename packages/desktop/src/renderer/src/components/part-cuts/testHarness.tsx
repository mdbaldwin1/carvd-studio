import { render } from '@testing-library/react';
import { vi } from 'vitest';
import type { Part, PartFeature, PartFeatureTarget } from '@renderer/types';
import { PartCutsEditorProvider, type PartCutsEditorProviderProps } from './PartCutsEditorContext';
import { PartCutsWorkspace } from './PartCutsWorkspace';

export type PartCutsHarnessProps = Omit<PartCutsEditorProviderProps, 'children'>;

/**
 * Mount the cuts preview with its editor state.
 *
 * The editor is spread across the sidebar, a dialog, and the properties panel,
 * so its state lives in PartCutsEditorProvider rather than in any one of them.
 * Tests that drive the preview mount the provider the same way the app does.
 */
export function renderPartCutsWorkspace(overrides: Partial<PartCutsHarnessProps> = {}) {
  const props: PartCutsHarnessProps = {
    part: { id: 'p1', name: 'Panel', length: 24, width: 12, thickness: 0.75 } as Part,
    draftFeatures: [] as PartFeature[],
    units: 'imperial',
    selectedFeatureId: null,
    hoveredTarget: null as PartFeatureTarget | null,
    pendingTarget: null as PartFeatureTarget | null,
    onSelectFeature: vi.fn(),
    onDraftFeaturesChange: vi.fn(),
    onHoveredTargetChange: vi.fn(),
    onPendingTargetChange: vi.fn(),
    onExit: vi.fn(),
    hasUnsavedChanges: false,
    ...overrides
  };
  const view = render(
    <PartCutsEditorProvider {...props}>
      <PartCutsWorkspace />
    </PartCutsEditorProvider>
  );
  return { ...view, props };
}
