import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../src/pages/HomePage';
import FeaturesPage from '../src/pages/FeaturesPage';
import PricingPage from '../src/pages/PricingPage';
import ChangelogPage from '../src/pages/ChangelogPage';
import NotFoundPage from '../src/pages/NotFoundPage';

// Helper to render with router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

// Helper to check for no violations
const expectNoViolations = async (container: HTMLElement) => {
  const results = await axe(container);
  // Check that there are no violations
  if (results.violations.length > 0) {
    // Format violations for better error messages
    const violationMessages = results.violations
      .map(
        (v) =>
          `${v.id}: ${v.description}\n  Impact: ${v.impact}\n  Nodes: ${v.nodes.map((n) => n.html).join('\n    ')}`
      )
      .join('\n\n');
    throw new Error(`Accessibility violations found:\n\n${violationMessages}`);
  }
  expect(results.violations).toHaveLength(0);
};

describe('Accessibility', () => {
  // Increase timeout for axe tests as they can be slow
  const axeTimeout = 30000;

  describe('HomePage', () => {
    it(
      'has no accessibility violations',
      async () => {
        const { container } = renderWithRouter(<HomePage />);
        await expectNoViolations(container);
      },
      axeTimeout
    );
  });

  describe('FeaturesPage', () => {
    it(
      'has no accessibility violations',
      async () => {
        const { container } = renderWithRouter(<FeaturesPage />);
        await expectNoViolations(container);
      },
      axeTimeout
    );
  });

  describe('PricingPage', () => {
    it(
      'has no accessibility violations',
      async () => {
        const { container } = renderWithRouter(<PricingPage />);
        await expectNoViolations(container);
      },
      axeTimeout
    );
  });

  describe('ChangelogPage', () => {
    it(
      'has no accessibility violations',
      async () => {
        const { container } = renderWithRouter(<ChangelogPage />);
        await expectNoViolations(container);
      },
      axeTimeout
    );
  });

  describe('NotFoundPage', () => {
    it(
      'has no accessibility violations',
      async () => {
        const { container } = renderWithRouter(<NotFoundPage />);
        await expectNoViolations(container);
      },
      axeTimeout
    );
  });
});
