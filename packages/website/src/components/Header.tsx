export default function Header() {
  return (
    <header className="header">
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      <nav className="nav container" aria-label="Main navigation">
        <a href="/" className="nav-brand">
          Carvd Studio
        </a>
        <div className="nav-links">
          <a href="/features" className="nav-link">
            Features
          </a>
          <a href="/pricing" className="nav-link">
            Pricing
          </a>
          <a href="/docs" className="nav-link">
            Docs
          </a>
          <a href="/download" className="btn btn-highlight btn-sm">
            Download
          </a>
        </div>
      </nav>
    </header>
  );
}
