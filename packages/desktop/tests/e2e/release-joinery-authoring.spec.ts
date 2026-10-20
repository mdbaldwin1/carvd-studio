import { waitForJsonFile } from './helpers/files';
/** Automated fresh-blank operation coverage for the 23 pending station families.
 * These are representative operations, not full-joint assembly or native manual acceptance.
 * No completed features are seeded: every cut is created through the Part Cuts UI.
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  launchElectronApp,
  closeElectronApp,
  seedProject,
  savePartCutsFromHeader,
  queueOpenPaths,
  queueSavePath,
  type RunningElectronApp
} from './helpers/electron-app';
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
type Scenario = { station: number; name: string; preset: string; configure?: (page: Page) => Promise<void> };
async function measurement(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press('Enter');
}
async function angle(page: Page) {
  await page.getByLabel('Drill angle from face (degrees)', { exact: true }).fill('15');
  await page.getByLabel('Drill direction across face (degrees)', { exact: true }).fill('35');
}
async function edge(page: Page, name: string) {
  await page.getByRole('button', { name: 'Choose edge profile', exact: true }).click();
  await page.getByRole('button', { name: `Select ${name} edge profile`, exact: true }).click();
}
const scenarios: Scenario[] = [
  { station: 17, name: 'Tambour edge rounding', preset: 'Edge Profile', configure: (p) => edge(p, 'Roundover') },
  { station: 25, name: 'Pin through hole', preset: 'Round Hole' },
  {
    station: 26,
    name: 'Pegged tenon cross drilling',
    preset: 'Round Hole',
    configure: async (p) => {
      await p.getByRole('button', { name: 'Front Face', exact: true }).click();
      await measurement(p, 'Hole Diameter', '1/4');
    }
  },
  { station: 27, name: 'Birdsmouth corner removal', preset: 'Corner Notch' },
  {
    station: 28,
    name: 'Scallop core-box route',
    preset: 'Routed Path',
    configure: async (p) => {
      await p.getByRole('button', { name: 'Choose router bit', exact: true }).click();
      await p.getByRole('button', { name: 'Select Round Bottom router bit', exact: true }).click();
    }
  },
  { station: 29, name: 'Cross dowel bore', preset: 'Counterbore' },
  { station: 30, name: 'Key mortise', preset: 'Mortise' },
  { station: 31, name: 'Fox wedge tenon', preset: 'Tenon' },
  {
    station: 33,
    name: 'Spline mitre',
    preset: 'End Cut',
    configure: async (p) => {
      await p.getByLabel('Cut Style', { exact: true }).selectOption('mitre');
      await p.getByLabel('Mitre Angle', { exact: true }).fill('30');
    }
  },
  { station: 34, name: 'Pocket angled drilling', preset: 'Round Hole', configure: angle },
  { station: 39, name: 'Rabbeted dado shoulder', preset: 'Rabbet' },
  {
    station: 41,
    name: 'Mitred lap',
    preset: 'End Cut',
    configure: async (p) => {
      await p.getByLabel('Cut Style', { exact: true }).selectOption('mitre');
      await p.getByLabel('Mitre Angle', { exact: true }).fill('22.5');
    }
  },
  {
    station: 42,
    name: 'Dovetailed splice socket',
    preset: 'Dado',
    configure: async (p) => {
      await measurement(p, 'Dado Width', '3/4');
      await measurement(p, 'Blind Depth', '1/4');
      await p.getByText('Dovetail shaping', { exact: true }).click();
      await measurement(p, 'Socket End Angle', '8');
    }
  },
  {
    station: 44,
    name: 'Compound mitre',
    preset: 'End Cut',
    configure: async (p) => {
      await p.getByLabel('Cut Style', { exact: true }).selectOption('compound');
      await p.getByLabel('Mitre Angle', { exact: true }).fill('30');
      await p.getByLabel('Bevel Angle', { exact: true }).fill('15');
    }
  },
  { station: 46, name: 'Rule joint cove', preset: 'Edge Profile', configure: (p) => edge(p, 'Cove') },
  { station: 36, name: 'Wedged through tenon', preset: 'Tenon' },
  {
    station: 47,
    name: 'Cleat countersink',
    preset: 'Countersink',
    configure: async (p) => {
      await measurement(p, 'Hole Diameter', '5/32');
      await measurement(p, 'Countersink Major Diameter', '3/8');
      await p.getByLabel('Included Angle', { exact: true }).fill('82');
      await p.getByLabel('Drill angle from face (degrees)', { exact: true }).fill('90');
    }
  },
  { station: 48, name: 'Egg-crate slot', preset: 'Edge Notch' },
  {
    station: 49,
    name: 'Hinge recess',
    preset: 'Mortise',
    configure: async (p) => {
      await measurement(p, 'Blind Depth', '1/8');
    }
  },
  {
    station: 51,
    name: 'T-slot route',
    preset: 'Routed Path',
    configure: async (p) => {
      await p.getByRole('button', { name: 'Choose router bit', exact: true }).click();
      await p.getByRole('button', { name: 'Select T-Slot router bit', exact: true }).click();
    }
  },
  { station: 52, name: 'Beaded edge', preset: 'Edge Profile', configure: (p) => edge(p, 'Bead') },
  {
    station: 53,
    name: 'Shelf pin pattern',
    preset: 'Round Hole',
    configure: async (p) => {
      await p.getByLabel('Repeating Pattern', { exact: true }).selectOption('linear');
      await p.getByLabel('Hole Count', { exact: true }).fill('4');
      await measurement(p, 'Spacing', '1');
    }
  },
  { station: 54, name: 'Cutter sampler round slot', preset: 'Rounded Slot' },
  {
    station: 102,
    name: 'Purchased insert cross drill',
    preset: 'Round Hole',
    preparation: 'purchase',
    configure: (p) => measurement(p, 'Hole Diameter', '1/8')
  },
  { station: 109, name: 'Finished glue panel hole', preset: 'Round Hole', preparation: 'glue_up' },
  { station: 110, name: 'Allowance reference hole', preset: 'Round Hole', preparation: 'allowance' }
];
test.describe('release operation-family authoring', () => {
  test.describe.configure({ mode: 'serial' });
  let running: RunningElectronApp;
  const failedBrandingRequests: string[] = [];
  test.beforeAll(async () => {
    running = await launchElectronApp();
    running.window.on('requestfailed', (request) => {
      if (request.url().includes('/branding/')) failedBrandingRequests.push(request.url());
    });
  });
  test.afterAll(async () => {
    await closeElectronApp(running);
  });
  for (const scenario of scenarios)
    test(`${scenario.station > 100 ? 'report contract' : `station ${scenario.station}`}: ${scenario.name} — author, reopen, export`, async () => {
      const { window: page, userDataDir } = running;
      await seedProject(page, 'stocked-one-part');
      if (scenario.preparation)
        await page.evaluate((preparation) => {
          const store = window.useProjectStore.getState();
          const part = store.parts[0];
          const stock = store.stocks[0];
          if (preparation === 'purchase') {
            store.updateStock(stock.id, {
              form: 'insert',
              insertKind: 'loose_tenon',
              length: 2,
              width: 0.5,
              thickness: 0.25
            });
            store.updatePart(part.id, { length: 2, width: 0.5, thickness: 0.25 });
          } else if (preparation === 'glue_up') {
            store.updateStock(stock.id, { form: 'board', width: 6 });
            store.updatePart(part.id, { glueUpPanel: true });
          } else store.updatePart(part.id, { extraLength: 2, extraWidth: 0.5 });
        }, scenario.preparation);
      await page.getByRole('button', { name: 'Edit Part Cuts' }).click();
      await page.locator('button[title="Add Cut"]').click();
      await page.getByRole('button', { name: new RegExp(`^${scenario.preset}\\b`) }).click();
      await page.getByLabel('Label (optional)', { exact: true }).fill(scenario.name);
      if (scenario.configure) await scenario.configure(page);
      await page.getByLabel('Label (optional)', { exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('complementary', { name: 'Cut properties' }).getByRole('alert')).toHaveCount(0);
      await savePartCutsFromHeader(page);
      const snapshot = await page.evaluate(() => window.useProjectStore.getState().parts[0].features);
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].label).toBe(scenario.name);
      if (scenario.configure === angle) expect(snapshot[0].parameters.tilt).toBe(75);
      if (scenario.station === 47) expect(snapshot[0].parameters.tilt ?? 0).toBe(0);
      const projectPath = path.join(userDataDir, `release-${scenario.station}.carvd`);
      await queueSavePath(page, projectPath);
      await page.keyboard.press(`${modifier}+S`);
      await waitForJsonFile(projectPath);
      const importDialog = page.getByRole('dialog', { name: 'Import to Library' });
      await importDialog.getByRole('button', { name: 'Skip' }).click();
      await page.getByRole('button', { name: 'Carvd Studio home' }).click();
      const logos = page.locator('img[src*="branding/"]');
      await expect.poll(() => logos.count()).toBeGreaterThan(0);
      for (const logo of await logos.all())
        await expect.poll(() => logo.evaluate((img: { naturalWidth: number }) => img.naturalWidth)).toBeGreaterThan(0);
      await queueOpenPaths(page, [projectPath]);
      await page.getByRole('button', { name: 'Open file...' }).evaluate((button: HTMLButtonElement) => button.click());
      await importDialog.getByRole('button', { name: 'Skip' }).click();
      await expect
        .poll(() => page.evaluate(() => window.useProjectStore.getState().parts[0].features))
        .toEqual(snapshot);
      await page.getByRole('button', { name: /Generate Cut List|Regenerate Cut List|View Cut List/ }).click();
      const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Cut List' }) });
      await dialog.getByRole('button', { name: 'Generate Cut List', exact: true }).click();
      await expect(dialog.getByRole('tab', { name: /Parts List/ })).toBeVisible();
      const csvPath = path.join(userDataDir, `release-${scenario.station}.csv`);
      await queueSavePath(page, csvPath);
      await dialog.locator('.cut-list-parts-tab').getByRole('button', { name: 'Download', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Download CSV' }).click();
      // Creating the file precedes the asynchronous write; wait for exported
      // content instead of racing the transient empty file.
      await expect
        .poll(() => (fs.existsSync(csvPath) ? fs.readFileSync(csvPath, 'utf8') : ''))
        .toContain(scenario.name);
      const csv = fs.readFileSync(csvPath, 'utf8');
      expect(csv).toContain(scenario.name);
      if (scenario.configure === angle) expect(csv).toContain('15° from face toward 35°');
      if (scenario.preparation === 'purchase') {
        expect(csv).toContain('After purchase - component machining');
        await expect(dialog.getByRole('region', { name: 'Operations by setup' })).toContainText('After purchase');
        expect(await page.evaluate(() => window.useProjectStore.getState().cutList?.stockBoards.length)).toBe(0);
      }
      if (scenario.preparation === 'glue_up') {
        expect(csv).toContain('After glue-up - finished panel');
        await expect(dialog.getByRole('region', { name: 'Operations by setup' })).toContainText('After glue-up');
      }
      if (scenario.preparation === 'allowance') expect(csv).toContain('Allowance is unassigned to edges');
      const pdfPath = path.join(userDataDir, `release-${scenario.station}.pdf`);
      await queueSavePath(page, pdfPath);
      await dialog.locator('.cut-list-parts-tab').getByRole('button', { name: 'Download', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Download PDF' }).click();
      await expect.poll(() => (fs.existsSync(pdfPath) ? fs.readFileSync(pdfPath, 'latin1') : '')).toContain('%%EOF');
      const pdf = fs.readFileSync(pdfPath, 'latin1');
      expect(pdf).toContain(scenario.name);
      expect(pdf).toContain('/Subtype /Image');
      expect(failedBrandingRequests).toEqual([]);
      await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    });
});
