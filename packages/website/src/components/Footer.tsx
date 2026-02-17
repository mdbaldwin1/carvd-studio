export default function Footer() {
  return (
    <footer className="footer container">
      <div className="mb-lg">
        <div className="flex justify-center gap-2xl mb-md">
          <a href="/features" className="nav-link">
            Features
          </a>
          <a href="/pricing" className="nav-link">
            Pricing
          </a>
          <a href="/docs" className="nav-link">
            Documentation
          </a>
          <a href="/support" className="nav-link">
            Support
          </a>
        </div>
        <div className="flex justify-center gap-xl text-sm text-muted">
          <a href="/privacy" className="nav-link">
            Privacy Policy
          </a>
          <a href="/terms" className="nav-link">
            Terms of Service
          </a>
          <a href="/changelog" className="nav-link">
            Changelog
          </a>
        </div>
      </div>
      <p>&copy; 2026 Carvd Studio. All rights reserved.</p>
    </footer>
  );
}
