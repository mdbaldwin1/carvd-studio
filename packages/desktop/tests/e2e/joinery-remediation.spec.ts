import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  getSelectedPartCanvasPoint,
  launchElectronApp,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

let running: RunningElectronApp;
test.beforeEach(async () => {
  running = await launchElectronApp();
});
test.afterEach(async () => {
  await closeElectronApp(running);
});

test('creates prepared tenon stock and closes the second board around its exposed end', async () => {
  const { window } = running;
  await seedProject(window, 'stocked-one-part');
  await window.evaluate(() => {
    const state = window.useProjectStore.getState();
    state.updatePart(state.parts[0].id, { length: 12, width: 6, thickness: 0.75, position: { x: 0, y: 0.375, z: 0 } });
    const id = state.addPart({ name: 'Prepared tenon', position: { x: 30, y: 0.375, z: 0 } });
    window.useSelectionStore.getState().selectParts([id!]);
  });
  await window.getByLabel('Stock', { exact: true }).selectOption('___create___');
  const stock = window.getByRole('dialog', { name: 'Create New Stock' });
  await stock.getByLabel('Stock Type').selectOption('insert');
  await stock.getByLabel('Insert Type').selectOption('loose_tenon');
  await stock.getByLabel('Name', { exact: true }).fill('Prepared oak');
  await stock.getByRole('button', { name: 'Create Stock', exact: true }).click();
  const snapshot = () => window.evaluate(() => window.useProjectStore.getState().parts);
  expect((await snapshot())[1]).toMatchObject({ length: 2, width: 0.75, thickness: 0.25 });
  expect(await window.evaluate(() => window.useProjectStore.getState().stocks.at(-1))).toMatchObject({
    form: 'insert',
    insertKind: 'loose_tenon',
    packSize: 1,
    pricePerUnit: 0
  });
  await window.evaluate(() =>
    window.useSelectionStore.getState().selectParts(window.useProjectStore.getState().parts.map((part) => part.id))
  );
  const socket = window.getByRole('dialog', { name: 'Cut a socket for the insert' });
  const assembly = window.getByRole('dialog', { name: 'Bring the pieces together' });
  await window.getByRole('button', { name: 'Cut socket for insert…' }).click();
  await socket.getByRole('button', { name: 'Apply socket' }).click();
  await window.getByRole('button', { name: 'Bring pieces together…' }).click();
  await expect(assembly.getByRole('status')).toContainText('fits without');
  await assembly.getByRole('button', { name: 'Place the piece' }).click();
  const firstAssembly = await snapshot();
  await window.evaluate(() => {
    const state = window.useProjectStore.getState();
    const id = state.addPart({
      name: 'Second board',
      length: 12,
      width: 6,
      thickness: 0.75,
      stockId: state.parts[0].stockId,
      position: { x: 30, y: 0.375, z: 0 }
    });
    window.useSelectionStore.getState().selectParts([state.parts[1].id, id!]);
  });
  await window.getByRole('button', { name: 'Cut socket for insert…' }).click();
  await expect(socket.getByLabel('End of insert entering this board')).toHaveValue('left_end');
  await socket.getByLabel('Receiving face').selectOption('back_face');
  await socket.getByRole('button', { name: 'Apply socket' }).click();
  const beforeSecondPlacement = await snapshot();
  await window.getByRole('button', { name: 'Bring pieces together…' }).click();
  await expect(assembly).toContainText('Move Second board to Prepared tenon');
  await expect(assembly.getByRole('status')).toContainText('fits without');
  await assembly.getByRole('button', { name: 'Place the piece' }).click();
  const complete = await snapshot();
  expect(complete.slice(0, 2)).toEqual(firstAssembly);
  expect(complete[2].position.z).toBeCloseTo(6, 6);
  await window.getByTitle('Undo (Cmd+Z)').click();
  await expect.poll(snapshot).toEqual(beforeSecondPlacement);
  await window.getByTitle('Redo (Cmd+Shift+Z)').click();
  await expect.poll(snapshot).toEqual(complete);
});

test('keeps a quick canvas-fallback drag when move and release arrive in one task', async () => {
  const { window } = running;
  await seedProject(window, 'one-part');
  await window.evaluate(() => {
    const state = window.useProjectStore.getState();
    window.useSelectionStore.getState().selectParts([state.parts[0].id]);
  });
  const point = await getSelectedPartCanvasPoint(window);
  const before = await window.evaluate(() => window.useProjectStore.getState().parts[0].position);
  await window.evaluate(() => window.useSelectionStore.getState().clearSelection());
  // Let selection handles unmount before choosing the body, then deliver the
  // actual gesture without a render opportunity between move and release.
  await window.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  );
  await window.evaluate(({ x, y }) => {
    const canvas = document.querySelector('canvas')!;
    const stopMesh = (event: Event) => event.stopPropagation();
    canvas.addEventListener('pointerdown', stopMesh, { capture: true });
    const init = {
      pointerId: 77,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
      bubbles: true,
      clientX: x,
      clientY: y
    };
    canvas.dispatchEvent(new PointerEvent('pointerdown', init));
    window.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: x + 70 }));
    window.dispatchEvent(new PointerEvent('pointerup', { ...init, buttons: 0, clientX: x + 70 }));
    canvas.removeEventListener('pointerdown', stopMesh, { capture: true });
  }, point);
  const after = await window.evaluate(() => window.useProjectStore.getState().parts[0].position);
  expect(Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)).toBeGreaterThan(0.1);
  await window.getByTitle('Undo (Cmd+Z)').click();
  await expect.poll(() => window.evaluate(() => window.useProjectStore.getState().parts[0].position)).toEqual(before);
});

test('lays out and seats a sliding dovetail with shop measurements', async () => {
  const { window } = running;
  await seedProject(window, 'one-part');
  await window.evaluate(() => {
    const state = window.useProjectStore.getState();
    const shelf = state.parts[0];
    state.updatePart(shelf.id, { length: 8, width: 6, thickness: 0.75, position: { x: -20, y: 0.375, z: 0 } });
    const side = state.addPart({
      name: 'Receiving side',
      length: 18,
      width: 8,
      thickness: 0.75,
      position: { x: 20, y: 0.375, z: 0 }
    });
    window.useSelectionStore.getState().selectParts([shelf.id, side!]);
  });
  await window.getByRole('button', { name: 'Lay out matching cuts…' }).click();
  const layout = window.getByRole('dialog', { name: 'Lay out a matching joint' });
  await layout.getByLabel('Joint', { exact: true }).selectOption('sliding_dovetail');
  await expect(layout.getByLabel('Housing depth')).toHaveValue('3/8');
  await expect(layout.getByLabel('Housing center from receiving board’s left end')).toHaveValue('9');
  await expect(layout.getByRole('status')).toContainText('fit within both');
  await layout.getByRole('button', { name: 'Apply matching cuts' }).click();
  await window.getByRole('button', { name: 'Bring pieces together…' }).click();
  const assembly = window.getByRole('dialog', { name: 'Bring the pieces together' });
  await expect(assembly.getByRole('status')).toContainText('fits without');
  await assembly.getByRole('button', { name: 'Place the piece' }).click();
  expect(
    await window.evaluate(() => window.useProjectStore.getState().parts.map((part) => part.features?.length))
  ).toEqual([2, 1]);
});

test('preserves an authored underside placement through rendering and undo', async () => {
  const { window } = running;
  await seedProject(window, 'one-part');
  const before = await window.evaluate(() => window.useProjectStore.getState().parts[0].position);
  await window.evaluate(() => {
    const state = window.useProjectStore.getState();
    state.updatePart(state.parts[0].id, { position: { x: 0, y: -4, z: 0 } });
    window.useSelectionStore.getState().selectParts([state.parts[0].id]);
  });
  const settle = () =>
    window.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let frames = 0;
          const next = () => (++frames === 10 ? resolve() : requestAnimationFrame(next));
          requestAnimationFrame(next);
        })
    );
  const position = () => window.evaluate(() => window.useProjectStore.getState().parts[0].position);
  await settle();
  expect(await position()).toEqual({ x: 0, y: -4, z: 0 });
  await window.getByTitle('Undo (Cmd+Z)').click();
  await expect.poll(position).toEqual(before);
  await window.getByTitle('Redo (Cmd+Shift+Z)').click();
  await settle();
  expect(await position()).toEqual({ x: 0, y: -4, z: 0 });
});
