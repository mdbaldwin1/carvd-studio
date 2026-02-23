import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileMenu } from './FileMenu';
import { useUIStore } from '../../store/uiStore';

// Mock the fileOperations module
vi.mock('../../utils/fileOperations', () => ({
  openProjectFromPath: vi.fn()
}));

import { openProjectFromPath } from '../../utils/fileOperations';

/**
 * Helper: click a submenu item using pointer events.
 *
 * Radix DropdownMenu submenus use a grace-area mechanism that prevents
 * normal userEvent.click from triggering onSelect in tests. Dispatching
 * the raw pointer events works around this.
 */
function clickSubMenuItem(element: HTMLElement) {
  fireEvent.pointerDown(element, { button: 0, pointerType: 'mouse' });
  fireEvent.pointerUp(element, { button: 0, pointerType: 'mouse' });
  fireEvent.click(element);
}

describe('FileMenu', () => {
  const defaultProps = {
    onNew: vi.fn(),
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    recentProjects: ['/path/to/project1.carvd', '/path/to/project2.carvd'],
    onRefreshRecent: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      showToast: vi.fn()
    });
    vi.mocked(openProjectFromPath).mockResolvedValue({ success: true });
  });

  async function openMenu(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /file/i }));
  }

  /** Open the "Open Recent" submenu and return the available menuitems. */
  async function openRecentSubmenu(user: ReturnType<typeof userEvent.setup>) {
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /open recent/i }));
  }

  describe('rendering', () => {
    it('renders File button', () => {
      render(<FileMenu {...defaultProps} />);

      expect(screen.getByRole('button', { name: /file/i })).toBeInTheDocument();
    });

    it('does not show dropdown by default', () => {
      render(<FileMenu {...defaultProps} />);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('shows dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<FileMenu {...defaultProps} />);

      await openMenu(user);

      expect(screen.getByRole('menuitem', { name: /new project/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /^open\./i })).toBeInTheDocument();
      // Both "Save" and "Save As..." start with "Save", so check for 2 matches
      const saveItems = screen.getAllByRole('menuitem').filter((el) => el.textContent?.startsWith('Save'));
      expect(saveItems).toHaveLength(2);
      expect(screen.getByRole('menuitem', { name: /save as/i })).toBeInTheDocument();
    });

    it('shows Open Recent menu item', async () => {
      const user = userEvent.setup();
      render(<FileMenu {...defaultProps} />);

      await openMenu(user);

      expect(screen.getByRole('menuitem', { name: /open recent/i })).toBeInTheDocument();
    });

    it('shows keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(<FileMenu {...defaultProps} />);

      await openMenu(user);

      // Look for shortcuts (either Mac or Windows format)
      const shortcuts = screen.getAllByText(/^(⌘|Ctrl\+)[NOSNS⇧]+$/);
      expect(shortcuts.length).toBeGreaterThan(0);
    });
  });

  describe('menu actions', () => {
    it('calls onNew when New Project is clicked', async () => {
      const user = userEvent.setup();
      const onNew = vi.fn();
      render(<FileMenu {...defaultProps} onNew={onNew} />);

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: /new project/i }));

      expect(onNew).toHaveBeenCalledTimes(1);
    });

    it('calls onOpen when Open... is clicked', async () => {
      const user = userEvent.setup();
      const onOpen = vi.fn();
      render(<FileMenu {...defaultProps} onOpen={onOpen} />);

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: /^open\./i }));

      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('calls onSave when Save is clicked', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<FileMenu {...defaultProps} onSave={onSave} />);

      await openMenu(user);
      // "Save" item has accessible name "SaveCtrl+S", so match beginning
      const saveItems = screen.getAllByRole('menuitem').filter((el) => /^Save[^A ]*$/.test(el.textContent || ''));
      // First match is the "Save" (not "Save As...")
      await user.click(saveItems[0]);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('calls onSaveAs when Save As... is clicked', async () => {
      const user = userEvent.setup();
      const onSaveAs = vi.fn();
      render(<FileMenu {...defaultProps} onSaveAs={onSaveAs} />);

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: /save as/i }));

      expect(onSaveAs).toHaveBeenCalledTimes(1);
    });

    it('closes menu after action', async () => {
      const user = userEvent.setup();
      render(<FileMenu {...defaultProps} />);

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: /new project/i }));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('recent projects submenu', () => {
    it('shows recent projects when submenu is opened', async () => {
      const user = userEvent.setup();
      render(<FileMenu {...defaultProps} />);

      await openRecentSubmenu(user);

      expect(screen.getByText('project1')).toBeInTheDocument();
      expect(screen.getByText('project2')).toBeInTheDocument();
    });

    it('shows "No recent projects" when list is empty', async () => {
      const user = userEvent.setup();
      render(<FileMenu {...defaultProps} recentProjects={[]} />);

      await openRecentSubmenu(user);

      expect(screen.getByText('No recent projects')).toBeInTheDocument();
    });

    it('opens recent project when clicked', async () => {
      const user = userEvent.setup();
      render(<FileMenu {...defaultProps} />);

      await openRecentSubmenu(user);
      const proj1 = screen.getAllByRole('menuitem').find((el) => el.textContent?.includes('project1'));
      clickSubMenuItem(proj1!);

      expect(openProjectFromPath).toHaveBeenCalledWith('/path/to/project1.carvd');
    });

    it('shows toast on successful open', async () => {
      const user = userEvent.setup();
      vi.mocked(openProjectFromPath).mockResolvedValue({ success: true });

      render(<FileMenu {...defaultProps} />);

      await openRecentSubmenu(user);
      const proj1 = screen.getAllByRole('menuitem').find((el) => el.textContent?.includes('project1'));
      clickSubMenuItem(proj1!);

      await vi.waitFor(() => {
        expect(useUIStore.getState().showToast).toHaveBeenCalledWith('Project opened', 'success');
      });
    });

    it('shows error toast on failed open', async () => {
      const user = userEvent.setup();
      vi.mocked(openProjectFromPath).mockResolvedValue({ success: false, error: 'File not found' });

      render(<FileMenu {...defaultProps} />);

      await openRecentSubmenu(user);
      const proj1 = screen.getAllByRole('menuitem').find((el) => el.textContent?.includes('project1'));
      clickSubMenuItem(proj1!);

      await vi.waitFor(() => {
        expect(useUIStore.getState().showToast).toHaveBeenCalledWith('Error: File not found', 'error');
      });
    });

    it('calls onRefreshRecent after opening project', async () => {
      const user = userEvent.setup();
      const onRefreshRecent = vi.fn();
      render(<FileMenu {...defaultProps} onRefreshRecent={onRefreshRecent} />);

      await openRecentSubmenu(user);
      const proj1 = screen.getAllByRole('menuitem').find((el) => el.textContent?.includes('project1'));
      clickSubMenuItem(proj1!);

      await vi.waitFor(() => {
        expect(onRefreshRecent).toHaveBeenCalled();
      });
    });

    it('extracts filename from path', async () => {
      const user = userEvent.setup();
      render(<FileMenu {...defaultProps} recentProjects={['/Users/test/Documents/my-project.carvd']} />);

      await openRecentSubmenu(user);

      expect(screen.getByText('my-project')).toBeInTheDocument();
    });

    it('handles Windows paths', async () => {
      const user = userEvent.setup();
      render(<FileMenu {...defaultProps} recentProjects={['C:\\Users\\test\\Documents\\project.carvd']} />);

      await openRecentSubmenu(user);

      expect(screen.getByText('project')).toBeInTheDocument();
    });
  });

  describe('toggle behavior', () => {
    it('closes menu when pressing Escape', async () => {
      const user = userEvent.setup();
      render(<FileMenu {...defaultProps} />);

      await openMenu(user);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('has aria-haspopup attribute on trigger', () => {
      render(<FileMenu {...defaultProps} />);

      const button = screen.getByRole('button', { name: /file/i });
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
    });
  });
});
