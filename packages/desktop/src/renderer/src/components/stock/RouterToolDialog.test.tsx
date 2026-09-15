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

describe('RouterToolDialog detailed envelope editing', () => {
  const openDetailed = (onSave = vi.fn()) => {
    render(<RouterToolDialog open initialTool={detailedTool} onOpenChange={vi.fn()} onSave={onSave} />);
    return onSave;
  };

  it('refuses an envelope that contradicts the simple dimensions', () => {
    const onSave = openDetailed();
    fireEvent.change(screen.getByLabelText('Section 1 end offset'), { target: { value: '0.4' } });
    fireEvent.change(screen.getByLabelText('Section 2 start offset'), { target: { value: '0.4' } });
    fireEvent.change(screen.getByLabelText('Section 2 diameter'), { target: { value: '0.5' } });
    expect(screen.getByText(/cutter span must match cuttingHeight/)).toBeInTheDocument();
    expect(screen.getByText(/shank diameter must match shankDiameter/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Tool' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves an edited envelope once the simple dimensions agree', () => {
    const onSave = openDetailed();
    fireEvent.change(screen.getByLabelText('Cutting Height'), { target: { value: '0.4' } });
    fireEvent.change(screen.getByLabelText('Shank Diameter'), { target: { value: '0.5' } });
    fireEvent.change(screen.getByLabelText('Section 1 end offset'), { target: { value: '0.4' } });
    fireEvent.change(screen.getByLabelText('Section 2 start offset'), { target: { value: '0.4' } });
    fireEvent.change(screen.getByLabelText('Section 2 diameter'), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Tool' }));
    const saved = onSave.mock.calls[0][0] as RouterToolDefinition;
    expect(saved.sections?.[0]).toMatchObject({ role: 'cutter', end: 0.4 });
    expect(saved.sections?.[1]).toMatchObject({ role: 'shank', start: 0.4, diameter: 0.5 });
  });

  it('reorders sections with the move controls', () => {
    const onSave = openDetailed();
    fireEvent.click(screen.getByLabelText(/Move section 2 up/));
    expect(screen.getByLabelText(/Section 1 role/)).toHaveValue('shank');
    fireEvent.click(screen.getByLabelText(/Move section 1 down/));
    expect(screen.getByLabelText(/Section 1 role/)).toHaveValue('cutter');
    void onSave;
  });

  it('adds and deletes a section', () => {
    openDetailed();
    const before = screen.getAllByLabelText(/Section \d+ role/).length;
    fireEvent.click(screen.getByRole('button', { name: /Add section/ }));
    expect(screen.getAllByLabelText(/Section \d+ role/)).toHaveLength(before + 1);
    fireEvent.click(screen.getByLabelText(new RegExp(`Delete section ${before + 1}`)));
    expect(screen.getAllByLabelText(/Section \d+ role/)).toHaveLength(before);
  });

  it('offers a stackable choice only for a bearing', () => {
    openDetailed();
    fireEvent.change(screen.getByLabelText(/Section 2 role/), { target: { value: 'bearing' } });
    const stackable = screen.getAllByRole('checkbox').at(-1);
    expect(stackable).toBeDefined();
    fireEvent.click(stackable!);
    expect(stackable).toBeChecked();
  });

  it('generates a starting envelope for a tool that has none', () => {
    const basic: RouterToolDefinition = {
      version: 1,
      id: 'basic',
      name: 'Legacy Bit',
      source: 'generic',
      profileFamily: 'roundover',
      cutterDiameter: 0.5,
      shankDiameter: 0.25,
      cuttingHeight: 0.25
    };
    render(<RouterToolDialog open initialTool={basic} onOpenChange={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Detailed tool envelope' }));
    expect(generateRouterToolSections(basic).length).toBeGreaterThan(0);
  });
});
