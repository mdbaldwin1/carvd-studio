import { expect, test } from '@playwright/test';
import type { Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  closeElectronApp,
  getCanvasPoint,
  launchElectronApp,
  queueOpenPaths,
  queueSavePath,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

const MODIFIER = process.platform === 'darwin' ? 'Meta' : 'Control';

async function setProjectUnits(window: Page, units: 'imperial' | 'metric'): Promise<void> {
  await window.getByRole('button', { name: 'Project Settings' }).click();
  const dialog = window.getByRole('dialog', { name: 'Project Settings' });
  await dialog.getByRole('tab', { name: 'Preferences' }).click();
  await dialog.locator('.settings-row').filter({ hasText: 'Units' }).locator('select').selectOption(units);
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect.poll(() => window.evaluate(() => window.useProjectStore.getState().units)).toBe(units);
}

async function openSelectedPartCuts(window: Page): Promise<void> {
  await window.getByRole('button', { name: 'Edit Part Cuts' }).click();
  await expect(window.locator('.header-mode-chip', { hasText: 'Part Cuts' })).toBeVisible();
}

async function startPreset(window: Page, preset: string): Promise<void> {
  await window.getByRole('button', { name: '+ Add Cut' }).click();
  await window.getByRole('button', { name: new RegExp(`^${preset}\\b`) }).click();
}

async function fillMeasurement(window: Page, label: string, value: string): Promise<void> {
  const input = window.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press('Enter');
}

async function saveCut(window: Page): Promise<void> {
  const button = window.getByRole('button', { name: 'Save Cut' });
  await expect(button).toBeEnabled();
  await button.click();
}

async function saveProjectTo(window: Page, filePath: string): Promise<void> {
  await queueSavePath(window, filePath);
  await window.keyboard.press(`${MODIFIER}+S`);
  await expect.poll(() => fs.existsSync(filePath), { timeout: 5000 }).toBe(true);
  await window.getByRole('dialog', { name: 'Import to Library' }).getByRole('button', { name: 'Skip' }).click();
}

async function reopenProject(window: Page, filePath: string): Promise<void> {
  await window.getByRole('button', { name: 'Carvd Studio home' }).click();
  await queueOpenPaths(window, [filePath]);
  await window.getByRole('button', { name: 'Open file...' }).evaluate((button: HTMLButtonElement) => button.click());
  const importDialog = window.getByRole('dialog', { name: 'Import to Library' });
  await importDialog.getByRole('button', { name: 'Skip' }).click();
  await expect(window.locator('canvas')).toBeVisible();
}

async function generateCutList(window: Page): Promise<ReturnType<Page['getByRole']>> {
  await window.getByRole('button', { name: /Generate Cut List|View Cut List/ }).click();
  const dialog = window.getByRole('dialog').filter({ has: window.getByRole('heading', { name: 'Cut List' }) });
  const generate = dialog.getByRole('button', { name: 'Generate Cut List' });
  await generate.click();
  await expect(dialog.locator('.cut-list-tabs')).toBeVisible();
  return dialog;
}

function extractJsPdfLiteralText(pdfPath: string): string {
  const pdf = fs.readFileSync(pdfPath, 'latin1');
  const literals = [...pdf.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)].map((match) =>
    match[0].slice(1, match[0].lastIndexOf(')'))
  );
  return literals
    .map((literal) =>
      literal
        .replace(/\\([0-7]{1,3})/g, (_escape, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)))
        .replace(
          /\\([nrtbf])/g,
          (_escape, character: string) => ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' })[character]
        )
        .replace(/\\([\\()])/g, '$1')
    )
    .join('');
}

function buildStressFeatures() {
  const features: Array<Record<string, unknown>> = [
    {
      id: 'stress-left-mitre',
      kind: 'end_cut',
      version: 1,
      enabled: true,
      label: 'Stress left mitre',
      target: { type: 'face', face: 'left_end' },
      reference: { primaryFrom: 'min' },
      cutType: 'mitre',
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 12.5, horizontalFlip: false }
    },
    {
      id: 'stress-right-compound',
      kind: 'end_cut',
      version: 1,
      enabled: true,
      label: 'Stress right compound',
      target: { type: 'face', face: 'right_end' },
      reference: { primaryFrom: 'min' },
      cutType: 'compound',
      lengthMode: 'long_point',
      parameters: {
        horizontalAngle: 15,
        horizontalFlip: true,
        verticalAngle: 5,
        verticalFlip: false
      }
    }
  ];

  for (let index = 0; index < 6; index += 1) {
    features.push({
      id: `stress-cutout-${index + 1}`,
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      label: `Stress cutout ${index + 1}`,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min', secondaryFrom: 'min' },
      cutType: 'cutout',
      placement: { x: 5 + index * 12, z: 2 },
      parameters: { size: { length: 2, width: 2 }, depthMode: 'blind', depth: 0.25 }
    });
  }

  for (let index = 0; index < 6; index += 1) {
    const cutType = ['round_hole', 'countersink', 'counterbore'][index % 3];
    const parameters: Record<string, unknown> = {
      diameter: 0.25,
      depthMode: 'blind',
      depth: 0.5,
      tilt: index,
      direction: index * 15
    };
    if (cutType === 'countersink') parameters.countersink = { majorDiameter: 0.5, includedAngle: 90 };
    if (cutType === 'counterbore') parameters.counterbore = { diameter: 0.5, depth: 0.125 };
    const pattern =
      index === 4
        ? { type: 'linear', count: 3, spacing: 1, direction: 0 }
        : index === 5
          ? { type: 'circular', count: 4, radius: 1, startAngle: 30 }
          : undefined;
    features.push({
      id: `stress-round-${index + 1}`,
      kind: 'circular_cut',
      version: 1,
      enabled: true,
      label: `Stress round ${index + 1}`,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      cutType,
      placement: { primary: -30 + index * 12, secondary: 10, rotation: 0 },
      pattern,
      parameters
    });
  }

  for (let index = 0; index < 6; index += 1) {
    const roundedRectangle = index % 2 === 1;
    features.push({
      id: `stress-rounded-${index + 1}`,
      kind: 'rounded_cut',
      version: 1,
      enabled: true,
      label: `Stress rounded ${index + 1}`,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      cutType: roundedRectangle ? 'rounded_rectangle' : 'rounded_slot',
      placement: { primary: -30 + index * 12, secondary: -5, rotation: index * 5 },
      parameters: {
        length: 4,
        width: 1,
        cornerRadius: roundedRectangle ? 0.25 : 0.5,
        depthMode: 'blind',
        depth: 0.375
      }
    });
  }

  return features;
}

test.describe('hands-on custom cuts qualification', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('authors representative joinery in metric, then re-edits it with fractional-inch input', async () => {
    test.setTimeout(120000);
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'metric-fractional-custom-cuts.carvd');
    const csvPath = path.join(userDataDir, 'metric-fractional-custom-cuts.csv');
    const pdfPath = path.join(userDataDir, 'metric-fractional-custom-cuts.pdf');
    await seedProject(window, 'stocked-one-part');
    await setProjectUnits(window, 'metric');
    await openSelectedPartCuts(window);

    await startPreset(window, 'End Cut');
    await window.getByRole('button', { name: 'Right End', exact: true }).click();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Metric frame mitre');
    await window.getByLabel('Cut Style', { exact: true }).selectOption('mitre');
    await window.getByLabel('Mitre Angle', { exact: true }).fill('45');
    await window.getByLabel('Long Point On', { exact: true }).selectOption('back');
    await saveCut(window);

    await startPreset(window, 'Dado');
    await window.getByRole('button', { name: 'Top Face', exact: true }).click();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Metric shelf dado');
    await fillMeasurement(window, 'Run Along Blank', '19.05');
    await fillMeasurement(window, 'Blind Depth', '6.35');
    await saveCut(window);

    await startPreset(window, 'Mortise');
    await window.getByRole('button', { name: 'Bottom Face', exact: true }).click();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Metric rail mortise');
    await fillMeasurement(window, 'Run Along Blank', '50.8');
    await fillMeasurement(window, 'Cross-Cut Width', '25.4');
    await fillMeasurement(window, 'Blind Depth', '9.525');
    await fillMeasurement(window, 'Offset Along Length', '152.4');
    await fillMeasurement(window, 'Offset Across Width', '50.8');
    await saveCut(window);

    await startPreset(window, 'Round Hole');
    await window.getByRole('button', { name: 'Front Face', exact: true }).click();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Metric face hole');
    await fillMeasurement(window, 'Hole Diameter', '6.35');
    await window.getByLabel('Depth', { exact: true }).selectOption('blind');
    await fillMeasurement(window, 'Hole Depth', '12.7');
    await fillMeasurement(window, 'Offset Along Face', '228.6');
    await fillMeasurement(window, 'Offset Across Face', '6.35');
    await saveCut(window);
    await window.getByRole('button', { name: 'Save Part' }).click();

    const metric = await window.evaluate(() => {
      const features = window.useProjectStore.getState().parts[0].features;
      return {
        units: window.useProjectStore.getState().units,
        mitreTarget: features[0].target,
        angle: features[0].parameters.horizontalAngle,
        mitreHorizontalFlip: features[0].parameters.horizontalFlip,
        dadoWidth: features[1].parameters.size.length,
        dadoDepth: features[1].parameters.depth,
        mortiseTarget: features[2].target,
        mortiseLength: features[2].parameters.size.length,
        mortiseWidth: features[2].parameters.size.width,
        mortiseDepth: features[2].parameters.depth,
        mortisePrimary: features[2].placement.x,
        mortiseSecondary: features[2].placement.z,
        holeTarget: features[3].target,
        holeDiameter: features[3].parameters.diameter,
        holeDepth: features[3].parameters.depth,
        holePrimary: features[3].placement.primary,
        holeSecondary: features[3].placement.secondary
      };
    });
    expect(metric).toMatchObject({
      units: 'metric',
      mitreTarget: { type: 'face', face: 'right_end' },
      angle: 45,
      mitreHorizontalFlip: true,
      mortiseTarget: { type: 'face', face: 'bottom_face' },
      holeTarget: { type: 'face', face: 'front_face' }
    });
    expect(metric.dadoWidth).toBeCloseTo(0.75, 8);
    expect(metric.dadoDepth).toBeCloseTo(0.25, 8);
    expect(metric.mortiseLength).toBeCloseTo(2, 8);
    expect(metric.mortiseWidth).toBeCloseTo(1, 8);
    expect(metric.mortiseDepth).toBeCloseTo(0.375, 8);
    expect(metric.mortisePrimary).toBeCloseTo(6, 8);
    expect(metric.mortiseSecondary).toBeCloseTo(2, 8);
    expect(metric.holeDiameter).toBeCloseTo(0.25, 8);
    expect(metric.holeDepth).toBeCloseTo(0.5, 8);
    expect(metric.holePrimary).toBeCloseTo(9, 8);
    expect(metric.holeSecondary).toBeCloseTo(0.25, 8);

    await setProjectUnits(window, 'imperial');
    await openSelectedPartCuts(window);

    await window.getByRole('button', { name: /^1\. Metric frame mitre/ }).click();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Fractional frame mitre');
    await window.getByLabel('Mitre Angle', { exact: true }).fill('22.5');
    await window.getByLabel('Long Point On', { exact: true }).selectOption('front');
    await saveCut(window);

    await window.getByRole('button', { name: /^2\. Metric shelf dado/ }).click();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Fractional shelf dado');
    await fillMeasurement(window, 'Run Along Blank', '13/16');
    await fillMeasurement(window, 'Blind Depth', '5/16');
    await saveCut(window);

    await window.getByRole('button', { name: /^3\. Metric rail mortise/ }).click();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Fractional rail mortise');
    await fillMeasurement(window, 'Run Along Blank', '2 3/8');
    await fillMeasurement(window, 'Cross-Cut Width', '1 1/8');
    await fillMeasurement(window, 'Blind Depth', '7/16');
    await fillMeasurement(window, 'Offset Along Length', '6 1/4');
    await fillMeasurement(window, 'Offset Across Width', '2 1/4');
    await saveCut(window);

    await window.getByRole('button', { name: /^4\. Metric face hole/ }).click();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Fractional face hole');
    await fillMeasurement(window, 'Hole Diameter', '5/16');
    await fillMeasurement(window, 'Hole Depth', '9/16');
    await fillMeasurement(window, 'Offset Along Face', '8 1/2');
    await fillMeasurement(window, 'Offset Across Face', '3/8');
    await saveCut(window);
    await window.getByRole('button', { name: 'Save Part' }).click();

    const fractional = await window.evaluate(() => {
      const features = window.useProjectStore.getState().parts[0].features;
      return {
        units: window.useProjectStore.getState().units,
        labels: features.map((feature: { label: string }) => feature.label),
        mitreTarget: features[0].target,
        angle: features[0].parameters.horizontalAngle,
        mitreHorizontalFlip: features[0].parameters.horizontalFlip,
        dadoWidth: features[1].parameters.size.length,
        dadoDepth: features[1].parameters.depth,
        mortiseTarget: features[2].target,
        mortiseLength: features[2].parameters.size.length,
        mortiseWidth: features[2].parameters.size.width,
        mortiseDepth: features[2].parameters.depth,
        mortisePrimary: features[2].placement.x,
        mortiseSecondary: features[2].placement.z,
        holeTarget: features[3].target,
        holeDiameter: features[3].parameters.diameter,
        holeDepth: features[3].parameters.depth,
        holePrimary: features[3].placement.primary,
        holeSecondary: features[3].placement.secondary
      };
    });
    expect(fractional).toMatchObject({
      units: 'imperial',
      labels: ['Fractional frame mitre', 'Fractional shelf dado', 'Fractional rail mortise', 'Fractional face hole'],
      mitreTarget: { type: 'face', face: 'right_end' },
      angle: 22.5,
      mitreHorizontalFlip: false,
      dadoWidth: 0.8125,
      dadoDepth: 0.3125,
      mortiseTarget: { type: 'face', face: 'bottom_face' },
      mortiseLength: 2.375,
      mortiseWidth: 1.125,
      mortiseDepth: 0.4375,
      mortisePrimary: 6.25,
      mortiseSecondary: 2.25,
      holeTarget: { type: 'face', face: 'front_face' },
      holeDiameter: 0.3125,
      holeDepth: 0.5625,
      holePrimary: 8.5,
      holeSecondary: 0.375
    });

    const expected = await window.evaluate(() => JSON.stringify(window.useProjectStore.getState().parts[0].features));
    await saveProjectTo(window, projectPath);
    await reopenProject(window, projectPath);
    await expect
      .poll(() => window.evaluate(() => JSON.stringify(window.useProjectStore.getState().parts[0].features)))
      .toBe(expected);
    const dialog = await generateCutList(window);
    const fabricationLines = [
      '1. Fractional frame mitre — Mitre 22.5° on Right End · Long point on Front',
      '2. Fractional shelf dado — Dado on Top Face · 13/16" wide × 5/16" deep',
      '3. Fractional rail mortise — Mortise on Bottom Face · 2 3/8" × 1 1/8" × 7/16" deep',
      '4. Fractional face hole — Round Hole on Front Face · 5/16" diameter × 9/16" deep'
    ];
    const operationSummary = dialog
      .locator('.cut-list-parts-tab tbody tr')
      .first()
      .locator('td')
      .last()
      .locator('span.italic');
    await expect(operationSummary).toHaveText(fabricationLines.join('; '));

    await queueSavePath(window, csvPath);
    await dialog.locator('.cut-list-parts-tab').getByRole('button', { name: 'Download' }).click();
    await window.getByRole('menuitem', { name: 'Download CSV' }).click();
    await expect
      .poll(() => (fs.existsSync(csvPath) ? fs.statSync(csvPath).size : 0), { timeout: 5000 })
      .toBeGreaterThan(0);
    const csv = fs.readFileSync(csvPath, 'utf8');
    for (const line of fabricationLines) expect(csv).toContain(line.replaceAll('"', '""'));

    await queueSavePath(window, pdfPath);
    await dialog.locator('.cut-list-parts-tab').getByRole('button', { name: 'Download' }).click();
    await window.getByRole('menuitem', { name: 'Download PDF' }).click();
    await expect
      .poll(() => (fs.existsSync(pdfPath) ? fs.statSync(pdfPath).size : 0), { timeout: 5000 })
      .toBeGreaterThan(0);
    const normalizedPdfText = extractJsPdfLiteralText(pdfPath).replace(/\s+/g, ' ');
    for (const line of fabricationLines) {
      const pdfLine = line
        .replaceAll('—', ' - ')
        .replaceAll('·', ' | ')
        .replaceAll('°', ' deg')
        .replaceAll('×', ' x ')
        .replace(/\s+/g, ' ');
      expect(normalizedPdfText).toContain(pdfLine);
    }
  });

  test('keeps a 20-feature part pickable through orbit, edit, reorder, history, save, reopen, and output', async () => {
    test.setTimeout(120000);
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'twenty-feature-stress.carvd');
    const stressFeatures = buildStressFeatures();
    await seedProject(window, 'stocked-one-part');
    await window.evaluate((features) => {
      const project = window.useProjectStore.getState();
      const part = project.parts[0];
      project.updatePart(part.id, {
        name: 'Twenty feature stress board',
        length: 84,
        width: 30,
        thickness: 1.5,
        position: { x: 0, y: 0.75, z: 0 },
        features
      });
    }, stressFeatures);
    await expect.poll(() => window.evaluate(() => window.useProjectStore.getState().parts[0].features.length)).toBe(20);

    const cameraBefore = await window.evaluate(() => window.useCameraStore.getState().cameraViewVectors);
    const orbitStart = await getCanvasPoint(window, 0.12, 0.16);
    await window.mouse.move(orbitStart.x, orbitStart.y);
    await window.mouse.down();
    await window.mouse.move(orbitStart.x + 130, orbitStart.y + 75, { steps: 12 });
    await window.mouse.up();
    await expect
      .poll(() => window.evaluate(() => window.useCameraStore.getState().cameraViewVectors))
      .not.toEqual(cameraBefore);

    const partId = await window.evaluate(() => window.useProjectStore.getState().parts[0].id);
    await window.evaluate(() => window.useSelectionStore.getState().clearSelection());
    const partPoint = await window.evaluate((id) => window.__carvdE2E?.getPartScreenPoint(id) ?? null, partId);
    if (!partPoint) throw new Error('The stress part did not expose a real canvas pick point.');
    await window.mouse.click(partPoint.x, partPoint.y);
    await expect
      .poll(() => window.evaluate(() => window.useSelectionStore.getState().selectedPartIds))
      .toEqual([partId]);

    await openSelectedPartCuts(window);
    const preview = window.getByRole('img', { name: 'Part cuts geometry preview' });
    const initialGeometry = await preview.getAttribute('data-geometry-signature');
    expect(initialGeometry).toBeTruthy();
    await expect(window.getByRole('checkbox', { name: /^Enable cut / })).toHaveCount(20);

    await window.getByRole('button', { name: /^20\. Stress rounded 6/ }).click();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Stress rounded 6 edited');
    await fillMeasurement(window, 'Opening Length', '5');
    await saveCut(window);
    const editedGeometry = await preview.getAttribute('data-geometry-signature');
    expect(editedGeometry).not.toBe(initialGeometry);

    await window.getByRole('button', { name: 'Actions for cut 20' }).click();
    await window.getByRole('menuitem', { name: 'Move Up' }).click();
    await expect(window.getByRole('button', { name: /^19\. Stress rounded 6 edited/ })).toBeVisible();
    await window.getByRole('button', { name: 'Undo cut change' }).click();
    await expect(window.getByRole('button', { name: /^20\. Stress rounded 6 edited/ })).toBeVisible();
    await window.getByRole('button', { name: 'Redo cut change' }).click();
    await expect(window.getByRole('button', { name: /^19\. Stress rounded 6 edited/ })).toBeVisible();

    await window.getByRole('button', { name: 'Actions for cut 3' }).click();
    await window.getByRole('menuitem', { name: 'Duplicate' }).click();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Temporary stress duplicate');
    await fillMeasurement(window, 'Offset Along Length', '76');
    await fillMeasurement(window, 'Offset Across Width', '5');
    await saveCut(window);
    await expect(window.getByRole('checkbox', { name: /^Enable cut / })).toHaveCount(21);
    await window.getByRole('button', { name: 'Actions for cut 21' }).click();
    await window.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(window.getByRole('checkbox', { name: /^Enable cut / })).toHaveCount(20);
    await expect(window.getByText('Temporary stress duplicate')).toHaveCount(0);

    const savedGeometry = await preview.getAttribute('data-geometry-signature');
    await window.getByRole('button', { name: 'Save Part' }).click();
    const expected = await window.evaluate(() => JSON.stringify(window.useProjectStore.getState().parts[0].features));
    await saveProjectTo(window, projectPath);
    await reopenProject(window, projectPath);
    await expect
      .poll(() => window.evaluate(() => JSON.stringify(window.useProjectStore.getState().parts[0].features)))
      .toBe(expected);
    await expect.poll(() => window.evaluate(() => window.useProjectStore.getState().parts[0].features.length)).toBe(20);

    const reopenedPartId = await window.evaluate(() => window.useProjectStore.getState().parts[0].id);
    await window.evaluate(() => window.useSelectionStore.getState().clearSelection());
    const reopenedPoint = await window.evaluate(
      (id) => window.__carvdE2E?.getPartScreenPoint(id) ?? null,
      reopenedPartId
    );
    if (!reopenedPoint) throw new Error('The reopened stress part was not pickable.');
    await window.mouse.click(reopenedPoint.x, reopenedPoint.y);
    await expect
      .poll(() => window.evaluate(() => window.useSelectionStore.getState().selectedPartIds))
      .toEqual([reopenedPartId]);
    await openSelectedPartCuts(window);
    await expect.poll(() => preview.getAttribute('data-geometry-signature'), { timeout: 15000 }).toBe(savedGeometry);
    await expect(window.getByRole('checkbox', { name: /^Enable cut / })).toHaveCount(20);
    await window.getByRole('button', { name: 'Back to Project' }).click();

    const dialog = await generateCutList(window);
    await expect(dialog.getByRole('tab', { name: 'Parts List (1)' })).toBeVisible();
    for (const label of [
      'Stress left mitre',
      'Stress right compound',
      'Stress cutout 1',
      'Stress round 5',
      'Stress rounded 6 edited',
      'Stress rounded 5'
    ]) {
      await expect(dialog.getByText(new RegExp(label))).toBeVisible();
    }
    await expect(dialog.getByText('Temporary stress duplicate')).toHaveCount(0);
  });
});
