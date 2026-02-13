import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../../src/pages/HomePage';

const renderHomePage = () => {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
};

describe('HomePage', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      expect(() => renderHomePage()).not.toThrow();
    });

    it('renders hero headline', () => {
      renderHomePage();
      expect(screen.getByText(/Stop Wasting Wood/i)).toBeInTheDocument();
      expect(screen.getByText(/Start Building Smarter/i)).toBeInTheDocument();
    });

    it('renders hero subtitle', () => {
      renderHomePage();
      expect(screen.getByText(/Professional furniture design software/i)).toBeInTheDocument();
    });

    it('renders trial messaging', () => {
      renderHomePage();
      // Multiple places may have this text, so use getAllByText
      const trialTexts = screen.getAllByText(/14-day free trial/i);
      expect(trialTexts.length).toBeGreaterThan(0);
    });
  });

  describe('navigation', () => {
    it('renders navigation links in header', () => {
      renderHomePage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /pricing/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /docs/i })).toBeInTheDocument();
    });

    it('renders brand link', () => {
      renderHomePage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /carvd studio/i })).toBeInTheDocument();
    });

    it('renders download button in nav', () => {
      renderHomePage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /download/i })).toBeInTheDocument();
    });
  });

  describe('download section', () => {
    it('renders download section heading', () => {
      renderHomePage();
      expect(screen.getByText(/Download Carvd Studio/i)).toBeInTheDocument();
    });

    it('renders macOS download card', () => {
      renderHomePage();
      // macOS appears in badge and download card - use download-specific content
      const dmgInstallerText = screen.getByText(/\.dmg installer/i);
      expect(dmgInstallerText).toBeInTheDocument();
      // Find the download card containing .dmg and verify macOS is there
      const downloadCard = dmgInstallerText.closest('a');
      expect(downloadCard).toHaveTextContent(/macOS/i);
    });

    it('renders Windows download card', () => {
      renderHomePage();
      // Windows appears in badge and download card - use download-specific content
      const exeInstallerText = screen.getByText(/\.exe installer/i);
      expect(exeInstallerText).toBeInTheDocument();
      // Find the download card containing .exe and verify Windows is there
      const downloadCard = exeInstallerText.closest('a');
      expect(downloadCard).toHaveTextContent(/Windows/i);
    });

    it('has correct macOS download href', () => {
      renderHomePage();
      // Find the download card by the .dmg installer text
      const dmgInstallerText = screen.getByText(/\.dmg installer/i);
      const macLink = dmgInstallerText.closest('a');
      expect(macLink).toHaveAttribute('href', expect.stringContaining('.dmg'));
      expect(macLink).toHaveAttribute('href', expect.stringContaining('github.com'));
    });

    it('has correct Windows download href', () => {
      renderHomePage();
      // Find the download card by the .exe installer text
      const exeInstallerText = screen.getByText(/\.exe installer/i);
      const winLink = exeInstallerText.closest('a');
      expect(winLink).toHaveAttribute('href', expect.stringContaining('.exe'));
      expect(winLink).toHaveAttribute('href', expect.stringContaining('github.com'));
    });

    it('displays system requirements', () => {
      renderHomePage();
      expect(screen.getByText(/macOS 10\.15\+/i)).toBeInTheDocument();
      expect(screen.getByText(/Windows 10\+/i)).toBeInTheDocument();
    });

    it('displays version badge', () => {
      renderHomePage();
      expect(screen.getByText(/Version 0\.1\.0/i)).toBeInTheDocument();
    });
  });

  describe('features section', () => {
    it('renders feature cards', () => {
      renderHomePage();
      expect(screen.getByText(/See It Before You Build It/i)).toBeInTheDocument();
      expect(screen.getByText(/Cut Lists That Save You Money/i)).toBeInTheDocument();
      expect(screen.getByText(/Know Your Costs Before You Quote/i)).toBeInTheDocument();
    });

    it('renders stats section', () => {
      renderHomePage();
      expect(screen.getByText(/Material Waste/i)).toBeInTheDocument();
      expect(screen.getByText(/Project Planning/i)).toBeInTheDocument();
      expect(screen.getByText(/Offline & Private/i)).toBeInTheDocument();
    });
  });

  describe('use cases section', () => {
    it('renders use case cards', () => {
      renderHomePage();
      expect(screen.getByText(/Custom Cabinet Shops/i)).toBeInTheDocument();
      expect(screen.getByText(/Furniture Makers/i)).toBeInTheDocument();
      expect(screen.getByText(/DIY Enthusiasts/i)).toBeInTheDocument();
    });
  });

  describe('comparison section', () => {
    it('renders pricing comparison table', () => {
      renderHomePage();
      expect(screen.getByText(/The Math Is Simple/i)).toBeInTheDocument();
      expect(screen.getByText(/\$59\.99 once/i)).toBeInTheDocument();
    });
  });

  describe('CTA section', () => {
    it('renders final CTA', () => {
      renderHomePage();
      expect(screen.getByText(/Ready to Build Smarter/i)).toBeInTheDocument();
    });

    it('renders buy button', () => {
      renderHomePage();
      expect(screen.getByRole('link', { name: /buy license/i })).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('renders footer links', () => {
      renderHomePage();
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
    });

    it('renders copyright', () => {
      renderHomePage();
      expect(screen.getByText(/© 2026 Carvd Studio/i)).toBeInTheDocument();
    });

    it('renders support link', () => {
      renderHomePage();
      expect(screen.getByRole('link', { name: /support/i })).toBeInTheDocument();
    });
  });
});
