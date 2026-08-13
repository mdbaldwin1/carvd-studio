import { expect, test, type Page } from '@playwright/test';
import {
  closeElectronApp,
  createBlankProject,
  getProjectSnapshot,
  launchElectronApp,
  openSelectionContextMenu,
  seedProject,
  sendNativeMenuCommand,
  type RunningElectronApp
} from './helpers/electron-app';

const DEV_LICENSE_KEY = 'DEV-TEST-LICENSE-KEY';

test.describe('trial and license lifecycle', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await resetLicenseState(running.window);
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('trial expired modal Continue Free enters free mode and shows free limits', async () => {
    const { window } = running;

    await expireTrialAndReload(window);
    const modal = trialExpiredDialog(window);
    await expect(modal.getByRole('heading', { name: 'Your 14-Day Trial Has Ended' })).toBeVisible();

    await modal.getByRole('button', { name: 'Continue with Limited Features' }).click();
    await expectLicenseMode(window, 'free');

    await createBlankProject(window, 'Expired Trial Free Mode E2E');
    await window.evaluate(() => {
      const project = window.useProjectStore.getState();
      for (let index = project.parts.length; index < 10; index += 1) {
        project.addPart({ name: `Free Limit Part ${index + 1}`, position: { x: index * 4, y: 0.375, z: 0 } });
      }
    });
    await expect.poll(async () => (await getProjectSnapshot(window)).parts.length).toBe(10);

    await window.locator('button[title="Add Part"]').first().click();
    await expect(window.getByText('Part limit reached (10). Upgrade to add more parts.')).toBeVisible();
    await expect.poll(async () => (await getProjectSnapshot(window)).parts.length).toBe(10);
  });

  test('license activation success unlocks premium actions using test-mode valid key', async () => {
    const { window } = running;

    await expireTrialAndReload(window);
    const modal = trialExpiredDialog(window);
    await modal.getByRole('button', { name: 'I Already Have a License Key' }).click();
    await activateLicenseFromDialog(window);

    await expectLicenseMode(window, 'licensed');
    await seedProject(window, 'two-parts');

    await openSelectionContextMenu(window);
    const menu = window.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'Create Group (G)' })).toBeEnabled();
    await expect(menu.getByRole('menuitem', { name: 'Save as Assembly' })).toBeEnabled();
  });

  test('license deactivation returns app to free mode and premium gates apply again', async () => {
    const { window } = running;

    await expireTrialAndReload(window);
    await activateDevLicense(window);
    await expectLicenseMode(window, 'licensed');
    await expect(trialExpiredDialog(window)).toHaveCount(0);
    await expect(licenseActivationDialog(window)).toHaveCount(0);

    await sendNativeMenuCommand(running, 'open-settings');
    const settings = window.getByRole('dialog', { name: 'App Settings' });
    await expect(settings).toBeVisible();
    await settings.getByRole('tab', { name: 'Data & License' }).click();
    await expect(settings.getByText('License Active')).toBeVisible();
    await window.evaluate(() => {
      window.confirm = () => true;
    });
    await settings.getByRole('button', { name: 'Deactivate License' }).click();

    await expectLicenseMode(window, 'free');
    await dismissTutorialIfVisible(window);
    await trialExpiredDialog(window)
      .getByRole('button', { name: 'Continue with Limited Features' })
      .click({ force: true });
    await seedProject(window, 'two-parts');
    await openSelectionContextMenu(window);
    const menu = window.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'Create Group (G)' })).toBeDisabled();
    await expect(menu.getByRole('menuitem', { name: 'Save as Assembly' })).toBeDisabled();
  });

  test('upgrade button captures external pricing link without opening a real browser', async () => {
    const { window } = running;

    await expireTrialAndReload(window);
    await trialExpiredDialog(window)
      .getByRole('button', {
        name: 'Continue with Limited Features'
      })
      .click();
    await expectLicenseMode(window, 'free');

    await createBlankProject(window, 'Upgrade Link E2E');
    await window.evaluate(() => {
      (window as unknown as { __openedUrls: string[] }).__openedUrls = [];
      window.open = (url?: string | URL) => {
        (window as unknown as { __openedUrls: string[] }).__openedUrls.push(String(url));
        return null;
      };
    });

    await window.getByRole('button', { name: 'Upgrade', exact: true }).click();
    await expect
      .poll(async () => window.evaluate(() => (window as unknown as { __openedUrls: string[] }).__openedUrls))
      .toEqual(['https://carvd-studio.com/pricing']);
  });
});

async function resetLicenseState(window: Page) {
  await window.evaluate(async () => {
    await window.electronAPI.deactivateLicense().catch(() => undefined);
    await window.electronAPI.resetTrial();
  });
  await expectLicenseMode(window, 'trial');
}

async function expireTrialAndReload(window: Page) {
  await window.evaluate(async () => {
    await window.electronAPI.simulateTrialExpired();
  });
  await window.reload();
  await window.waitForFunction(() => !!window.useLicenseStore, null, { timeout: 30000 });
  await expect(trialExpiredDialog(window)).toBeVisible({ timeout: 15000 });
}

function trialExpiredDialog(window: Page) {
  return window
    .getByRole('dialog')
    .filter({ has: window.getByRole('heading', { name: 'Your 14-Day Trial Has Ended' }) });
}

async function activateLicenseFromDialog(window: Page) {
  const activation = licenseActivationDialog(window);
  await expect(activation).toBeVisible();
  await activation.getByLabel('License Key').fill(DEV_LICENSE_KEY);
  await activation.getByRole('button', { name: 'Activate License' }).click();
  await expectLicenseMode(window, 'licensed');
  await expect(activation).toHaveCount(0);
}

function licenseActivationDialog(window: Page) {
  return window.getByRole('dialog').filter({ has: window.getByRole('heading', { name: 'Activate Carvd Studio' }) });
}

async function activateDevLicense(window: Page) {
  const result = await window.evaluate(
    async (licenseKey) => window.electronAPI.activateLicense(licenseKey),
    DEV_LICENSE_KEY
  );
  expect(result).toMatchObject({ valid: true });
  await window.reload();
  await window.waitForFunction(() => !!window.useLicenseStore, null, { timeout: 30000 });
}

async function expectLicenseMode(window: Page, mode: 'trial' | 'licensed' | 'free') {
  await expect.poll(async () => window.evaluate(() => window.useLicenseStore.getState().licenseMode)).toBe(mode);
}

async function dismissTutorialIfVisible(window: Page) {
  const skipTutorial = window.getByRole('button', { name: 'Skip Tutorial' });
  if (await skipTutorial.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipTutorial.click({ force: true });
  }
}
