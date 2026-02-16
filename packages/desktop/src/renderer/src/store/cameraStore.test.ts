import { describe, it, expect, beforeEach } from 'vitest';
import { useCameraStore } from './cameraStore';

describe('cameraStore', () => {
  beforeEach(() => {
    useCameraStore.setState({
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
      pendingCameraRestore: false
    });
  });

  // ============================================================
  // Display State
  // ============================================================

  describe('display state', () => {
    describe('setDisplayMode', () => {
      it('changes display mode to exploded', () => {
        const store = useCameraStore.getState();

        store.setDisplayMode('exploded');

        expect(useCameraStore.getState().displayMode).toBe('exploded');
      });

      it('changes display mode to assembled', () => {
        useCameraStore.setState({ displayMode: 'exploded' });
        const store = useCameraStore.getState();

        store.setDisplayMode('assembled');

        expect(useCameraStore.getState().displayMode).toBe('assembled');
      });
    });

    describe('setShowGrid', () => {
      it('shows the grid', () => {
        useCameraStore.setState({ showGrid: false });
        const store = useCameraStore.getState();

        store.setShowGrid(true);

        expect(useCameraStore.getState().showGrid).toBe(true);
      });

      it('hides the grid', () => {
        useCameraStore.setState({ showGrid: true });
        const store = useCameraStore.getState();

        store.setShowGrid(false);

        expect(useCameraStore.getState().showGrid).toBe(false);
      });
    });

    describe('toggleGrainDirection', () => {
      it('toggles showGrainDirection from false to true', () => {
        useCameraStore.setState({ showGrainDirection: false });
        const store = useCameraStore.getState();

        store.toggleGrainDirection();

        expect(useCameraStore.getState().showGrainDirection).toBe(true);
      });

      it('toggles showGrainDirection from true to false', () => {
        useCameraStore.setState({ showGrainDirection: true });
        const store = useCameraStore.getState();

        store.toggleGrainDirection();

        expect(useCameraStore.getState().showGrainDirection).toBe(false);
      });
    });
  });

  // ============================================================
  // Camera Actions
  // ============================================================

  describe('camera actions', () => {
    describe('requestCenterCamera', () => {
      it('sets centerCameraRequested to true', () => {
        const store = useCameraStore.getState();
        expect(store.centerCameraRequested).toBe(false);

        store.requestCenterCamera();

        expect(useCameraStore.getState().centerCameraRequested).toBe(true);
      });
    });

    describe('requestCenterCameraAtOrigin', () => {
      it('sets centerCameraAtOriginRequested to true', () => {
        const store = useCameraStore.getState();
        expect(store.centerCameraAtOriginRequested).toBe(false);

        store.requestCenterCameraAtOrigin();

        expect(useCameraStore.getState().centerCameraAtOriginRequested).toBe(true);
      });
    });

    describe('requestCenterCameraAtPosition', () => {
      it('sets the position to center camera at', () => {
        const store = useCameraStore.getState();
        const position = { x: 10, y: 5, z: 20 };

        store.requestCenterCameraAtPosition(position);

        expect(useCameraStore.getState().centerCameraAtPosition).toEqual(position);
      });
    });

    describe('clearCenterCameraRequest', () => {
      it('clears all camera request flags', () => {
        const store = useCameraStore.getState();
        store.requestCenterCamera();
        store.requestCenterCameraAtOrigin();
        store.requestCenterCameraAtPosition({ x: 10, y: 5, z: 20 });

        store.clearCenterCameraRequest();

        const state = useCameraStore.getState();
        expect(state.centerCameraRequested).toBe(false);
        expect(state.centerCameraAtOriginRequested).toBe(false);
        expect(state.centerCameraAtPosition).toBeNull();
      });
    });

    describe('setCameraViewVectors', () => {
      it('sets camera view vectors', () => {
        const store = useCameraStore.getState();
        const vectors = {
          up: { x: 0, y: 0, z: 1 },
          right: { x: 1, y: 0, z: 0 }
        };

        store.setCameraViewVectors(vectors);

        expect(useCameraStore.getState().cameraViewVectors).toEqual(vectors);
      });
    });
  });

  // ============================================================
  // Camera State Persistence
  // ============================================================

  describe('camera state persistence', () => {
    describe('setCameraState', () => {
      it('sets camera state', () => {
        const cameraState = {
          position: { x: 10, y: 20, z: 30 },
          target: { x: 0, y: 0, z: 0 }
        };

        useCameraStore.getState().setCameraState(cameraState);

        expect(useCameraStore.getState().cameraState).toEqual(cameraState);
      });

      it('clears camera state when set to null', () => {
        useCameraStore.setState({
          cameraState: { position: { x: 1, y: 2, z: 3 }, target: { x: 0, y: 0, z: 0 } }
        });

        useCameraStore.getState().setCameraState(null);

        expect(useCameraStore.getState().cameraState).toBeNull();
      });
    });

    describe('clearPendingCameraRestore', () => {
      it('clears pending camera restore flag', () => {
        useCameraStore.setState({ pendingCameraRestore: true });

        useCameraStore.getState().clearPendingCameraRestore();

        expect(useCameraStore.getState().pendingCameraRestore).toBe(false);
      });
    });
  });
});
