import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Electron APIs
global.window.electronAPI = {
  // File operations
  saveProject: vi.fn(),
  loadProject: vi.fn(),
  saveProjectAs: vi.fn(),
  openProject: vi.fn(),
  onOpenProject: vi.fn(() => () => {}),
  getRecentProjects: vi.fn().mockResolvedValue([]),
  addRecentProject: vi.fn(),

  // Preferences
  getTheme: vi.fn().mockResolvedValue('dark'),
  setTheme: vi.fn(),
  getSnapEnabled: vi.fn().mockResolvedValue(true),
  setSnapEnabled: vi.fn(),
  getSnapDistance: vi.fn().mockResolvedValue(0.125),
  setSnapDistance: vi.fn(),

  // License
  verifyLicense: vi.fn().mockResolvedValue({ valid: false, error: 'No license' }),
  getLicenseData: vi.fn().mockResolvedValue(null),
  deactivateLicense: vi.fn(),

  // Welcome tutorial
  getHasCompletedWelcome: vi.fn().mockResolvedValue(false),
  setHasCompletedWelcome: vi.fn(),
  resetWelcomeTutorial: vi.fn(),

  // App library
  getAppLibrary: vi.fn().mockResolvedValue({ stocks: [], composites: [] }),
  saveAppLibrary: vi.fn(),

  // Window controls
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),

  // Menu actions
  onNewProject: vi.fn(() => () => {}),
  onSaveProject: vi.fn(() => () => {}),
  onUndo: vi.fn(() => () => {}),
  onRedo: vi.fn(() => () => {})
};

// Mock Three.js for component tests
vi.mock('three', () => ({
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas')
  })),
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(),
  BoxGeometry: vi.fn(),
  MeshBasicMaterial: vi.fn(),
  Mesh: vi.fn(() => ({
    position: { set: vi.fn() },
    rotation: { set: vi.fn() },
    scale: { set: vi.fn() }
  })),
  Vector3: vi.fn(function (this: any, x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.set = vi.fn((newX, newY, newZ) => {
      this.x = newX;
      this.y = newY;
      this.z = newZ;
      return this;
    });
    this.add = vi.fn((v) => {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    });
    this.sub = vi.fn((v) => {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    });
    this.applyQuaternion = vi.fn(function (this: any) {
      return this;
    });
    this.distanceTo = vi.fn().mockReturnValue(0);
    return this;
  }),
  Euler: vi.fn(function (this: any, x = 0, y = 0, z = 0, order = 'XYZ') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
    this.set = vi.fn((newX: number, newY: number, newZ: number, newOrder = 'XYZ') => {
      this.x = newX;
      this.y = newY;
      this.z = newZ;
      this.order = newOrder;
      return this;
    });
    return this;
  }),
  Quaternion: vi.fn(function (this: any) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
    this.setFromEuler = vi.fn(function (this: any) {
      return this;
    });
    return this;
  }),
  Raycaster: vi.fn(),
  Color: vi.fn()
}));

// Suppress console errors in tests (optional - comment out for debugging)
// vi.spyOn(console, 'error').mockImplementation(() => {});
