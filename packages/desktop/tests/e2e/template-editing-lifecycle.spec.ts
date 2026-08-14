import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  addPartFromSidebar,
  closeElectronApp,
  launchElectronApp,
  queueOpenPaths,
  sendNativeMenuCommand,
  waitForAppReady,
  type RunningElectronApp
} from './helpers/electron-app';

type SeedTemplate = {
  id: string;
  name: string;
  description: string;
  dimensions: { width: number; depth: number; height: number };
  partCount: number;
  thumbnail: string;
  category: 'other';
  createdAt: string;
  project: string;
};

test.describe('template editing lifecycle', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await waitForAppReady(running.window);
    await running.window.evaluate(() => {
      window.electronAPI.setPreference('userTemplates', []);
      window.useProjectStore.getState().markClean();
    });
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('edits an existing custom template and saves project changes', async () => {
    const { window } = running;
    await seedUserTemplates(window, [makeTemplate({ id: 'e2e-edit-template', name: 'E2E Editable Template' })]);

    await openCustomTemplateForEditing(running, 'E2E Editable Template');
    await addPartFromSidebar(window);
    await window.getByTitle('Save (Cmd+S)').click();

    await expect.poll(() => getTemplatePartCount(window, 'E2E Editable Template'), { timeout: 10000 }).toBe(2);
    await expect(window.getByRole('heading', { name: 'Templates', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('template exit dialog supports cancel, discard, and save', async () => {
    const { window } = running;
    await seedUserTemplates(window, [makeTemplate({ id: 'e2e-exit-template', name: 'E2E Exit Template' })]);

    await openCustomTemplateForEditing(running, 'E2E Exit Template');
    await addPartFromSidebar(window);
    await clickEditingCancel(window);
    const keepDialog = window.getByRole('alertdialog', { name: 'Discard Changes?' });
    await expect(keepDialog).toBeVisible();
    await keepDialog.getByRole('button', { name: 'Keep Editing' }).click();
    await expect(keepDialog).toHaveCount(0);
    await expect(window.locator('.header-mode-chip', { hasText: 'Template' })).toBeVisible();

    await clickEditingCancel(window);
    const discardDialog = window.getByRole('alertdialog', { name: 'Discard Changes?' });
    await discardDialog.getByRole('button', { name: 'Discard Changes' }).click();
    await expect.poll(() => getTemplatePartCount(window, 'E2E Exit Template'), { timeout: 5000 }).toBe(1);
    await expect(window.getByRole('heading', { name: 'Templates', exact: true })).toBeVisible({ timeout: 10000 });

    await openCustomTemplateForEditing(running, 'E2E Exit Template');
    await addPartFromSidebar(window);
    await window.getByTitle('Save (Cmd+S)').click();
    await expect.poll(() => getTemplatePartCount(window, 'E2E Exit Template'), { timeout: 10000 }).toBe(2);
    await expect(window.getByRole('heading', { name: 'Templates', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('duplicates built-in and custom templates into My Templates', async () => {
    const { window } = running;
    await seedUserTemplates(window, [makeTemplate({ id: 'e2e-custom-template', name: 'E2E Custom Template' })]);
    await openTemplatesScreen(running);

    await window.getByTitle('Duplicate to My Templates').first().click();
    await expect.poll(() => getUserTemplateNames(window), { timeout: 10000 }).toContain('Simple Writing Desk (Copy)');
    await window.waitForTimeout(500);
    if ((await window.locator('.header-mode-chip', { hasText: 'Template' }).count()) > 0) {
      await clickEditingCancel(window);
    }

    await openTemplatesScreen(running);
    await window.getByText('E2E Custom Template').first().hover();
    await window.getByLabel('Duplicate E2E Custom Template').click();
    await expect.poll(() => getUserTemplateNames(window), { timeout: 10000 }).toContain('E2E Custom Template (Copy)');
  });

  test('template import duplicate path keeps existing and creates imported copy when not replacing', async () => {
    const { window, userDataDir } = running;
    const template = makeTemplate({ id: 'e2e-import-template', name: 'E2E Imported Template' });
    const templatePath = path.join(userDataDir, 'e2e-import-template.carvd-template');
    fs.writeFileSync(
      templatePath,
      JSON.stringify(
        {
          version: 1,
          type: 'template',
          exportedAt: '2026-08-13T12:00:00.000Z',
          appVersion: '1.0.5',
          data: template
        },
        null,
        2
      )
    );

    await openTemplatesScreen(running);
    await queueOpenPaths(window, [templatePath]);
    await window.getByRole('button', { name: 'Import', exact: true }).click();
    await expect.poll(() => getUserTemplateNames(window), { timeout: 10000 }).toEqual(['E2E Imported Template']);

    await queueOpenPaths(window, [templatePath]);
    await window.getByRole('button', { name: 'Import', exact: true }).click();
    await expect
      .poll(() => getUserTemplateNames(window), { timeout: 10000 })
      .toEqual(['E2E Imported Template', 'E2E Imported Template (Imported)']);
  });
});

async function openTemplatesScreen(runningApp: RunningElectronApp) {
  const { window } = runningApp;
  await sendNativeMenuCommand(runningApp, 'new-from-template');
  const templatesHeading = window.getByRole('heading', { name: 'Templates', exact: true });
  await expect(templatesHeading).toBeVisible({ timeout: 10000 });
  await expect(window.getByRole('heading', { name: 'My Templates' })).toBeVisible({ timeout: 10000 });
}

async function openCustomTemplateForEditing(runningApp: RunningElectronApp, templateName: string) {
  const { window } = runningApp;
  await openTemplatesScreen(runningApp);
  await window.getByText(templateName).first().hover();
  await window.getByLabel(`Edit ${templateName}`).click();
  await expect(window.locator('.header-mode-chip', { hasText: 'Template' })).toBeVisible({ timeout: 10000 });
  await expect(window.getByRole('button', { name: new RegExp(templateName) })).toBeVisible();
}

async function clickEditingCancel(window: import('@playwright/test').Page) {
  await window
    .locator('.app-header')
    .getByRole('button', { name: /^(Cancel|Exit)$/ })
    .click();
}

async function seedUserTemplates(window: import('@playwright/test').Page, templates: SeedTemplate[]) {
  await window.evaluate((nextTemplates) => {
    window.electronAPI.setPreference('userTemplates', nextTemplates);
    window.useProjectStore.getState().markClean();
  }, templates);
}

async function getUserTemplateNames(window: import('@playwright/test').Page) {
  return window.evaluate(async () =>
    ((await window.electronAPI.getUserTemplates()) as Array<{ name: string }>).map((template) => template.name)
  );
}

async function getTemplatePartCount(window: import('@playwright/test').Page, templateName: string) {
  const template = await window.evaluate(
    async (name) =>
      ((await window.electronAPI.getUserTemplates()) as Array<{ name: string; partCount: number }>).find(
        (candidate) => candidate.name === name
      ) ?? null,
    templateName
  );
  return template?.partCount ?? null;
}

function makeTemplate({ id, name }: { id: string; name: string }): SeedTemplate {
  const now = '2026-08-13T12:00:00.000Z';
  return {
    id,
    name,
    description: 'Seeded template for lifecycle e2e coverage.',
    dimensions: { width: 24, depth: 10, height: 2 },
    partCount: 1,
    thumbnail: '📐',
    category: 'other',
    createdAt: now,
    project: JSON.stringify({
      version: '1.0',
      name,
      stocks: [],
      parts: [
        {
          id: `${id}-part-1`,
          name: 'Template Part',
          length: 24,
          width: 10,
          thickness: 2,
          position: { x: 0, y: 1, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          stockId: null,
          grainSensitive: true,
          grainDirection: 'length',
          color: '#c4a574'
        }
      ],
      groups: [],
      groupMembers: [],
      assemblies: [],
      units: 'imperial',
      gridSize: 0.0625,
      kerfWidth: 0.125,
      overageFactor: 0.1,
      projectNotes: 'Seeded template for lifecycle e2e coverage.',
      stockConstraints: {
        constrainDimensions: true,
        constrainGrain: true,
        constrainColor: true,
        preventOverlap: true
      },
      createdAt: now,
      modifiedAt: now
    })
  };
}
