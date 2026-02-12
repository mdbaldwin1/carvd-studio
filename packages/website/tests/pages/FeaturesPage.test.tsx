import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FeaturesPage from '../../src/pages/FeaturesPage';

const renderFeaturesPage = () => {
  return render(
    <MemoryRouter>
      <FeaturesPage />
    </MemoryRouter>
  );
};

describe('FeaturesPage', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      expect(() => renderFeaturesPage()).not.toThrow();
    });

    it('renders page headline', () => {
      renderFeaturesPage();
      expect(screen.getByText(/Every Tool You Need/i)).toBeInTheDocument();
      expect(screen.getByText(/Nothing You Don't/i)).toBeInTheDocument();
    });

    it('renders page subtitle', () => {
      renderFeaturesPage();
      expect(screen.getByText(/Designed by woodworkers who were tired of complicated software/i)).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('renders navigation links in header', () => {
      renderFeaturesPage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /pricing/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /docs/i })).toBeInTheDocument();
    });

    it('renders back to home link', () => {
      renderFeaturesPage();
      expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
    });
  });

  describe('main features', () => {
    it('renders 3D design section', () => {
      renderFeaturesPage();
      expect(screen.getByText(/3D Design That Makes Sense/i)).toBeInTheDocument();
      expect(screen.getByText(/Real-Time 3D Visualization/i)).toBeInTheDocument();
      expect(screen.getByText(/Intuitive Interface/i)).toBeInTheDocument();
      expect(screen.getByText(/Catch Mistakes Before Cutting/i)).toBeInTheDocument();
    });

    it('renders cut list optimization section', () => {
      renderFeaturesPage();
      expect(screen.getByText(/Smart Cut List Generation/i)).toBeInTheDocument();
      expect(screen.getByText(/Automatic Optimization/i)).toBeInTheDocument();
      expect(screen.getByText(/Professional Cut Sheets/i)).toBeInTheDocument();
      expect(screen.getByText(/Material Shopping Lists/i)).toBeInTheDocument();
    });

    it('renders cost tracking section', () => {
      renderFeaturesPage();
      expect(screen.getByText(/Real-Time Cost Tracking/i)).toBeInTheDocument();
      expect(screen.getByText(/Live Material Costs/i)).toBeInTheDocument();
      expect(screen.getByText(/Accurate Client Quotes/i)).toBeInTheDocument();
      expect(screen.getByText(/Custom Materials Library/i)).toBeInTheDocument();
    });

    it('renders privacy section', () => {
      renderFeaturesPage();
      expect(screen.getByText(/Your Work Stays Private/i)).toBeInTheDocument();
      expect(screen.getByText(/100% Offline Operation/i)).toBeInTheDocument();
      expect(screen.getByText(/Complete Data Privacy/i)).toBeInTheDocument();
      expect(screen.getByText(/No Subscription Hostage/i)).toBeInTheDocument();
    });
  });

  describe('additional features', () => {
    it('renders additional features heading', () => {
      renderFeaturesPage();
      expect(screen.getByText(/And There's More/i)).toBeInTheDocument();
    });

    it('renders lightning fast performance card', () => {
      renderFeaturesPage();
      expect(screen.getByText(/Lightning Fast Performance/i)).toBeInTheDocument();
    });

    it('renders precision measurements card', () => {
      renderFeaturesPage();
      expect(screen.getByText(/Precision Measurements/i)).toBeInTheDocument();
    });

    it('renders joinery allowances card', () => {
      renderFeaturesPage();
      expect(screen.getByText(/Joinery Allowances/i)).toBeInTheDocument();
    });

    it('renders export options card', () => {
      renderFeaturesPage();
      expect(screen.getByText(/Export Options/i)).toBeInTheDocument();
    });

    it('renders free updates card', () => {
      renderFeaturesPage();
      // "Free updates forever" appears both as a card title and in the CTA footer
      const freeUpdatesTexts = screen.getAllByText(/Free Updates Forever/i);
      expect(freeUpdatesTexts.length).toBeGreaterThan(0);
    });
  });

  describe('CTA section', () => {
    it('renders CTA heading', () => {
      renderFeaturesPage();
      expect(screen.getByText(/Ready to Design Smarter/i)).toBeInTheDocument();
    });

    it('renders download trial link', () => {
      renderFeaturesPage();
      const downloadLinks = screen.getAllByRole('link', { name: /download free trial/i });
      expect(downloadLinks.length).toBeGreaterThan(0);
    });

    it('renders buy button', () => {
      renderFeaturesPage();
      expect(screen.getByRole('link', { name: /buy license/i })).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('renders footer with legal links', () => {
      renderFeaturesPage();
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
    });

    it('renders copyright', () => {
      renderFeaturesPage();
      expect(screen.getByText(/© 2026 Carvd Studio/i)).toBeInTheDocument();
    });
  });
});
