/**
 * Native application menu for Carvd Studio
 */

import { Menu, MenuItemConstructorOptions, BrowserWindow, app } from 'electron';
import { getRecentProjects } from './store';

const isMac = process.platform === 'darwin';

/**
 * Send a menu command to the renderer process
 */
function sendMenuCommand(command: string, ...args: unknown[]) {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.webContents.send('menu-command', command, ...args);
  }
}

/**
 * Build the Open Recent submenu
 */
function buildRecentFilesMenu(): MenuItemConstructorOptions[] {
  const recentProjects = getRecentProjects();

  if (recentProjects.length === 0) {
    return [{ label: 'No Recent Projects', enabled: false }];
  }

  const recentItems: MenuItemConstructorOptions[] = recentProjects.map((filePath) => {
    // Get just the filename for display
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    return {
      label: fileName,
      click: () => sendMenuCommand('open-recent', filePath)
    };
  });

  // Add separator and Clear Recent
  recentItems.push(
    { type: 'separator' },
    {
      label: 'Clear Recent',
      click: () => sendMenuCommand('clear-recent')
    }
  );

  return recentItems;
}

/**
 * Build the application menu template
 */
export function buildMenuTemplate(): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [];

  // macOS App menu
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'Cmd+,',
          click: () => sendMenuCommand('open-settings')
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  // File menu
  template.push({
    label: 'File',
    submenu: [
      {
        label: 'New Project',
        accelerator: 'CmdOrCtrl+N',
        click: () => sendMenuCommand('new-project')
      },
      { type: 'separator' },
      {
        label: 'Open...',
        accelerator: 'CmdOrCtrl+O',
        click: () => sendMenuCommand('open-project')
      },
      {
        label: 'Open Recent',
        submenu: buildRecentFilesMenu()
      },
      { type: 'separator' },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: () => sendMenuCommand('save-project')
      },
      {
        label: 'Save As...',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => sendMenuCommand('save-project-as')
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  });

  // Edit menu
  template.push({
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        click: () => sendMenuCommand('undo')
      },
      {
        label: 'Redo',
        accelerator: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y',
        click: () => sendMenuCommand('redo')
      },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      {
        label: 'Delete',
        accelerator: isMac ? 'Backspace' : 'Delete',
        click: () => sendMenuCommand('delete')
      },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        click: () => sendMenuCommand('select-all')
      }
    ]
  });

  // View menu
  template.push({
    label: 'View',
    submenu: [
      {
        label: 'Reset Camera',
        accelerator: 'CmdOrCtrl+0',
        click: () => sendMenuCommand('reset-camera')
      },
      { type: 'separator' },
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  });

  // Window menu (macOS)
  if (isMac) {
    template.push({
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ]
    });
  }

  // Help menu
  template.push({
    label: 'Help',
    submenu: [
      {
        label: 'Keyboard Shortcuts',
        accelerator: 'CmdOrCtrl+/',
        click: () => sendMenuCommand('show-shortcuts')
      },
      { type: 'separator' },
      {
        label: 'Learn More',
        click: async () => {
          const { shell } = require('electron');
          await shell.openExternal('https://github.com/your-repo/carvd-studio');
        }
      }
    ]
  });

  return template;
}

/**
 * Create and set the application menu
 */
export function createApplicationMenu() {
  const template = buildMenuTemplate();
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Refresh the menu (e.g., to update Open Recent)
 */
export function refreshMenu() {
  createApplicationMenu();
}
