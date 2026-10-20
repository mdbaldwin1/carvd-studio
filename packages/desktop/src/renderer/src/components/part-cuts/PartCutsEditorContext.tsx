import { createContext, useContext, type ReactNode } from 'react';
import { usePartCutsEditorState, type PartCutsEditorState } from './usePartCutsEditorState';
import type { Part, PartFeature, PartFeatureTarget } from '@renderer/types';

const PartCutsEditorContext = createContext<PartCutsEditorState | null>(null);

export interface PartCutsEditorProviderProps {
  part: Part;
  draftFeatures: PartFeature[];
  units: 'imperial' | 'metric';
  selectedFeatureId: string | null;
  hoveredTarget: PartFeatureTarget | null;
  pendingTarget: PartFeatureTarget | null;
  onSelectFeature: (featureId: string | null) => void;
  onDraftFeaturesChange: (features: PartFeature[]) => void;
  onHoveredTargetChange: (target: PartFeatureTarget | null) => void;
  onPendingTargetChange: (target: PartFeatureTarget | null) => void;
  onExit: () => void;
  hasUnsavedChanges: boolean;
  children?: ReactNode;
}

/**
 * Shares one cut-editor state across the sidebar list, the preview, and the
 * properties panel, so the editor can occupy the ordinary shell instead of
 * replacing it with a screen of its own.
 */
export function PartCutsEditorProvider({ children, ...props }: PartCutsEditorProviderProps) {
  const value = usePartCutsEditorState(props);
  return <PartCutsEditorContext.Provider value={value}>{children}</PartCutsEditorContext.Provider>;
}

/** The cut editor state, or null outside the cuts workspace. */
export function usePartCutsEditorOptional(): PartCutsEditorState | null {
  return useContext(PartCutsEditorContext);
}

export function usePartCutsEditor(): PartCutsEditorState {
  const value = useContext(PartCutsEditorContext);
  if (!value) throw new Error('usePartCutsEditor must be used inside a PartCutsEditorProvider');
  return value;
}
