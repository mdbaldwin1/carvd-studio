import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FavoritesTab } from './FavoritesTab';

vi.mock('./StartScreen', () => ({
  formatRelativeDate: vi.fn(() => 'Just now')
}));

const existingProject = {
  path: '/path/to/project.carvd',
  name: 'My Project',
  lastOpened: '2025-01-15T10:00:00Z',
  modifiedAt: '2025-01-15T10:00:00Z',
  isFavorite: true,
  thumbnail: null,
  exists: true
};

const missingProject = {
  path: '/path/to/missing.carvd',
  name: 'Missing File',
  lastOpened: '2025-01-10T10:00:00Z',
  modifiedAt: undefined,
  isFavorite: true,
  thumbnail: null,
  exists: false
};

const projectWithThumbnail = {
  ...existingProject,
  path: '/path/to/with-thumb.carvd',
  name: 'Thumbnail Project',
  thumbnail: { data: 'base64data', width: 100, height: 75 }
};

describe('FavoritesTab', () => {
  it('shows empty state when no projects', () => {
    render(
      <FavoritesTab
        projects={[]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    expect(screen.getByText('No favorites yet. Star a project to add it here.')).toBeInTheDocument();
  });

  it('renders project name', () => {
    render(
      <FavoritesTab
        projects={[existingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('calls onOpenProject for existing project', () => {
    const onOpen = vi.fn();
    render(
      <FavoritesTab
        projects={[existingProject]}
        onOpenProject={onOpen}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('My Project'));
    expect(onOpen).toHaveBeenCalledWith('/path/to/project.carvd');
  });

  it('calls onRelocateFile for missing project', () => {
    const onRelocate = vi.fn();
    render(
      <FavoritesTab
        projects={[missingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={onRelocate}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Missing File'));
    expect(onRelocate).toHaveBeenCalledWith('/path/to/missing.carvd', 'Missing File');
  });

  it('handles Enter key for existing project', () => {
    const onOpen = vi.fn();
    render(
      <FavoritesTab
        projects={[existingProject]}
        onOpenProject={onOpen}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    fireEvent.keyDown(screen.getByText('My Project').closest('[role="button"]')!, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledWith('/path/to/project.carvd');
  });

  it('handles Enter key for missing project', () => {
    const onRelocate = vi.fn();
    render(
      <FavoritesTab
        projects={[missingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={onRelocate}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    fireEvent.keyDown(screen.getByText('Missing File').closest('[role="button"]')!, { key: 'Enter' });
    expect(onRelocate).toHaveBeenCalledWith('/path/to/missing.carvd', 'Missing File');
  });

  it('shows "Click to locate" for missing projects', () => {
    render(
      <FavoritesTab
        projects={[missingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    expect(screen.getByText('Click to locate')).toBeInTheDocument();
  });

  it('shows modified date for existing projects', () => {
    render(
      <FavoritesTab
        projects={[existingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  it('calls onToggleFavorite when star clicked', () => {
    const onToggle = vi.fn();
    render(
      <FavoritesTab
        projects={[existingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={onToggle}
        onReorder={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Remove My Project from favorites'));
    expect(onToggle).toHaveBeenCalledWith(existingProject, expect.any(Object));
  });

  it('renders drag handle for existing projects', () => {
    render(
      <FavoritesTab
        projects={[existingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    expect(screen.getByTitle('Drag to reorder')).toBeInTheDocument();
  });

  it('renders thumbnail image when available', () => {
    const { container } = render(
      <FavoritesTab
        projects={[projectWithThumbnail]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    const img = container.querySelector('img.project-thumbnail');
    expect(img).toBeInTheDocument();
    expect(img!.getAttribute('src')).toContain('base64data');
  });

  it('handles drag and drop reorder', () => {
    const projects = [existingProject, { ...existingProject, path: '/path/to/second.carvd', name: 'Second' }];
    const onReorder = vi.fn();
    render(
      <FavoritesTab
        projects={projects}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onReorder={onReorder}
      />
    );
    const items = screen.getAllByRole('button', { name: /favorites/ });
    const firstItem = items[0].closest('[draggable]')!;
    const secondItem = items[1].closest('[draggable]')!;

    fireEvent.dragStart(firstItem, { dataTransfer: { effectAllowed: 'move' } });
    fireEvent.dragOver(secondItem, { dataTransfer: { dropEffect: 'move' } });
    fireEvent.drop(secondItem, {});
    expect(onReorder).toHaveBeenCalled();
  });

  it('does not set draggable on missing project', () => {
    render(
      <FavoritesTab
        projects={[missingProject]}
        onOpenProject={vi.fn()}
        onRelocateFile={vi.fn()}
        onToggleFavorite={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    const item = screen.getByText('Missing File').closest('[role="button"]')!;
    expect(item.getAttribute('draggable')).toBe('false');
  });
});
