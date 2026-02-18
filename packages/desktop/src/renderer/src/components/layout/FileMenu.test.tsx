import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileMenu } from './FileMenu';
import { useUIStore } from '../../store/uiStore';

// Mock the fileOperations module
vi.mock('../../utils/fileOperations', () => ({
  openProjectFromPath: vi.fn()
}));

import { openProjectFromPath } from '../../utils/fileOperations';

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

  describe('rendering', () => {
    it('renders File button', () => {
      render(<FileMenu {...defaultProps} />);

      expect(screen.getByText('File')).toBeInTheDocument();
    });

    it('does not show dropdown by default', () => {
      render(<FileMenu {...defaultProps} />);

      expect(screen.queryByText('New Project')).not.toBeInTheDocument();
    });

    it('shows dropdown when clicked', () => {
      render(<FileMenu {...defaultProps} />);

      fireEvent.click(screen.getByText('File'));

      expect(screen.getByText('New Project')).toBeInTheDocument();
      expect(screen.getByText('Open...')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Save As...')).toBeInTheDocument();
    });

    it('shows Open Recent menu item', () => {
      render(<FileMenu {...defaultProps} />);

      fireEvent.click(screen.getByText('File'));

      expect(screen.getByText('Open Recent')).toBeInTheDocument();
    });

    it('shows keyboard shortcuts', () => {
      render(<FileMenu {...defaultProps} />);

      fireEvent.click(screen.getByText('File'));

      // Look for shortcuts (either Mac or Windows format)
      const shortcuts = screen.getAllByText(/^(⌘|Ctrl\+)[NOSNS⇧]+$/);
      expect(shortcuts.length).toBeGreaterThan(0);
    });
  });

  describe('menu actions', () => {
    it('calls onNew when New Project is clicked', () => {
      const onNew = vi.fn();
      render(<FileMenu {...defaultProps} onNew={onNew} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.click(screen.getByText('New Project'));

      expect(onNew).toHaveBeenCalledTimes(1);
    });

    it('calls onOpen when Open... is clicked', () => {
      const onOpen = vi.fn();
      render(<FileMenu {...defaultProps} onOpen={onOpen} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.click(screen.getByText('Open...'));

      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('calls onSave when Save is clicked', () => {
      const onSave = vi.fn();
      render(<FileMenu {...defaultProps} onSave={onSave} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.click(screen.getByText('Save'));

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('calls onSaveAs when Save As... is clicked', () => {
      const onSaveAs = vi.fn();
      render(<FileMenu {...defaultProps} onSaveAs={onSaveAs} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.click(screen.getByText('Save As...'));

      expect(onSaveAs).toHaveBeenCalledTimes(1);
    });

    it('closes menu after action', () => {
      render(<FileMenu {...defaultProps} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.click(screen.getByText('New Project'));

      expect(screen.queryByText('Open...')).not.toBeInTheDocument();
    });
  });

  describe('recent projects submenu', () => {
    it('shows recent projects on hover', () => {
      render(<FileMenu {...defaultProps} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.mouseEnter(screen.getByText('Open Recent'));

      expect(screen.getByText('project1')).toBeInTheDocument();
      expect(screen.getByText('project2')).toBeInTheDocument();
    });

    it('shows "No recent projects" when list is empty', () => {
      render(<FileMenu {...defaultProps} recentProjects={[]} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.mouseEnter(screen.getByText('Open Recent'));

      expect(screen.getByText('No recent projects')).toBeInTheDocument();
    });

    it('opens recent project when clicked', async () => {
      render(<FileMenu {...defaultProps} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.mouseEnter(screen.getByText('Open Recent'));
      fireEvent.click(screen.getByText('project1'));

      expect(openProjectFromPath).toHaveBeenCalledWith('/path/to/project1.carvd');
    });

    it('shows toast on successful open', async () => {
      vi.mocked(openProjectFromPath).mockResolvedValue({ success: true });

      render(<FileMenu {...defaultProps} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.mouseEnter(screen.getByText('Open Recent'));
      fireEvent.click(screen.getByText('project1'));

      // Wait for async operation
      await vi.waitFor(() => {
        expect(useUIStore.getState().showToast).toHaveBeenCalledWith('Project opened');
      });
    });

    it('shows error toast on failed open', async () => {
      vi.mocked(openProjectFromPath).mockResolvedValue({ success: false, error: 'File not found' });

      render(<FileMenu {...defaultProps} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.mouseEnter(screen.getByText('Open Recent'));
      fireEvent.click(screen.getByText('project1'));

      await vi.waitFor(() => {
        expect(useUIStore.getState().showToast).toHaveBeenCalledWith('Error: File not found');
      });
    });

    it('calls onRefreshRecent after opening project', async () => {
      const onRefreshRecent = vi.fn();
      render(<FileMenu {...defaultProps} onRefreshRecent={onRefreshRecent} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.mouseEnter(screen.getByText('Open Recent'));
      fireEvent.click(screen.getByText('project1'));

      await vi.waitFor(() => {
        expect(onRefreshRecent).toHaveBeenCalled();
      });
    });

    it('extracts filename from path', () => {
      render(<FileMenu {...defaultProps} recentProjects={['/Users/test/Documents/my-project.carvd']} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.mouseEnter(screen.getByText('Open Recent'));

      expect(screen.getByText('my-project')).toBeInTheDocument();
    });

    it('handles Windows paths', () => {
      render(<FileMenu {...defaultProps} recentProjects={['C:\\Users\\test\\Documents\\project.carvd']} />);

      fireEvent.click(screen.getByText('File'));
      fireEvent.mouseEnter(screen.getByText('Open Recent'));

      expect(screen.getByText('project')).toBeInTheDocument();
    });
  });

  describe('toggle behavior', () => {
    it('closes menu when clicking File button again', () => {
      render(<FileMenu {...defaultProps} />);

      fireEvent.click(screen.getByText('File'));
      expect(screen.getByText('New Project')).toBeInTheDocument();

      fireEvent.click(screen.getByText('File'));
      expect(screen.queryByText('New Project')).not.toBeInTheDocument();
    });

    it('has aria-expanded attribute', () => {
      render(<FileMenu {...defaultProps} />);

      const button = screen.getByText('File').closest('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button!);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('click outside', () => {
    it('closes menu when clicking outside', () => {
      render(
        <div>
          <FileMenu {...defaultProps} />
          <button data-testid="outside">Outside</button>
        </div>
      );

      fireEvent.click(screen.getByText('File'));
      expect(screen.getByText('New Project')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(screen.queryByText('New Project')).not.toBeInTheDocument();
    });
  });
});
