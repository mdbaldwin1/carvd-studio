import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataManagementSection } from './DataManagementSection';

describe('DataManagementSection', () => {
  it('renders section heading', () => {
    render(<DataManagementSection isExporting={false} onExport={vi.fn()} onImport={vi.fn()} />);
    expect(screen.getByText('Data Management')).toBeInTheDocument();
  });

  it('renders export button', () => {
    render(<DataManagementSection isExporting={false} onExport={vi.fn()} onImport={vi.fn()} />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders import button', () => {
    render(<DataManagementSection isExporting={false} onExport={vi.fn()} onImport={vi.fn()} />);
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('calls onExport when export button clicked', () => {
    const onExport = vi.fn();
    render(<DataManagementSection isExporting={false} onExport={onExport} onImport={vi.fn()} />);
    fireEvent.click(screen.getByText('Export'));
    expect(onExport).toHaveBeenCalled();
  });

  it('calls onImport when import button clicked', () => {
    const onImport = vi.fn();
    render(<DataManagementSection isExporting={false} onExport={vi.fn()} onImport={onImport} />);
    fireEvent.click(screen.getByText('Import'));
    expect(onImport).toHaveBeenCalled();
  });

  it('shows exporting state and disables button', () => {
    render(<DataManagementSection isExporting={true} onExport={vi.fn()} onImport={vi.fn()} />);
    const exportBtn = screen.getByText('Exporting...');
    expect(exportBtn).toBeInTheDocument();
    expect(exportBtn.closest('button')).toBeDisabled();
  });

  it('does not call onExport when exporting', () => {
    const onExport = vi.fn();
    render(<DataManagementSection isExporting={true} onExport={onExport} onImport={vi.fn()} />);
    fireEvent.click(screen.getByText('Exporting...'));
    expect(onExport).not.toHaveBeenCalled();
  });
});
