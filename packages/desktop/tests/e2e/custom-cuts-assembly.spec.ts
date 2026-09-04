import { expect, test } from '@playwright/test';
import type { Page } from 'playwright';
import {
  closeElectronApp,
  dragCanvas,
  getResizeHandleCanvasPoint,
  getSelectedPartCanvasPoint,
  launchElectronApp,
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
    return await window.evaluate((pointerDownState) => {
      const session = window.useInteractionStore.getState().activeSession;
      const selection = window.useSelectionStore.getState();
      return session?.kind === 'move'
        ? {
            delta: session.delta,
            moveOwner: session.moveOwner ?? null,
            snapLines: window.useSnapStore.getState().activeSnapLines,
            selectedPartIds: selection.selectedPartIds,
            selectedGroupIds: selection.selectedGroupIds,
            pointerDown: pointerDownState
          }
        : null;
    }, pointerDown);
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
    expect(preview!.snapLines.map((line: { family?: string }) => line.family)).toContain('face');
    for (const axis of ['x', 'y', 'z'] as const) {
      const startPosition = { x: 4.1, y: 2.8, z: 4 };
      expect(result.position[axis]).toBeCloseTo(startPosition[axis] + preview!.delta[axis], 3);
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
    await running.window.getByRole('button', { name: 'Save Cut' }).click();
    await running.window.getByRole('button', { name: 'Save Part' }).click();
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
});
