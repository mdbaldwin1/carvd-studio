import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  dragCanvas,
  getProjectSnapshot,
  getSelectedPartCanvasPoint,
  launchElectronApp,
  savePartCutsFromHeader,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

async function seedFeaturedPart(window: RunningElectronApp['window']): Promise<void> {
  await seedProject(window, 'one-part');
  await window.evaluate(() => {
    const project = window.useProjectStore.getState();
    const part = project.parts[0];
    project.updatePart(part.id, {
      features: [
        {
          id: 'canvas-mitre',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          label: 'Canvas mitre',
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 30, horizontalFlip: true }
        },
        {
          id: 'canvas-dado',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          label: 'Canvas dado',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          cutType: 'dado',
          placement: { x: 6, z: 0 },
          parameters: { size: { length: 0.75, width: 4 }, depthMode: 'blind', depth: 0.375 }
        },
        {
          id: 'canvas-holes',
          kind: 'circular_cut',
          version: 1,
          enabled: true,
          label: 'Canvas holes',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'center', secondaryFrom: 'center' },
          cutType: 'round_hole',
          placement: { primary: 0, secondary: 0, rotation: 0 },
          pattern: { type: 'linear', count: 3, spacing: 0.75, direction: 20 },
          parameters: { diameter: 0.25, depthMode: 'blind', depth: 0.5, tilt: 0, direction: 0 }
        },
        {
          id: 'canvas-slot',
          kind: 'rounded_cut',
          version: 1,
          enabled: true,
          label: 'Canvas slot',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'center', secondaryFrom: 'center' },
          cutType: 'rounded_slot',
          placement: { primary: 3, secondary: 2, rotation: 30 },
          parameters: { length: 3, width: 0.5, cornerRadius: 0.25, depthMode: 'through' }
        }
      ]
    });
  });
}

async function getSelectedFeaturePayload(window: RunningElectronApp['window']): Promise<string> {
  return window.evaluate(() => {
    const selectedId = window.useSelectionStore.getState().selectedPartIds[0];
    const part = window.useProjectStore
      .getState()
      .parts.find((candidate: { id: string }) => candidate.id === selectedId);
    return JSON.stringify(part?.features ?? []);
  });
}

async function getSelectedTransform(window: RunningElectronApp['window']): Promise<{
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}> {
  return window.evaluate(() => {
    const selectedId = window.useSelectionStore.getState().selectedPartIds[0];
    const part = window.useProjectStore
      .getState()
      .parts.find((candidate: { id: string }) => candidate.id === selectedId);
    if (!part) throw new Error('Selected part was not found');
    return { position: part.position, rotation: part.rotation };
  });
}

async function getHistoryCounts(window: RunningElectronApp['window']): Promise<{ past: number; future: number }> {
  return window.evaluate(() => {
    const temporal = window.useProjectStore.temporal.getState();
    return { past: temporal.pastStates.length, future: temporal.futureStates.length };
  });
}

async function getHistoricalPartStates(window: RunningElectronApp['window']): Promise<
  Array<{
    transform: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number } };
    features: string;
  }>
> {
  return window.evaluate(() => {
    const selectedId = window.useSelectionStore.getState().selectedPartIds[0];
    return window.useProjectStore.temporal
      .getState()
      .pastStates.map((state: { parts: Array<{ id: string; position: unknown; rotation: unknown }> }) => {
        const part = state.parts.find((candidate) => candidate.id === selectedId);
        if (!part) throw new Error('Selected part was not found in history');
        return {
          transform: { position: part.position, rotation: part.rotation },
          features: JSON.stringify(part.features ?? [])
        };
      });
  });
}

function transformDigest(transform: { position: object; rotation: object }): string {
  return JSON.stringify(transform, (_key, value) => (typeof value === 'number' ? Number(value.toFixed(6)) : value));
}

test.describe('Canvas transform workflows', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('moves a selected part with a real canvas drag', async () => {
    await seedProject(running.window, 'one-part');
    const before = await getProjectSnapshot(running.window);
    const beforePosition = before.parts[0].position;

    const point = await getSelectedPartCanvasPoint(running.window);
    await dragCanvas(running.window, point, { x: 90, y: -55 });

    const after = await getProjectSnapshot(running.window);
    const afterPosition = after.parts[0].position;
    expect(afterPosition.x).not.toBeCloseTo(beforePosition.x, 5);
    expect(afterPosition.z).not.toBeCloseTo(beforePosition.z, 5);
    expect(after.activeSession).toBeNull();
  });

  test('duplicates every feature family through the real main-canvas command', async () => {
    await seedFeaturedPart(running.window);
    const sourceBefore = await getSelectedFeaturePayload(running.window);

    await running.window.locator('canvas').click({ force: true });
    await running.window.keyboard.press('Shift+D');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts).toHaveLength(2);

    const duplicated = await running.window.evaluate(() => {
      const [source, copy] = window.useProjectStore.getState().parts;
      return {
        sourceId: source.id,
        copyId: copy.id,
        sourceFeatureIds: source.features?.map((feature: { id: string }) => feature.id),
        copyFeatureIds: copy.features?.map((feature: { id: string }) => feature.id),
        sourcePayload: JSON.stringify(source.features),
        copyPayloadWithoutIds: (copy.features ?? []).map(({ id, ...feature }: { id: string }) => feature),
        sourcePayloadWithoutIds: (source.features ?? []).map(({ id, ...feature }: { id: string }) => feature),
        circularParametersAliased: source.features?.[2]?.parameters === copy.features?.[2]?.parameters,
        rectangularSizeAliased: source.features?.[1]?.parameters.size === copy.features?.[1]?.parameters.size
      };
    });

    expect(duplicated.copyId).not.toBe(duplicated.sourceId);
    expect(duplicated.copyFeatureIds).toHaveLength(4);
    expect(new Set(duplicated.copyFeatureIds).size).toBe(duplicated.copyFeatureIds.length);
    expect(duplicated.copyFeatureIds?.every((id) => !duplicated.sourceFeatureIds?.includes(id))).toBe(true);
    expect(duplicated.copyPayloadWithoutIds).toEqual(duplicated.sourcePayloadWithoutIds);
    expect(duplicated.circularParametersAliased).toBe(false);
    expect(duplicated.rectangularSizeAliased).toBe(false);
    expect(duplicated.sourcePayload).toBe(sourceBefore);
  });

  test('copies and pastes all featured families through the real keyboard commands without aliasing the source', async () => {
    await seedFeaturedPart(running.window);
    const sourceBefore = await getSelectedFeaturePayload(running.window);
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

    await running.window.locator('canvas').click({ force: true });
    await running.window.keyboard.press(`${mod}+C`);
    await running.window.keyboard.press(`${mod}+V`);
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts).toHaveLength(2);
    const copied = await running.window.evaluate(() => {
      const [source, copy] = window.useProjectStore.getState().parts;
      return {
        sourceIds: source.features?.map((feature: { id: string }) => feature.id) ?? [],
        copyIds: copy.features?.map((feature: { id: string }) => feature.id) ?? [],
        sourcePayload: JSON.stringify(source.features),
        copyPayload: (copy.features ?? []).map(({ id, ...feature }: { id: string }) => feature),
        sourceComparable: (source.features ?? []).map(({ id, ...feature }: { id: string }) => feature)
      };
    });
    expect(new Set(copied.copyIds).size).toBe(4);
    expect(copied.copyIds.every((id) => !copied.sourceIds.includes(id))).toBe(true);
    expect(copied.copyPayload).toEqual(copied.sourceComparable);

    await running.window.getByRole('button', { name: 'Edit Part Cuts' }).click();
    await running.window.getByRole('button', { name: /^3\./ }).click();
    await running.window.getByLabel('Hole Diameter').fill('0.375');
    // Edit the pasted rectangular operation through the same inspector rather
    // than mutating store data. Its nested size object must remain independent
    // from the original feature after the real copy/paste command.
    await running.window.getByRole('button', { name: /^2\./ }).click();
    await running.window.getByLabel('Run Along Blank').fill('1.25');
    await savePartCutsFromHeader(running.window);
    expect(
      await running.window.evaluate(() => JSON.stringify(window.useProjectStore.getState().parts[0].features))
    ).toBe(sourceBefore);
    expect(
      await running.window.evaluate(() => window.useProjectStore.getState().parts[1].features?.[2].parameters.diameter)
    ).toBe(0.375);
    expect(
      await running.window.evaluate(() => window.useProjectStore.getState().parts[1].features?.[1].parameters.size)
    ).toEqual({ length: 1.25, width: 10 });
  });

  test('resizes a copied featured part through properties without changing its source', async () => {
    await seedFeaturedPart(running.window);
    const source = await running.window.evaluate(() => {
      const part = window.useProjectStore.getState().parts[0];
      return JSON.stringify({ length: part.length, width: part.width, features: part.features });
    });
    await running.window.locator('canvas').click({ force: true });
    await running.window.keyboard.press('Shift+D');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts).toHaveLength(2);
    const copiedFeaturesBeforeResize = await running.window.evaluate(() =>
      JSON.stringify(window.useProjectStore.getState().parts[1].features)
    );
    const dims = running.window.locator('.dimension-inputs input');
    await dims.nth(0).fill('1');
    await dims.nth(0).press('Tab');
    expect(
      await running.window.evaluate(() => {
        const part = window.useProjectStore.getState().parts[0];
        return JSON.stringify({ length: part.length, width: part.width, features: part.features });
      })
    ).toBe(source);
    expect(
      await running.window.evaluate(() => {
        const part = window.useProjectStore.getState().parts[1];
        return {
          length: part.length,
          width: part.width,
          thickness: part.thickness,
          features: JSON.stringify(part.features)
        };
      })
    ).toEqual({ length: 1, width: 10, thickness: 2, features: copiedFeaturesBeforeResize });
    await running.window.getByRole('button', { name: /Generate Cut List|View Cut List/ }).click();
    const dialog = running.window
      .getByRole('dialog')
      .filter({ has: running.window.getByRole('heading', { name: 'Cut List' }) });
    await dialog.getByRole('button', { name: 'Generate Cut List' }).click();
    await expect(dialog.getByText('Operation "Canvas dado" is invalid: Dado width runs past the blank.')).toBeVisible();
    await expect(
      dialog.getByText(
        'Fix the errors below before generating. Blank dimensions, stock assignments, and authored operations must all be valid.'
      )
    ).toBeVisible();
    await expect(dialog.locator('.cut-list-tabs')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Generate Cut List' })).toBeEnabled();
    expect((await getProjectSnapshot(running.window)).cutList).toBeNull();
  });

  test('keeps featured geometry local and pickable through real canvas transforms and shortcut history', async () => {
    await seedFeaturedPart(running.window);
    const featuresBefore = await getSelectedFeaturePayload(running.window);
    const before = await getSelectedTransform(running.window);
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

    // The canvas drag is the user action that moves this feature-bearing part.
    const startPoint = await getSelectedPartCanvasPoint(running.window);
    await dragCanvas(running.window, startPoint, { x: 90, y: -55 });
    const afterMove = await getSelectedTransform(running.window);
    expect(afterMove.position).not.toEqual(before.position);
    expect(afterMove.rotation).toEqual(before.rotation);
    expect(await getSelectedFeaturePayload(running.window)).toBe(featuresBefore);

    // X/Y/Z all dispatch through the real global workspace shortcuts. Capture
    // each persisted state because world-axis quaternion composition is not
    // equivalent to independently setting Euler fields.
    await running.window.keyboard.press('X');
    await running.window.waitForTimeout(300);
    await expect
      .poll(async () => transformDigest(await getSelectedTransform(running.window)))
      .not.toBe(transformDigest(afterMove));
    const afterX = await getSelectedTransform(running.window);
    expect(afterX.rotation).not.toEqual(afterMove.rotation);

    await running.window.keyboard.press('Y');
    await running.window.waitForTimeout(300);
    await expect
      .poll(async () => transformDigest(await getSelectedTransform(running.window)))
      .not.toBe(transformDigest(afterX));
    const afterY = await getSelectedTransform(running.window);
    expect(afterY.rotation).not.toEqual(afterX.rotation);

    await running.window.keyboard.press('Z');
    await running.window.waitForTimeout(300);
    await expect
      .poll(async () => transformDigest(await getSelectedTransform(running.window)))
      .not.toBe(transformDigest(afterY));
    const afterZ = await getSelectedTransform(running.window);
    expect(afterZ.rotation).not.toEqual(afterY.rotation);
    expect(await getSelectedFeaturePayload(running.window)).toBe(featuresBefore);

    // Its rotated mesh remains available to the real canvas picker.
    await expect
      .poll(async () => running.window.evaluate(() => window.__carvdE2E?.getPartScreenPoint() ?? null))
      .not.toBeNull();

    // Undo and redo use the same user shortcuts, proving each canvas action
    // remains an independent history entry without directly manipulating time.
    const historyBeforeUndo = await getHistoryCounts(running.window);
    const historicalPartStates = await getHistoricalPartStates(running.window);
    const beforeHistoryIndex = historicalPartStates.findIndex(
      (state) => state.features === featuresBefore && transformDigest(state.transform) === transformDigest(before)
    );
    expect(beforeHistoryIndex).toBeGreaterThanOrEqual(0);
    const undoExpected = historicalPartStates
      .slice(beforeHistoryIndex)
      .map((state) => state.transform)
      .reverse();
    expect(undoExpected).toContainEqual(before);
    expect(undoExpected).toContainEqual(afterMove);
    expect(undoExpected).toContainEqual(afterX);
    expect(undoExpected).toContainEqual(afterY);

    for (const [index, expected] of undoExpected.entries()) {
      await running.window.keyboard.press(`${mod}+Z`);
      await expect
        .poll(async () => getHistoryCounts(running.window))
        .toEqual({
          past: historyBeforeUndo.past - index - 1,
          future: historyBeforeUndo.future + index + 1
        });
      await expect
        .poll(async () => transformDigest(await getSelectedTransform(running.window)))
        .toBe(transformDigest(expected));
      expect(await getSelectedFeaturePayload(running.window)).toBe(featuresBefore);
    }
    const redoExpected = [...undoExpected.slice(0, -1).reverse(), afterZ];
    for (const [index, expected] of redoExpected.entries()) {
      await running.window.keyboard.press(`${mod}+Shift+Z`);
      await expect
        .poll(async () => getHistoryCounts(running.window))
        .toEqual({
          past: historyBeforeUndo.past - undoExpected.length + index + 1,
          future: historyBeforeUndo.future + undoExpected.length - index - 1
        });
      await expect
        .poll(async () => transformDigest(await getSelectedTransform(running.window)))
        .toBe(transformDigest(expected));
      expect(await getSelectedFeaturePayload(running.window)).toBe(featuresBefore);
    }

    expect(await getSelectedPartCanvasPoint(running.window)).toBeTruthy();
    expect(await getSelectedFeaturePayload(running.window)).toBe(featuresBefore);
  });

  test('rotates a selected part with keyboard axis shortcuts', async () => {
    await seedProject(running.window, 'one-part');
    await running.window.locator('canvas').click({ force: true });

    for (const [key, axis] of [
      ['X', 'x'],
      ['Y', 'y'],
      ['Z', 'z']
    ] as const) {
      await running.window.evaluate(() => {
        const project = window.useProjectStore.getState();
        const part = project.parts[0];
        project.updatePart(part.id, { rotation: { x: 0, y: 0, z: 0 } });
        window.useSelectionStore.getState().selectPart(part.id);
      });
      await running.window.keyboard.press(key);
      await expect.poll(async () => (await getProjectSnapshot(running.window)).parts[0].rotation[axis]).toBe(90);
    }
  });

  test('edits dimensions through the properties panel and commits to project state', async () => {
    await seedProject(running.window, 'one-part');

    const dimInputs = running.window.locator('.dimension-inputs input');
    await expect(dimInputs.first()).toBeVisible({ timeout: 5000 });
    await dimInputs.nth(0).fill('30');
    await running.window.keyboard.press('Tab');
    await dimInputs.nth(1).fill('10');
    await running.window.keyboard.press('Tab');
    await dimInputs.nth(2).fill('1.5');
    await running.window.keyboard.press('Tab');

    const snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.parts[0].length).toBe(30);
    expect(snapshot.parts[0].width).toBe(10);
    expect(snapshot.parts[0].thickness).toBe(1.5);
    expect(snapshot.parts[0].position.y).toBe(0.75);
  });
});
