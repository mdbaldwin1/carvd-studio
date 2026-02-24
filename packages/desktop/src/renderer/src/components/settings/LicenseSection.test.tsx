import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LicenseSection } from './LicenseSection';

beforeAll(() => {
  window.confirm = vi.fn();
});

describe('LicenseSection', () => {
  it('renders section heading', () => {
    render(
      <LicenseSection
        licenseData={{ licenseEmail: null, licenseOrderId: null, licenseActivatedAt: null }}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('License')).toBeInTheDocument();
  });

  describe('licensed state', () => {
    const licenseData = {
      licenseEmail: 'user@example.com',
      licenseOrderId: 'ORD-12345',
      licenseActivatedAt: '2025-01-15T10:00:00Z'
    };

    it('shows active license info', () => {
      render(<LicenseSection licenseMode="licensed" licenseData={licenseData} onClose={vi.fn()} />);
      expect(screen.getByText('License Active')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('ORD-12345')).toBeInTheDocument();
    });

    it('shows activation date', () => {
      render(<LicenseSection licenseMode="licensed" licenseData={licenseData} onClose={vi.fn()} />);
      expect(screen.getByText(/Activated:/)).toBeInTheDocument();
    });

    it('hides activation date when null', () => {
      const data = { ...licenseData, licenseActivatedAt: null };
      render(<LicenseSection licenseMode="licensed" licenseData={data} onClose={vi.fn()} />);
      expect(screen.queryByText(/Activated:/)).not.toBeInTheDocument();
    });

    it('shows deactivate button when callback provided', () => {
      render(
        <LicenseSection
          licenseMode="licensed"
          licenseData={licenseData}
          onDeactivateLicense={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('Deactivate License')).toBeInTheDocument();
    });

    it('hides deactivate button when callback not provided', () => {
      render(<LicenseSection licenseMode="licensed" licenseData={licenseData} onClose={vi.fn()} />);
      expect(screen.queryByText('Deactivate License')).not.toBeInTheDocument();
    });

    it('calls onDeactivateLicense after confirm', () => {
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const onDeactivate = vi.fn();
      render(
        <LicenseSection
          licenseMode="licensed"
          licenseData={licenseData}
          onDeactivateLicense={onDeactivate}
          onClose={vi.fn()}
        />
      );
      fireEvent.click(screen.getByText('Deactivate License'));
      expect(onDeactivate).toHaveBeenCalled();
    });

    it('does not deactivate when confirm cancelled', () => {
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const onDeactivate = vi.fn();
      render(
        <LicenseSection
          licenseMode="licensed"
          licenseData={licenseData}
          onDeactivateLicense={onDeactivate}
          onClose={vi.fn()}
        />
      );
      fireEvent.click(screen.getByText('Deactivate License'));
      expect(onDeactivate).not.toHaveBeenCalled();
    });
  });

  describe('free mode', () => {
    const licenseData = { licenseEmail: null, licenseOrderId: null, licenseActivatedAt: null };

    it('shows upgrade messaging', () => {
      render(<LicenseSection licenseMode="free" licenseData={licenseData} onClose={vi.fn()} />);
      expect(screen.getByText(/free version/)).toBeInTheDocument();
    });

    it('shows purchase license link', () => {
      render(<LicenseSection licenseMode="free" licenseData={licenseData} onClose={vi.fn()} />);
      const link = screen.getByText('Purchase License');
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toBe('https://carvd-studio.com/pricing');
      expect(link.getAttribute('target')).toBe('_blank');
    });

    it('shows enter license key button when callback provided', () => {
      render(
        <LicenseSection licenseMode="free" licenseData={licenseData} onShowLicenseModal={vi.fn()} onClose={vi.fn()} />
      );
      expect(screen.getByText('Enter License Key')).toBeInTheDocument();
    });

    it('calls onClose then onShowLicenseModal when clicking enter license key', () => {
      const onClose = vi.fn();
      const onShowModal = vi.fn();
      render(
        <LicenseSection
          licenseMode="free"
          licenseData={licenseData}
          onShowLicenseModal={onShowModal}
          onClose={onClose}
        />
      );
      fireEvent.click(screen.getByText('Enter License Key'));
      expect(onClose).toHaveBeenCalled();
      expect(onShowModal).toHaveBeenCalled();
    });

    it('hides enter license key button when callback not provided', () => {
      render(<LicenseSection licenseMode="free" licenseData={licenseData} onClose={vi.fn()} />);
      expect(screen.queryByText('Enter License Key')).not.toBeInTheDocument();
    });
  });

  describe('trial mode', () => {
    const licenseData = { licenseEmail: null, licenseOrderId: null, licenseActivatedAt: null };

    it('shows trial purchase messaging', () => {
      render(<LicenseSection licenseMode="trial" licenseData={licenseData} onClose={vi.fn()} />);
      expect(screen.getByText(/free trial/)).toBeInTheDocument();
    });

    it('shows purchase license link', () => {
      render(<LicenseSection licenseMode="trial" licenseData={licenseData} onClose={vi.fn()} />);
      expect(screen.getByText('Purchase License')).toBeInTheDocument();
    });

    it('shows enter license key button when callback provided', () => {
      render(
        <LicenseSection licenseMode="trial" licenseData={licenseData} onShowLicenseModal={vi.fn()} onClose={vi.fn()} />
      );
      expect(screen.getByText('Enter License Key')).toBeInTheDocument();
    });

    it('does not show deactivate button', () => {
      render(<LicenseSection licenseMode="trial" licenseData={licenseData} onClose={vi.fn()} />);
      expect(screen.queryByText('Deactivate License')).not.toBeInTheDocument();
    });
  });
});
