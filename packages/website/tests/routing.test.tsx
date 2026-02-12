import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HomePage from '../src/pages/HomePage';
import FeaturesPage from '../src/pages/FeaturesPage';
import PricingPage from '../src/pages/PricingPage';
import DocsPage from '../src/pages/DocsPage';
import PrivacyPolicyPage from '../src/pages/PrivacyPolicyPage';
import TermsPage from '../src/pages/TermsPage';
import NotFoundPage from '../src/pages/NotFoundPage';

// Create a test router that mimics the app's routing structure
// We can't use App directly because it already has a BrowserRouter
const TestRouter = ({ initialRoute }: { initialRoute: string }) => {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Routing', () => {
  describe('HomePage route', () => {
    it('renders HomePage at /', () => {
      render(<TestRouter initialRoute="/" />);
      expect(screen.getByText(/Stop Wasting Wood/i)).toBeInTheDocument();
    });

    it('renders HomePage hero content', () => {
      render(<TestRouter initialRoute="/" />);
      expect(screen.getByText(/Start Building Smarter/i)).toBeInTheDocument();
    });
  });

  describe('FeaturesPage route', () => {
    it('renders FeaturesPage at /features', () => {
      render(<TestRouter initialRoute="/features" />);
      expect(screen.getByText(/Every Tool You Need/i)).toBeInTheDocument();
    });
  });

  describe('PricingPage route', () => {
    it('renders PricingPage at /pricing', () => {
      render(<TestRouter initialRoute="/pricing" />);
      // "Own It Forever" appears multiple times on the pricing page
      const ownItForeverTexts = screen.getAllByText(/Own It Forever/i);
      expect(ownItForeverTexts.length).toBeGreaterThan(0);
    });
  });

  describe('DocsPage route', () => {
    it('renders DocsPage at /docs', () => {
      render(<TestRouter initialRoute="/docs" />);
      // DocsPage should have documentation content
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });
  });

  describe('PrivacyPolicyPage route', () => {
    it('renders PrivacyPolicyPage at /privacy', () => {
      render(<TestRouter initialRoute="/privacy" />);
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });
  });

  describe('TermsPage route', () => {
    it('renders TermsPage at /terms', () => {
      render(<TestRouter initialRoute="/terms" />);
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });
  });

  describe('NotFoundPage route', () => {
    it('renders NotFoundPage for unknown routes', () => {
      render(<TestRouter initialRoute="/this-page-does-not-exist" />);
      expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('renders NotFoundPage for deeply nested unknown routes', () => {
      render(<TestRouter initialRoute="/some/deeply/nested/route" />);
      expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
    });

    it('renders NotFoundPage with recovery options', () => {
      render(<TestRouter initialRoute="/unknown-page" />);
      expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
    });
  });

  describe('navigation consistency', () => {
    it('HomePage has navigation header with brand', () => {
      render(<TestRouter initialRoute="/" />);
      const header = screen.getByRole('banner');
      const brandLink = within(header).getByRole('link', { name: /carvd studio/i });
      expect(brandLink).toBeInTheDocument();
    });

    it('FeaturesPage has navigation header with brand', () => {
      render(<TestRouter initialRoute="/features" />);
      const header = screen.getByRole('banner');
      const brandLink = within(header).getByRole('link', { name: /carvd studio/i });
      expect(brandLink).toBeInTheDocument();
    });

    it('PricingPage has navigation header with brand', () => {
      render(<TestRouter initialRoute="/pricing" />);
      const header = screen.getByRole('banner');
      const brandLink = within(header).getByRole('link', { name: /carvd studio/i });
      expect(brandLink).toBeInTheDocument();
    });

    it('NotFoundPage has navigation header with brand', () => {
      render(<TestRouter initialRoute="/unknown" />);
      const header = screen.getByRole('banner');
      const brandLink = within(header).getByRole('link', { name: /carvd studio/i });
      expect(brandLink).toBeInTheDocument();
    });

    it('all main pages have footer with copyright', () => {
      const routes = ['/', '/features', '/pricing', '/unknown'];

      routes.forEach((route) => {
        const { unmount } = render(<TestRouter initialRoute={route} />);
        expect(screen.getByText(/© 2026 Carvd Studio/i)).toBeInTheDocument();
        unmount();
      });
    });
  });
});
