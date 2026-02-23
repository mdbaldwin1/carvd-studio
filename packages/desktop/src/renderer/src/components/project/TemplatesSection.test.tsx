import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplatesSection } from './TemplatesSection';

// Mock the templates module
vi.mock('../../templates', () => {
  const tutorialTemplate = {
    id: 'tutorial',
    name: 'Tutorial',
    description: 'Learn the basics',
    thumbnail: '📚',
    thumbnailData: null,
    dimensions: { width: 24, height: 30, depth: 18 },
    partCount: 5,
    type: 'built-in' as const,
    generate: vi.fn(() => ({
      id: 'tutorial-project',
      name: 'Tutorial',
      parts: [],
      stocks: [],
      groups: [],
      groupMembers: []
    }))
  };

  const builtInA = {
    id: 'shelf',
    name: 'Simple Shelf',
    description: 'A simple shelf',
    thumbnail: '📦',
    thumbnailData: null,
    dimensions: { width: 36, height: 48, depth: 12 },
    partCount: 8,
    type: 'built-in' as const,
    generate: vi.fn(() => ({
      id: 'shelf-project',
      name: 'Simple Shelf',
      parts: [],
      stocks: [],
      groups: [],
      groupMembers: []
    }))
  };

  const builtInB = {
    id: 'cabinet',
    name: 'Basic Cabinet',
    description: 'A basic cabinet',
    thumbnail: '🗄️',
    thumbnailData: null,
    dimensions: { width: 30, height: 36, depth: 24 },
    partCount: 12,
    type: 'built-in' as const,
    generate: vi.fn(() => ({
      id: 'cabinet-project',
      name: 'Basic Cabinet',
      parts: [],
      stocks: [],
      groups: [],
      groupMembers: []
    }))
  };

  return {
    builtInTemplates: [tutorialTemplate, builtInA, builtInB],
    formatDimensions: vi.fn(
      (d: { width: number; height: number; depth: number }) => `${d.width}" × ${d.height}" × ${d.depth}"`
    ),
    BuiltInTemplate: {},
    UserTemplate: {},
    ProjectTemplate: {}
  };
});

beforeAll(() => {
  window.electronAPI = {
    ...window.electronAPI,
    trackTemplateUsage: vi.fn().mockResolvedValue(undefined)
  };
});

describe('TemplatesSection', () => {
  const defaultProps = {
    userTemplates: [],
    onNewProject: vi.fn(),
    onViewAllTemplates: vi.fn(),
    onSelectTemplate: vi.fn(),
    onStartTutorial: vi.fn()
  };

  it('renders section heading', () => {
    render(<TemplatesSection {...defaultProps} />);
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('renders blank project button', () => {
    render(<TemplatesSection {...defaultProps} />);
    expect(screen.getByTitle('Start with a blank project')).toBeInTheDocument();
    expect(screen.getByText('Blank')).toBeInTheDocument();
  });

  it('calls onNewProject when blank clicked', () => {
    const onNewProject = vi.fn();
    render(<TemplatesSection {...defaultProps} onNewProject={onNewProject} />);
    fireEvent.click(screen.getByTitle('Start with a blank project'));
    expect(onNewProject).toHaveBeenCalled();
  });

  it('renders tutorial template', () => {
    render(<TemplatesSection {...defaultProps} />);
    expect(screen.getByText('Tutorial')).toBeInTheDocument();
    expect(screen.getByText('Guided walkthrough')).toBeInTheDocument();
  });

  it('calls onStartTutorial when tutorial clicked', () => {
    const onStartTutorial = vi.fn();
    render(<TemplatesSection {...defaultProps} onStartTutorial={onStartTutorial} />);
    fireEvent.click(screen.getByTitle('Learn the basics'));
    expect(onStartTutorial).toHaveBeenCalled();
  });

  it('renders built-in templates', () => {
    render(<TemplatesSection {...defaultProps} />);
    expect(screen.getByText('Simple Shelf')).toBeInTheDocument();
    expect(screen.getByText('Basic Cabinet')).toBeInTheDocument();
  });

  it('calls onSelectTemplate when built-in template clicked', () => {
    const onSelectTemplate = vi.fn();
    render(<TemplatesSection {...defaultProps} onSelectTemplate={onSelectTemplate} />);
    fireEvent.click(screen.getByText('Simple Shelf').closest('[role="button"]')!);
    expect(onSelectTemplate).toHaveBeenCalled();
  });

  it('renders View All button', () => {
    render(<TemplatesSection {...defaultProps} />);
    expect(screen.getByText('View All')).toBeInTheDocument();
  });

  it('calls onViewAllTemplates when View All clicked', () => {
    const onViewAll = vi.fn();
    render(<TemplatesSection {...defaultProps} onViewAllTemplates={onViewAll} />);
    fireEvent.click(screen.getByText('View All'));
    expect(onViewAll).toHaveBeenCalled();
  });

  it('shows dimensions and part count', () => {
    render(<TemplatesSection {...defaultProps} />);
    expect(screen.getByText('36" × 48" × 12" • 8 parts')).toBeInTheDocument();
  });

  it('renders user templates with Custom badge', () => {
    const userTemplates = [
      {
        id: 'user-1',
        name: 'My Custom Template',
        description: 'Custom template',
        thumbnail: '🔨',
        thumbnailData: null,
        dimensions: { width: 20, height: 30, depth: 10 },
        partCount: 3,
        type: 'user' as const,
        project: JSON.stringify({ parts: [], stocks: [], groups: [], groupMembers: [] }),
        createdAt: '2025-01-01T00:00:00Z',
        lastUsedAt: null
      }
    ];
    render(<TemplatesSection {...defaultProps} userTemplates={userTemplates} />);
    expect(screen.getByText('My Custom Template')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('tracks usage for user templates', () => {
    const userTemplates = [
      {
        id: 'user-1',
        name: 'User Template',
        description: 'Custom',
        thumbnail: '🔨',
        thumbnailData: null,
        dimensions: { width: 20, height: 30, depth: 10 },
        partCount: 3,
        type: 'user' as const,
        project: JSON.stringify({
          parts: [],
          stocks: [],
          groups: [],
          groupMembers: [],
          createdAt: '2025-01-01T00:00:00Z',
          modifiedAt: '2025-01-01T00:00:00Z'
        }),
        createdAt: '2025-01-01T00:00:00Z',
        lastUsedAt: null
      }
    ];
    render(<TemplatesSection {...defaultProps} userTemplates={userTemplates} />);
    fireEvent.click(screen.getByText('User Template').closest('[role="button"]')!);
    expect(window.electronAPI.trackTemplateUsage).toHaveBeenCalledWith('user-1');
  });

  it('prioritizes recently used user templates', () => {
    const userTemplates = [
      {
        id: 'unused',
        name: 'Unused Template',
        description: 'Unused',
        thumbnail: '🔨',
        thumbnailData: null,
        dimensions: { width: 10, height: 10, depth: 10 },
        partCount: 1,
        type: 'user' as const,
        project: JSON.stringify({ parts: [], stocks: [], groups: [], groupMembers: [] }),
        createdAt: '2025-01-01T00:00:00Z',
        lastUsedAt: null
      },
      {
        id: 'used',
        name: 'Recently Used',
        description: 'Used',
        thumbnail: '🔧',
        thumbnailData: null,
        dimensions: { width: 20, height: 20, depth: 20 },
        partCount: 2,
        type: 'user' as const,
        project: JSON.stringify({ parts: [], stocks: [], groups: [], groupMembers: [] }),
        createdAt: '2025-01-01T00:00:00Z',
        lastUsedAt: '2025-01-15T00:00:00Z'
      }
    ];

    render(<TemplatesSection {...defaultProps} userTemplates={userTemplates} />);
    // Recently used should appear (it gets priority)
    expect(screen.getByText('Recently Used')).toBeInTheDocument();
  });
});
