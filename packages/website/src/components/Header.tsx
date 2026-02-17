export default function Header() {
  return (
    <header className="header">
      <nav className="nav container">
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
