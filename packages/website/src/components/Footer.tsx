export default function Footer() {
  return (
    <footer className="container mt-16 pb-12 max-md:mt-12 max-sm:mt-8">
      <div className="site-section px-6 py-8 text-center text-text-muted sm:px-8">
        <a
          href="/"
          aria-label="Footer home"
          className="mx-auto mb-6 inline-flex items-center justify-center rounded-md p-1 no-underline transition-opacity hover:opacity-90"
        >
          <img
            src="/branding/CarvdStudio-Horizontal-WHT.svg"
            alt=""
            aria-hidden="true"
            className="h-8 w-auto sm:h-9"
          />
        </a>

        <nav aria-label="Footer navigation" className="mb-6">
          <div className="mb-4 flex flex-wrap justify-center gap-8 max-sm:gap-4">
            <a
              href="/features"
              className="inline-flex min-h-11 items-center rounded-md px-2 py-1 font-medium text-text transition-colors hover:text-highlight"
            >
              Features
            </a>
            <a
              href="/pricing"
              className="inline-flex min-h-11 items-center rounded-md px-2 py-1 font-medium text-text transition-colors hover:text-highlight"
            >
              Pricing
            </a>
            <a
              href="/docs"
              className="inline-flex min-h-11 items-center rounded-md px-2 py-1 font-medium text-text transition-colors hover:text-highlight"
            >
              Documentation
            </a>
            <a
              href="/support"
              className="inline-flex min-h-11 items-center rounded-md px-2 py-1 font-medium text-text transition-colors hover:text-highlight"
            >
              Support
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm max-sm:flex-col max-sm:gap-2">
            <a
              href="/privacy"
              className="inline-flex items-center rounded-md px-2 py-1 font-medium text-text-muted transition-colors hover:text-highlight"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="inline-flex items-center rounded-md px-2 py-1 font-medium text-text-muted transition-colors hover:text-highlight"
            >
              Terms of Service
            </a>
            <a
              href="/changelog"
              className="inline-flex items-center rounded-md px-2 py-1 font-medium text-text-muted transition-colors hover:text-highlight"
            >
              Changelog
            </a>
          </div>
        </nav>

        <p className="text-sm">
          &copy; 2026 Carvd Studio. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
