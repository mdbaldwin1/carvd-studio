import { describe, expect, it, vi } from 'vitest';
const send = vi.hoisted(() => vi.fn());
vi.mock('electron', () => ({
  Menu: { buildFromTemplate: vi.fn(), setApplicationMenu: vi.fn() },
  BrowserWindow: { getFocusedWindow: () => ({ webContents: { send } }), getAllWindows: () => [] },
  app: { name: 'Carvd Studio' }
}));
vi.mock('./store', () => ({ getRecentProjects: () => [] }));
vi.mock('./updater', () => ({ checkForUpdatesManual: vi.fn() }));
import { buildMenuTemplate } from './menu';
import type { MenuItemConstructorOptions } from 'electron';
describe('M2 guarded native reload', () => {
  it.each(['reload', 'forceReload'])('%s requests renderer approval rather than a destructive role', (kind) => {
    send.mockClear();
    const view = buildMenuTemplate().find((item) => item.label === 'View')!.submenu as MenuItemConstructorOptions[];
    const item = view.find((item) => item.role === kind || item.id === kind)!;
    expect.soft(item.role).toBeUndefined();
    expect.soft(item.click).toBeTypeOf('function');
    if (item.click) item.click({} as never, {} as never, {} as never);
    expect(send).toHaveBeenCalledWith('menu-command', 'request-reload', kind === 'forceReload');
  });
});
