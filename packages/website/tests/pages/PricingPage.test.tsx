import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PricingPage from '../../src/pages/PricingPage';

const renderPricingPage = () => {
  return render(
    <MemoryRouter>
      <PricingPage />
    </MemoryRouter>
  );
};

describe('PricingPage', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      expect(() => renderPricingPage()).not.toThrow();
    });

    it('renders page headline', () => {
      renderPricingPage();
      // "Own It Forever" and "Pay Once" appear multiple times on the page
      const ownItForeverTexts = screen.getAllByText(/Own It Forever/i);
      expect(ownItForeverTexts.length).toBeGreaterThan(0);
      const payOnceTexts = screen.getAllByText(/Pay Once/i);
      expect(payOnceTexts.length).toBeGreaterThan(0);
    });

    it('renders pricing badge', () => {
      renderPricingPage();
      expect(screen.getByText(/Less Than 6 Months of Subscription Software/i)).toBeInTheDocument();
    });
  });

  describe('pricing card', () => {
    it('displays the price', () => {
      renderPricingPage();
      const priceElements = screen.getAllByText(/\$59\.99/i);
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('displays one-time payment text', () => {
      renderPricingPage();
      // "one-time payment" may appear multiple times
      const oneTimePaymentTexts = screen.getAllByText(/one-time payment/i);
      expect(oneTimePaymentTexts.length).toBeGreaterThan(0);
    });

    it('displays yours forever text', () => {
      renderPricingPage();
      expect(screen.getByText(/yours forever/i)).toBeInTheDocument();
    });

    it('renders everything included heading', () => {
      renderPricingPage();
      expect(screen.getByText(/Everything Included/i)).toBeInTheDocument();
    });

    it('renders feature checklist items', () => {
      renderPricingPage();
      expect(screen.getByText(/Full 3D furniture design studio/i)).toBeInTheDocument();
      expect(screen.getByText(/Intelligent cut list optimizer/i)).toBeInTheDocument();
      expect(screen.getByText(/Real-time material cost tracking/i)).toBeInTheDocument();
      expect(screen.getByText(/Free lifetime updates/i)).toBeInTheDocument();
      expect(screen.getByText(/Install on up to 3 devices/i)).toBeInTheDocument();
    });

    it('renders download trial button', () => {
      renderPricingPage();
      const downloadLinks = screen.getAllByRole('link', { name: /download free trial/i });
      expect(downloadLinks.length).toBeGreaterThan(0);
    });

    it('renders buy button', () => {
      renderPricingPage();
      const buyButtons = screen.getAllByRole('link', { name: /buy license/i });
      expect(buyButtons.length).toBeGreaterThan(0);
    });

    it('displays trust signals', () => {
      renderPricingPage();
      // Trust signals appear in multiple places
      const guaranteeTexts = screen.getAllByText(/30-day money-back guarantee/i);
      expect(guaranteeTexts.length).toBeGreaterThan(0);
      expect(screen.getByText(/Instant download/i)).toBeInTheDocument();
      expect(screen.getByText(/Secure checkout/i)).toBeInTheDocument();
    });
  });

  describe('value comparison', () => {
    it('renders break-even heading', () => {
      renderPricingPage();
      expect(screen.getByText(/The Break-Even Point\? 6 Months\./i)).toBeInTheDocument();
    });

    it('renders subscription comparison card', () => {
      renderPricingPage();
      // "Monthly Subscription" may appear multiple times (heading and card)
      const monthlySubTexts = screen.getAllByText(/Monthly Subscription/i);
      expect(monthlySubTexts.length).toBeGreaterThan(0);
      // $10/mo may also appear multiple times
      const priceTexts = screen.getAllByText(/\$10\/mo/i);
      expect(priceTexts.length).toBeGreaterThan(0);
    });

    it('renders savings callout', () => {
      renderPricingPage();
      expect(screen.getByText(/Save \$540 over 5 years/i)).toBeInTheDocument();
    });
  });

  describe('ROI calculator', () => {
    it('renders ROI section heading', () => {
      renderPricingPage();
      expect(screen.getByText(/How It Could Pay For Itself/i)).toBeInTheDocument();
    });

    it('displays hypothetical example disclaimer', () => {
      renderPricingPage();
      // "hypothetical example" appears in both heading and disclaimer
      const hypotheticalTexts = screen.getAllByText(/hypothetical example/i);
      expect(hypotheticalTexts.length).toBeGreaterThan(0);
    });

    it('displays material savings', () => {
      renderPricingPage();
      const priceTexts = screen.getAllByText(/\$80/);
      expect(priceTexts.length).toBeGreaterThan(0);
      expect(screen.getByText(/Potential material savings/i)).toBeInTheDocument();
    });

    it('displays time savings', () => {
      renderPricingPage();
      expect(screen.getByText(/\$125/)).toBeInTheDocument();
      expect(screen.getByText(/Potential time savings/i)).toBeInTheDocument();
    });

    it('displays mistake avoidance value', () => {
      renderPricingPage();
      expect(screen.getByText(/\$200/)).toBeInTheDocument();
      expect(screen.getByText(/Avoided cost of one mis-cut/i)).toBeInTheDocument();
    });

    it('displays total potential value with disclaimer', () => {
      renderPricingPage();
      expect(screen.getByText(/Potential Value:/i)).toBeInTheDocument();
      expect(screen.getByText(/\$405/)).toBeInTheDocument();
      expect(screen.getByText(/Your results will vary/i)).toBeInTheDocument();
    });
  });

  describe('competitor comparison', () => {
    it('renders comparison heading', () => {
      renderPricingPage();
      expect(screen.getByText(/How We Compare to Other Software/i)).toBeInTheDocument();
    });

    it('renders comparison table with competitors', () => {
      renderPricingPage();
      expect(screen.getByText(/SketchUp Pro/i)).toBeInTheDocument();
      // "Fusion 360" and "Cabinet Vision" appear in both table and descriptive text
      const fusionTexts = screen.getAllByText(/Fusion 360/i);
      expect(fusionTexts.length).toBeGreaterThan(0);
      const cabinetVisionTexts = screen.getAllByText(/Cabinet Vision/i);
      expect(cabinetVisionTexts.length).toBeGreaterThan(0);
    });

    it('highlights Carvd Studio in comparison', () => {
      renderPricingPage();
      // The comparison table should show Carvd Studio
      const carvdRows = screen.getAllByText(/Carvd Studio/i);
      expect(carvdRows.length).toBeGreaterThan(0);
    });
  });

  describe('FAQ section', () => {
    it('renders FAQ heading', () => {
      renderPricingPage();
      expect(screen.getByText(/Your Questions, Answered/i)).toBeInTheDocument();
    });

    it('renders FAQ questions', () => {
      renderPricingPage();
      expect(screen.getByText(/Is this really a one-time payment\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Do I get future updates\?/i)).toBeInTheDocument();
      expect(screen.getByText(/What if I'm not satisfied\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Can I use it on multiple computers\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Will it work offline\?/i)).toBeInTheDocument();
      expect(screen.getByText(/What if I need help\?/i)).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('renders navigation links in header', () => {
      renderPricingPage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /pricing/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /docs/i })).toBeInTheDocument();
    });

    it('renders back to home link', () => {
      renderPricingPage();
      expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('renders footer with legal links', () => {
      renderPricingPage();
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
    });

    it('renders copyright', () => {
      renderPricingPage();
      expect(screen.getByText(/© 2026 Carvd Studio/i)).toBeInTheDocument();
    });
  });
});
