import React from 'react';

export default function NotFoundPage() {
  return (
    <div className="page bg-gradient-radial">
      {/* Header */}
      <header className="header">
        <nav className="nav container">
          <a href="/" className="nav-brand">Carvd Studio</a>
          <div className="nav-links">
            <a href="/features" className="nav-link">Features</a>
            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/docs" className="nav-link">Docs</a>
            <a href="/download" className="btn btn-highlight btn-sm">Download</a>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="page-content container">
        <div className="py-3xl">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-9xl mb-lg">🪵</div>
            <h1 className="text-6xl font-bold mb-lg">404</h1>
            <h2 className="text-3xl font-bold mb-md text-muted">Page Not Found</h2>
            <p className="text-xl text-muted mb-3xl">
              Looks like this board got cut a little short. The page you're looking for doesn't exist.
            </p>
            <div className="flex gap-md justify-center">
              <a href="/" className="btn btn-highlight btn-lg">
                Back to Home
              </a>
              <a href="/docs" className="btn btn-outline btn-lg">
                View Documentation
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer container">
        <div className="mb-lg">
          <div className="flex justify-center gap-2xl mb-md">
            <a href="/features" className="nav-link">Features</a>
            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/docs" className="nav-link">Documentation</a>
            <a href="/support" className="nav-link">Support</a>
          </div>
          <div className="flex justify-center gap-xl text-sm text-muted">
            <a href="/privacy" className="nav-link">Privacy Policy</a>
            <a href="/terms" className="nav-link">Terms of Service</a>
          </div>
        </div>
        <p>&copy; 2026 Carvd Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
