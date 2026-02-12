import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SupportPage from '../../src/pages/SupportPage';

const renderSupportPage = () => {
  return render(
    <BrowserRouter>
      <SupportPage />
    </BrowserRouter>
  );
};

describe('SupportPage', () => {
  describe('Header', () => {
    it('renders navigation with brand link', () => {
      renderSupportPage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /carvd studio/i })).toHaveAttribute('href', '/');
    });

    it('renders navigation links', () => {
      renderSupportPage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /pricing/i })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: /docs/i })).toBeInTheDocument();
    });

    it('renders download button in nav', () => {
      renderSupportPage();
      const header = screen.getByRole('banner');
      expect(within(header).getByRole('link', { name: /download/i })).toBeInTheDocument();
    });
  });

  describe('Hero Section', () => {
    it('renders main heading', () => {
      renderSupportPage();
      expect(screen.getByRole('heading', { level: 1, name: /how can we help/i })).toBeInTheDocument();
    });

    it('renders subtitle', () => {
      renderSupportPage();
      expect(screen.getByText(/find answers to common questions/i)).toBeInTheDocument();
    });
  });

  describe('Quick Links Section', () => {
    it('renders troubleshooting card', () => {
      renderSupportPage();
      // Troubleshooting appears in quick links card and as a section heading
      const troubleshootingElements = screen.getAllByText('Troubleshooting');
      expect(troubleshootingElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Fix common issues')).toBeInTheDocument();
    });

    it('renders FAQ card', () => {
      renderSupportPage();
      // FAQ appears in quick links and as a section heading
      const faqElements = screen.getAllByText('FAQ');
      expect(faqElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Quick answers')).toBeInTheDocument();
    });

    it('renders Contact Us card', () => {
      renderSupportPage();
      // Contact Us appears in quick links card and as a section heading
      const contactElements = screen.getAllByText('Contact Us');
      expect(contactElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Get personal help')).toBeInTheDocument();
    });

    it('quick links have correct anchor hrefs', () => {
      renderSupportPage();
      // Get links by href since names include spans with different text
      const troubleshootingLink = screen.getByRole('link', { name: /fix common issues/i });
      expect(troubleshootingLink).toHaveAttribute('href', '#troubleshooting');

      const faqLink = screen.getByRole('link', { name: /quick answers/i });
      expect(faqLink).toHaveAttribute('href', '#faq');

      const contactLink = screen.getByRole('link', { name: /get personal help/i });
      expect(contactLink).toHaveAttribute('href', '#contact');
    });
  });

  describe('Troubleshooting Section', () => {
    it('renders troubleshooting heading', () => {
      renderSupportPage();
      const headings = screen.getAllByRole('heading', { level: 2 });
      const troubleshootingHeading = headings.find(h => h.textContent === 'Troubleshooting');
      expect(troubleshootingHeading).toBeInTheDocument();
    });

    it('renders installation issues section', () => {
      renderSupportPage();
      expect(screen.getByText(/installation issues/i)).toBeInTheDocument();
    });

    it('renders macOS installation troubleshoot', () => {
      renderSupportPage();
      expect(screen.getByText(/carvd studio can't be opened because apple cannot check/i)).toBeInTheDocument();
    });

    it('renders Windows SmartScreen troubleshoot', () => {
      renderSupportPage();
      expect(screen.getByText(/smartscreen prevented an unrecognized app/i)).toBeInTheDocument();
    });

    it('renders license and activation section', () => {
      renderSupportPage();
      expect(screen.getByText(/license & activation/i)).toBeInTheDocument();
    });

    it('renders license key troubleshoot', () => {
      renderSupportPage();
      expect(screen.getByText(/my license key isn't working/i)).toBeInTheDocument();
    });

    it('renders app issues section', () => {
      renderSupportPage();
      expect(screen.getByText(/app issues/i)).toBeInTheDocument();
    });

    it('renders project file troubleshoot', () => {
      renderSupportPage();
      expect(screen.getByText(/my project file won't open/i)).toBeInTheDocument();
    });

    it('renders 3D view performance troubleshoot', () => {
      renderSupportPage();
      expect(screen.getByText(/the 3d view is slow or laggy/i)).toBeInTheDocument();
    });

    it('renders cut list troubleshoot', () => {
      renderSupportPage();
      expect(screen.getByText(/cut list calculations seem wrong/i)).toBeInTheDocument();
    });
  });

  describe('FAQ Section', () => {
    it('renders FAQ heading', () => {
      renderSupportPage();
      expect(screen.getByRole('heading', { level: 2, name: /frequently asked questions/i })).toBeInTheDocument();
    });

    it('renders General FAQ category', () => {
      renderSupportPage();
      expect(screen.getByRole('heading', { level: 3, name: /^general$/i })).toBeInTheDocument();
    });

    it('renders Pricing & Licensing FAQ category', () => {
      renderSupportPage();
      expect(screen.getByRole('heading', { level: 3, name: /pricing & licensing/i })).toBeInTheDocument();
    });

    it('renders Features FAQ category', () => {
      renderSupportPage();
      expect(screen.getByRole('heading', { level: 3, name: /^features$/i })).toBeInTheDocument();
    });

    it('renders Technical FAQ category', () => {
      renderSupportPage();
      expect(screen.getByRole('heading', { level: 3, name: /^technical$/i })).toBeInTheDocument();
    });

    it('renders FAQ about what Carvd Studio is', () => {
      renderSupportPage();
      expect(screen.getByText(/what is carvd studio\?/i)).toBeInTheDocument();
    });

    it('renders FAQ about offline usage', () => {
      renderSupportPage();
      expect(screen.getByText(/do i need internet to use carvd studio\?/i)).toBeInTheDocument();
    });

    it('renders FAQ about free trial', () => {
      renderSupportPage();
      expect(screen.getByText(/is there a free trial\?/i)).toBeInTheDocument();
    });

    it('renders FAQ about subscription', () => {
      renderSupportPage();
      expect(screen.getByText(/is this a subscription\?/i)).toBeInTheDocument();
    });

    it('renders FAQ about license computers', () => {
      renderSupportPage();
      expect(screen.getByText(/how many computers can i use my license on\?/i)).toBeInTheDocument();
    });

    it('renders FAQ about refunds', () => {
      renderSupportPage();
      expect(screen.getByText(/do you offer refunds\?/i)).toBeInTheDocument();
    });

    it('renders FAQ about system requirements', () => {
      renderSupportPage();
      expect(screen.getByText(/what are the system requirements\?/i)).toBeInTheDocument();
    });

    it('renders FAQ about updates', () => {
      renderSupportPage();
      expect(screen.getByText(/how do i update to a new version\?/i)).toBeInTheDocument();
    });
  });

  describe('Contact Section', () => {
    it('renders contact heading', () => {
      renderSupportPage();
      const headings = screen.getAllByRole('heading', { level: 2 });
      const contactHeading = headings.find(h => h.textContent === 'Contact Us');
      expect(contactHeading).toBeInTheDocument();
    });

    it('renders email support section', () => {
      renderSupportPage();
      expect(screen.getByText(/email support/i)).toBeInTheDocument();
    });

    it('renders support email link', () => {
      renderSupportPage();
      const emailLinks = screen.getAllByRole('link', { name: /support@carvd-studio\.com/i });
      expect(emailLinks.length).toBeGreaterThan(0);
    });

    it('renders response time info', () => {
      renderSupportPage();
      expect(screen.getByText(/we typically respond within 24 hours/i)).toBeInTheDocument();
    });

    it('renders documentation section', () => {
      renderSupportPage();
      // Documentation appears in nav, contact section, and footer
      const docElements = screen.getAllByText(/documentation/i);
      expect(docElements.length).toBeGreaterThan(0);
    });

    it('renders documentation link', () => {
      renderSupportPage();
      expect(screen.getByRole('link', { name: /view documentation/i })).toHaveAttribute('href', '/docs');
    });

    it('renders support checklist', () => {
      renderSupportPage();
      expect(screen.getByText(/when contacting support, please include/i)).toBeInTheDocument();
      expect(screen.getByText(/your operating system.*and version/i)).toBeInTheDocument();
      expect(screen.getByText(/carvd studio version/i)).toBeInTheDocument();
    });
  });

  describe('CTA Section', () => {
    it('renders CTA heading', () => {
      renderSupportPage();
      expect(screen.getByText(/didn't find what you need\?/i)).toBeInTheDocument();
    });

    it('renders CTA description', () => {
      renderSupportPage();
      expect(screen.getByText(/our support team is here to help/i)).toBeInTheDocument();
    });

    it('renders contact support button', () => {
      renderSupportPage();
      const buttons = screen.getAllByRole('link', { name: /contact support/i });
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Footer', () => {
    it('renders footer with links', () => {
      renderSupportPage();
      const footer = screen.getByRole('contentinfo');
      expect(within(footer).getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
      expect(within(footer).getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
      expect(within(footer).getByRole('link', { name: /documentation/i })).toBeInTheDocument();
    });

    it('renders copyright notice', () => {
      renderSupportPage();
      expect(screen.getByText(/© 2026 carvd studio/i)).toBeInTheDocument();
    });
  });
});
