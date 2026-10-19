import { expect, test } from '@playwright/test';
import { launchElectronApp, closeElectronApp, seedProject, type RunningElectronApp } from './helpers/electron-app';

test.describe('woodworking reference assembly', () => {
  let running: RunningElectronApp;
  test.beforeEach(async () => {
    running = await launchElectronApp();
  });
  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  for (const [kind, counts] of [
    ['box', [2, 2]],
    ['through_dovetail', [3, 2]],
    ['half_blind_dovetail', [3, 2]],
    ['mitred_blind_dovetail', [5, 4]],
    ['mortise_tenon', [1, 1]],
    ['twin_tenon', [2, 2]],
    ['haunched_tenon', [2, 2]]
  ] as const)
    test(`lays out and seats ${kind} as atomic operations`, async () => {
      const { window } = running;
      await seedProject(window, 'one-part');
      await window.evaluate(() => {
        const state = window.useProjectStore.getState();
        const first = state.parts[0];
        state.updatePart(first.id, { length: 12, width: 3, thickness: 0.75, position: { x: -20, y: 0.375, z: 0 } });
        const second = state.addPart({
          name: 'Mating board',
          length: 16,
          width: 3,
          thickness: 0.75,
          position: { x: 20, y: 0.375, z: 0 }
        });
        if (!second) throw new Error('Missing mating stock');
        window.useSelectionStore.getState().selectParts([first.id, second]);
        window.useProjectStore.temporal.getState().clear();
      });
      const snapshot = () => window.evaluate(() => window.useProjectStore.getState().parts);
      const before = await snapshot();
      await window.getByRole('button', { name: 'Lay out matching cuts…' }).click();
      const layout = window.getByRole('dialog', { name: 'Lay out a matching joint' });
      await layout.getByLabel('Joint', { exact: true }).selectOption(kind);
      await expect(layout.getByRole('status')).toContainText('fit within both');
      expect(await snapshot()).toEqual(before);
      await layout.getByRole('button', { name: 'Apply matching cuts' }).click();
      const cut = await snapshot();
      expect(cut.map((part) => part.features?.length)).toEqual(counts);
      await window.getByTitle('Undo (Cmd+Z)').click();
      await expect.poll(snapshot).toEqual(before);
      await window.getByTitle('Redo (Cmd+Shift+Z)').click();
      await expect.poll(snapshot).toEqual(cut);
      await window.getByRole('button', { name: 'Lay out matching cuts…' }).click();
      await expect(layout.getByLabel('Joint', { exact: true })).toHaveValue(kind);
      await layout.getByRole('button', { name: 'Cancel', exact: true }).click();
      await window.getByRole('button', { name: 'Bring pieces together…' }).click();
      const assembly = window.getByRole('dialog', { name: 'Bring the pieces together' });
      await expect(assembly.getByRole('status')).toContainText('fits without');
      await assembly.getByRole('button', { name: 'Place the piece' }).click();
      await expect(assembly).not.toBeVisible();
      const placed = await snapshot();
      expect(placed.map((part) => part.features)).toEqual(cut.map((part) => part.features));
      expect(placed.map((part) => part.position)).not.toEqual(cut.map((part) => part.position));
      await window.getByTitle('Undo (Cmd+Z)').click();
      await expect.poll(snapshot).toEqual(cut);
    });

  for (const kind of ['domino', 'biscuit', 'loose_tenon', 'dowel_pin'] as const)
    test(`cuts and seats a real ${kind} part`, async () => {
      const { window } = running;
      await seedProject(window, 'stocked-one-part');
      await window.evaluate((insertKind) => {
        const state = window.useProjectStore.getState();
        const board = state.parts[0];
        state.updatePart(board.id, { length: 12, width: 4, thickness: 0.75, position: { x: 0, y: 0.375, z: 0 } });
        const stockId = state.addStock({
          name: 'Purchased insert',
          form: 'insert',
          insertKind,
          length: 2,
          width: insertKind === 'dowel_pin' ? 0.25 : 0.75,
          thickness: 0.25,
          grainDirection: 'length',
          color: '#bb9966',
          cost: 1,
          pricingUnit: 'per_item',
          packSize: 1
        });
        const insertId = state.addPart({ name: 'Insert', stockId, position: { x: 20, y: 0.125, z: 0 } });
        window.useSelectionStore.getState().selectParts([board.id, insertId!]);
      }, kind);
      await window.getByRole('button', { name: 'Cut socket for insert…' }).click();
      const socket = window.getByRole('dialog', { name: 'Cut a socket for the insert' });
      await expect(socket.getByRole('status')).toContainText('fits within');
      await socket.getByRole('button', { name: 'Apply socket' }).click();
      const cut = await window.evaluate(() => window.useProjectStore.getState().parts);
      expect(cut[0].features).toHaveLength(1);
      expect(cut[1].ignoreOverlap).not.toBe(true);
      await window.getByRole('button', { name: 'Bring pieces together…' }).click();
      const assembly = window.getByRole('dialog', { name: 'Bring the pieces together' });
      await expect(assembly.getByRole('status')).toContainText('fits without');
      await assembly.getByRole('button', { name: 'Place the piece' }).click();
      await expect(assembly).not.toBeVisible();
      await window.getByTitle('Undo (Cmd+Z)').click();
      await expect.poll(() => window.evaluate(() => window.useProjectStore.getState().parts)).toEqual(cut);
    });

  test('creates purchased factory shapes through stock assignment without decorative cuts', async () => {
    const { window } = running;
    await seedProject(window, 'one-part');
    await window.evaluate(() => {
      const state = window.useProjectStore.getState();
      const base = state.stocks[0];
      window.useProjectStore.setState({
        stocks: [
          ...state.stocks,
          {
            ...base,
            id: 'domino',
            name: 'Factory Domino',
            form: 'insert',
            insertKind: 'domino',
            length: 40 / 25.4,
            width: 20 / 25.4,
            thickness: 6 / 25.4
          },
          {
            ...base,
            id: 'biscuit',
            name: 'Factory Biscuit',
            form: 'insert',
            insertKind: 'biscuit',
            length: 56 / 25.4,
            width: 23 / 25.4,
            thickness: 4 / 25.4
          }
        ]
      });
      window.useSelectionStore.getState().selectParts([state.parts[0].id]);
    });
    for (const shape of ['domino', 'biscuit']) {
      await window.getByLabel('Stock', { exact: true }).selectOption(shape);
      const part = await window.evaluate(() => window.useProjectStore.getState().parts[0]);
      expect(part.blankShape).toBe(shape);
      expect(part.features ?? []).toEqual([]);
      expect(part.length).toBeCloseTo((shape === 'domino' ? 40 : 56) / 25.4);
      expect(part.thickness).toBeCloseTo((shape === 'domino' ? 6 : 4) / 25.4);
    }
  });

  test('previews, cancels, places, and undoes a joint without coordinate entry', async () => {
    const { window } = running;
    await seedProject(window, 'one-part');
    await window.evaluate(() => {
      const state = window.useProjectStore.getState();
      const first = state.parts[0];
      state.updatePart(first.id, {
        name: 'Moving rail',
        length: 12,
        width: 3,
        thickness: 0.75,
        position: { x: -20, y: 0.375, z: 0 }
      });
      const second = state.addPart({
        name: 'Fixed rail',
        length: 8,
        width: 3,
        thickness: 0.75,
        position: { x: 20, y: 0.375, z: 0 }
      });
      if (!second) throw new Error('Could not create second board');
      window.useSelectionStore.getState().selectParts([first.id, second]);
      window.useProjectStore.temporal.getState().clear();
    });
    const snapshot = () => window.evaluate(() => window.useProjectStore.getState().parts.map((part) => ({ ...part })));
    const before = await snapshot();
    await window.getByRole('button', { name: 'Bring pieces together…' }).click();
    const dialog = window.getByRole('dialog', { name: 'Bring the pieces together' });
    await expect(dialog.getByRole('status')).toContainText('fits without');
    expect(await snapshot()).toEqual(before);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await snapshot()).toEqual(before);
    await window.getByRole('button', { name: 'Bring pieces together…' }).click();
    await dialog.getByRole('button', { name: 'Place the piece' }).click();
    await expect(dialog).not.toBeVisible();
    const after = await snapshot();
    expect(after[0].position.x).toBeCloseTo(10);
    expect(after[1]).toEqual(before[1]);
    expect(after[0].length).toBe(before[0].length);
    await window.getByTitle('Undo (Cmd+Z)').click();
    await expect.poll(snapshot).toEqual(before);
    await window.getByTitle('Redo (Cmd+Shift+Z)').click();
    await expect.poll(snapshot).toEqual(after);
  });
});
