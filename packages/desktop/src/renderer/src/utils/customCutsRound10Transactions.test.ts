import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { useProjectStore, generateThumbnail } from '../store/projectStore';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { useFileOperations } from '../hooks/useFileOperations';
import { saveProject, saveProjectAs, waitForPendingProjectSaves } from './fileOperations';
import { serializeProject, stringifyCarvdFile } from './fileFormat';
import { createTestProject } from '../../../../tests/helpers/factories';

vi.mock('../store/projectStore', async (original) => ({
  ...(await original<typeof import('../store/projectStore')>()),
  generateThumbnail: vi.fn().mockResolvedValue(null)
}));
vi.mock('./analytics', () => ({ analytics: { capture: vi.fn() } }));

let disk: Map<string, string>;
let beforeClose: () => void;
beforeEach(async () => {
  await waitForPendingProjectSaves();
  vi.clearAllMocks();
  vi.mocked(generateThumbnail).mockResolvedValue(null);
  usePartCutsEditingStore.getState().finishEditing();
  useProjectStore.getState().newProject();
  useProjectStore.setState({
    projectName: 'original',
    filePath: '/original.carvd',
    projectNotes: 'Older',
    isDirty: false
  });
  disk = new Map([['/original.carvd', stringifyCarvdFile(serializeProject(useProjectStore.getState()))]]);
  window.electronAPI.writeFile = vi.fn(async (file, data) => {
    disk.set(file, data);
  });
  window.electronAPI.showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: '/copy.carvd' });
  window.electronAPI.addRecentProject = vi.fn().mockResolvedValue(undefined);
  window.electronAPI.setWindowTitle = vi.fn();
  window.electronAPI.getRecentProjects = vi.fn().mockResolvedValue([]);
  window.electronAPI.onOpenProject = vi.fn(() => () => undefined);
  window.electronAPI.onBeforeClose = vi.fn((callback) => {
    beforeClose = callback;
    return () => undefined;
  });
});

function holdCopyWrite() {
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let held = false;
  window.electronAPI.writeFile = vi.fn(async (file, data) => {
    if (file === '/copy.carvd' && !held) {
      held = true;
      entered.resolve();
      await release.promise;
    }
    disk.set(file, data);
  });
  return { entered: entered.promise, release: () => release.resolve() };
}
const notes = (file: string) => JSON.parse(disk.get(file)!).project.projectNotes;

it.each([false, true])(
  'P1 saves queued before the chooser resolves inherit the name and path (initial=%s)',
  async (initial) => {
    if (initial) useProjectStore.setState({ filePath: null });
    const chooser = Promise.withResolvers<{ canceled: boolean; filePath: string }>();
    window.electronAPI.showSaveDialog = vi.fn(() => chooser.promise);
    const copy = initial ? saveProject() : saveProjectAs();
    useProjectStore.getState().setProjectNotes('LATEST');
    const latest = saveProject();
    chooser.resolve({ canceled: false, filePath: '/copy.carvd' });
    const results = await Promise.all([copy, latest]);
    expect(notes('/copy.carvd')).toBe('LATEST');
    expect(JSON.parse(disk.get('/copy.carvd')!).project.name).toBe('copy');
    expect(results[1]).toEqual({ success: true, filePath: '/copy.carvd' });
    expect(useProjectStore.getState().isDirty).toBe(false);
    expect(window.electronAPI.showSaveDialog).toHaveBeenCalledTimes(1);
  }
);

it.each(['cancel', 'fail'] as const)(
  'P1 a %s Save As leaves queued manual and auto saves on the original destination',
  async (outcome) => {
    const chooser = Promise.withResolvers<{ canceled: boolean; filePath: string }>();
    window.electronAPI.showSaveDialog = vi.fn(() => chooser.promise);
    window.electronAPI.writeFile = vi.fn(async (file, data) => {
      if (file === '/copy.carvd') throw new Error('Read-only destination');
      disk.set(file, data);
    });
    const copy = saveProjectAs();
    useProjectStore.getState().setProjectNotes('Middle');
    const middle = saveProject('manual');
    useProjectStore.getState().setProjectNotes('LATEST');
    const latest = saveProject('auto');
    chooser.resolve(
      outcome === 'cancel' ? { canceled: true, filePath: '' } : { canceled: false, filePath: '/copy.carvd' }
    );
    const results = await Promise.all([copy, middle, latest]);
    expect(results[0].success).toBe(false);
    expect(results[2]).toEqual({ success: true, filePath: '/original.carvd' });
    expect(disk.has('/copy.carvd')).toBe(false);
    expect(notes('/original.carvd')).toBe('LATEST');
    expect(useProjectStore.getState().filePath).toBe('/original.carvd');
    expect(useProjectStore.getState().isDirty).toBe(false);
  }
);

it.each(['success', 'cancel', 'fail'] as const)(
  'P1 a second explicit Save As %s controls only its succeeding saves',
  async (outcome) => {
    const gate = holdCopyWrite();
    const write = window.electronAPI.writeFile;
    window.electronAPI.writeFile = vi.fn(async (file, data) => {
      if (file === '/third.carvd' && outcome === 'fail') throw new Error('Disk failure');
      await write(file, data);
    });
    window.electronAPI.showSaveDialog = vi
      .fn()
      .mockResolvedValueOnce({ canceled: false, filePath: '/copy.carvd' })
      .mockResolvedValueOnce(outcome === 'cancel' ? { canceled: true } : { canceled: false, filePath: '/third.carvd' });
    const copy = saveProjectAs();
    await gate.entered;
    useProjectStore.getState().setProjectNotes('Middle');
    const middle = saveProject('auto');
    const third = saveProjectAs();
    useProjectStore.getState().setProjectNotes('LATEST');
    const latest = saveProject();
    gate.release();
    const results = await Promise.all([copy, middle, third, latest]);
    const finalPath = outcome === 'success' ? '/third.carvd' : '/copy.carvd';
    expect(notes('/original.carvd')).toBe('Older');
    expect(notes('/copy.carvd')).toBe(outcome === 'success' ? 'Middle' : 'LATEST');
    expect(notes(finalPath)).toBe('LATEST');
    expect(results[3]).toEqual({ success: true, filePath: finalPath });
    expect(useProjectStore.getState().filePath).toBe(finalPath);
    expect(useProjectStore.getState().isDirty).toBe(false);
  }
);

it.each(['new', 'open'] as const)('P1 queued destination belongs to its document through %s', async (route) => {
  const gate = holdCopyWrite();
  const copy = saveProjectAs();
  await gate.entered;
  useProjectStore.getState().setProjectNotes('First latest');
  const oldLatest = saveProject();
  if (route === 'open') useProjectStore.getState().loadProject(createTestProject({ name: 'Second' }), '/second.carvd');
  else {
    useProjectStore.getState().newProject();
    window.electronAPI.showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: '/second.carvd' });
  }
  useProjectStore.getState().setProjectNotes('Second latest');
  const second = saveProject();
  gate.release();
  const results = await Promise.all([copy, oldLatest, second]);
  expect(results[0].documentChanged).toBe(true);
  expect(results[1].documentChanged).toBe(true);
  expect(notes('/original.carvd')).toBe('Older');
  expect(notes('/copy.carvd')).toBe('First latest');
  expect(notes('/second.carvd')).toBe('Second latest');
  expect(useProjectStore.getState().filePath).toBe('/second.carvd');
  expect(useProjectStore.getState().isDirty).toBe(false);
});

it('P1 an authored name change during Save As is retained by the queued snapshot', async () => {
  const gate = holdCopyWrite();
  const copy = saveProjectAs();
  await gate.entered;
  useProjectStore.getState().setProjectName('My authored name');
  useProjectStore.getState().setProjectNotes('LATEST');
  const latest = saveProject();
  gate.release();
  expect((await copy).pendingChanges).toBe(true);
  expect(await latest).toEqual({ success: true, filePath: '/copy.carvd' });
  expect(JSON.parse(disk.get('/copy.carvd')!).project.name).toBe('My authored name');
  expect(useProjectStore.getState().projectName).toBe('My authored name');
  expect(useProjectStore.getState().isDirty).toBe(false);
});

it('P1 queued saves retain each requested content and a failed middle write does not break destination inheritance', async () => {
  const gate = holdCopyWrite();
  const write = window.electronAPI.writeFile;
  const attempts: Array<[string, string]> = [];
  window.electronAPI.writeFile = vi.fn(async (file, data) => {
    const note = JSON.parse(data).project.projectNotes;
    attempts.push([file, note]);
    if (note === 'Failed middle') throw new Error('Transient write error');
    await write(file, data);
  });
  const copy = saveProjectAs();
  await gate.entered;
  useProjectStore.getState().setProjectNotes('Failed middle');
  const middle = saveProject('auto');
  useProjectStore.getState().setProjectNotes('LATEST');
  const latest = saveProject();
  gate.release();
  expect((await copy).success).toBe(true);
  expect((await middle).error).toContain('Transient write error');
  expect(await latest).toEqual({ success: true, filePath: '/copy.carvd' });
  expect(attempts).toEqual([
    ['/copy.carvd', 'Older'],
    ['/copy.carvd', 'Failed middle'],
    ['/copy.carvd', 'LATEST']
  ]);
  expect(notes('/original.carvd')).toBe('Older');
  expect(notes('/copy.carvd')).toBe('LATEST');
  expect(useProjectStore.getState().isDirty).toBe(false);
});

it.each(['cancel', 'fail'] as const)(
  'P1 initial Save As %s allows the next requested save to choose a destination',
  async (outcome) => {
    useProjectStore.setState({ filePath: null });
    const chooser = Promise.withResolvers<{ canceled: boolean; filePath: string }>();
    window.electronAPI.showSaveDialog = vi
      .fn()
      .mockImplementationOnce(() => chooser.promise)
      .mockResolvedValueOnce({ canceled: false, filePath: '/second.carvd' });
    window.electronAPI.writeFile = vi.fn(async (file, data) => {
      if (file === '/copy.carvd') throw new Error('Disk failure');
      disk.set(file, data);
    });
    const copy = saveProject();
    useProjectStore.getState().setProjectNotes('LATEST');
    const latest = saveProject();
    chooser.resolve(
      outcome === 'cancel' ? { canceled: true, filePath: '' } : { canceled: false, filePath: '/copy.carvd' }
    );
    expect((await copy).success).toBe(false);
    expect(await latest).toEqual({ success: true, filePath: '/second.carvd' });
    expect(notes('/second.carvd')).toBe('LATEST');
    expect(useProjectStore.getState().filePath).toBe('/second.carvd');
    expect(useProjectStore.getState().isDirty).toBe(false);
    expect(window.electronAPI.showSaveDialog).toHaveBeenCalledTimes(2);
  }
);

it.each(['manual', 'auto'] as const)('P1 a queued %s save follows an in-flight Save As destination', async (kind) => {
  const gate = holdCopyWrite();
  const copy = saveProjectAs();
  await gate.entered;
  useProjectStore.getState().setProjectNotes('LATEST');
  const latest = saveProject(kind);
  gate.release();
  await Promise.all([copy, latest]);
  expect(notes('/copy.carvd')).toBe('LATEST');
  expect(notes('/original.carvd')).toBe('Older');
  expect(useProjectStore.getState().filePath).toBe('/copy.carvd');
  expect(useProjectStore.getState().isDirty).toBe(false);
});

it('P1 real close-save dialog writes the latest snapshot into the Save As copy before confirming close', async () => {
  function FileDialogs() {
    const files = useFileOperations();
    return createElement(files.UnsavedChangesDialogComponent);
  }
  const view = render(createElement(FileDialogs));
  const closed: Array<{ destination: string | null; notes: string }> = [];
  window.electronAPI.confirmClose = vi.fn(async () => {
    closed.push({ destination: useProjectStore.getState().filePath, notes: notes('/copy.carvd') });
  });
  const gate = holdCopyWrite();
  let copy!: ReturnType<typeof saveProjectAs>;
  await act(async () => {
    copy = saveProjectAs();
    await gate.entered;
  });
  act(() => {
    useProjectStore.getState().setProjectNotes('LATEST');
    beforeClose();
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(closed).toEqual([]);
  await act(async () => {
    gate.release();
    await copy;
    await waitForPendingProjectSaves();
  });
  expect(closed).toEqual([{ destination: '/copy.carvd', notes: 'LATEST' }]);
  expect(notes('/original.carvd')).toBe('Older');
  expect(useProjectStore.getState().isDirty).toBe(false);
  view.unmount();
});
