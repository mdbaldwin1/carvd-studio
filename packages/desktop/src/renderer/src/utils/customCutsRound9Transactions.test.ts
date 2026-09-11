import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectStore, generateThumbnail } from '../store/projectStore';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { createTestPart, createTestProject } from '../../../../tests/helpers/factories';
import { saveProject, saveProjectAs, openProjectFromPath, openProject } from './fileOperations';
import { serializeProject, stringifyCarvdFile } from './fileFormat';
import { act, renderHook } from '@testing-library/react';
import { useFileOperations } from '../hooks/useFileOperations';

vi.mock('../store/projectStore', async (original) => ({
  ...(await original<typeof import('../store/projectStore')>()),
  generateThumbnail: vi.fn().mockResolvedValue(null)
}));
vi.mock('./analytics', () => ({ analytics: { capture: vi.fn() } }));
const snapshot = () => serializeProject(useProjectStore.getState());
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(generateThumbnail).mockResolvedValue(null);
  usePartCutsEditingStore.getState().finishEditing();
  useProjectStore.getState().newProject();
  useProjectStore.setState({ filePath: '/first.carvd', parts: [createTestPart({ id: 'first' })], isDirty: true });
  window.electronAPI.setWindowTitle = vi.fn();
  window.electronAPI.addRecentProject = vi.fn().mockResolvedValue(undefined);
});

describe('round 9 document transactions', () => {
  it('N3 relocation retains its original approval across the file chooser and recent-path update', async () => {
    const data = stringifyCarvdFile(snapshot());
    const chooser = Promise.withResolvers<{ canceled: boolean; filePaths: string[] }>();
    window.electronAPI.showOpenDialog = vi.fn(() => chooser.promise);
    window.electronAPI.readFile = vi.fn().mockResolvedValue(data);
    window.electronAPI.onOpenProject = vi.fn(() => () => undefined);
    window.electronAPI.onBeforeClose = vi.fn(() => () => undefined);
    window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
    window.electronAPI.updateRecentProjectPath = vi.fn().mockResolvedValue(undefined);
    const hook = renderHook(() => useFileOperations());
    let opening!: Promise<void>;
    act(() => {
      opening = hook.result.current.handleRelocateFile('/missing.carvd', 'missing');
    });
    act(() => {
      useProjectStore.getState().setProjectNotes('Edit during chooser');
    });
    await act(async () => {
      chooser.resolve({ canceled: false, filePaths: ['/replacement.carvd'] });
      await opening;
    });
    expect(useProjectStore.getState().filePath).toBe('/first.carvd');
    expect(useProjectStore.getState().projectNotes).toBe('Edit during chooser');
    hook.unmount();
  });
  it.each(['thumbnail', 'write'] as const)(
    'N1 orders manual/auto/Save As snapshots through delayed %s and a failed write',
    async (stage) => {
      const entered = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      const disk = new Map<string, string>();
      if (stage === 'thumbnail')
        vi.mocked(generateThumbnail).mockImplementationOnce(async () => {
          entered.resolve();
          await release.promise;
          return null;
        });
      window.electronAPI.writeFile = vi.fn(async (file, data) => {
        const notes = JSON.parse(data).project.projectNotes;
        if (stage === 'write' && notes === 'Older') {
          entered.resolve();
          await release.promise;
        }
        if (notes === 'Failed middle') throw new Error('Disk failure');
        disk.set(file, data);
      });
      window.electronAPI.showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: '/copy.carvd' });
      useProjectStore.getState().setProjectNotes('Older');
      const oldest = saveProject();
      await entered.promise;
      useProjectStore.getState().setProjectNotes('Failed middle');
      const failed = saveProject('auto');
      useProjectStore.getState().setProjectNotes('NEWEST');
      const newest = saveProject();
      const copy = saveProjectAs();
      release.resolve();
      expect((await oldest).success).toBe(true);
      expect((await failed).error).toContain('Disk failure');
      expect((await newest).success).toBe(true);
      expect((await copy).success).toBe(true);
      expect(JSON.parse(disk.get('/first.carvd')!).project.projectNotes).toBe('NEWEST');
      expect(JSON.parse(disk.get('/copy.carvd')!).project.projectNotes).toBe('NEWEST');
      expect(useProjectStore.getState().filePath).toBe('/copy.carvd');
      expect(useProjectStore.getState().isDirty).toBe(false);
    }
  );

  it.each(['document', 'edit', 'session-cycle', 'save-as'] as const)(
    'N3 cancels delayed replacement after a newer %s transaction',
    async (change) => {
      const data = stringifyCarvdFile(snapshot());
      const read = Promise.withResolvers<string>();
      window.electronAPI.readFile = vi.fn(() => read.promise);
      const opening = openProjectFromPath('/replacement.carvd');
      if (change === 'document')
        useProjectStore.getState().loadProject(createTestProject({ name: 'Second' }), '/second.carvd');
      if (change === 'edit') useProjectStore.getState().setProjectNotes('Keep my edit');
      if (change === 'session-cycle') {
        usePartCutsEditingStore.getState().startEditingPartCuts('first', 'First');
        usePartCutsEditingStore.getState().finishEditing();
      }
      if (change === 'save-as') {
        window.electronAPI.showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: '/chosen.carvd' });
        window.electronAPI.writeFile = vi.fn().mockResolvedValue(undefined);
        await saveProjectAs();
      }
      const expected = useProjectStore.getState();
      read.resolve(data);
      expect((await opening).success).toBe(false);
      expect(useProjectStore.getState()).toBe(expected);
    }
  );

  it('N3 the latest requested Open wins when reads complete in reverse order', async () => {
    const first = snapshot();
    const second = { ...first, project: { ...first.project, name: 'Second' } };
    const held = Promise.withResolvers<string>();
    window.electronAPI.readFile = vi.fn((file) =>
      file === '/older.carvd' ? held.promise : Promise.resolve(stringifyCarvdFile(second))
    );
    const older = openProjectFromPath('/older.carvd');
    await openProjectFromPath('/newer.carvd');
    held.resolve(stringifyCarvdFile(first));
    expect((await older).success).toBe(false);
    expect(useProjectStore.getState().projectName).toBe('Second');
    expect(useProjectStore.getState().filePath).toBe('/newer.carvd');
  });

  it('N2 document ownership changes on New/Open but never on edits or undo and is not serialized', () => {
    const first = useProjectStore.getState().documentGeneration;
    useProjectStore.getState().setProjectNotes('Edited');
    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().documentGeneration).toBe(first);
    useProjectStore.getState().newProject();
    const second = useProjectStore.getState().documentGeneration;
    expect(second).toBeGreaterThan(first);
    useProjectStore.getState().loadProject(createTestProject());
    expect(useProjectStore.getState().documentGeneration).toBeGreaterThan(second);
    expect(stringifyCarvdFile(snapshot())).not.toContain('documentGeneration');
  });
  it('N1 all save kinds preserve request order despite a suspended older write', async () => {
    const gate = Promise.withResolvers<void>();
    const reached = Promise.withResolvers<void>();
    let disk = '';
    window.electronAPI.writeFile = vi.fn(async (_path, data) => {
      if (JSON.parse(data).project.projectNotes === 'Older') {
        reached.resolve();
        await gate.promise;
      }
      disk = data;
    });
    useProjectStore.getState().setProjectNotes('Older');
    const older = saveProject('manual');
    await reached.promise;
    useProjectStore.getState().setProjectNotes('Middle');
    const middle = saveProject('auto');
    useProjectStore.getState().setProjectNotes('NEWEST');
    const newest = saveProject('manual');
    // Drain every immediately-ready operation; the older write alone stays held.
    await new Promise((resolve) => setTimeout(resolve, 20));
    gate.resolve();
    await Promise.all([older, middle, newest]);
    expect(JSON.parse(disk).project.projectNotes).toBe('NEWEST');
    expect(useProjectStore.getState().isDirty).toBe(false);
  });

  it.each(['new', 'open'] as const)('N2 completion cannot retarget a different document after %s', async (route) => {
    const reached = Promise.withResolvers<void>();
    const gate = Promise.withResolvers<void>();
    window.electronAPI.writeFile = vi.fn(async () => {
      reached.resolve();
      await gate.promise;
    });
    const save = saveProject();
    await reached.promise;
    if (route === 'new') useProjectStore.getState().newProject();
    else useProjectStore.getState().loadProject(createTestProject({ name: 'Second' }), '/second.carvd');
    const expected = useProjectStore.getState();
    gate.resolve();
    await save;
    expect(useProjectStore.getState().filePath).toBe(expected.filePath);
    expect(useProjectStore.getState().isDirty).toBe(false);
    expect(useProjectStore.getState().projectName).toBe(expected.projectName);
  });

  it('N2 Save As dialog cannot rename or write a document opened while awaiting a path', async () => {
    const dialog = Promise.withResolvers<{ canceled: boolean; filePath: string }>();
    window.electronAPI.showSaveDialog = vi.fn(() => dialog.promise);
    const writes: string[] = [];
    window.electronAPI.writeFile = vi.fn(async (path) => {
      writes.push(path);
    });
    const save = saveProjectAs();
    useProjectStore.getState().loadProject(createTestProject({ name: 'Second' }), '/second.carvd');
    dialog.resolve({ canceled: false, filePath: '/chosen-for-first.carvd' });
    await save;
    expect(writes).toEqual([]);
    expect(useProjectStore.getState().filePath).toBe('/second.carvd');
    expect(useProjectStore.getState().projectName).toBe('Second');
  });

  it.each(['path', 'dialog'] as const)(
    'N3 %s open revalidates the document and cut session before applying a delayed read',
    async (route) => {
      const data = stringifyCarvdFile(snapshot());
      const read = Promise.withResolvers<string>();
      const reached = Promise.withResolvers<void>();
      window.electronAPI.readFile = vi.fn(() => {
        reached.resolve();
        return read.promise;
      });
      window.electronAPI.showOpenDialog = vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/second.carvd'] });
      useProjectStore.getState().markClean();
      const opening = route === 'path' ? openProjectFromPath('/second.carvd') : openProject();
      await reached.promise;
      const part = useProjectStore.getState().parts[0];
      usePartCutsEditingStore.getState().startEditingPartCuts(part.id, part.name, part.features);
      usePartCutsEditingStore.getState().registerInspector(true, () => null);
      read.resolve(data);
      const result = await opening;
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/changed|editing|cuts/i);
      expect(useProjectStore.getState().filePath).toBe('/first.carvd');
      expect(usePartCutsEditingStore.getState().sourcePartId).toBe('first');
      expect(usePartCutsEditingStore.getState().inspectorDirty).toBe(true);
    }
  );
});
