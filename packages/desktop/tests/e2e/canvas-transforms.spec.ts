import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  dragCanvas,
  getProjectSnapshot,
  getSelectedPartCanvasPoint,
  launchElectronApp,
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
        circularParametersAliased: source.features?.[2]?.parameters === copy.features?.[2]?.parameters
      };
    });

    expect(duplicated.copyId).not.toBe(duplicated.sourceId);
    expect(duplicated.copyFeatureIds).toHaveLength(4);
    expect(new Set(duplicated.copyFeatureIds).size).toBe(duplicated.copyFeatureIds.length);
    expect(duplicated.copyFeatureIds?.every((id) => !duplicated.sourceFeatureIds?.includes(id))).toBe(true);
    expect(duplicated.copyPayloadWithoutIds).toEqual(duplicated.sourcePayloadWithoutIds);
    expect(duplicated.circularParametersAliased).toBe(false);
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
    await running.window.getByRole('button', { name: 'Save Cut' }).click();
    await running.window.getByRole('button', { name: 'Save Part' }).click();
    expect(
      await running.window.evaluate(() => JSON.stringify(window.useProjectStore.getState().parts[0].features))
    ).toBe(sourceBefore);
    expect(
      await running.window.evaluate(() => window.useProjectStore.getState().parts[1].features?.[2].parameters.diameter)
    ).toBe(0.375);
  });

  test('keeps featured geometry local and pickable across canvas movement, all-axis rotation, and history', async () => {
    await seedFeaturedPart(running.window);
    await running.window.evaluate(() => window.useProjectStore.temporal.getState().clear());
    const featuresBefore = await getSelectedFeaturePayload(running.window);
    const before = await getProjectSnapshot(running.window);

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
      expect(await getSelectedFeaturePayload(running.window)).toBe(featuresBefore);
    }

    expect(
      await running.window.evaluate(() => window.useProjectStore.temporal.getState().pastStates.length)
    ).toBeGreaterThan(0);
    await running.window.evaluate(() => window.useProjectStore.temporal.getState().undo());
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts[0].rotation.z).toBe(0);
    await running.window.evaluate(() => window.useProjectStore.temporal.getState().redo());
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts[0].rotation.z).toBe(90);
    expect(await getSelectedFeaturePayload(running.window)).toBe(featuresBefore);

    // The selected feature-bearing mesh remains available to the real canvas
    // picker and can still be moved after its local operations are rotated.
    const startPoint = await getSelectedPartCanvasPoint(running.window);
    await dragCanvas(running.window, startPoint, { x: 90, y: -55 });
    const afterMove = await getProjectSnapshot(running.window);
    expect(afterMove.parts[0].position).not.toEqual(before.parts[0].position);
    expect(afterMove.activeSession).toBeNull();
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
