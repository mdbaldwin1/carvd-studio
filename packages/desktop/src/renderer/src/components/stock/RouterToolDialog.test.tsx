import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RouterToolDefinition } from '@renderer/types';
import { generateRouterToolSections, RouterToolDialog, RouterToolSilhouette } from './RouterToolDialog';

const libraryProfile = vi.hoisted(() => ({
  version: 1 as const,
  id: 'profile-1',
  name: 'Library Cove',
  family: 'cove',
  source: 'generic' as const,
  parameters: {},
  boundary: { start: { u: 0, v: 0.25 }, segments: [{ kind: 'line' as const, to: { u: 0.25, v: 0 } }] }
}));
vi.mock('@renderer/hooks/useRouterProfileLibrary', () => ({
  useRouterProfileLibrary: () => ({ profiles: [libraryProfile] })
}));

const detailedTool: RouterToolDefinition = {
  version: 1,
  id: 'detailed',
  name: 'Measured Cove',
  source: 'manufacturer',
  manufacturer: 'Acme',
  sku: 'C-1',
  profileFamily: 'cove',
  cutterDiameter: 0.75,
  shankDiameter: 0.25,
  cuttingHeight: 0.375,
  envelopeVersion: 1,
  sections: [
    { role: 'cutter', start: 0, end: 0.375, diameter: 0.75 },
    { role: 'shank', start: 0.375, end: 1.625, diameter: 0.25 }
  ],
  overallLength: 2.125,
  safeColletInsertion: 0.5
};

describe('RouterToolDialog source metadata', () => {
  it('reveals clearly labeled manufacturer metadata in keyboard order', () => {
    render(<RouterToolDialog open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByLabelText('Manufacturer (required)')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'manufacturer' } });
    const manufacturer = screen.getByLabelText('Manufacturer (required)');
    const sku = screen.getByLabelText('SKU / Model (required)');
    const url = screen.getByLabelText('Product Source URL (optional)');
    expect(manufacturer).toBeInTheDocument();
    expect(sku).toBeInTheDocument();
    expect(url).toBeInTheDocument();
    expect(manufacturer.compareDocumentPosition(sku) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sku.compareDocumentPosition(url) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Catalog SKU, model, or part number.')).toBeInTheDocument();
  });
});

describe('RouterToolDialog detailed envelope', () => {
  it('keeps the simple legacy fields approachable until detail is enabled', () => {
    render(<RouterToolDialog open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Cutter Diameter')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Detailed tool envelope' })).not.toBeChecked();
    expect(screen.queryByRole('table', { name: 'Axial tool envelope sections' })).not.toBeInTheDocument();
  });

  it('generates reviewable sections without inventing a bearing position', () => {
    const generated = generateRouterToolSections({
      ...detailedTool,
      sections: undefined,
      envelopeVersion: undefined,
      bearingDiameter: 0.5
    });
    expect(generated.some((section) => section.role === 'bearing')).toBe(false);
    render(<RouterToolDialog open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Detailed tool envelope' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate sections from simple dimensions' }));
    expect(screen.getByRole('status')).toHaveTextContent('Inferred starting values');
    expect(screen.getByRole('table', { name: 'Axial tool envelope sections' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Axial router bit silhouette' })).toBeInTheDocument();
  });

  it('blocks invalid overlaps and permits explicitly stackable bearings', () => {
    render(
      <RouterToolDialog
        open
        initialTool={{
          ...detailedTool,
          bearingDiameter: 0.5,
          sections: [...detailedTool.sections!, { role: 'bearing', start: 0.1, end: 0.2, diameter: 0.5 }]
        }}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('overlapping bearings must be explicitly stackable');
    expect(screen.getByRole('button', { name: 'Save Tool' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Stackable' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('preserves exact detailed values when saving an imported tool', () => {
    const onSave = vi.fn();
    render(<RouterToolDialog open initialTool={detailedTool} onOpenChange={vi.fn()} onSave={onSave} />);
    expect(screen.getByLabelText('Section 2 end offset')).toHaveValue(1.625);
    fireEvent.click(screen.getByRole('button', { name: 'Save Tool' }));
    expect(onSave).toHaveBeenCalledWith(detailedTool);
  });

  it('provides a textual equivalent matching every silhouette section', () => {
    render(<RouterToolSilhouette sections={detailedTool.sections!} />);
    expect(screen.getByText(/cutter: offset 0 to 0.375, diameter 0.75/)).toBeInTheDocument();
    expect(screen.getByText(/shank: offset 0.375 to 1.625, diameter 0.25/)).toBeInTheDocument();
  });

  it('links and removes immutable certified profiles with explicit scaling bounds', () => {
    render(<RouterToolDialog open onOpenChange={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Library profile to link'), { target: { value: 'profile-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Link profile' }));
    expect(screen.getByRole('list', { name: 'Linked produced profiles' })).toHaveTextContent('Library Cove');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Manufacturer-certified uniform scaling' }));
    expect(screen.getByRole('alert')).toHaveTextContent('does not certify feeds, bearing contact, router setup');
    expect(screen.getByLabelText('Minimum Scale')).toHaveValue(0.5);
    expect(screen.getByLabelText('Maximum Scale')).toHaveValue(2);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Library Cove link' }));
    expect(screen.queryByRole('list', { name: 'Linked produced profiles' })).not.toBeInTheDocument();
  });
});
