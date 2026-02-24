import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppSettingsModal } from './AppSettingsModal';
import { AppSettings } from '../../types';

// Mock window.electronAPI and window.confirm
beforeAll(() => {
  window.electronAPI = {} as typeof window.electronAPI;

  // Define confirm for testing
  window.confirm = vi.fn();
});

describe('AppSettingsModal', () => {
  const defaultSettings: AppSettings = {
    theme: 'dark',
    showHotkeyHints: true,
    defaultUnits: 'imperial',
    defaultGridSize: 0.25,
    confirmBeforeDelete: true,
    snapSensitivity: 'normal',
    liveGridSnap: false,
    snapToOrigin: true,
    dimensionSnapSameTypeOnly: false,
    stockConstraints: {
      constrainDimensions: true,
      constrainGrain: true,
      constrainColor: true,
      preventOverlap: false
    }
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    settings: defaultSettings,
    onUpdateSettings: vi.fn()
  };

  const openTab = (name: string) => {
    fireEvent.click(screen.getByRole('tab', { name }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<AppSettingsModal {...defaultProps} />);

      expect(screen.getByText('App Settings')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<AppSettingsModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('App Settings')).not.toBeInTheDocument();
    });

    it('shows Appearance section', () => {
      render(<AppSettingsModal {...defaultProps} />);

      expect(screen.getByText('Appearance')).toBeInTheDocument();
    });

    it('shows Defaults for New Projects section', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('New Project Defaults');

      expect(screen.getByText('Defaults for New Projects')).toBeInTheDocument();
    });

    it('shows Behavior section', () => {
      render(<AppSettingsModal {...defaultProps} />);

      expect(screen.getByText('Behavior')).toBeInTheDocument();
    });

    it('shows Snapping section', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('General');

      expect(screen.getByText('Snapping')).toBeInTheDocument();
    });

    it('shows Stock Constraints section', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('New Project Defaults');

      expect(screen.getByText('Stock Constraints (Defaults)')).toBeInTheDocument();
    });

    it('shows Done button', () => {
      render(<AppSettingsModal {...defaultProps} />);

      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  describe('theme settings', () => {
    it('shows theme selector', () => {
      render(<AppSettingsModal {...defaultProps} />);

      expect(screen.getByText('Theme')).toBeInTheDocument();
    });

    it('displays current theme', () => {
      render(<AppSettingsModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Dark')).toBeInTheDocument();
    });

    it('calls onUpdateSettings when theme changes', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);

      fireEvent.change(screen.getByDisplayValue('Dark'), {
        target: { value: 'light' }
      });

      expect(onUpdateSettings).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('shows theme options', () => {
      render(<AppSettingsModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Dark' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Light' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'System' })).toBeInTheDocument();
    });
  });

  describe('hotkey hints', () => {
    it('shows hotkey hints checkbox', () => {
      render(<AppSettingsModal {...defaultProps} />);

      expect(screen.getByText('Show Hotkey Hints')).toBeInTheDocument();
    });

    it('calls onUpdateSettings when toggled', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const hotkeyCheckbox = checkboxes[0]; // First checkbox is hotkey hints

      fireEvent.click(hotkeyCheckbox);

      expect(onUpdateSettings).toHaveBeenCalledWith({ showHotkeyHints: false });
    });
  });

  describe('default units', () => {
    it('shows units selector', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('New Project Defaults');

      expect(screen.getByText('Units')).toBeInTheDocument();
    });

    it('displays current units', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('New Project Defaults');

      expect(screen.getByDisplayValue('Imperial (inches)')).toBeInTheDocument();
    });

    it('shows imperial grid options when imperial selected', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('New Project Defaults');

      expect(screen.getByRole('option', { name: '1/4"' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '1/2"' })).toBeInTheDocument();
    });

    it('shows metric grid options when metric selected', () => {
      render(<AppSettingsModal {...defaultProps} settings={{ ...defaultSettings, defaultUnits: 'metric' }} />);
      openTab('New Project Defaults');

      expect(screen.getByRole('option', { name: '5mm' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '10mm' })).toBeInTheDocument();
    });
  });

  describe('confirm before delete', () => {
    it('shows confirm before delete checkbox', () => {
      render(<AppSettingsModal {...defaultProps} />);

      expect(screen.getByText('Confirm Before Delete')).toBeInTheDocument();
    });

    it('calls onUpdateSettings when toggled', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);

      // Find Confirm Before Delete checkbox by its label
      const checkboxes = screen.getAllByRole('checkbox');
      const confirmDeleteCheckbox = checkboxes.find((cb) => {
        const label = cb.closest('.settings-row')?.querySelector('label');
        return label?.textContent === 'Confirm Before Delete';
      });

      fireEvent.click(confirmDeleteCheckbox!);

      expect(onUpdateSettings).toHaveBeenCalledWith({ confirmBeforeDelete: false });
    });
  });

  describe('snap settings', () => {
    it('shows snap sensitivity selector', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('General');

      expect(screen.getByText('Snap Sensitivity')).toBeInTheDocument();
    });

    it('shows snap sensitivity options', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('General');

      expect(screen.getByRole('option', { name: 'Tight (precise)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Normal' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Loose (easier)' })).toBeInTheDocument();
    });

    it('shows live grid snapping checkbox', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('General');

      expect(screen.getByText('Live Grid Snapping')).toBeInTheDocument();
    });

    it('shows snap to origin checkbox', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('General');

      expect(screen.getByText('Snap to Origin')).toBeInTheDocument();
    });

    it('shows match same dimensions checkbox', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('General');

      expect(screen.getByText('Match Same Dimensions Only')).toBeInTheDocument();
    });
  });

  describe('stock constraints defaults', () => {
    it('shows constrain dimensions checkbox', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('New Project Defaults');

      expect(screen.getByText('Constrain Dimensions')).toBeInTheDocument();
    });

    it('shows constrain grain checkbox', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('New Project Defaults');

      expect(screen.getByText('Constrain Grain Direction')).toBeInTheDocument();
    });

    it('shows auto-sync color checkbox', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('New Project Defaults');

      expect(screen.getByText('Auto-sync Color')).toBeInTheDocument();
    });

    it('shows prevent overlap checkbox', () => {
      render(<AppSettingsModal {...defaultProps} />);
      openTab('New Project Defaults');

      expect(screen.getByText('Prevent Overlap')).toBeInTheDocument();
    });
  });

  describe('license info', () => {
    it('does not show license section when no licenseData provided', () => {
      render(<AppSettingsModal {...defaultProps} />);

      expect(screen.queryByText('License')).not.toBeInTheDocument();
    });

    it('shows license section when licenseData provided', () => {
      render(
        <AppSettingsModal
          {...defaultProps}
          licenseData={{
            licenseEmail: 'test@example.com',
            licenseOrderId: 'ORDER-123',
            licenseActivatedAt: '2024-01-01T00:00:00.000Z'
          }}
        />
      );
      openTab('Data & License');

      expect(screen.getByText('License')).toBeInTheDocument();
    });

    it('shows license active status when licensed', () => {
      render(
        <AppSettingsModal
          {...defaultProps}
          licenseData={{
            licenseEmail: 'test@example.com',
            licenseOrderId: 'ORDER-123',
            licenseActivatedAt: '2024-01-01T00:00:00.000Z'
          }}
        />
      );
      openTab('Data & License');

      expect(screen.getByText('License Active')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('ORDER-123')).toBeInTheDocument();
    });

    it('shows trial purchase + activation actions when in trial mode with no email', () => {
      const mockOnShowLicenseModal = vi.fn();
      render(
        <AppSettingsModal
          {...defaultProps}
          licenseMode="trial"
          licenseData={{
            licenseEmail: null,
            licenseOrderId: null,
            licenseActivatedAt: null
          }}
          onShowLicenseModal={mockOnShowLicenseModal}
        />
      );
      openTab('Data & License');

      expect(screen.getByText(/free trial/)).toBeInTheDocument();
      expect(screen.getByText('Purchase License')).toBeInTheDocument();
      expect(screen.getByText('Enter License Key')).toBeInTheDocument();
    });

    it('shows upgrade section when in free mode with no email', () => {
      const mockOnShowLicenseModal = vi.fn();
      render(
        <AppSettingsModal
          {...defaultProps}
          licenseMode="free"
          licenseData={{
            licenseEmail: null,
            licenseOrderId: null,
            licenseActivatedAt: null
          }}
          onShowLicenseModal={mockOnShowLicenseModal}
        />
      );
      openTab('Data & License');

      expect(screen.getByText(/You're using the free version/)).toBeInTheDocument();
      expect(screen.getByText('Purchase License')).toBeInTheDocument();
      expect(screen.getByText('Enter License Key')).toBeInTheDocument();
    });

    it('shows deactivate button when licensed and callback provided', () => {
      render(
        <AppSettingsModal
          {...defaultProps}
          licenseData={{
            licenseEmail: 'test@example.com',
            licenseOrderId: 'ORDER-123',
            licenseActivatedAt: '2024-01-01T00:00:00.000Z'
          }}
          onDeactivateLicense={vi.fn()}
        />
      );
      openTab('Data & License');

      expect(screen.getByText('Deactivate License')).toBeInTheDocument();
    });
  });

  describe('units conversion', () => {
    it('calls onUpdateSettings with both units and grid when units change', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('New Project Defaults');

      fireEvent.change(screen.getByDisplayValue('Imperial (inches)'), {
        target: { value: 'metric' }
      });

      expect(onUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultUnits: 'metric',
          defaultGridSize: expect.any(Number)
        })
      );
    });

    it('converts grid size when switching from imperial to metric', () => {
      const onUpdateSettings = vi.fn();
      // Start with 0.25" (1/4")
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('New Project Defaults');

      fireEvent.change(screen.getByDisplayValue('Imperial (inches)'), {
        target: { value: 'metric' }
      });

      // Should get called with new grid size
      const call = onUpdateSettings.mock.calls[0][0];
      expect(call.defaultUnits).toBe('metric');
      expect(call.defaultGridSize).toBeDefined();
    });
  });

  describe('grid size', () => {
    it('calls onUpdateSettings when grid size changes', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('New Project Defaults');

      // Find the grid size select (second select after units)
      const selects = screen.getAllByRole('combobox');
      const gridSelect = selects.find((s) => s.querySelector('option[value="0.5"]'));

      fireEvent.change(gridSelect!, { target: { value: '0.5' } });

      expect(onUpdateSettings).toHaveBeenCalledWith({ defaultGridSize: 0.5 });
    });

    it('shows correct grid options for metric', () => {
      render(<AppSettingsModal {...defaultProps} settings={{ ...defaultSettings, defaultUnits: 'metric' }} />);
      openTab('New Project Defaults');

      expect(screen.getByRole('option', { name: '1mm' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '2mm' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '25mm' })).toBeInTheDocument();
    });
  });

  describe('snap sensitivity', () => {
    it('calls onUpdateSettings when snap sensitivity changes', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('General');

      fireEvent.change(screen.getByDisplayValue('Normal'), {
        target: { value: 'tight' }
      });

      expect(onUpdateSettings).toHaveBeenCalledWith({ snapSensitivity: 'tight' });
    });

    it('changes to loose sensitivity', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('General');

      fireEvent.change(screen.getByDisplayValue('Normal'), {
        target: { value: 'loose' }
      });

      expect(onUpdateSettings).toHaveBeenCalledWith({ snapSensitivity: 'loose' });
    });
  });

  describe('live grid snapping', () => {
    it('calls onUpdateSettings when toggled', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('General');

      // Find Live Grid Snapping checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      const liveGridCheckbox = checkboxes.find((cb) => {
        const label = cb.closest('.settings-row')?.querySelector('label');
        return label?.textContent === 'Live Grid Snapping';
      });

      fireEvent.click(liveGridCheckbox!);

      expect(onUpdateSettings).toHaveBeenCalledWith({ liveGridSnap: true });
    });
  });

  describe('snap to origin', () => {
    it('calls onUpdateSettings when toggled', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('General');

      // Find Snap to Origin checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      const snapOriginCheckbox = checkboxes.find((cb) => {
        const label = cb.closest('.settings-row')?.querySelector('label');
        return label?.textContent === 'Snap to Origin';
      });

      fireEvent.click(snapOriginCheckbox!);

      expect(onUpdateSettings).toHaveBeenCalledWith({ snapToOrigin: false });
    });
  });

  describe('match same dimensions only', () => {
    it('calls onUpdateSettings when toggled', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('General');

      // Find Match Same Dimensions Only checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      const matchDimsCheckbox = checkboxes.find((cb) => {
        const label = cb.closest('.settings-row')?.querySelector('label');
        return label?.textContent === 'Match Same Dimensions Only';
      });

      fireEvent.click(matchDimsCheckbox!);

      expect(onUpdateSettings).toHaveBeenCalledWith({ dimensionSnapSameTypeOnly: true });
    });
  });

  describe('stock constraints toggles', () => {
    it('calls onUpdateSettings when constrain dimensions toggled', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('New Project Defaults');

      // Find Constrain Dimensions checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      const constrainDimsCheckbox = checkboxes.find((cb) => {
        const label = cb.closest('.settings-row')?.querySelector('label');
        return label?.textContent === 'Constrain Dimensions';
      });

      fireEvent.click(constrainDimsCheckbox!);

      expect(onUpdateSettings).toHaveBeenCalledWith({
        stockConstraints: expect.objectContaining({
          constrainDimensions: false
        })
      });
    });

    it('calls onUpdateSettings when constrain grain toggled', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('New Project Defaults');

      // Find Constrain Grain Direction checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      const constrainGrainCheckbox = checkboxes.find((cb) => {
        const label = cb.closest('.settings-row')?.querySelector('label');
        return label?.textContent === 'Constrain Grain Direction';
      });

      fireEvent.click(constrainGrainCheckbox!);

      expect(onUpdateSettings).toHaveBeenCalledWith({
        stockConstraints: expect.objectContaining({
          constrainGrain: false
        })
      });
    });

    it('calls onUpdateSettings when auto-sync color toggled', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('New Project Defaults');

      // Find Auto-sync Color checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      const syncColorCheckbox = checkboxes.find((cb) => {
        const label = cb.closest('.settings-row')?.querySelector('label');
        return label?.textContent === 'Auto-sync Color';
      });

      fireEvent.click(syncColorCheckbox!);

      expect(onUpdateSettings).toHaveBeenCalledWith({
        stockConstraints: expect.objectContaining({
          constrainColor: false
        })
      });
    });

    it('calls onUpdateSettings when prevent overlap toggled', () => {
      const onUpdateSettings = vi.fn();
      render(<AppSettingsModal {...defaultProps} onUpdateSettings={onUpdateSettings} />);
      openTab('New Project Defaults');

      // Find Prevent Overlap checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      const preventOverlapCheckbox = checkboxes.find((cb) => {
        const label = cb.closest('.settings-row')?.querySelector('label');
        return label?.textContent === 'Prevent Overlap';
      });

      fireEvent.click(preventOverlapCheckbox!);

      expect(onUpdateSettings).toHaveBeenCalledWith({
        stockConstraints: expect.objectContaining({
          preventOverlap: true
        })
      });
    });
  });

  describe('deactivate license', () => {
    it('calls onDeactivateLicense when confirmed', () => {
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const onDeactivateLicense = vi.fn();

      render(
        <AppSettingsModal
          {...defaultProps}
          licenseData={{
            licenseEmail: 'test@example.com',
            licenseOrderId: 'ORDER-123',
            licenseActivatedAt: '2024-01-01T00:00:00.000Z'
          }}
          onDeactivateLicense={onDeactivateLicense}
        />
      );
      openTab('Data & License');

      fireEvent.click(screen.getByText('Deactivate License'));

      expect(window.confirm).toHaveBeenCalled();
      expect(onDeactivateLicense).toHaveBeenCalled();
    });

    it('does not deactivate when cancelled', () => {
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const onDeactivateLicense = vi.fn();

      render(
        <AppSettingsModal
          {...defaultProps}
          licenseData={{
            licenseEmail: 'test@example.com',
            licenseOrderId: 'ORDER-123',
            licenseActivatedAt: '2024-01-01T00:00:00.000Z'
          }}
          onDeactivateLicense={onDeactivateLicense}
        />
      );
      openTab('Data & License');

      fireEvent.click(screen.getByText('Deactivate License'));

      expect(onDeactivateLicense).not.toHaveBeenCalled();
    });

    it('shows activation date when provided', () => {
      render(
        <AppSettingsModal
          {...defaultProps}
          licenseData={{
            licenseEmail: 'test@example.com',
            licenseOrderId: 'ORDER-123',
            licenseActivatedAt: '2024-06-15T00:00:00.000Z'
          }}
        />
      );
      openTab('Data & License');

      // Should show the formatted date
      expect(screen.getByText(/Activated:/)).toBeInTheDocument();
    });
  });

  describe('close interactions', () => {
    it('calls onClose when Done is clicked', () => {
      const onClose = vi.fn();
      render(<AppSettingsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Done'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      const onClose = vi.fn();
      render(<AppSettingsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('×'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose on Escape key', () => {
      const onClose = vi.fn();
      render(<AppSettingsModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<AppSettingsModal {...defaultProps} onClose={onClose} />);

      const backdrop = document.querySelector('[data-state="open"][class*="bg-overlay"]') as HTMLElement;
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
