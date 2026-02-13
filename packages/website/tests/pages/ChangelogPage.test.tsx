import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ChangelogPage from '../../src/pages/ChangelogPage';

const renderChangelogPage = () => {
  return render(
    <BrowserRouter>
      <ChangelogPage />
    </BrowserRouter>
  );
};

describe('ChangelogPage', () => {
  describe('Header', () => {
    it('renders navigation with brand link', () => {
      renderChangelogPage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /carvd studio/i })).toHaveAttribute('href', '/');
    });

    it('renders navigation links', () => {
      renderChangelogPage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /pricing/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /docs/i })).toBeInTheDocument();
    });

    it('renders download button in nav', () => {
      renderChangelogPage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /download/i })).toBeInTheDocument();
    });
  });

  describe('Page Content', () => {
    it('renders main heading', () => {
      renderChangelogPage();
      expect(screen.getByRole('heading', { level: 1, name: /changelog/i })).toBeInTheDocument();
    });

    it('renders intro text', () => {
      renderChangelogPage();
      expect(screen.getByText(/all notable changes to carvd studio/i)).toBeInTheDocument();
    });

    it('renders semantic versioning link', () => {
      renderChangelogPage();
      expect(screen.getByRole('link', { name: /semantic versioning/i })).toHaveAttribute(
        'href',
        'https://semver.org/'
      );
    });
  });

  describe('Version Entries', () => {
    it('renders version badge for v0.1.1', () => {
      renderChangelogPage();
      expect(screen.getByText('v0.1.1')).toBeInTheDocument();
    });

    it('renders version badge for v0.1.0', () => {
      renderChangelogPage();
      expect(screen.getByText('v0.1.0')).toBeInTheDocument();
    });

    it('renders formatted dates', () => {
      renderChangelogPage();
      expect(screen.getByText('February 13, 2026')).toBeInTheDocument();
      expect(screen.getByText('February 12, 2025')).toBeInTheDocument();
    });

    it('renders Added category badge', () => {
      renderChangelogPage();
      const badges = screen.getAllByText('Added');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it('renders changelog entries', () => {
      renderChangelogPage();
      expect(screen.getByText('3D Furniture Design Editor')).toBeInTheDocument();
      expect(screen.getByText('Part Management')).toBeInTheDocument();
      expect(screen.getByText('Cut List Optimizer')).toBeInTheDocument();
    });

    it('renders entry descriptions', () => {
      renderChangelogPage();
      expect(
        screen.getByText(/interactive workspace with real-time 3d visualization/i)
      ).toBeInTheDocument();
    });
  });

  describe('Back Link', () => {
    it('renders back to documentation link', () => {
      renderChangelogPage();
      const backLink = screen.getByRole('link', { name: /back to documentation/i });
      expect(backLink).toHaveAttribute('href', '/docs');
    });
  });

  describe('Footer', () => {
    it('renders footer with standard links', () => {
      renderChangelogPage();
      const footer = screen.getByRole('contentinfo');
      expect(within(footer).getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
      expect(within(footer).getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
      expect(within(footer).getByRole('link', { name: /documentation/i })).toBeInTheDocument();
    });

    it('renders changelog link in footer', () => {
      renderChangelogPage();
      const footer = screen.getByRole('contentinfo');
      expect(within(footer).getByRole('link', { name: /changelog/i })).toBeInTheDocument();
    });

    it('renders copyright notice', () => {
      renderChangelogPage();
      expect(screen.getByText(/© 2026 carvd studio/i)).toBeInTheDocument();
    });
  });
});
