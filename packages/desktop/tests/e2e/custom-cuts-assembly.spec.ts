import { expect, test } from '@playwright/test';
import type { Page } from 'playwright';
import {
  closeElectronApp,
  dragCanvas,
  exitPartCutsFromHeader,
  getResizeHandleCanvasPoint,
  getSelectedPartCanvasPoint,
  launchElectronApp,
  savePartCutsFromHeader,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

type FixturePart = {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  position: { x: number; y: number; z: number };
  features?: unknown[];
};

const rectCut = (
  id: string,
  cutType: 'dado' | 'groove' | 'stopped_groove' | 'rabbet' | 'mortise' | 'tenon',
  target: { type: 'face'; face: string } | { type: 'edge'; edge: string },
  size: { length: number; width: number },
  depth: number,
  placement: { x: number; z: number }
) => ({
  id,
  kind: 'rect_cut',
  version: 1,
  enabled: true,
  label: id,
  target,
  reference: { primaryFrom: 'min', secondaryFrom: 'min' },
  cutType,
  placement,
  parameters: { size, depthMode: 'blind', depth }
});

const roundHole = (id: string, label: string, primary: number) => ({
  id,
  kind: 'circular_cut',
  version: 1,
  enabled: true,
  label,
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  cutType: 'round_hole',
  placement: { primary, secondary: 0, rotation: 0 },
  parameters: { diameter: 0.25, depthMode: 'blind', depth: 0.25, tilt: 0, direction: 0 }
});

async function seedFixture(
  window: Page,
  parts: FixturePart[],
  selectedPartId: string,
  singletonGroupMemberId?: string,
  selectSingletonGroup = true
): Promise<void> {
  await seedProject(window, 'empty');
  await window.evaluate(
    ({ fixtureParts, selectedId, groupMemberId, selectGroup }) => {
      const project = window.useProjectStore.getState();
      project.setStockConstraints({ ...project.stockConstraints, preventOverlap: true });
      window.useSnapStore.getState().setSnapToPartsEnabled(true);
      window.useSelectionStore.getState().setHoveredPart(null);
      for (const part of fixtureParts) {
        project.addPart({
          ...part,
          features: part.features as never,
          rotation: { x: 0, y: 0, z: 0 },
          stockId: null,
          color: '#c4a574',
          grainDirection: 'length'
        });
      }
      if (groupMemberId) {
        project.createGroup('Singleton Mate Group', [{ id: groupMemberId, type: 'part' }]);
        if (!selectGroup) window.useSelectionStore.getState().clearSelection();
      } else {
        window.useSelectionStore.getState().selectPart(selectedId);
      }
    },
    {
      fixtureParts: parts,
      selectedId: selectedPartId,
      groupMemberId: singletonGroupMemberId,
      selectGroup: selectSingletonGroup
    }
  );
  await window.waitForTimeout(300);
}

async function setCamera(window: Page, view: 'top' | 'front'): Promise<void> {
  await window.waitForFunction(() => typeof window.__carvdE2E?.setCameraView === 'function');
  await window.evaluate((nextView) => window.__carvdE2E!.setCameraView(nextView), view);
  await window.waitForTimeout(150);
}

async function enablePrecisionSnapping(window: Page): Promise<void> {
  await window.getByTitle('App Settings').click();
  const dialog = window.getByRole('dialog', { name: 'App Settings' });
  const preset = dialog.locator('.settings-row').filter({ hasText: 'Advanced Snap Preset' }).locator('select');
  await preset.selectOption('simple');
  await preset.selectOption('precision');
  await dialog.getByRole('button', { name: 'Done' }).click();
}

async function rotateSelected(window: Page, axis: 'X' | 'Y' | 'Z', turns = 1): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) {
    await window.keyboard.press(axis);
    await window.waitForTimeout(150);
  }
}

async function dragSelectedOnFace(
  window: Page,
  delta: { x: number; y: number },
  bodyOffset = 0.65,
  edgeOnly = false
): Promise<{
  previewDelta: { x: number; y: number; z: number } | null;
  debugLogs: Array<{ event: string; payload?: unknown }>;
}> {
  const center = await getSelectedPartCanvasPoint(window);
  const targets = edgeOnly
    ? await Promise.all([
        getResizeHandleCanvasPoint(window, { x: 1, y: 0, z: 0 }),
        getResizeHandleCanvasPoint(window, { x: -1, y: 0, z: 0 }),
        getResizeHandleCanvasPoint(window, { x: 0, y: 0, z: 1 }),
        getResizeHandleCanvasPoint(window, { x: 0, y: 0, z: -1 })
      ])
    : [await getResizeHandleCanvasPoint(window, { x: 1, y: 1, z: 1 })];
  const target = targets.reduce((furthest, candidate) =>
    Math.hypot(candidate.x - center.x, candidate.y - center.y) >
    Math.hypot(furthest.x - center.x, furthest.y - center.y)
      ? candidate
      : furthest
  );
  // The rotation rings occupy face centers. An interior point toward the
  // opposite-end corner stays on material while avoiding rings and resize handles.
  const start = {
    x: center.x + (target.x - center.x) * bodyOffset,
    y: center.y + (target.y - center.y) * bodyOffset
  };
  await window.keyboard.down('Shift');
  try {
    await window.mouse.move(start.x, start.y);
    await window.waitForTimeout(150);
    await window.mouse.down();
    await window.waitForTimeout(250);
    for (let i = 1; i <= 12; i += 1) {
      await window.mouse.move(start.x + (delta.x * i) / 12, start.y + (delta.y * i) / 12);
      await window.waitForTimeout(20);
    }
    const previewDelta = await window.evaluate(() => {
      const session = window.useInteractionStore.getState().activeSession;
      return session?.kind === 'move' ? { ...session.delta } : null;
    });
    await window.mouse.up();
    await window.waitForTimeout(500);
    const debugLogs = await window.evaluate(
      () => window.dumpDragDebugLogs?.().map(({ event, payload }) => ({ event, payload })) ?? []
    );
    return { previewDelta, debugLogs };
  } finally {
    await window.keyboard.up('Shift');
  }
}

async function selectedTransform(window: Page) {
  return window.evaluate(() => {
    const selectedId = window.useSelectionStore.getState().selectedPartIds[0];
    const part = window.useProjectStore
      .getState()
      .parts.find((candidate: { id: string }) => candidate.id === selectedId);
    return { position: part.position, rotation: part.rotation };
  });
}

async function resetDragTrace(window: Page): Promise<void> {
  await window.waitForFunction(() => typeof window.enableDragDebug === 'function');
  await window.evaluate(() => {
    window.enableDragDebug!();
    window.clearDragDebugLogs!();
  });
}

function lastDragEvent<T extends Record<string, unknown>>(
  logs: Array<{ event: string; payload?: unknown }>,
  event: string
): T | null {
  return (logs.filter((entry) => entry.event === event).at(-1)?.payload as T | undefined) ?? null;
}

const MODIFIER = process.platform === 'darwin' ? 'Meta' : 'Control';

async function selectFixturePart(window: Page, partId: string): Promise<void> {
  await window.evaluate((id) => window.useSelectionStore.getState().selectPart(id), partId);
  await window.waitForTimeout(100);
}

async function selectCanvasPart(window: Page, partId: string): Promise<void> {
  // Remove rotation/resize controls before locating material. This keeps a
  // camera-dependent handle projection from turning a selection click into a
  // transform gesture when the target happens to already be selected.
  await window.keyboard.press('Escape');
  await expect.poll(() => window.evaluate(() => window.useSelectionStore.getState().selectedPartIds)).toEqual([]);
  await window.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  );
  await window.waitForFunction(
    (id) => typeof window.__carvdE2E?.getPartScreenPoint === 'function' && !!window.__carvdE2E.getPartScreenPoint(id),
    partId
  );
  const point = await window.evaluate((id) => window.__carvdE2E?.getPartScreenPoint(id) ?? null, partId);
  if (!point) throw new Error(`Unable to project part ${partId} for canvas selection.`);
  await window.mouse.click(point.x, point.y);
  await expect.poll(() => window.evaluate(() => window.useSelectionStore.getState().selectedPartIds)).toEqual([partId]);
}

async function openSelectedPartCuts(window: Page, partId: string): Promise<void> {
  await selectFixturePart(window, partId);
  await window.getByRole('button', { name: 'Edit Part Cuts' }).click();
  await expect(window.locator('.header-mode-chip', { hasText: 'Part Cuts' })).toBeVisible();
}

async function authorRightMitre(window: Page, partId: string, flip: boolean): Promise<void> {
  await openSelectedPartCuts(window, partId);
  await window.locator('button[title="Add Cut"]').click();
  await window.getByRole('button', { name: /^End Cut\b/ }).click();
  await window.getByRole('button', { name: 'Right End', exact: true }).click();
  await window.getByLabel('Cut Style', { exact: true }).selectOption('mitre');
  await window.getByLabel('Mitre Angle', { exact: true }).fill('45');
  const longPoint = window.getByLabel('Long Point On', { exact: true });
  await longPoint.selectOption(flip ? 'back' : 'front');
  await expect(longPoint).toHaveValue(flip ? 'back' : 'front');
  await savePartCutsFromHeader(window);
  await expect
    .poll(() => window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts))
    .toBe(false);
  await expect
    .poll(() =>
      window.evaluate((id) => {
        const part = window.useProjectStore.getState().parts.find((candidate: { id: string }) => candidate.id === id);
        return part.features[0].parameters.horizontalFlip;
      }, partId)
    )
    .toBe(flip);
}

async function editFirstMitreAngle(window: Page, partId: string, angle: number): Promise<void> {
  await openSelectedPartCuts(window, partId);
  await window.getByRole('button', { name: /^1\./ }).click();
  const preview = window.getByRole('img', { name: 'Part cuts geometry preview' });
  const before = await preview.getAttribute('data-geometry-signature');
  await window.getByLabel('Mitre Angle', { exact: true }).fill(String(angle));
  await expect.poll(() => preview.getAttribute('data-geometry-signature')).not.toBe(before);
  await savePartCutsFromHeader(window);
  await expect
    .poll(() => window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts))
    .toBe(false);
  await window.waitForFunction(() => typeof window.__carvdE2E?.getDowelVisualizations === 'function');
}

async function createDefaultDowelJoint(window: Page, firstPartId: string): Promise<void> {
  await openSelectedPartCuts(window, firstPartId);
  await window.locator('button[title="Add Cut"]').click();
  await window.getByRole('button', { name: /^Create Dowel Joint\b/ }).click();
  await window.getByRole('button', { name: 'Next' }).click();
  await window.getByRole('button', { name: 'Next' }).click();
  await expect(window.getByLabel('Dowel Diameter', { exact: true })).toHaveValue('3/8');
  await expect(window.getByLabel('Dowel Count', { exact: true })).toHaveValue('2');
  await window.getByRole('button', { name: 'Next' }).click();
  await expect(window.getByText('All holes fit within both boards.')).toBeVisible();
  await window.getByRole('button', { name: 'Create Dowel Joint' }).click();
  await exitPartCutsFromHeader(window);
  await window.waitForFunction(() => typeof window.__carvdE2E?.getDowelVisualizations === 'function');
}

async function editFirstHoleDiameter(window: Page, partId: string, diameter: number): Promise<void> {
  await openSelectedPartCuts(window, partId);
  await window.getByRole('button', { name: /^1\./ }).click();
  const input = window.getByLabel('Hole Diameter', { exact: true });
  await input.fill(String(diameter));
  await input.press('Enter');
  await savePartCutsFromHeader(window);
  await expect
    .poll(() => window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts))
    .toBe(false);
  await window.waitForFunction(() => typeof window.__carvdE2E?.getDowelVisualizations === 'function');
}

async function dragSelectedToWorld(
  window: Page,
  target: { x: number; y: number; z: number },
  bodyOffset = 0.65,
  materialPoint?: { x: number; y: number; z: number },
  deselectBeforeDrag = true
) {
  const points = await window.evaluate((worldTarget) => {
    const selectedId = window.useSelectionStore.getState().selectedPartIds[0];
    const selected = window.useProjectStore.getState().parts.find((part: { id: string }) => part.id === selectedId);
    const rendered = window.__carvdE2E?.getPartRenderedWorldPosition(selectedId) ?? null;
    const current = rendered
      ? (window.__carvdE2E?.getWorldScreenPoint(rendered) ?? null)
      : (window.__carvdE2E?.getPartScreenPoint() ?? null);
    const destination = window.__carvdE2E?.getWorldScreenPoint(worldTarget) ?? null;
    return {
      current,
      destination,
      rendered,
      selectedId,
      storedPosition: selected?.position ?? null,
      storedRotation: selected?.rotation ?? null
    };
  }, target);
  if (!points.current || !points.destination) throw new Error('Unable to project the selected part drag target.');
  if (materialPoint) {
    const starts = await window.evaluate(
      ({ partId, point }) => {
        const requested = window.__carvdE2E?.getPartLocalScreenPoint(partId, point) ?? null;
        const material = window.__carvdE2E?.getPartMaterialScreenPoints(partId) ?? [];
        return requested ? [requested, ...material] : material;
      },
      { partId: points.selectedId, point: materialPoint }
    );
    if (starts.length === 0) throw new Error('Unable to project the selected part material point.');
    if (deselectBeforeDrag) {
      // Deselect through the real project shortcut so the six rotation rings
      // do not sit in front of the material hit point. Pointer-down reselects
      // the board and starts the ordinary part move in one gesture.
      await window.keyboard.press('Escape');
      await expect.poll(() => window.evaluate(() => window.useSelectionStore.getState().selectedPartIds)).toEqual([]);
      // Selection moves the board from the individual renderer back into the
      // instanced mesh. Let React and R3F publish that frame before hit-testing.
      await window.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      );
    }
    await window.keyboard.down('Alt');
    try {
      let start: { x: number; y: number } | null = null;
      for (const candidate of starts) {
        await window.mouse.move(candidate.x, candidate.y);
        await window.waitForTimeout(75);
        const hoveredPartId = await window.evaluate(() => window.useSelectionStore.getState().hoveredPartId);
        if (hoveredPartId === points.selectedId) {
          start = candidate;
          break;
        }
      }
      if (!start) throw new Error(`No rendered material point hit selected part ${points.selectedId}.`);
      await window.mouse.down();
      await window.waitForTimeout(250);
      const pointerSessionKind = await window.evaluate(
        () => window.useInteractionStore.getState().activeSession?.kind ?? null
      );
      if (pointerSessionKind !== 'move') {
        await window.mouse.up();
        throw new Error(`Material drag started ${String(pointerSessionKind)} instead of a move session.`);
      }
      let altPreviewDelta: { x: number; y: number; z: number } | null = null;
      for (let index = 1; index <= 40; index += 1) {
        if (index === 39) await window.keyboard.up('Alt');
        await window.mouse.move(
          start.x + ((points.destination.x - points.current.x) * index) / 40,
          start.y + ((points.destination.y - points.current.y) * index) / 40
        );
        await window.waitForTimeout(20);
        if (index === 38) {
          altPreviewDelta = await window.evaluate(() => {
            const session = window.useInteractionStore.getState().activeSession;
            return session?.kind === 'move' ? { ...session.delta } : null;
          });
        }
      }
      const previewState = await window.evaluate(() => {
        const session = window.useInteractionStore.getState().activeSession;
        return {
          delta: session?.kind === 'move' ? { ...session.delta } : null,
          snapLines: window.useSnapStore.getState().activeSnapLines
        };
      });
      await window.mouse.up();
      await window.waitForTimeout(500);
      return {
        previewDelta: previewState.delta,
        debugLogs: [
          { event: 'drag-projection', payload: { ...points, start } },
          { event: 'alt-preview-delta', payload: altPreviewDelta },
          { event: 'preview-snap-lines', payload: previewState.snapLines }
        ]
      };
    } finally {
      await window.keyboard.up('Alt');
    }
  }
  return dragSelectedOnFace(
    window,
    {
      x: points.destination.x - points.current.x,
      y: points.destination.y - points.current.y
    },
    bodyOffset
  );
}

async function dragSelectedGroupOnFace(
  window: Page,
  partId: string,
  delta: { x: number; y: number },
  options: { suppressPerMeshPointerDown?: boolean; createGroupAfterPointerDown?: boolean } = {}
) {
  const start = await window.evaluate((id) => window.__carvdE2E?.getPartScreenPoint(id) ?? null, partId);
  if (!start) throw new Error(`No canvas point is available for grouped part ${partId}`);

  await window.mouse.move(start.x, start.y);
  await window.waitForTimeout(150);
  if (options.suppressPerMeshPointerDown) {
    await window.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');
      const suppressPerMeshPointerDown = (event: Event) => {
        canvas.removeEventListener('pointerdown', suppressPerMeshPointerDown, true);
        event.stopImmediatePropagation();
      };
      canvas.addEventListener('pointerdown', suppressPerMeshPointerDown, true);
    });
  }
  await window.mouse.down();
  try {
    await window.waitForTimeout(250);
    const pointerDown = await window.evaluate(() => {
      const session = window.useInteractionStore.getState().activeSession;
      const selection = window.useSelectionStore.getState();
      return {
        moveOwner: session?.kind === 'move' ? (session.moveOwner ?? null) : null,
        selectedPartIds: selection.selectedPartIds,
        selectedGroupIds: selection.selectedGroupIds
      };
    });
    if (options.createGroupAfterPointerDown) {
      await window.evaluate((id) => {
        window.useProjectStore.getState().createGroup('Fallback Takeover Group', [{ id, type: 'part' }]);
      }, partId);
    }
    for (let i = 1; i <= 12; i += 1) {
      await window.mouse.move(start.x + (delta.x * i) / 12, start.y + (delta.y * i) / 12);
      await window.waitForTimeout(20);
    }
    await expect
      .poll(() =>
        window.evaluate(() => {
          const session = window.useInteractionStore.getState().activeSession;
          return session?.kind === 'move' ? session.delta : null;
        })
      )
      .not.toBeNull();
    await window.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    return await window.evaluate(
      ({ pointerDownState, id }) => {
        const session = window.useInteractionStore.getState().activeSession;
        const selection = window.useSelectionStore.getState();
        return session?.kind === 'move'
          ? {
              delta: session.delta,
              inFlightRenderedPosition: window.__carvdE2E?.getPartRenderedWorldPosition(id) ?? null,
              moveOwner: session.moveOwner ?? null,
              snapLines: window.useSnapStore.getState().activeSnapLines,
              selectedPartIds: selection.selectedPartIds,
              selectedGroupIds: selection.selectedGroupIds,
              pointerDown: pointerDownState
            }
          : null;
      },
      { pointerDownState: pointerDown, id: partId }
    );
  } finally {
    await window.mouse.up();
    await window.waitForTimeout(500);
  }
}

test.describe.serial('custom cuts assembly qualification', () => {
  let running: RunningElectronApp;

  test.beforeAll(async () => {
    running = await launchElectronApp();
  });

  test.afterAll(async () => {
    await closeElectronApp(running);
  });

  test('seats nominal and clearance dado fits, rejects an oversized fit, and leaves the host independent', async () => {
    let configuredSnapping = false;
    for (const [label, dividerThickness, expectedY] of [
      ['oversized', 0.8, 2.75],
      ['clearance', 0.74, 2.375],
      ['nominal', 0.75, 2.375]
    ] as const) {
      await test.step(label, async () => {
        await seedFixture(
          running.window,
          [
            {
              id: 'dado-host',
              name: 'Dado Host',
              length: 12,
              width: 6,
              thickness: 0.75,
              position: { x: 4, y: 0.375, z: 4 },
              features: [
                rectCut('dado-slot', 'dado', { type: 'face', face: 'top_face' }, { length: 0.755, width: 6 }, 0.375, {
                  x: 5.6225,
                  z: 0
                })
              ]
            },
            {
              id: 'dado-divider',
              name: 'Dado Divider',
              length: 4,
              width: 6,
              thickness: dividerThickness,
              position: { x: 4.1, y: 2.8, z: 4.1 }
            }
          ],
          'dado-divider'
        );
        if (!configuredSnapping) {
          await enablePrecisionSnapping(running.window);
          configuredSnapping = true;
        }
        await rotateSelected(running.window, 'Z');
        await setCamera(running.window, 'front');
        if (label === 'nominal') await resetDragTrace(running.window);
        const beforeDrag = await selectedTransform(running.window);
        const drag = await dragSelectedOnFace(running.window, { x: 7, y: 0 });

        const transform = await selectedTransform(running.window);
        expect(transform.rotation.z).toBe(90);
        if (label === 'oversized') {
          expect(transform.position.y).toBeGreaterThanOrEqual(2.74);
          expect(transform.position.y).not.toBeCloseTo(2.375, 2);
        } else {
          expect(transform.position.y).toBeCloseTo(expectedY, 3);
          expect(transform.position.x).toBeCloseTo(4, 3);
          expect(transform.position.z).toBeCloseTo(4, 3);
          await expect(running.window.getByText('Movement limited to avoid overlap')).toHaveCount(0);
          if (label === 'nominal') {
            expect(drag.previewDelta).not.toBeNull();
            for (const axis of ['x', 'y', 'z'] as const) {
              expect(transform.position[axis]).toBeCloseTo(beforeDrag.position[axis] + drag.previewDelta![axis], 3);
            }

            const previewCollision = lastDragEvent<{
              mateHostPartId?: string;
              proposedPosition: { x: number; y: number; z: number };
            }>(drag.debugLogs, 'partDrag:move:collisionInput');
            const releaseCollision = lastDragEvent<{
              mateHostPartId?: string;
              proposedPosition: { x: number; y: number; z: number };
            }>(drag.debugLogs, 'partDrag:release:collisionInput');
            const commit = lastDragEvent<{
              mateHostPartId?: string;
              position: { x: number; y: number; z: number };
            }>(drag.debugLogs, 'partDrag:release:commitInput');

            expect(previewCollision?.mateHostPartId).toBe('dado-host');
            expect(releaseCollision?.mateHostPartId).toBe('dado-host');
            expect(commit?.mateHostPartId).toBe('dado-host');
            for (const axis of ['x', 'y', 'z'] as const) {
              expect(releaseCollision!.proposedPosition[axis]).toBeCloseTo(previewCollision!.proposedPosition[axis], 3);
              expect(commit!.position[axis]).toBeCloseTo(previewCollision!.proposedPosition[axis], 3);
            }
          }
        }
      });
    }

    const before = await running.window.evaluate(() => {
      const parts = window.useProjectStore.getState().parts;
      const host = parts.find((part: { id: string }) => part.id === 'dado-host');
      const divider = parts.find((part: { id: string }) => part.id === 'dado-divider');
      return {
        hostFeatures: JSON.stringify(host.features),
        hostPosition: { ...host.position },
        dividerTransform: JSON.stringify({ position: divider.position, rotation: divider.rotation })
      };
    });
    await running.window.evaluate(() => {
      window.useSelectionStore.getState().selectPart('dado-host');
    });
    await setCamera(running.window, 'front');
    const hostLeftEdge = await getResizeHandleCanvasPoint(running.window, { x: -1, y: 0, z: 0 });
    await dragCanvas(running.window, { x: hostLeftEdge.x + 40, y: hostLeftEdge.y }, { x: 260, y: 0 });
    const after = await running.window.evaluate(() => {
      const parts = window.useProjectStore.getState().parts;
      const host = parts.find((part: { id: string }) => part.id === 'dado-host');
      const divider = parts.find((part: { id: string }) => part.id === 'dado-divider');
      return {
        hostFeatures: JSON.stringify(host.features),
        hostPosition: { ...host.position },
        dividerTransform: JSON.stringify({ position: divider.position, rotation: divider.rotation })
      };
    });
    expect(Math.abs(after.hostPosition.x - before.hostPosition.x)).toBeGreaterThan(10);
    expect(after.hostFeatures).toBe(before.hostFeatures);
    expect(after.dividerTransform).toBe(before.dividerTransform);
  });

  test('keeps a selected singleton group on the ordinary face-snap and collision path', async () => {
    await seedFixture(
      running.window,
      [
        {
          id: 'group-dado-host',
          name: 'Group Dado Host',
          length: 12,
          width: 6,
          thickness: 0.75,
          position: { x: 4, y: 0.375, z: 4 },
          features: [
            rectCut('group-dado-slot', 'dado', { type: 'face', face: 'top_face' }, { length: 0.755, width: 6 }, 0.375, {
              x: 5.6225,
              z: 0
            })
          ]
        },
        {
          id: 'grouped-dado-divider',
          name: 'Grouped Dado Divider',
          length: 0.75,
          width: 6,
          thickness: 4,
          position: { x: 4.1, y: 2.8, z: 4 }
        }
      ],
      'grouped-dado-divider',
      'grouped-dado-divider'
    );
    await enablePrecisionSnapping(running.window);
    await setCamera(running.window, 'front');
    await resetDragTrace(running.window);

    const previewDelta = await dragSelectedGroupOnFace(
      running.window,
      'grouped-dado-divider',
      { x: 7, y: 0 },
      { suppressPerMeshPointerDown: true }
    );
    const state = await running.window.evaluate(() => {
      const selection = window.useSelectionStore.getState();
      const part = window.useProjectStore
        .getState()
        .parts.find((candidate: { id: string }) => candidate.id === 'grouped-dado-divider');
      return {
        position: part.position,
        selectedPartIds: selection.selectedPartIds,
        selectedGroupIds: selection.selectedGroupIds
      };
    });
    const fallbackTrace = await running.window.evaluate(
      () =>
        window
          .dumpDragDebugLogs?.()
          .filter((entry) => entry.event === 'canvasDrag:fallback:group')
          .at(-1)?.payload ?? null
    );

    expect(previewDelta).not.toBeNull();
    expect(previewDelta!.moveOwner).toBe('group');
    expect(previewDelta!.pointerDown.moveOwner).toBeNull();
    expect(previewDelta!.selectedPartIds).toEqual([]);
    expect(previewDelta!.selectedGroupIds).toHaveLength(1);
    expect(previewDelta!.snapLines).not.toHaveLength(0);
    expect(previewDelta!.snapLines.every((line: { family?: string }) => line.family !== undefined)).toBe(true);
    expect(previewDelta!.snapLines.map((line: { family?: string }) => line.family)).toContain('face');
    expect(2.8 + previewDelta!.delta.y).toBeCloseTo(2.75, 3);
    for (const axis of ['x', 'y', 'z'] as const) {
      const startPosition = { x: 4.1, y: 2.8, z: 4 };
      expect(state.position[axis]).toBeCloseTo(startPosition[axis] + previewDelta!.delta[axis], 3);
    }
    expect(state.position.y).not.toBeCloseTo(2.375, 2);
    expect(state.selectedPartIds).toEqual([]);
    expect(state.selectedGroupIds).toHaveLength(1);
    expect(fallbackTrace).toMatchObject({ displacedMoveOwner: null, partId: 'grouped-dado-divider' });
    await expect(running.window.getByText('Movement limited to avoid overlap')).toHaveCount(0);
  });

  test('exclusively takes a live direct-part gesture over for the selected-group fallback', async () => {
    await seedFixture(
      running.window,
      [
        {
          id: 'takeover-host',
          name: 'Takeover Host',
          length: 12,
          width: 6,
          thickness: 0.75,
          position: { x: 4, y: 0.375, z: 4 },
          features: [
            rectCut('takeover-slot', 'dado', { type: 'face', face: 'top_face' }, { length: 0.755, width: 6 }, 0.375, {
              x: 5.6225,
              z: 0
            })
          ]
        },
        {
          id: 'takeover-divider',
          name: 'Takeover Divider',
          length: 0.75,
          width: 6,
          thickness: 4,
          position: { x: 4.1, y: 2.8, z: 4 }
        }
      ],
      'takeover-divider'
    );
    await enablePrecisionSnapping(running.window);
    await setCamera(running.window, 'front');
    await resetDragTrace(running.window);

    const preview = await dragSelectedGroupOnFace(
      running.window,
      'takeover-divider',
      { x: 7, y: 0 },
      { createGroupAfterPointerDown: true }
    );
    const result = await running.window.evaluate(() => {
      const selection = window.useSelectionStore.getState();
      const part = window.useProjectStore
        .getState()
        .parts.find((candidate: { id: string }) => candidate.id === 'takeover-divider');
      return {
        position: part.position,
        selectedPartIds: selection.selectedPartIds,
        selectedGroupIds: selection.selectedGroupIds,
        logs: window.dumpDragDebugLogs?.().map(({ event, payload }) => ({ event, payload })) ?? []
      };
    });

    expect(preview).not.toBeNull();
    expect(preview!.pointerDown.moveOwner).toBe('part');
    expect(preview!.moveOwner).toBe('group');
    expect(preview!.selectedPartIds).toEqual([]);
    expect(preview!.selectedGroupIds).toHaveLength(1);
    expect(preview!.snapLines.every((line: { family?: string }) => line.family !== undefined)).toBe(true);
    expect(preview!.snapLines.map((line: { family?: string }) => line.family)).toContain('face');
    expect(preview!.inFlightRenderedPosition).not.toBeNull();
    for (const axis of ['x', 'y', 'z'] as const) {
      const startPosition = { x: 4.1, y: 2.8, z: 4 };
      const groupPreviewPosition = startPosition[axis] + preview!.delta[axis];
      expect(preview!.inFlightRenderedPosition![axis]).toBeCloseTo(groupPreviewPosition, 3);
      expect(result.position[axis]).toBeCloseTo(preview!.inFlightRenderedPosition![axis], 3);
    }
    expect(result.position.y).toBeCloseTo(2.75, 3);
    expect(result.position.y).not.toBeCloseTo(2.375, 2);
    expect(result.selectedPartIds).toEqual([]);
    expect(result.selectedGroupIds).toHaveLength(1);

    const fallbackIndex = result.logs.findIndex((entry) => entry.event === 'canvasDrag:fallback:group');
    expect(fallbackIndex).toBeGreaterThanOrEqual(0);
    expect(result.logs[fallbackIndex]?.payload).toMatchObject({
      displacedMoveOwner: 'part',
      partId: 'takeover-divider'
    });
    expect(
      result.logs
        .slice(fallbackIndex + 1)
        .filter((entry) => entry.event.startsWith('partDrag:move') || entry.event.startsWith('partDrag:release'))
    ).toEqual([]);
    expect(result.logs.some((entry) => entry.event === 'groupDrag:release:commit')).toBe(true);
    await expect(running.window.getByText('Movement limited to avoid overlap')).toHaveCount(0);
  });

  test('claims an initially unselected singleton group before its first drag preview', async () => {
    await seedFixture(
      running.window,
      [
        {
          id: 'first-drag-group-host',
          name: 'First Drag Group Host',
          length: 12,
          width: 6,
          thickness: 0.75,
          position: { x: 4, y: 0.375, z: 4 },
          features: [
            rectCut(
              'first-drag-group-slot',
              'dado',
              { type: 'face', face: 'top_face' },
              { length: 0.755, width: 6 },
              0.375,
              { x: 5.6225, z: 0 }
            )
          ]
        },
        {
          id: 'first-drag-group-divider',
          name: 'First Drag Group Divider',
          length: 0.75,
          width: 6,
          thickness: 4,
          position: { x: 4.1, y: 2.8, z: 4 }
        }
      ],
      'first-drag-group-divider',
      'first-drag-group-divider',
      false
    );
    await enablePrecisionSnapping(running.window);
    await setCamera(running.window, 'front');
    await expect
      .poll(() => running.window.evaluate(() => window.useSelectionStore.getState().selectedGroupIds))
      .toEqual([]);

    const preview = await dragSelectedGroupOnFace(running.window, 'first-drag-group-divider', { x: 7, y: 0 });
    const state = await running.window.evaluate(() => {
      const selection = window.useSelectionStore.getState();
      const part = window.useProjectStore
        .getState()
        .parts.find((candidate: { id: string }) => candidate.id === 'first-drag-group-divider');
      return {
        position: part.position,
        selectedPartIds: selection.selectedPartIds,
        selectedGroupIds: selection.selectedGroupIds
      };
    });

    expect(preview).not.toBeNull();
    expect(preview!.moveOwner).toBe('group');
    expect(preview!.pointerDown.moveOwner).toBe('group');
    expect(preview!.pointerDown.selectedPartIds).toEqual([]);
    expect(preview!.pointerDown.selectedGroupIds).toHaveLength(1);
    expect(preview!.selectedPartIds).toEqual([]);
    expect(preview!.selectedGroupIds).toHaveLength(1);
    expect(preview!.snapLines).not.toHaveLength(0);
    expect(preview!.snapLines.every((line: { family?: string }) => line.family !== undefined)).toBe(true);
    expect(preview!.snapLines.map((line: { family?: string }) => line.family)).toContain('face');
    expect(2.8 + preview!.delta.y).toBeCloseTo(2.75, 3);
    for (const axis of ['x', 'y', 'z'] as const) {
      const startPosition = { x: 4.1, y: 2.8, z: 4 };
      expect(state.position[axis]).toBeCloseTo(startPosition[axis] + preview!.delta[axis], 3);
    }
    expect(state.position.y).toBeCloseTo(2.75, 3);
    expect(state.selectedPartIds).toEqual([]);
    expect(state.selectedGroupIds).toHaveLength(1);
    await expect(running.window.getByText('Movement limited to avoid overlap')).toHaveCount(0);
  });

  test('seats groove, stopped-groove, and rabbet fits while respecting a stopped termination', async () => {
    let configuredSnapping = false;
    const cases = [
      {
        id: 'groove',
        cutType: 'groove' as const,
        target: { type: 'face' as const, face: 'top_face' },
        size: { length: 12, width: 0.755 },
        placement: { x: 0, z: 2.6225 },
        candidateX: 4,
        candidateZ: 4.1
      },
      {
        id: 'stopped-groove',
        cutType: 'stopped_groove' as const,
        target: { type: 'face' as const, face: 'top_face' },
        size: { length: 4, width: 0.755 },
        placement: { x: 4, z: 2.6225 },
        candidateX: 3.9,
        candidateZ: 4.1
      },
      {
        id: 'rabbet',
        cutType: 'rabbet' as const,
        target: { type: 'edge' as const, edge: 'top_front_edge' },
        size: { length: 12, width: 0.755 },
        placement: { x: 0, z: 0 },
        candidateX: 4,
        candidateZ: 6.7225
      }
    ];

    for (const scenario of cases) {
      await test.step(scenario.id, async () => {
        await seedFixture(
          running.window,
          [
            {
              id: `${scenario.id}-host`,
              name: `${scenario.id} Host`,
              length: 12,
              width: 6,
              thickness: 0.75,
              position: { x: 4, y: 0.375, z: 4 },
              features: [
                rectCut(
                  `${scenario.id}-socket`,
                  scenario.cutType,
                  scenario.target,
                  scenario.size,
                  0.375,
                  scenario.placement
                )
              ]
            },
            {
              id: `${scenario.id}-mate`,
              name: `${scenario.id} Mate`,
              length: 4,
              width: 4,
              thickness: 0.75,
              position: { x: scenario.candidateX, y: 2.8, z: scenario.candidateZ }
            }
          ],
          `${scenario.id}-mate`
        );
        if (!configuredSnapping) {
          await enablePrecisionSnapping(running.window);
          configuredSnapping = true;
        }
        await rotateSelected(running.window, 'X', 3);
        await setCamera(running.window, 'front');
        await dragSelectedOnFace(running.window, { x: 8, y: 0 });
        const transform = await selectedTransform(running.window);
        expect(transform.position.y).toBeCloseTo(2.375, 3);
        if (scenario.id === 'stopped-groove') expect(transform.position.x).toBeCloseTo(4, 3);
      });
    }

    await seedFixture(
      running.window,
      [
        {
          id: 'termination-host',
          name: 'Stopped Groove Host',
          length: 12,
          width: 6,
          thickness: 0.75,
          position: { x: 4, y: 0.375, z: 4 },
          features: [
            rectCut(
              'termination-socket',
              'stopped_groove',
              { type: 'face', face: 'top_face' },
              { length: 4, width: 0.755 },
              0.375,
              { x: 4, z: 2.6225 }
            )
          ]
        },
        {
          id: 'past-termination',
          name: 'Past Termination',
          length: 4,
          width: 4,
          thickness: 0.75,
          position: { x: 5.1, y: 2.8, z: 4.1 }
        }
      ],
      'past-termination'
    );
    await rotateSelected(running.window, 'X', 3);
    await setCamera(running.window, 'front');
    await dragSelectedOnFace(running.window, { x: 8, y: 0 });
    const terminated = await selectedTransform(running.window);
    expect(terminated.position.x).toBeGreaterThan(5);
    expect(terminated.position.y).toBeGreaterThanOrEqual(2.74);
  });

  test('assembles complementary half laps and persists a user-edited depth mismatch', async () => {
    await seedFixture(
      running.window,
      [
        {
          id: 'half-lap-host',
          name: 'Half Lap Host',
          length: 6,
          width: 2,
          thickness: 0.75,
          position: { x: 4, y: 0.375, z: 4 },
          features: [
            rectCut('top-half-lap', 'dado', { type: 'face', face: 'top_face' }, { length: 2, width: 2 }, 0.375, {
              x: 2,
              z: 0
            })
          ]
        },
        {
          id: 'half-lap-mate',
          name: 'Half Lap Mate',
          length: 6,
          width: 2,
          thickness: 0.75,
          position: { x: 4.2, y: 1.5, z: 4.2 },
          features: [
            rectCut('bottom-half-lap', 'dado', { type: 'face', face: 'bottom_face' }, { length: 2, width: 2 }, 0.375, {
              x: 2,
              z: 0
            })
          ]
        }
      ],
      'half-lap-mate'
    );
    await enablePrecisionSnapping(running.window);
    await rotateSelected(running.window, 'Y');
    await setCamera(running.window, 'front');
    await dragSelectedOnFace(running.window, { x: 0, y: 7 }, 0.82, true);
    const assembled = await selectedTransform(running.window);
    expect(assembled.rotation.y).toBe(90);
    expect(assembled.position.x).toBeCloseTo(4, 3);
    expect(assembled.position.y).toBeCloseTo(0.375, 3);
    expect(assembled.position.z).toBeCloseTo(4, 3);

    await running.window.getByRole('button', { name: 'Edit Part Cuts' }).click();
    await running.window.getByRole('button', { name: /^1\./ }).click();
    const blindDepth = running.window.getByLabel('Blind Depth', { exact: true });
    await blindDepth.fill('0.25');
    await blindDepth.press('Enter');
    await savePartCutsFromHeader(running.window);
    await expect
      .poll(() =>
        running.window.evaluate(() => {
          const mate = window.useProjectStore
            .getState()
            .parts.find((part: { id: string }) => part.id === 'half-lap-mate');
          return mate.features[0].parameters.depth;
        })
      )
      .toBe(0.25);
    await running.window.getByRole('button', { name: 'Advanced' }).click();
    await expect(running.window.getByText('Overlaps with: Half Lap Host')).toBeVisible();
  });

  test('seats an authored tenon shoulder at the mortise surface', async () => {
    await seedFixture(
      running.window,
      [
        {
          id: 'mortise-host',
          name: 'Mortise Host',
          length: 12,
          width: 6,
          thickness: 1,
          position: { x: 4, y: 0.5, z: 4 },
          features: [
            rectCut(
              'mortise-socket',
              'mortise',
              { type: 'face', face: 'top_face' },
              { length: 0.51, width: 1.01 },
              0.75,
              { x: 5.745, z: 2.495 }
            )
          ]
        },
        {
          id: 'tenon-rail',
          name: 'Tenon Rail',
          length: 4,
          width: 2,
          thickness: 1,
          // Keep the rail clear while the real keyboard rotation is applied;
          // the subsequent face drag is what brings the tenon to the socket.
          position: { x: 4, y: 3.0625, z: 4 },
          features: [
            rectCut('rail-tenon', 'tenon', { type: 'face', face: 'left_end' }, { length: 0.75, width: 1 }, 0.5, {
              x: 0,
              z: 0.5
            })
          ]
        }
      ],
      'tenon-rail'
    );
    await enablePrecisionSnapping(running.window);
    await rotateSelected(running.window, 'Z');
    await setCamera(running.window, 'front');
    await dragSelectedOnFace(running.window, { x: 0, y: 7 });
    const seated = await selectedTransform(running.window);
    expect(seated.rotation.z).toBe(90);
    expect(seated.position.x).toBeCloseTo(4, 3);
    expect(seated.position.y).toBeCloseTo(2.25, 3);
    expect(seated.position.z).toBeCloseTo(4, 3);
    const shoulderY = seated.position.y - (4 / 2 - 0.75);
    expect(shoulderY).toBeCloseTo(1, 3);
    await expect(running.window.getByText('Movement limited to avoid overlap')).toHaveCount(0);
  });

  test('authors, rotates, and drags complementary mitres into exact corners for both flip directions', async () => {
    let configuredSnapping = false;
    for (const scenario of [
      {
        title: 'Back/Front long points at the positive-Z corner',
        firstFlip: true,
        secondFlip: false,
        start: { x: 8, y: 0.5, z: 8 },
        assembled: { x: 4, y: 0.5, z: 4 },
        turns: 1,
        expectedRotation: 90
      },
      {
        title: 'Front/Back long points at the negative-Z corner',
        firstFlip: false,
        secondFlip: true,
        start: { x: 8, y: 0.5, z: -8 },
        assembled: { x: 4, y: 0.5, z: -4 },
        turns: 3,
        expectedRotation: -90
      }
    ] as const) {
      await test.step(scenario.title, async () => {
        await seedFixture(
          running.window,
          [
            {
              id: 'mitre-horizontal',
              name: 'Mitre Horizontal',
              length: 10,
              width: 2,
              thickness: 1,
              position: { x: 0, y: 0.5, z: 0 }
            },
            {
              id: 'mitre-turn',
              name: 'Mitre Turn',
              length: 10,
              width: 2,
              thickness: 1,
              position: scenario.start
            }
          ],
          'mitre-turn'
        );
        if (!configuredSnapping) {
          await enablePrecisionSnapping(running.window);
          configuredSnapping = true;
        }
        await authorRightMitre(running.window, 'mitre-horizontal', scenario.firstFlip);
        await authorRightMitre(running.window, 'mitre-turn', scenario.secondFlip);
        await selectCanvasPart(running.window, 'mitre-turn');
        await rotateSelected(running.window, 'Y', scenario.turns);
        await expect
          .poll(() =>
            running.window.evaluate(() => {
              const part = window.useProjectStore
                .getState()
                .parts.find((candidate: { id: string }) => candidate.id === 'mitre-turn');
              return part.rotation.y;
            })
          )
          .toBe(scenario.expectedRotation);
        expect(
          await running.window.evaluate(
            ({ position }) => window.__carvdE2E?.partsOverlap('mitre-horizontal', 'mitre-turn', position),
            { position: scenario.assembled }
          )
        ).toBe(false);
        await setCamera(running.window, 'top');
        const drag = await dragSelectedToWorld(running.window, scenario.assembled, 0.25, { x: -2.5, y: 0, z: -0.5 });
        expect(drag.previewDelta, JSON.stringify(drag.debugLogs.slice(-8))).not.toBeNull();

        const result = await running.window.evaluate(() => {
          const parts = window.useProjectStore.getState().parts;
          const moving = parts.find((part: { id: string }) => part.id === 'mitre-turn');
          return {
            position: moving.position,
            rotation: moving.rotation,
            overlap: window.__carvdE2E?.partsOverlap('mitre-horizontal', 'mitre-turn')
          };
        });
        expect(result.position.x, JSON.stringify(drag.debugLogs)).toBeCloseTo(scenario.assembled.x, 3);
        expect(result.position.y).toBeCloseTo(scenario.assembled.y, 3);
        expect(result.position.z, JSON.stringify(drag.debugLogs)).toBeCloseTo(scenario.assembled.z, 3);
        expect(result.rotation.y).toBe(scenario.expectedRotation);
        expect(result.overlap).toBe(false);
        await expect(running.window.getByText('Movement limited to avoid overlap')).toHaveCount(0);

        if (!scenario.firstFlip) {
          await editFirstMitreAngle(running.window, 'mitre-horizontal', 30);
          await expect
            .poll(() =>
              running.window.evaluate(() => {
                const part = window.useProjectStore
                  .getState()
                  .parts.find((candidate: { id: string }) => candidate.id === 'mitre-horizontal');
                return part.features[0].parameters.horizontalAngle;
              })
            )
            .toBe(30);
        }
      });
    }
  });

  test('authors a paired 3/8 inch dowel joint, diagnoses movement, and rejects a 1/4 to 1/2 mismatch', async () => {
    await seedFixture(
      running.window,
      [
        {
          id: 'dowel-lower',
          name: 'Dowel Lower',
          length: 10,
          width: 4,
          thickness: 1,
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: 'dowel-upper',
          name: 'Dowel Upper',
          length: 10,
          width: 4,
          thickness: 1,
          position: { x: 0, y: 1, z: 0 }
        }
      ],
      'dowel-lower'
    );
    await createDefaultDowelJoint(running.window, 'dowel-lower');

    const authored = await running.window.evaluate(() => {
      const parts = window.useProjectStore.getState().parts;
      return {
        members: parts.map((part: { features?: unknown[] }) => part.features ?? []),
        visuals: window.__carvdE2E?.getDowelVisualizations() ?? []
      };
    });
    expect(authored.members.map((features: unknown[]) => features.length)).toEqual([2, 2]);
    expect(authored.visuals, JSON.stringify(authored.members)).toHaveLength(2);
    expect(authored.visuals).toEqual([
      expect.objectContaining({
        memberIndex: 0,
        center: { x: -4, y: 0.5, z: 0 },
        axis: { x: 0, y: -1, z: 0 },
        diameter: 0.375,
        length: 0.75,
        aligned: true
      }),
      expect.objectContaining({
        memberIndex: 1,
        center: { x: -2, y: 0.5, z: 0 },
        axis: { x: 0, y: -1, z: 0 },
        diameter: 0.375,
        length: 0.75,
        aligned: true
      })
    ]);
    const pairedGeometry = authored.members.flatMap((features: any[]) =>
      features.map((feature) => ({
        diameter: feature.parameters.diameter,
        depth: feature.parameters.depth,
        metadataDiameter: feature.metadata.dowelJoint.dowelDiameter,
        embedment: feature.metadata.dowelJoint.embedmentDepth,
        length: feature.metadata.dowelJoint.dowelLength
      }))
    );
    expect(pairedGeometry).toEqual(
      Array.from({ length: 4 }, () => ({
        diameter: 0.375,
        depth: 0.375,
        metadataDiameter: 0.375,
        embedment: 0.375,
        length: 0.75
      }))
    );

    await selectFixturePart(running.window, 'dowel-upper');
    await setCamera(running.window, 'top');
    const upperFeaturesBeforeMove = await running.window.evaluate(() => {
      const upper = window.useProjectStore.getState().parts.find((part: { id: string }) => part.id === 'dowel-upper');
      return JSON.stringify(upper.features);
    });
    await dragSelectedToWorld(running.window, { x: 1.5, y: 1, z: 0 }, 0.65, { x: -2.5, y: 0, z: -0.5 });
    await expect
      .poll(() =>
        running.window.evaluate(() => window.__carvdE2E?.getDowelVisualizations().map((visual) => visual.aligned))
      )
      .toEqual([false, false]);
    expect(
      await running.window.evaluate(() => {
        const upper = window.useProjectStore.getState().parts.find((part: { id: string }) => part.id === 'dowel-upper');
        return JSON.stringify(upper.features);
      })
    ).toBe(upperFeaturesBeforeMove);

    await dragSelectedToWorld(running.window, { x: 0, y: 1, z: 0 }, 0.65, { x: -2.5, y: 0, z: -0.5 });
    await expect
      .poll(() =>
        running.window.evaluate(() => window.__carvdE2E?.getDowelVisualizations().map((visual) => visual.aligned))
      )
      .toEqual([true, true]);
    expect(
      await running.window.evaluate(() => {
        const upper = window.useProjectStore.getState().parts.find((part: { id: string }) => part.id === 'dowel-upper');
        return JSON.stringify(upper.features);
      })
    ).toBe(upperFeaturesBeforeMove);

    await editFirstHoleDiameter(running.window, 'dowel-lower', 0.25);
    await editFirstHoleDiameter(running.window, 'dowel-upper', 0.5);
    const mismatch = await running.window.evaluate(() => {
      const parts = window.useProjectStore.getState().parts;
      return {
        diameters: parts.map(
          (part: { features: Array<{ parameters: { diameter: number } }> }) => part.features[0].parameters.diameter
        ),
        metadata: parts.map((part: { features: Array<{ metadata?: unknown }> }) => part.features[0].metadata),
        visuals: window.__carvdE2E?.getDowelVisualizations() ?? []
      };
    });
    expect(mismatch.diameters).toEqual([0.25, 0.5]);
    expect(mismatch.metadata.every(Boolean)).toBe(true);
    expect(
      mismatch.visuals.find((visual) => visual.memberIndex === 0)?.aligned,
      JSON.stringify(mismatch.metadata)
    ).toBe(false);
  });

  test('blocks dowel creation until a dirty add, edit, delete, disable, and reorder draft is resolved', async () => {
    await seedFixture(
      running.window,
      [
        {
          id: 'dirty-draft-lower',
          name: 'Dirty Draft Lower',
          length: 10,
          width: 4,
          thickness: 1,
          position: { x: 0, y: 0, z: 0 },
          features: [
            roundHole('dirty-hole-1', 'Dirty Hole One', -3),
            roundHole('dirty-hole-2', 'Dirty Hole Two', -1),
            roundHole('dirty-hole-3', 'Dirty Hole Three', 1)
          ]
        },
        {
          id: 'dirty-draft-upper',
          name: 'Dirty Draft Upper',
          length: 10,
          width: 4,
          thickness: 1,
          position: { x: 0, y: 1, z: 0 }
        }
      ],
      'dirty-draft-lower'
    );
    const before = await running.window.evaluate(() => ({
      persisted: JSON.stringify(
        window.useProjectStore.getState().parts.find((part: { id: string }) => part.id === 'dirty-draft-lower').features
      ),
      projectHistory: window.useProjectStore.temporal.getState().pastStates.length
    }));

    await openSelectedPartCuts(running.window, 'dirty-draft-lower');

    await running.window.locator('button[title="Add Cut"]').click();
    await running.window.getByRole('button', { name: /^Round Hole\b/ }).click();
    await running.window.getByLabel('Label (optional)', { exact: true }).fill('Dirty Added Hole');
    const addedOffset = running.window.getByLabel('Offset Along Face', { exact: true });
    await addedOffset.fill('3');
    await addedOffset.press('Enter');

    await running.window.getByRole('button', { name: /^1\. Dirty Hole One/ }).click();
    await running.window.getByLabel('Label (optional)', { exact: true }).fill('Dirty Hole One Edited');
    await running.window.getByRole('checkbox', { name: 'Enable cut 2' }).uncheck();
    await running.window.getByRole('button', { name: 'Actions for cut 3' }).click();
    await running.window.getByRole('menuitem', { name: 'Move Up' }).click();
    await running.window.getByRole('button', { name: 'Actions for cut 4' }).click();
    await running.window.getByRole('menuitem', { name: 'Delete' }).click();

    await expect
      .poll(() =>
        running.window.evaluate(() =>
          window.usePartCutsEditingStore.getState().draftFeatures.map((feature) => ({
            id: feature.id,
            label: feature.label,
            enabled: feature.enabled
          }))
        )
      )
      .toEqual([
        { id: 'dirty-hole-1', label: 'Dirty Hole One Edited', enabled: true },
        { id: 'dirty-hole-3', label: 'Dirty Hole Three', enabled: true },
        { id: 'dirty-hole-2', label: 'Dirty Hole Two', enabled: false }
      ]);

    await running.window.locator('button[title="Add Cut"]').click();
    const createJoint = running.window.getByRole('button', { name: /^Create Dowel Joint/ });
    await expect(createJoint).toBeDisabled();
    await expect(running.window.getByText('Save or discard part changes first')).toBeVisible();
    await createJoint.click({ force: true });
    await expect(running.window.getByRole('dialog', { name: 'Create Dowel Joint' })).toHaveCount(0);

    // Choosing a cut type is a dialog now, so it is dismissed the way dialogs
    // are rather than by a panel button.
    await running.window.keyboard.press('Escape');
    await expect(running.window.getByRole('dialog', { name: 'What kind of cut?' })).toHaveCount(0);
    await running.window.keyboard.press(`${MODIFIER}+Z`);
    await expect
      .poll(() => running.window.evaluate(() => window.usePartCutsEditingStore.getState().draftFeatures.length))
      .toBe(4);
    const afterDraftUndo = await running.window.evaluate(() => ({
      persisted: JSON.stringify(
        window.useProjectStore.getState().parts.find((part: { id: string }) => part.id === 'dirty-draft-lower').features
      ),
      projectHistory: window.useProjectStore.temporal.getState().pastStates.length,
      draft: window.usePartCutsEditingStore.getState().draftFeatures.map((feature) => ({
        id: feature.id,
        label: feature.label,
        enabled: feature.enabled
      }))
    }));
    expect(afterDraftUndo.persisted).toBe(before.persisted);
    expect(afterDraftUndo.projectHistory).toBe(before.projectHistory);
    expect(afterDraftUndo.draft.slice(0, 3)).toEqual([
      { id: 'dirty-hole-1', label: 'Dirty Hole One Edited', enabled: true },
      { id: 'dirty-hole-3', label: 'Dirty Hole Three', enabled: true },
      { id: 'dirty-hole-2', label: 'Dirty Hole Two', enabled: false }
    ]);
    expect(afterDraftUndo.draft[3]).toMatchObject({ label: 'Dirty Added Hole', enabled: true });

    await exitPartCutsFromHeader(running.window);
    const exitDialog = running.window.getByRole('alertdialog', { name: 'Save Part Cuts?' });
    await exitDialog.getByRole('button', { name: 'Discard' }).click();
    await expect
      .poll(() => running.window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts))
      .toBe(false);
    expect(
      await running.window.evaluate(() =>
        JSON.stringify(
          window.useProjectStore.getState().parts.find((part: { id: string }) => part.id === 'dirty-draft-lower')
            .features
        )
      )
    ).toBe(before.persisted);
  });

  test('duplicates dowel members through the sidebar Duplicate action and Shift+D shortcut', async () => {
    await seedFixture(
      running.window,
      [
        {
          id: 'duplicate-dowel-lower',
          name: 'Duplicate Dowel Lower',
          length: 10,
          width: 4,
          thickness: 1,
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: 'duplicate-dowel-upper',
          name: 'Duplicate Dowel Upper',
          length: 10,
          width: 4,
          thickness: 1,
          position: { x: 0, y: 1, z: 0 }
        }
      ],
      'duplicate-dowel-lower'
    );
    await createDefaultDowelJoint(running.window, 'duplicate-dowel-lower');
    const original = await running.window.evaluate(() => {
      const originals = window.useProjectStore
        .getState()
        .parts.filter((part: { id: string }) => ['duplicate-dowel-lower', 'duplicate-dowel-upper'].includes(part.id));
      return {
        featureIds: originals.flatMap((part: any) => part.features.map((feature: any) => feature.id)),
        jointId: originals[0].features[0].metadata.dowelJoint.jointId
      };
    });

    const lowerName = running.window.locator('.part-name').filter({ hasText: /^Duplicate Dowel Lower$/ });
    await lowerName.hover();
    await running.window.getByRole('button', { name: 'Duplicate Duplicate Dowel Lower' }).click();
    const loneCopy = await running.window.evaluate(() => {
      const selectedId = window.useSelectionStore.getState().selectedPartIds[0];
      const part = window.useProjectStore
        .getState()
        .parts.find((candidate: { id: string }) => candidate.id === selectedId);
      return { id: selectedId, features: part.features };
    });
    expect(loneCopy.features).toHaveLength(2);
    expect(loneCopy.features.every((feature: any) => feature.metadata?.dowelJoint === undefined)).toBe(true);
    expect(loneCopy.features.every((feature: any) => !original.featureIds.includes(feature.id))).toBe(true);

    await lowerName.click();
    await running.window.keyboard.down(MODIFIER);
    try {
      await running.window
        .locator('.part-name')
        .filter({ hasText: /^Duplicate Dowel Upper$/ })
        .click();
    } finally {
      await running.window.keyboard.up(MODIFIER);
    }
    await expect
      .poll(() => running.window.evaluate(() => [...window.useSelectionStore.getState().selectedPartIds].sort()))
      .toEqual(['duplicate-dowel-lower', 'duplicate-dowel-upper']);
    const idsBeforeShortcut = await running.window.evaluate(() =>
      window.useProjectStore.getState().parts.map((part: { id: string }) => part.id)
    );
    await running.window.keyboard.press('Shift+D');
    const pairedCopy = await running.window.evaluate((beforeIds) => {
      const copies = window.useProjectStore
        .getState()
        .parts.filter((part: { id: string }) => !beforeIds.includes(part.id));
      return copies.map((part: any) => ({
        id: part.id,
        featureIds: part.features.map((feature: any) => feature.id),
        joints: part.features.map((feature: any) => feature.metadata?.dowelJoint)
      }));
    }, idsBeforeShortcut);
    expect(pairedCopy).toHaveLength(2);
    expect(pairedCopy.flatMap((part) => part.featureIds).every((id) => !original.featureIds.includes(id))).toBe(true);
    expect(pairedCopy[0].joints.every(Boolean)).toBe(true);
    expect(pairedCopy[1].joints.every(Boolean)).toBe(true);
    expect(pairedCopy[0].joints.map((joint) => joint.jointId)).toEqual(
      pairedCopy[1].joints.map((joint) => joint.jointId)
    );
    expect(pairedCopy[0].joints[0].jointId).not.toBe(original.jointId);
    expect(pairedCopy[0].joints.every((joint) => joint.matePartId === pairedCopy[1].id)).toBe(true);
    expect(pairedCopy[1].joints.every((joint) => joint.matePartId === pairedCopy[0].id)).toBe(true);
    await expect.poll(() => running.window.evaluate(() => window.__carvdE2E?.getDowelVisualizations().length)).toBe(4);
  });

  test('copies and deletes paired dowel members through project UI without corrupting relationships', async () => {
    await seedFixture(
      running.window,
      [
        {
          id: 'copy-dowel-lower',
          name: 'Copy Dowel Lower',
          length: 10,
          width: 4,
          thickness: 1,
          position: { x: 0, y: 0, z: 0 }
        },
        {
          id: 'copy-dowel-upper',
          name: 'Copy Dowel Upper',
          length: 10,
          width: 4,
          thickness: 1,
          position: { x: 0, y: 1, z: 0 }
        }
      ],
      'copy-dowel-lower'
    );
    await createDefaultDowelJoint(running.window, 'copy-dowel-lower');
    const original = await running.window.evaluate(() => {
      const parts = window.useProjectStore.getState().parts;
      return {
        featureIds: parts.flatMap((part: { features: Array<{ id: string }> }) =>
          part.features.map((feature) => feature.id)
        ),
        jointId: parts[0].features[0].metadata.dowelJoint.jointId
      };
    });

    await selectFixturePart(running.window, 'copy-dowel-lower');
    await running.window.keyboard.press(`${MODIFIER}+C`);
    await running.window.keyboard.press(`${MODIFIER}+V`);
    const loneCopyId = await running.window.evaluate(() => window.useSelectionStore.getState().selectedPartIds[0]);
    const loneCopy = await running.window.evaluate((id) => {
      const part = window.useProjectStore.getState().parts.find((candidate: { id: string }) => candidate.id === id);
      return part.features;
    }, loneCopyId);
    expect(loneCopy).toHaveLength(2);
    expect(loneCopy.every((feature: any) => feature.metadata?.dowelJoint === undefined)).toBe(true);

    await running.window.evaluate(() =>
      window.useSelectionStore.getState().selectParts(['copy-dowel-lower', 'copy-dowel-upper'])
    );
    const idsBeforePairPaste = await running.window.evaluate(() =>
      window.useProjectStore.getState().parts.map((part: { id: string }) => part.id)
    );
    await running.window.keyboard.press(`${MODIFIER}+C`);
    await running.window.keyboard.press(`${MODIFIER}+V`);
    const pairedCopy = await running.window.evaluate((beforeIds) => {
      const copied = window.useProjectStore
        .getState()
        .parts.filter((part: { id: string }) => !beforeIds.includes(part.id));
      return copied.map((part: any) => ({
        id: part.id,
        featureIds: part.features.map((feature: any) => feature.id),
        joints: part.features.map((feature: any) => feature.metadata.dowelJoint)
      }));
    }, idsBeforePairPaste);
    expect(pairedCopy).toHaveLength(2);
    expect(pairedCopy.flatMap((part) => part.featureIds).every((id) => !original.featureIds.includes(id))).toBe(true);
    expect(pairedCopy[0].joints.map((joint) => joint.jointId)).toEqual([
      pairedCopy[1].joints[0].jointId,
      pairedCopy[1].joints[1].jointId
    ]);
    expect(pairedCopy[0].joints[0].jointId).not.toBe(original.jointId);
    expect(pairedCopy[0].joints.every((joint) => joint.matePartId === pairedCopy[1].id)).toBe(true);
    expect(pairedCopy[1].joints.every((joint) => joint.matePartId === pairedCopy[0].id)).toBe(true);

    await openSelectedPartCuts(running.window, 'copy-dowel-lower');
    await running.window.getByRole('button', { name: 'Actions for cut 1' }).click();
    await running.window.getByRole('menuitem', { name: 'Delete' }).click();
    await savePartCutsFromHeader(running.window);
    await expect
      .poll(() => running.window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts))
      .toBe(false);
    await running.window.waitForFunction(() => typeof window.__carvdE2E?.getDowelVisualizations === 'function');
    const afterDelete = await running.window.evaluate(() => {
      const parts = window.useProjectStore.getState().parts;
      const lower = parts.find((part: { id: string }) => part.id === 'copy-dowel-lower');
      const upper = parts.find((part: { id: string }) => part.id === 'copy-dowel-upper');
      return {
        lowerFeatures: lower.features,
        upperFeatures: upper.features,
        visualCount: window.__carvdE2E?.getDowelVisualizations().length
      };
    });
    expect(afterDelete.lowerFeatures).toHaveLength(1);
    expect(afterDelete.upperFeatures).toHaveLength(2);
    expect(afterDelete.upperFeatures[0].metadata?.dowelJoint).toBeUndefined();
    expect(afterDelete.upperFeatures[0]).toMatchObject({
      kind: 'circular_cut',
      cutType: 'round_hole',
      parameters: { diameter: 0.375, depthMode: 'blind', depth: 0.375 }
    });
    expect(afterDelete.visualCount).toBe(3);

    await running.window.keyboard.press(`${MODIFIER}+Z`);
    await expect
      .poll(() =>
        running.window.evaluate(() => {
          const parts = window.useProjectStore.getState().parts;
          return parts
            .filter((part: { id: string }) => ['copy-dowel-lower', 'copy-dowel-upper'].includes(part.id))
            .map((part: { features: unknown[] }) => part.features.length);
        })
      )
      .toEqual([2, 2]);
    const restored = await running.window.evaluate(() => {
      const parts = window.useProjectStore.getState().parts;
      return parts
        .filter((part: { id: string }) => ['copy-dowel-lower', 'copy-dowel-upper'].includes(part.id))
        .flatMap((part: any) => part.features.map((feature: any) => feature.metadata?.dowelJoint));
    });
    expect(restored).toHaveLength(4);
    expect(restored.every(Boolean)).toBe(true);
  });
});
