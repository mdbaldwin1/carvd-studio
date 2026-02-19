export default function Footer() {
  return (
    <footer className="container mt-16 border-t border-border py-12 text-center text-text-muted max-md:mt-12 max-md:py-8 max-sm:mt-8">
      <nav aria-label="Footer navigation" className="mb-6">
        <div className="mb-4 flex flex-wrap justify-center gap-12 max-sm:gap-4">
          <a
            href="/features"
            className="inline-flex min-h-11 items-center px-2 py-1 font-medium text-text transition-colors hover:text-highlight"
          >
            Features
          </a>
          <a
            href="/pricing"
            className="inline-flex min-h-11 items-center px-2 py-1 font-medium text-text transition-colors hover:text-highlight"
          >
            Pricing
          </a>
          <a
            href="/docs"
            className="inline-flex min-h-11 items-center px-2 py-1 font-medium text-text transition-colors hover:text-highlight"
          >
            Documentation
          </a>
          <a
            href="/support"
            className="inline-flex min-h-11 items-center px-2 py-1 font-medium text-text transition-colors hover:text-highlight"
          >
            Support
          </a>
        </div>
        <div className="flex flex-wrap justify-center gap-8 text-sm max-sm:flex-col max-sm:gap-2">
          <a
            href="/privacy"
            className="inline-flex items-center px-2 py-1 font-medium text-text-muted transition-colors hover:text-highlight"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            className="inline-flex items-center px-2 py-1 font-medium text-text-muted transition-colors hover:text-highlight"
          >
            Terms of Service
          </a>
          <a
            href="/changelog"
            className="inline-flex items-center px-2 py-1 font-medium text-text-muted transition-colors hover:text-highlight"
          >
            Changelog
          </a>
        </div>
      </nav>
      <p>&copy; 2026 Carvd Studio. All rights reserved.</p>
    </footer>
  );
}
