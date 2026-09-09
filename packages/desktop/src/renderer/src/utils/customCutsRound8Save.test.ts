import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectStore, generateThumbnail } from '../store/projectStore';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature } from '../types';
import { saveProject } from './fileOperations';

vi.mock('../store/projectStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../store/projectStore')>()),
  generateThumbnail: vi.fn()
}));
vi.mock('./analytics', () => ({ analytics: { capture: vi.fn() } }));

const hole: CircularCutFeature = {
  id: 'hole',
  label: 'Captured label',
  kind: 'circular_cut',
  version: 1,
  enabled: true,
  cutType: 'round_hole',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary: 0, secondary: 0, rotation: 0 },
  parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 }
};
beforeEach(() => {
  vi.clearAllMocks();
  useProjectStore.getState().newProject();
  useProjectStore.setState({
    parts: [createTestPart({ id: 'board', features: [hole] })],
    filePath: '/tmp/round8.carvd',
    isDirty: true
  });
  window.electronAPI.setWindowTitle = vi.fn();
});
describe('M3 actual serialization revision boundaries', () => {
  it.each(['thumbnail', 'write', 'recent'] as const)(
    'keeps newer cut edits dirty during %s I/O and saves them on retry',
    async (stage) => {
      const reached = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      const waitAt = async (candidate: string) => {
        if (candidate === stage) {
          reached.resolve();
          await release.promise;
        }
      };
      vi.mocked(generateThumbnail).mockImplementation(async () => {
        await waitAt('thumbnail');
        return null;
      });
      const written: Array<{ parts: Array<{ features: CircularCutFeature[] }> }> = [];
      window.electronAPI.writeFile = vi.fn(async (_path, json) => {
        written.push(JSON.parse(json));
        await waitAt('write');
      });
      window.electronAPI.addRecentProject = vi.fn(async () => {
        await waitAt('recent');
      });
      const saving = saveProject();
      await reached.promise;
      useProjectStore.getState().updatePart('board', {
        features: [{ ...hole, label: 'Newer label', parameters: { ...hole.parameters, diameter: 0.755 } }]
      });
      release.resolve();
      expect(await saving).toMatchObject({ success: true, pendingChanges: true });
      expect(written[0].parts[0].features[0]).toMatchObject({
        label: 'Captured label',
        parameters: { diameter: 0.25 }
      });
      expect(useProjectStore.getState().isDirty).toBe(true);
      await expect(saveProject()).resolves.toEqual({ success: true, filePath: '/tmp/round8.carvd' });
      expect(written[1].parts[0].features[0]).toMatchObject({ label: 'Newer label', parameters: { diameter: 0.755 } });
      expect(useProjectStore.getState().isDirty).toBe(false);
    }
  );
});
