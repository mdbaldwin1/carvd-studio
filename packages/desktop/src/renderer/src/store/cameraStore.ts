import { create } from 'zustand';
import { CameraState, DisplayMode } from '../types';

interface CameraStoreState {
  // Camera centering requests
  centerCameraRequested: boolean;
  centerCameraAtOriginRequested: boolean;
  centerCameraAtPosition: { x: number; y: number; z: number } | null;

  // Camera view vectors for view-relative movement (screen-aligned, normalized)
  cameraViewVectors: {
    up: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  };

  // Display toggles
  showGrainDirection: boolean;
  displayMode: DisplayMode;
  showGrid: boolean;

  // Camera state (position and target) for restoring view on project load
  cameraState: CameraState | null;
  pendingCameraRestore: boolean;

  // Actions - Camera centering
  requestCenterCamera: () => void;
  requestCenterCameraAtOrigin: () => void;
  requestCenterCameraAtPosition: (position: { x: number; y: number; z: number }) => void;
  clearCenterCameraRequest: () => void;

  // Actions - View vectors
  setCameraViewVectors: (vectors: {
    up: { x: number; y: number; z: number };
    right: { x: number; y: number; z: number };
  }) => void;

  // Actions - Display toggles
  toggleGrainDirection: () => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setShowGrid: (show: boolean) => void;

  // Actions - Camera state persistence
  setCameraState: (state: CameraState | null) => void;
  clearPendingCameraRestore: () => void;
}

export const useCameraStore = create<CameraStoreState>((set) => ({
  centerCameraRequested: false,
  centerCameraAtOriginRequested: false,
  centerCameraAtPosition: null,
  cameraViewVectors: {
    up: { x: 0, y: 1, z: 0 },
    right: { x: 0.707, y: 0, z: -0.707 }
  },
  showGrainDirection: false,
  displayMode: 'solid',
  showGrid: true,
  cameraState: null,
  pendingCameraRestore: false,

  requestCenterCamera: () => set({ centerCameraRequested: true }),
  requestCenterCameraAtOrigin: () => set({ centerCameraAtOriginRequested: true }),
  requestCenterCameraAtPosition: (position) => set({ centerCameraAtPosition: position }),
  clearCenterCameraRequest: () =>
    set({ centerCameraRequested: false, centerCameraAtOriginRequested: false, centerCameraAtPosition: null }),

  setCameraViewVectors: (vectors) => set({ cameraViewVectors: vectors }),

  toggleGrainDirection: () => set((state) => ({ showGrainDirection: !state.showGrainDirection })),
  setDisplayMode: (displayMode) => set({ displayMode }),
  setShowGrid: (showGrid) => set({ showGrid }),

  setCameraState: (state) => set({ cameraState: state }),
  clearPendingCameraRestore: () => set({ pendingCameraRestore: false })
}));
