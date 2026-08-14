import { expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

declare global {
  interface Window {
    useProjectStore: { getState: () => any };
    useSelectionStore: { getState: () => any };
    useSnapStore: { getState: () => any };
    useUIStore: { getState: () => any };
    useInteractionStore: { getState: () => any };
    useLicenseStore: { getState: () => any };
    useCameraStore: { getState: () => any; setState: (state: Record<string, unknown>) => void };
    useAssemblyEditingStore: { getState: () => any };
    __carvdE2E?: {
      getPartScreenPoint: (partId?: string) => { x: number; y: number } | null;
      getResizeHandleScreenPoint: (
        handle: { x: -1 | 0 | 1; y: -1 | 0 | 1; z: -1 | 0 | 1 },
        partId?: string
      ) => { x: number; y: number } | null;
      getRotationHandleScreenPoint: (
        handle: { axis: 'x' | 'y' | 'z'; side: -1 | 1; target?: 'ring' | 'grab' },
        partId?: string
      ) => { x: number; y: number } | null;
      setCameraView: (view: 'isometric' | 'top' | 'front' | 'right') => void;
    };
  }
}

export interface RunningElectronApp {
  electronApp: ElectronApplication;
  window: Page;
  userDataDir: string;
  consoleMessages: string[];
}

export type ProjectSnapshot = {
  projectName: string;
  parts: Array<{
    id: string;
    name: string;
    length: number;
    width: number;
    thickness: number;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    stockId: string | null;
    color: string;
    grainDirection: string;
  }>;
  stocks: Array<{
    id: string;
    name: string;
    length: number;
    width: number;
    thickness: number;
    color: string;
    grainDirection: string;
  }>;
  groups: Array<{ id: string; name: string }>;
  groupMembers: Array<{ id: string; groupId: string; memberId: string; memberType: 'part' | 'group' }>;
  assemblies: Array<{ id: string; name: string }>;
  snapGuides: Array<{ id: string; axis: 'x' | 'y' | 'z'; position: number; label?: string }>;
  customShoppingItems: Array<{ id: string; name: string; quantity: number; unitPrice: number }>;
  cutList: null | {
    instructions: unknown[];
    stockBoards: unknown[];
    statistics: { byStock: unknown[] };
    isStale: boolean;
  };
  units: 'imperial' | 'metric';
  gridSize: number;
  kerfWidth: number;
  overageFactor: number;
  projectNotes: string;
  selectedPartIds: string[];
  selectedGroupIds: string[];
  contextMenu: unknown;
  activeSession: unknown;
};

export async function launchElectronApp(): Promise<RunningElectronApp> {
  const appPath = path.resolve(__dirname, '../../..');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carvd-e2e-'));
  const args = [appPath, '--test-mode', `--user-data-dir=${userDataDir}`];
  if (process.env.CI) {
    args.unshift('--no-sandbox');
  }

  const electronApp = await electron.launch({
    args,
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });

  const window = await getMainWindow(electronApp);
  await window.setViewportSize({ width: 1400, height: 900 });
  await waitForAutomationHooks(window);

  const consoleMessages: string[] = [];
  window.on('console', (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      console.log(`[E2E Console] ${text}`);
    }
  });
  window.on('pageerror', (error) => {
    const text = `[pageerror] ${error.message}`;
    consoleMessages.push(text);
    console.log(`[E2E] ${text}`);
  });

  return { electronApp, window, userDataDir, consoleMessages };
}

export async function waitForAutomationHooks(window: Page): Promise<void> {
  await window.waitForFunction(
    () =>
      !!window.useProjectStore &&
      !!window.useSelectionStore &&
      !!window.useUIStore &&
      !!window.useInteractionStore &&
      !!window.useLicenseStore &&
      !!window.useAssemblyEditingStore,
    null,
    { timeout: 30000 }
  );
}

export async function closeElectronApp(running: RunningElectronApp | undefined): Promise<void> {
  if (!running) return;
  try {
    await Promise.race([
      running.electronApp.close(),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('close timeout')), 5000))
    ]);
  } catch {
    try {
      const signal = process.platform === 'win32' ? undefined : 'SIGKILL';
      running.electronApp.process().kill(signal);
    } catch {
      // Process may already be gone.
    }
  }
  fs.rmSync(running.userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}

export async function getMainWindow(electronApp: ElectronApplication): Promise<Page> {
  for (let i = 0; i < 90; i += 1) {
    for (const win of electronApp.windows()) {
      const hasApp = await win
        .evaluate(() => {
          const el = document.querySelector('.app');
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .catch(() => false);

      if (hasApp) {
        await win.waitForFunction(() => document.readyState === 'complete', null, { timeout: 30000 });
        return win;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Main application window with .app root not found after 90s');
}

export async function isElementVisible(window: Page, selector: string): Promise<boolean> {
  return window.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, selector);
}

export async function isEmptyStateVisible(window: Page): Promise<boolean> {
  return isElementVisible(window, '.empty-state-overlay');
}

export async function waitForAppReady(window: Page): Promise<'start-screen' | 'editor'> {
  for (let i = 0; i < 60; i += 1) {
    const state = await window.evaluate(() => {
      function isVisible(el: Element | null): boolean {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      const errorBoundary = document.querySelector('.error-boundary');
      if (isVisible(errorBoundary)) {
        const details = document.querySelector('.error-boundary-details pre');
        const errorMsg = details?.textContent || 'unknown error';
        const tryAgainBtn = document.querySelector('.error-boundary-actions .btn-secondary') as HTMLElement | null;
        tryAgainBtn?.click();
        return { type: 'error-boundary' as const, error: errorMsg };
      }

      const skipBtn = document.querySelector('.tutorial-tooltip-skip') as HTMLElement | null;
      if (isVisible(skipBtn)) {
        skipBtn?.click();
        return { type: 'skipped-tutorial' as const };
      }

      const trialModal = document.querySelector('.trial-expired-modal');
      if (isVisible(trialModal)) {
        const buttons = trialModal!.querySelectorAll('button');
        const lastBtn = buttons[buttons.length - 1] as HTMLElement | undefined;
        lastBtn?.click();
        return { type: 'dismissed-trial' as const };
      }

      if (isVisible(document.querySelector('.start-screen'))) {
        return { type: 'start-screen' as const };
      }
      if (isVisible(document.querySelector('.app-header'))) {
        return { type: 'editor' as const };
      }
      return { type: 'waiting' as const };
    });

    if (state.type === 'start-screen') return 'start-screen';
    if (state.type === 'editor') return 'editor';
    if (state.type === 'error-boundary') {
      console.log(`[E2E] Error boundary detected: ${(state as { error: string }).error}`);
      await window.waitForTimeout(2000);
      continue;
    }
    if (state.type === 'skipped-tutorial' || state.type === 'dismissed-trial') {
      await window.waitForTimeout(500);
      continue;
    }
    await window.waitForTimeout(1000);
  }

  const bodyHTML = await window.evaluate(() => document.body.innerHTML.substring(0, 1000));
  throw new Error(`App did not reach a usable state after 60s. Page content: ${bodyHTML}`);
}

export async function createBlankProject(window: Page, name = 'E2E Project'): Promise<void> {
  const state = await waitForAppReady(window);
  const startScreenVisible = await isElementVisible(window, '.start-screen');

  if (state === 'start-screen' || startScreenVisible) {
    await expect(window.locator('.blank-template')).toBeVisible({ timeout: 10000 });
    await window.evaluate(() => {
      (document.querySelector('.blank-template') as HTMLElement | null)?.click();
    });
  }

  await expect(window.locator('.new-project-dialog')).toBeVisible({ timeout: 10000 });
  await window.locator('.new-project-dialog input').first().fill(name);
  await window.evaluate(() => {
    const dialog = document.querySelector('.new-project-dialog');
    const buttons = Array.from(dialog?.querySelectorAll('button') ?? []);
    const createButton = buttons.find((button) => button.textContent?.trim() === 'Create Project') as
      | HTMLButtonElement
      | undefined;
    createButton?.click();
  });

  await expect(window.locator('.app-header')).toBeVisible({ timeout: 15000 });
  await expect(window.locator('.sidebar')).toBeVisible();
  await expect(window.locator('canvas')).toBeVisible();
}

export async function ensureEditorReady(window: Page): Promise<void> {
  const state = await waitForAppReady(window);
  if (state === 'start-screen' || (await isElementVisible(window, '.start-screen'))) {
    await createBlankProject(window);
  }
  await expect(window.locator('.app-header')).toBeVisible({ timeout: 15000 });
  await expect(window.locator('.sidebar')).toBeVisible();
  await expect(window.locator('canvas')).toBeVisible();
}

export async function addPartFromSidebar(window: Page): Promise<void> {
  await window.locator('button[title="Add Part"]').first().click({ force: true });
  await window.waitForTimeout(500);
}

type ElectronAPIWithTestDialogs = Window['electronAPI'] & {
  queueTestSaveDialogPath: (filePath: string | null) => Promise<{ success: boolean; error?: string }>;
  queueTestOpenDialogPaths: (filePaths: string[] | null) => Promise<{ success: boolean; error?: string }>;
};

export async function queueSavePath(window: Page, filePath: string | null): Promise<void> {
  const result = await window.evaluate(async (queuedPath) => {
    const api = window.electronAPI as ElectronAPIWithTestDialogs;
    return api.queueTestSaveDialogPath(queuedPath);
  }, filePath);
  expect(result).toMatchObject({ success: true });
}

export async function queueOpenPaths(window: Page, filePaths: string[] | null): Promise<void> {
  const result = await window.evaluate(async (queuedPaths) => {
    const api = window.electronAPI as ElectronAPIWithTestDialogs;
    return api.queueTestOpenDialogPaths(queuedPaths);
  }, filePaths);
  expect(result).toMatchObject({ success: true });
}

export async function sendNativeMenuCommand(
  running: RunningElectronApp,
  command: string,
  ...args: unknown[]
): Promise<void> {
  await running.electronApp.evaluate(
    async ({ BrowserWindow }, payload) => {
      const targetWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!targetWindow) {
        throw new Error('No Electron window available for native menu command');
      }
      targetWindow.webContents.send('menu-command', payload.command, ...payload.args);
    },
    { command, args }
  );
  await running.window.waitForTimeout(300);
}

export async function getProjectSnapshot(window: Page): Promise<ProjectSnapshot> {
  return window.evaluate(() => {
    const project = window.useProjectStore.getState();
    const selection = window.useSelectionStore.getState();
    const ui = window.useUIStore.getState();
    const interaction = window.useInteractionStore.getState();
    return {
      projectName: project.projectName,
      parts: project.parts,
      stocks: project.stocks,
      groups: project.groups,
      groupMembers: project.groupMembers,
      assemblies: project.assemblies.map((assembly: { id: string; name: string }) => ({
        id: assembly.id,
        name: assembly.name
      })),
      snapGuides: project.snapGuides,
      customShoppingItems: project.customShoppingItems,
      cutList: project.cutList,
      units: project.units,
      gridSize: project.gridSize,
      kerfWidth: project.kerfWidth,
      overageFactor: project.overageFactor,
      projectNotes: project.projectNotes,
      selectedPartIds: selection.selectedPartIds,
      selectedGroupIds: selection.selectedGroupIds,
      contextMenu: ui.contextMenu,
      activeSession: interaction.activeSession
    };
  });
}

export async function seedProject(
  window: Page,
  seed:
    | 'empty'
    | 'one-part'
    | 'two-parts'
    | 'stocked-one-part'
    | 'one-group'
    | 'two-groups'
    | 'mixed-part-and-group'
    | 'guide' = 'one-part'
) {
  await ensureEditorReady(window);
  await window.evaluate((seedKind) => {
    const project = window.useProjectStore.getState();
    const selection = window.useSelectionStore.getState();
    project.newProject();

    let stockId: string | null = null;
    if (seedKind === 'stocked-one-part') {
      stockId = project.addStock({
        name: 'E2E Plywood',
        length: 96,
        width: 48,
        thickness: 2,
        color: '#d4a574',
        grainDirection: 'length'
      });
    }

    const addTestPart = (name: string, position: { x: number; y: number; z: number }) =>
      project.addPart({
        name,
        length: 24,
        width: 10,
        thickness: 2,
        stockId,
        position,
        color: stockId ? '#d4a574' : '#c4a574',
        grainDirection: 'length'
      });

    if (seedKind !== 'empty' && seedKind !== 'guide') {
      const firstPartId = addTestPart('E2E Part', { x: 0, y: 1, z: 0 });
      const partIds = firstPartId ? [firstPartId] : [];
      if (seedKind === 'two-parts' || seedKind === 'one-group' || seedKind === 'mixed-part-and-group') {
        const secondPartId = addTestPart('E2E Part 2', { x: 30, y: 1, z: 0 });
        if (secondPartId) partIds.push(secondPartId);
      }
      if (seedKind === 'two-groups') {
        const secondPartId = addTestPart('E2E Part 2', { x: 30, y: 1, z: 0 });
        const thirdPartId = addTestPart('E2E Part 3', { x: 60, y: 1, z: 0 });
        if (secondPartId) partIds.push(secondPartId);
        if (thirdPartId) partIds.push(thirdPartId);
      }

      if (seedKind === 'one-group' && partIds.length >= 2) {
        const groupId = project.createGroup(
          'Group 1',
          partIds.map((id) => ({ id, type: 'part' as const }))
        );
        if (groupId) selection.selectGroup(groupId);
        return;
      }

      if (seedKind === 'two-groups' && partIds.length >= 3) {
        const firstGroupId = project.createGroup('Group 1', [{ id: partIds[0], type: 'part' as const }]);
        const secondGroupId = project.createGroup('Group 2', [
          { id: partIds[1], type: 'part' as const },
          { id: partIds[2], type: 'part' as const }
        ]);
        if (firstGroupId && secondGroupId) {
          window.useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [firstGroupId, secondGroupId] });
        }
        return;
      }

      if (seedKind === 'mixed-part-and-group' && partIds.length >= 2) {
        const groupId = project.createGroup('Group 1', [{ id: partIds[0], type: 'part' as const }]);
        if (groupId) {
          window.useSelectionStore.setState({ selectedPartIds: [partIds[1]], selectedGroupIds: [groupId] });
        }
        return;
      }

      if (partIds.length === 1) selection.selectPart(partIds[0]);
      if (partIds.length > 1) selection.selectParts(partIds);
    } else if (seedKind === 'guide') {
      project.addSnapGuide('x', 12);
      selection.clearSelection();
    } else {
      selection.clearSelection();
    }
  }, seed);
  await window.waitForTimeout(500);
}

export async function getCanvasPoint(window: Page, xRatio = 0.5, yRatio = 0.5): Promise<{ x: number; y: number }> {
  return window.locator('canvas').evaluate(
    (canvas, ratios) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + rect.width * ratios.xRatio,
        y: rect.top + rect.height * ratios.yRatio
      };
    },
    { xRatio, yRatio }
  );
}

export async function getSelectedPartCanvasPoint(window: Page): Promise<{ x: number; y: number }> {
  await window.waitForFunction(() => !!window.__carvdE2E?.getPartScreenPoint(), null, { timeout: 10000 });
  const point = await window.evaluate(() => window.__carvdE2E?.getPartScreenPoint() ?? null);
  if (!point) {
    throw new Error('No selected part screen point is available');
  }
  return point;
}

export async function getResizeHandleCanvasPoint(
  window: Page,
  handle: { x: -1 | 0 | 1; y: -1 | 0 | 1; z: -1 | 0 | 1 }
): Promise<{ x: number; y: number }> {
  await window.waitForFunction(() => typeof window.__carvdE2E?.getResizeHandleScreenPoint === 'function', null, {
    timeout: 10000
  });
  const point = await window.evaluate(
    (targetHandle) => window.__carvdE2E?.getResizeHandleScreenPoint(targetHandle) ?? null,
    handle
  );
  if (!point) {
    throw new Error('No resize handle screen point is available');
  }
  return point;
}

export async function getRotationHandleCanvasPoint(
  window: Page,
  handle: { axis: 'x' | 'y' | 'z'; side: -1 | 1; target?: 'ring' | 'grab' }
): Promise<{ x: number; y: number }> {
  await window.waitForFunction(() => typeof window.__carvdE2E?.getRotationHandleScreenPoint === 'function', null, {
    timeout: 10000
  });
  const point = await window.evaluate(
    (targetHandle) => window.__carvdE2E?.getRotationHandleScreenPoint(targetHandle) ?? null,
    handle
  );
  if (!point) {
    throw new Error('No rotation handle screen point is available');
  }
  return point;
}

export async function dragCanvas(window: Page, start: { x: number; y: number }, delta: { x: number; y: number }) {
  await window.mouse.move(start.x, start.y);
  await window.waitForTimeout(150);
  await window.mouse.down();
  await window.waitForTimeout(250);
  for (let i = 1; i <= 12; i += 1) {
    await window.mouse.move(start.x + (delta.x * i) / 12, start.y + (delta.y * i) / 12);
    await window.waitForTimeout(20);
  }
  await window.mouse.up();
  await window.waitForTimeout(500);
}

export async function rightClickCanvas(window: Page, point: { x: number; y: number }) {
  await window.mouse.click(point.x, point.y, { button: 'right' });
  await window.waitForTimeout(300);
}

export async function clickMenuItem(window: Page, label: string) {
  await window.evaluate((text) => {
    const item = Array.from(document.querySelectorAll('button, [role="menuitem"]')).find(
      (el) => el.textContent?.trim() === text
    ) as HTMLElement | undefined;
    item?.click();
  }, label);
  await window.waitForTimeout(300);
}

export async function openSelectionContextMenu(window: Page, point = { x: 500, y: 300 }) {
  await window.evaluate(({ x, y }) => {
    window.useUIStore.getState().openContextMenu({ x, y, type: 'part' });
  }, point);
  await expect(window.locator('[role="menu"], .context-menu')).toBeVisible({ timeout: 5000 });
}
