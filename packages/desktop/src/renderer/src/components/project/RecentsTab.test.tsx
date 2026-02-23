import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentsTab } from './RecentsTab';

// Mock formatRelativeDate from StartScreen
vi.mock('./StartScreen', () => ({
  formatRelativeDate: vi.fn((date: string) => {
    if (!date) return '';
    return 'Just now';
  })
}));

const existingProject = {
  path: '/path/to/project.carvd',
  name: 'My Project',
  lastOpened: '2025-01-15T10:00:00Z',
  modifiedAt: '2025-01-15T10:00:00Z',
  isFavorite: false,
  thumbnail: null,
  exists: true
};

const favoriteProject = {
  ...existingProject,
  path: '/path/to/favorite.carvd',
  name: 'Favorite Project',
  isFavorite: true
};

const missingProject = {
  path: '/path/to/missing.carvd',
  name: 'Missing File',
  lastOpened: '2025-01-10T10:00:00Z',
  modifiedAt: undefined,
  isFavorite: false,
  thumbnail: null,
  exists: false
};

describe('RecentsTab', () => {
  it('shows empty state when no projects', () => {
    render(
      <RecentsTab
        projects={[]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={vi.fn()}
      />
    );
    expect(screen.getByText('No recent projects yet.')).toBeInTheDocument();
  });

  it('renders project name', () => {
    render(
      <RecentsTab
        projects={[existingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={vi.fn()}
      />
    );
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('calls onOpenProject for existing project', () => {
    const onOpen = vi.fn();
    render(
      <RecentsTab
        projects={[existingProject]}
        onOpenProject={onOpen}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('My Project'));
    expect(onOpen).toHaveBeenCalledWith('/path/to/project.carvd');
  });

  it('calls onRelocateFile for missing project', () => {
    const onRelocate = vi.fn();
    render(
      <RecentsTab
        projects={[missingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={onRelocate}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Missing File'));
    expect(onRelocate).toHaveBeenCalledWith('/path/to/missing.carvd', 'Missing File');
  });

  it('handles Enter key for existing project', () => {
    const onOpen = vi.fn();
    render(
      <RecentsTab
        projects={[existingProject]}
        onOpenProject={onOpen}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={vi.fn()}
      />
    );
    fireEvent.keyDown(screen.getByText('My Project').closest('[role="button"]')!, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledWith('/path/to/project.carvd');
  });

  it('handles Enter key for missing project', () => {
    const onRelocate = vi.fn();
    render(
      <RecentsTab
        projects={[missingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={onRelocate}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={vi.fn()}
      />
    );
    fireEvent.keyDown(screen.getByText('Missing File').closest('[role="button"]')!, { key: 'Enter' });
    expect(onRelocate).toHaveBeenCalledWith('/path/to/missing.carvd', 'Missing File');
  });

  it('shows "Click to locate" for missing projects', () => {
    render(
      <RecentsTab
        projects={[missingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={vi.fn()}
      />
    );
    expect(screen.getByText('Click to locate')).toBeInTheDocument();
  });

  it('calls onToggleFavorite when star clicked', () => {
    const onToggle = vi.fn();
    render(
      <RecentsTab
        projects={[existingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={onToggle}
        onRemoveRecent={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Add My Project to favorites'));
    expect(onToggle).toHaveBeenCalledWith(existingProject, expect.any(Object));
  });

  it('calls onRemoveRecent when trash clicked', () => {
    const onRemove = vi.fn();
    render(
      <RecentsTab
        projects={[existingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={onRemove}
      />
    );
    fireEvent.click(screen.getByLabelText('Remove My Project from recent'));
    expect(onRemove).toHaveBeenCalledWith(existingProject, expect.any(Object));
  });

  it('shows filled star for favorite projects', () => {
    render(
      <RecentsTab
        projects={[favoriteProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Remove Favorite Project from favorites')).toBeInTheDocument();
  });

  it('hides favorite button for missing projects', () => {
    render(
      <RecentsTab
        projects={[missingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={vi.fn()}
      />
    );
    expect(screen.queryByLabelText(/favorites/)).not.toBeInTheDocument();
  });

  it('renders multiple projects', () => {
    render(
      <RecentsTab
        projects={[existingProject, favoriteProject, missingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onRemoveRecent={vi.fn()}
      />
    );
    expect(screen.getByText('My Project')).toBeInTheDocument();
    expect(screen.getByText('Favorite Project')).toBeInTheDocument();
    expect(screen.getByText('Missing File')).toBeInTheDocument();
  });
});
