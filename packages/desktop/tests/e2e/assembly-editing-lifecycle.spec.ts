import { expect, test } from '@playwright/test';
import {
  addPartFromSidebar,
  closeElectronApp,
  createBlankProject,
  launchElectronApp,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

type SeedAssembly = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  parts: Array<{
    name: string;
    length: number;
    width: number;
    thickness: number;
    relativePosition: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    stockId: string | null;
    grainSensitive: boolean;
    grainDirection: 'length' | 'width';
    color: string;
  }>;
  groups: Array<{ originalId: string; name: string }>;
  groupMembers: Array<{ groupIndex: number; memberType: 'part' | 'group'; memberIndex: number }>;
  createdAt: string;
  modifiedAt: string;
};

test.describe('assembly editing lifecycle', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await createBlankProject(running.window, 'Assembly Editing Lifecycle E2E');
    await running.window.evaluate(() => window.electronAPI.setPreference('assemblyLibrary', []));
    await markProjectClean(running.window);
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('creates a new assembly in 3D editing mode and saves it to the library', async () => {
    const { window } = running;

    await openAssembliesLibrary(window);
    await window.getByRole('dialog', { name: 'App Library' }).getByLabel('Create new assembly').click();

    await expect(window.getByRole('button', { name: /New Assembly/ })).toBeVisible();
    await expect(window.locator('.header-mode-chip', { hasText: 'Assembly' })).toBeVisible();
    await addPartFromSidebar(window);
    await renameEditingAssembly(window, 'E2E Created Assembly');
    await window.getByTitle('Save (Cmd+S)').click();

    await expect.poll(() => getAssemblyLibraryNames(window), { timeout: 5000 }).toContain('E2E Created Assembly');
    await expect(window.getByRole('button', { name: /Assembly Editing Lifecycle E2E/ })).toBeVisible();
    await expect.poll(() => isEditingAssembly(window), { timeout: 5000 }).toBe(false);
  });

  test('edits an existing assembly in 3D and saves changes', async () => {
    const { window } = running;
    await seedAssemblyLibrary(window, [makeAssembly({ id: 'e2e-edit-assembly', name: 'E2E Editable Assembly' })]);

    await openAssemblyIn3D(window, 'E2E Editable Assembly');
    await mutateFirstAssemblyPart(window, { name: 'Edited Rail', length: 31 });
    await window.getByTitle('Save (Cmd+S)').click();

    await expect
      .poll(() => getAssemblyByName(window, 'E2E Editable Assembly'), { timeout: 5000 })
      .toMatchObject({
        name: 'E2E Editable Assembly',
        parts: [expect.objectContaining({ name: 'Edited Rail', length: 31 })]
      });
    await expect.poll(() => isEditingAssembly(window), { timeout: 5000 }).toBe(false);
  });

  test('assembly exit dialog supports cancel, discard, and save', async () => {
    const { window } = running;
    await seedAssemblyLibrary(window, [makeAssembly({ id: 'e2e-exit-assembly', name: 'E2E Exit Assembly' })]);

    await openAssemblyIn3D(window, 'E2E Exit Assembly');
    await mutateFirstAssemblyPart(window, { name: 'Cancel Attempt Rail' });
    await clickEditingCancel(window);
    const cancelDialog = window.getByRole('alertdialog', { name: 'Save Changes?' });
    await expect(cancelDialog).toBeVisible();
    await cancelDialog.getByRole('button', { name: 'Keep Editing' }).click();
    await expect(cancelDialog).toHaveCount(0);
    await expect.poll(() => isEditingAssembly(window)).toBe(true);

    await clickEditingCancel(window);
    const discardDialog = window.getByRole('alertdialog', { name: 'Save Changes?' });
    await discardDialog.getByRole('button', { name: 'Discard Changes' }).click();
    await expect.poll(() => isEditingAssembly(window), { timeout: 5000 }).toBe(false);
    await expect.poll(() => getAssemblyPartNames(window, 'E2E Exit Assembly')).toEqual(['Assembly Rail']);

    await openAssemblyIn3D(window, 'E2E Exit Assembly');
    await mutateFirstAssemblyPart(window, { name: 'Saved Exit Rail' });
    await clickEditingCancel(window);
    const saveDialog = window.getByRole('alertdialog', { name: 'Save Changes?' });
    await saveDialog.getByRole('button', { name: 'Save to Library' }).click();
    await expect.poll(() => isEditingAssembly(window), { timeout: 5000 }).toBe(false);
    await expect
      .poll(() => getAssemblyPartNames(window, 'E2E Exit Assembly'), { timeout: 5000 })
      .toEqual(['Saved Exit Rail']);
  });

  test('app library duplicate and delete assembly actions update persisted library', async () => {
    const { window } = running;
    await seedAssemblyLibrary(window, [makeAssembly({ id: 'e2e-copy-delete-assembly', name: 'E2E Copy Delete' })]);

    const dialog = await openAssembliesLibrary(window);
    await dialog.getByRole('button', { name: /E2E Copy Delete/ }).click();
    await dialog.getByRole('button', { name: 'Duplicate' }).click();
    await expect.poll(() => getAssemblyLibraryNames(window), { timeout: 5000 }).toContain('E2E Copy Delete (Copy)');

    await dialog.getByRole('button', { name: /E2E Copy Delete \(Copy\)/ }).click();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(() => getAssemblyLibraryNames(window), { timeout: 5000 }).toEqual(['E2E Copy Delete']);
  });
});

async function openAssembliesLibrary(window: import('@playwright/test').Page) {
  await window.getByTitle('Stock Library').click();
  const dialog = window.getByRole('dialog', { name: 'App Library' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: 'Assemblies' }).click();
  return dialog;
}

async function openAssemblyIn3D(window: import('@playwright/test').Page, assemblyName: string) {
  const dialog = await openAssembliesLibrary(window);
  await dialog.getByRole('button', { name: new RegExp(assemblyName) }).click();
  await dialog.getByRole('button', { name: 'Edit in 3D' }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => isEditingAssembly(window), { timeout: 5000 }).toBe(true);
  await expect(window.locator('.header-mode-chip', { hasText: 'Assembly' })).toBeVisible();
}

async function clickEditingCancel(window: import('@playwright/test').Page) {
  await window.locator('.app-header').getByRole('button', { name: 'Cancel', exact: true }).click();
}

async function renameEditingAssembly(window: import('@playwright/test').Page, name: string) {
  await window.evaluate((nextName) => {
    (window.useAssemblyEditingStore as unknown as { setState: (state: Record<string, unknown>) => void }).setState({
      editingAssemblyName: nextName
    });
    window.useProjectStore.getState().markDirty();
  }, name);
}

async function mutateFirstAssemblyPart(
  window: import('@playwright/test').Page,
  updates: { name?: string; length?: number }
) {
  await window.evaluate((nextUpdates) => {
    const project = window.useProjectStore.getState();
    const part = project.parts[0];
    if (!part) throw new Error('Expected an editable assembly part');
    project.updatePart(part.id, nextUpdates);
  }, updates);
}

async function isEditingAssembly(window: import('@playwright/test').Page) {
  return window.evaluate(() => window.useAssemblyEditingStore.getState().isEditingAssembly);
}

async function getAssemblyLibraryNames(window: import('@playwright/test').Page) {
  return window.evaluate(async () =>
    ((await window.electronAPI.getPreference('assemblyLibrary')) as Array<{ name: string }>).map(
      (assembly) => assembly.name
    )
  );
}

async function getAssemblyByName(window: import('@playwright/test').Page, name: string) {
  return window.evaluate(
    async (assemblyName) =>
      ((await window.electronAPI.getPreference('assemblyLibrary')) as SeedAssembly[]).find(
        (assembly) => assembly.name === assemblyName
      ) ?? null,
    name
  );
}

async function getAssemblyPartNames(window: import('@playwright/test').Page, assemblyName: string) {
  const assembly = await getAssemblyByName(window, assemblyName);
  return assembly?.parts.map((part) => part.name) ?? [];
}

async function seedAssemblyLibrary(window: import('@playwright/test').Page, assemblies: SeedAssembly[]) {
  await window.evaluate(
    (nextAssemblies) => window.electronAPI.setPreference('assemblyLibrary', nextAssemblies),
    assemblies
  );
  await markProjectClean(window);
}

async function markProjectClean(window: import('@playwright/test').Page) {
  await window.evaluate(() => window.useProjectStore.getState().markClean());
}

function makeAssembly({ id, name }: { id: string; name: string }): SeedAssembly {
  return {
    id,
    name,
    description: 'Seeded assembly for lifecycle testing.',
    thumbnail: '🧩',
    parts: [
      {
        name: 'Assembly Rail',
        length: 24,
        width: 3,
        thickness: 0.75,
        relativePosition: { x: 0, y: 0.375, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#c4a574'
      }
    ],
    groups: [],
    groupMembers: [],
    createdAt: '2026-08-13T12:00:00.000Z',
    modifiedAt: '2026-08-13T12:00:00.000Z'
  };
}
