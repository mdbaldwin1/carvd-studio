import {
  getAppVersion,
  getMacDownloadInfo,
  getWindowsDownloadInfo,
} from "../utils/downloads";

export default function DownloadPage() {
    const macDownload = getMacDownloadInfo();
    const windowsDownload = getWindowsDownloadInfo();
    const appVersion = getAppVersion();

    return (
        <div className="page bg-gradient-radial">
            {/* Header */}
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
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main>
                {/* Hero Download Section */}
                <section className="hero">
                    <div className="container">
                        <h1 className="hero-title text-5xl font-bold mb-lg">
                            Download Carvd Studio
                        </h1>
                        <p className="hero-subtitle max-w-2xl mx-auto">
                            Free to download. Try all features for 14 days. No
                            credit card required.
                        </p>
                        <p className="text-center mt-lg mb-xl">
                            <span className="badge badge-highlight">
                                Version {appVersion}
                            </span>
                        </p>
                        <div className="download-buttons">
                            <a href={macDownload.url} className="download-card">
                                <span className="download-icon">🍎</span>
                                <span className="download-platform">macOS</span>
                                <span className="download-file">
                                    {macDownload.fileExtension} installer
                                </span>
                                <span className="download-req">
                                    {macDownload.minOsVersion}
                                </span>
                            </a>
                            <a
                                href={windowsDownload.url}
                                className="download-card"
                            >
                                <span className="download-icon">🪟</span>
                                <span className="download-platform">
                                    Windows
                                </span>
                                <span className="download-file">
                                    {windowsDownload.fileExtension} installer
                                </span>
                                <span className="download-req">
                                    {windowsDownload.minOsVersion}
                                </span>
                            </a>
                        </div>
                    </div>
                </section>

                {/* Installation Instructions */}
                <section className="container mt-3xl">
                    <h2 className="text-3xl font-bold mb-xl text-center">
                        Installation Instructions
                    </h2>

                    <div className="grid grid-cols-2 gap-xl">
                        {/* macOS Instructions */}
                        <div className="card">
                            <h3 className="text-2xl font-bold mb-lg flex items-center gap-sm">
                                <span>🍎</span> macOS Installation
                            </h3>
                            <ol className="install-steps">
                                <li className="install-step">
                                    <span className="step-number">1</span>
                                    <div className="step-content">
                                        <strong>Download the installer</strong>
                                        <p className="text-muted">
                                            Click the macOS download button
                                            above to get the .dmg file.
                                        </p>
                                    </div>
                                </li>
                                <li className="install-step">
                                    <span className="step-number">2</span>
                                    <div className="step-content">
                                        <strong>Open the DMG file</strong>
                                        <p className="text-muted">
                                            Double-click the downloaded file to
                                            mount the disk image.
                                        </p>
                                    </div>
                                </li>
                                <li className="install-step">
                                    <span className="step-number">3</span>
                                    <div className="step-content">
                                        <strong>Drag to Applications</strong>
                                        <p className="text-muted">
                                            Drag the Carvd Studio icon to your
                                            Applications folder.
                                        </p>
                                    </div>
                                </li>
                                <li className="install-step">
                                    <span className="step-number">4</span>
                                    <div className="step-content">
                                        <strong>Launch the app</strong>
                                        <p className="text-muted">
                                            Open Carvd Studio from your
                                            Applications folder or Launchpad.
                                        </p>
                                    </div>
                                </li>
                            </ol>
                            <div className="accent-box-warning mt-lg">
                                <strong>First launch on macOS</strong>
                                <p className="text-muted mt-sm">
                                    If you see "Carvd Studio can't be opened
                                    because Apple cannot check it for malicious
                                    software", right-click the app and select
                                    "Open", then click "Open" in the dialog.
                                </p>
                            </div>
                        </div>

                        {/* Windows Instructions */}
                        <div className="card">
                            <h3 className="text-2xl font-bold mb-lg flex items-center gap-sm">
                                <span>🪟</span> Windows Installation
                            </h3>
                            <ol className="install-steps">
                                <li className="install-step">
                                    <span className="step-number">1</span>
                                    <div className="step-content">
                                        <strong>Download the installer</strong>
                                        <p className="text-muted">
                                            Click the Windows download button
                                            above to get the .exe file.
                                        </p>
                                    </div>
                                </li>
                                <li className="install-step">
                                    <span className="step-number">2</span>
                                    <div className="step-content">
                                        <strong>Run the installer</strong>
                                        <p className="text-muted">
                                            Double-click the downloaded .exe
                                            file to start installation.
                                        </p>
                                    </div>
                                </li>
                                <li className="install-step">
                                    <span className="step-number">3</span>
                                    <div className="step-content">
                                        <strong>Follow the prompts</strong>
                                        <p className="text-muted">
                                            Accept the license agreement and
                                            choose your installation location.
                                        </p>
                                    </div>
                                </li>
                                <li className="install-step">
                                    <span className="step-number">4</span>
                                    <div className="step-content">
                                        <strong>Launch the app</strong>
                                        <p className="text-muted">
                                            Find Carvd Studio in your Start menu
                                            or desktop shortcut.
                                        </p>
                                    </div>
                                </li>
                            </ol>
                            <div className="accent-box-warning mt-lg">
                                <strong>Windows SmartScreen</strong>
                                <p className="text-muted mt-sm">
                                    If Windows SmartScreen appears, click "More
                                    info" then "Run anyway". This happens
                                    because the app is new and building trust
                                    with Microsoft.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Version History */}
                <section id="changelog" className="container mt-3xl">
                    <h2 className="text-3xl font-bold mb-xl text-center">
                        Version History
                    </h2>

                    <div className="max-w-3xl mx-auto">
                        <div className="version-entry">
                            <div className="version-header">
                                <span className="version-number">
                                    v{appVersion}
                                </span>
                                <span className="version-date">
                                    Current Release
                                </span>
                                <span className="badge badge-highlight">
                                    Latest
                                </span>
                            </div>
                            <div className="version-content">
                                <h4 className="font-bold mb-sm">
                                    Initial Release
                                </h4>
                                <ul className="version-changes">
                                    <li>
                                        3D furniture design workspace with
                                        intuitive controls
                                    </li>
                                    <li>
                                        Smart cut list optimizer to minimize
                                        material waste
                                    </li>
                                    <li>
                                        Cost tracking with custom pricing per
                                        material
                                    </li>
                                    <li>
                                        Project templates and reusable
                                        assemblies
                                    </li>
                                    <li>
                                        PDF export for cut lists and project
                                        summaries
                                    </li>
                                    <li>
                                        Stock library management with custom
                                        materials
                                    </li>
                                    <li>
                                        Offline-first architecture - no internet
                                        required
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Placeholder for future versions */}
                        {/*
            <div className="version-entry">
              <div className="version-header">
                <span className="version-number">v0.9.0</span>
                <span className="version-date">January 2024</span>
              </div>
              <div className="version-content">
                <h4 className="font-bold mb-sm">Beta Release</h4>
                <ul className="version-changes">
                  <li>Feature description here</li>
                </ul>
              </div>
            </div>
            */}
                    </div>
                </section>

                {/* System Requirements */}
                <section className="container mt-3xl">
                    <h2 className="text-3xl font-bold mb-xl text-center">
                        System Requirements
                    </h2>

                    <div className="grid grid-cols-2 gap-xl max-w-4xl mx-auto">
                        <div className="card">
                            <h3 className="text-xl font-bold mb-md">
                                🍎 macOS
                            </h3>
                            <ul className="requirements-list">
                                <li>
                                    <strong>OS:</strong> macOS 10.15 (Catalina)
                                    or later
                                </li>
                                <li>
                                    <strong>Processor:</strong> Intel or Apple
                                    Silicon
                                </li>
                                <li>
                                    <strong>Memory:</strong> 4 GB RAM minimum
                                </li>
                                <li>
                                    <strong>Storage:</strong> 200 MB available
                                    space
                                </li>
                                <li>
                                    <strong>Display:</strong> 1280x720 minimum
                                    resolution
                                </li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-bold mb-md">
                                🪟 Windows
                            </h3>
                            <ul className="requirements-list">
                                <li>
                                    <strong>OS:</strong> Windows 10 or later
                                    (64-bit)
                                </li>
                                <li>
                                    <strong>Processor:</strong> Intel Core i3 or
                                    equivalent
                                </li>
                                <li>
                                    <strong>Memory:</strong> 4 GB RAM minimum
                                </li>
                                <li>
                                    <strong>Storage:</strong> 200 MB available
                                    space
                                </li>
                                <li>
                                    <strong>Display:</strong> 1280x720 minimum
                                    resolution
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="container mt-3xl mb-3xl">
                    <h2 className="text-3xl font-bold mb-xl text-center">
                        Frequently Asked Questions
                    </h2>

                    <div className="max-w-3xl mx-auto">
                        <div className="faq-item">
                            <h3 className="faq-question">
                                Is the download safe?
                            </h3>
                            <p className="faq-answer">
                                Yes! Carvd Studio is built with Electron, the
                                same framework used by VS Code, Slack, and
                                Discord. Our installers are code-signed and
                                verified. The security warnings you may see are
                                standard for new apps that haven't yet built up
                                reputation with OS vendors.
                            </p>
                        </div>

                        <div className="faq-item">
                            <h3 className="faq-question">
                                What's included in the free trial?
                            </h3>
                            <p className="faq-answer">
                                Everything! For 14 days, you get full access to
                                all features including the cut list optimizer,
                                unlimited projects, PDF exports, and all
                                templates. After the trial, you can purchase a
                                license or continue with the free version which
                                has some feature limitations.
                            </p>
                        </div>

                        <div className="faq-item">
                            <h3 className="faq-question">
                                Do I need an internet connection?
                            </h3>
                            <p className="faq-answer">
                                No! Carvd Studio is designed to work completely
                                offline. Your projects are saved locally on your
                                computer. The only time internet is needed is
                                for license activation and checking for updates.
                            </p>
                        </div>

                        <div className="faq-item">
                            <h3 className="faq-question">
                                How do I update to a new version?
                            </h3>
                            <p className="faq-answer">
                                Carvd Studio will notify you when updates are
                                available. You can also manually check by going
                                to Help → Check for Updates in the app menu.
                                Updates are downloaded in the background and
                                installed when you restart the app.
                            </p>
                        </div>

                        <div className="faq-item">
                            <h3 className="faq-question">
                                Can I transfer my license to a new computer?
                            </h3>
                            <p className="faq-answer">
                                Yes! Your license can be activated on up to 3
                                computers at once. If you need to move to a new
                                machine, you can deactivate your license in the
                                app settings before activating on the new
                                computer.
                            </p>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="container mb-3xl">
                    <div className="cta-section">
                        <h2 className="cta-title">Ready to start designing?</h2>
                        <p className="cta-description">
                            Download Carvd Studio and start your 14-day free
                            trial today.
                        </p>
                        <div className="flex justify-center gap-md">
                            <a
                                href={macDownload.url}
                                className="btn btn-highlight btn-lg"
                            >
                                Download for macOS
                            </a>
                            <a
                                href={windowsDownload.url}
                                className="btn btn-outline btn-lg"
                            >
                                Download for Windows
                            </a>
                        </div>
                    </div>
                </section>
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
