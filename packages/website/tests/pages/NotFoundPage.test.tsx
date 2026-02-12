import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from '../../src/pages/NotFoundPage';

const renderNotFoundPage = () => {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>
  );
};

describe('NotFoundPage', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      expect(() => renderNotFoundPage()).not.toThrow();
    });

    it('displays 404 error code', () => {
      renderNotFoundPage();
      expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('displays page not found message', () => {
      renderNotFoundPage();
      expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
    });

    it('displays friendly error message', () => {
      renderNotFoundPage();
      expect(screen.getByText(/Looks like this board got cut a little short/i)).toBeInTheDocument();
    });

    it('displays wood emoji', () => {
      renderNotFoundPage();
      expect(screen.getByText('🪵')).toBeInTheDocument();
    });
  });

  describe('navigation actions', () => {
    it('renders back to home button', () => {
      renderNotFoundPage();
      expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
    });

    it('back to home button links to root', () => {
      renderNotFoundPage();
      const homeLink = screen.getByRole('link', { name: /back to home/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('renders view documentation button', () => {
      renderNotFoundPage();
      expect(screen.getByRole('link', { name: /view documentation/i })).toBeInTheDocument();
    });

    it('view documentation button links to docs', () => {
      renderNotFoundPage();
      const docsLink = screen.getByRole('link', { name: /view documentation/i });
      expect(docsLink).toHaveAttribute('href', '/docs');
    });
  });

  describe('header navigation', () => {
    it('renders brand link', () => {
      renderNotFoundPage();
      expect(screen.getByRole('link', { name: /carvd studio/i })).toBeInTheDocument();
    });

    it('renders navigation links', () => {
      renderNotFoundPage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /pricing/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /docs/i })).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('renders footer links', () => {
      renderNotFoundPage();
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
    });

    it('renders copyright', () => {
      renderNotFoundPage();
      expect(screen.getByText(/© 2026 Carvd Studio/i)).toBeInTheDocument();
    });

    it('renders support link', () => {
      renderNotFoundPage();
      expect(screen.getByRole('link', { name: /support/i })).toBeInTheDocument();
    });
  });
});
