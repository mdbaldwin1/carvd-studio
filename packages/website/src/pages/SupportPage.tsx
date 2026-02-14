import { Wrench, HelpCircle, Mail, Monitor, Key, Settings, BookOpen } from 'lucide-react';

export default function SupportPage() {
  const supportEmail = 'support@carvd-studio.com';

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
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-lg text-center">
              How Can We Help?
            </h1>
            <p className="text-xl text-muted text-center mb-3xl max-w-2xl mx-auto">
              Find answers to common questions, troubleshoot issues, or get in touch with our support team.
            </p>

            {/* Quick Links */}
            <div className="grid grid-cols-3 gap-lg mb-3xl">
              <a href="#troubleshooting" className="support-card">
                <span className="support-card-icon"><Wrench size={24} /></span>
                <span className="support-card-title">Troubleshooting</span>
                <span className="support-card-desc">Fix common issues</span>
              </a>
              <a href="#faq" className="support-card">
                <span className="support-card-icon"><HelpCircle size={24} /></span>
                <span className="support-card-title">FAQ</span>
                <span className="support-card-desc">Quick answers</span>
              </a>
              <a href="#contact" className="support-card">
                <span className="support-card-icon"><Mail size={24} /></span>
                <span className="support-card-title">Contact Us</span>
                <span className="support-card-desc">Get personal help</span>
              </a>
            </div>

            {/* Troubleshooting Section */}
            <section id="troubleshooting" className="mt-3xl mb-3xl">
              <h2 className="text-3xl font-bold mb-xl">Troubleshooting</h2>

              {/* Installation Issues */}
              <div className="mb-xl">
                <h3 className="text-xl font-bold mb-md flex items-center gap-sm">
                  <Monitor size={20} /> Installation Issues
                </h3>

                <div className="troubleshoot-item">
                  <h4 className="troubleshoot-question">
                    macOS: "Carvd Studio can't be opened because Apple cannot check it for malicious software"
                  </h4>
                  <div className="troubleshoot-answer">
                    <p>This is a standard macOS security feature for apps downloaded from the internet. To open the app:</p>
                    <ol className="troubleshoot-steps">
                      <li>Right-click (or Control-click) on Carvd Studio in your Applications folder</li>
                      <li>Select "Open" from the context menu</li>
                      <li>Click "Open" in the dialog that appears</li>
                    </ol>
                    <p className="text-muted mt-sm">You only need to do this once. Future launches will work normally.</p>
                  </div>
                </div>

                <div className="troubleshoot-item">
                  <h4 className="troubleshoot-question">
                    Windows: SmartScreen prevented an unrecognized app from starting
                  </h4>
                  <div className="troubleshoot-answer">
                    <p>Windows SmartScreen shows this warning for new apps. To proceed:</p>
                    <ol className="troubleshoot-steps">
                      <li>Click "More info" on the SmartScreen dialog</li>
                      <li>Click "Run anyway"</li>
                    </ol>
                    <p className="text-muted mt-sm">This warning will disappear as more users install the app and Microsoft builds trust with our certificate.</p>
                  </div>
                </div>

                <div className="troubleshoot-item">
                  <h4 className="troubleshoot-question">
                    The app won't start or crashes immediately
                  </h4>
                  <div className="troubleshoot-answer">
                    <p>Try these steps:</p>
                    <ol className="troubleshoot-steps">
                      <li>Make sure your system meets the <a href="/download#requirements" className="text-primary">minimum requirements</a></li>
                      <li>Restart your computer and try again</li>
                      <li>Reinstall the app from the <a href="/download" className="text-primary">download page</a></li>
                      <li>Check if your antivirus is blocking the app and add an exception if needed</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* License Issues */}
              <div className="mb-xl">
                <h3 className="text-xl font-bold mb-md flex items-center gap-sm">
                  <Key size={20} /> License & Activation
                </h3>

                <div className="troubleshoot-item">
                  <h4 className="troubleshoot-question">
                    My license key isn't working
                  </h4>
                  <div className="troubleshoot-answer">
                    <p>If your license key is rejected:</p>
                    <ol className="troubleshoot-steps">
                      <li>Check for typos - copy and paste the key directly from your email</li>
                      <li>Make sure you're connected to the internet</li>
                      <li>Check that you haven't exceeded the activation limit (3 devices)</li>
                      <li>If you've reached the limit, deactivate an old device first in Settings → License</li>
                    </ol>
                  </div>
                </div>

                <div className="troubleshoot-item">
                  <h4 className="troubleshoot-question">
                    I need to move my license to a new computer
                  </h4>
                  <div className="troubleshoot-answer">
                    <p>You can activate your license on up to 3 computers. To move it:</p>
                    <ol className="troubleshoot-steps">
                      <li>On your old computer, go to Settings → License</li>
                      <li>Click "Deactivate License"</li>
                      <li>On your new computer, enter your license key in Settings → License</li>
                    </ol>
                    <p className="text-muted mt-sm">If you no longer have access to the old computer, <a href="#contact" className="text-primary">contact us</a> and we can reset your activations.</p>
                  </div>
                </div>

                <div className="troubleshoot-item">
                  <h4 className="troubleshoot-question">
                    My trial expired but I wasn't done evaluating
                  </h4>
                  <div className="troubleshoot-answer">
                    <p>We understand! <a href="#contact" className="text-primary">Contact us</a> and we'll extend your trial so you have enough time to evaluate all the features.</p>
                  </div>
                </div>
              </div>

              {/* App Issues */}
              <div className="mb-xl">
                <h3 className="text-xl font-bold mb-md flex items-center gap-sm">
                  <Settings size={20} /> App Issues
                </h3>

                <div className="troubleshoot-item">
                  <h4 className="troubleshoot-question">
                    My project file won't open
                  </h4>
                  <div className="troubleshoot-answer">
                    <p>If a project file won't open:</p>
                    <ol className="troubleshoot-steps">
                      <li>Check if the file has a .carvd extension</li>
                      <li>Try opening the auto-recovery version: File → Recover Auto-Saved Project</li>
                      <li>Make sure the file isn't on a network drive or cloud storage that's offline</li>
                    </ol>
                    <p className="text-muted mt-sm">If the file is corrupted, <a href="#contact" className="text-primary">contact us</a> with the file attached and we may be able to recover it.</p>
                  </div>
                </div>

                <div className="troubleshoot-item">
                  <h4 className="troubleshoot-question">
                    The 3D view is slow or laggy
                  </h4>
                  <div className="troubleshoot-answer">
                    <p>Performance issues can usually be improved by:</p>
                    <ol className="troubleshoot-steps">
                      <li>Closing other applications to free up memory</li>
                      <li>Reducing the number of visible parts (use groups to hide sections)</li>
                      <li>Making sure your graphics drivers are up to date</li>
                      <li>On laptops, ensuring you're plugged in (battery mode reduces performance)</li>
                    </ol>
                  </div>
                </div>

                <div className="troubleshoot-item">
                  <h4 className="troubleshoot-question">
                    Cut list calculations seem wrong
                  </h4>
                  <div className="troubleshoot-answer">
                    <p>Double-check these settings:</p>
                    <ol className="troubleshoot-steps">
                      <li>Verify your stock dimensions are correct in the Stock Library</li>
                      <li>Check the kerf (blade width) setting in your project settings</li>
                      <li>Make sure grain direction is set correctly on grain-sensitive parts</li>
                      <li>Confirm units are consistent (all inches or all mm)</li>
                    </ol>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="mt-3xl mb-3xl">
              <h2 className="text-3xl font-bold mb-xl">Frequently Asked Questions</h2>

              <div className="faq-category">
                <h3 className="text-xl font-bold mb-md">General</h3>

                <div className="faq-item">
                  <h4 className="faq-question">What is Carvd Studio?</h4>
                  <p className="faq-answer">
                    Carvd Studio is a desktop application for designing furniture and generating optimized cut lists.
                    It helps woodworkers and furniture makers plan their projects in 3D, minimize material waste,
                    and track costs - all without requiring an internet connection.
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">Do I need internet to use Carvd Studio?</h4>
                  <p className="faq-answer">
                    No! Carvd Studio is designed to work completely offline. Your projects are saved locally on your
                    computer. Internet is only needed for license activation and checking for updates.
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">What file formats can I export?</h4>
                  <p className="faq-answer">
                    You can export cut lists and project summaries as PDF files. Project files use our .carvd format
                    which preserves all your 3D design data, materials, and settings.
                  </p>
                </div>
              </div>

              <div className="faq-category">
                <h3 className="text-xl font-bold mb-md">Pricing & Licensing</h3>

                <div className="faq-item">
                  <h4 className="faq-question">Is there a free trial?</h4>
                  <p className="faq-answer">
                    Yes! You get a 14-day free trial with full access to all features. No credit card required.
                    After the trial, you can purchase a license or continue with the free version which has
                    some feature limitations.
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">Is this a subscription?</h4>
                  <p className="faq-answer">
                    No, Carvd Studio is a one-time purchase. Pay once, own it forever. You'll also receive
                    free updates for the lifetime of version 1.x.
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">How many computers can I use my license on?</h4>
                  <p className="faq-answer">
                    Your license can be activated on up to 3 computers at once. This is per license, not per household,
                    so a single license works great for your workshop computer, laptop, and home office.
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">What's included in the free version?</h4>
                  <p className="faq-answer">
                    The free version includes basic 3D design, up to 5 parts per project, and manual cut list
                    generation. The paid version adds unlimited parts, automatic cut list optimization, PDF exports,
                    templates, and assemblies.
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">Do you offer refunds?</h4>
                  <p className="faq-answer">
                    Yes, we offer a 30-day money-back guarantee. If Carvd Studio doesn't meet your needs,
                    <a href="#contact" className="text-primary"> contact us</a> for a full refund.
                  </p>
                </div>
              </div>

              <div className="faq-category">
                <h3 className="text-xl font-bold mb-md">Features</h3>

                <div className="faq-item">
                  <h4 className="faq-question">Can I import designs from other software?</h4>
                  <p className="faq-answer">
                    Currently, Carvd Studio uses its own project format. We're exploring import options for
                    future versions. For now, you can recreate designs using our intuitive 3D tools.
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">Does it support metric and imperial units?</h4>
                  <p className="faq-answer">
                    Yes! You can work in inches, feet, millimeters, or centimeters. Switch between unit systems
                    at any time in your project settings.
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">Can I create custom templates?</h4>
                  <p className="faq-answer">
                    Yes, with a paid license you can save any project as a template for future use. You can also
                    create reusable assemblies (like drawer boxes or cabinet carcasses) to speed up your workflow.
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">How does the cut list optimizer work?</h4>
                  <p className="faq-answer">
                    Our optimizer uses advanced algorithms to arrange your parts on stock material with minimal waste.
                    It considers grain direction, part dimensions, kerf width, and your stock inventory to find the
                    most efficient cutting layout.
                  </p>
                </div>
              </div>

              <div className="faq-category">
                <h3 className="text-xl font-bold mb-md">Technical</h3>

                <div className="faq-item">
                  <h4 className="faq-question">What are the system requirements?</h4>
                  <p className="faq-answer">
                    <strong>macOS:</strong> 10.15 (Catalina) or later, Intel or Apple Silicon<br />
                    <strong>Windows:</strong> Windows 10 or later (64-bit)<br />
                    <strong>RAM:</strong> 4 GB minimum (8 GB recommended for large projects)<br />
                    <strong>Storage:</strong> 200 MB available space
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">Where are my projects saved?</h4>
                  <p className="faq-answer">
                    Projects are saved wherever you choose when you save them. By default, Carvd Studio suggests
                    your Documents folder. Auto-recovery files are stored in your system's application data folder.
                  </p>
                </div>

                <div className="faq-item">
                  <h4 className="faq-question">How do I update to a new version?</h4>
                  <p className="faq-answer">
                    Carvd Studio will notify you when updates are available. You can also manually check by going
                    to Help → Check for Updates. Updates are downloaded in the background and installed when you
                    restart the app.
                  </p>
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="mt-3xl mb-3xl">
              <h2 className="text-3xl font-bold mb-xl">Contact Us</h2>

              <div className="grid grid-cols-2 gap-xl">
                <div className="card">
                  <h3 className="text-xl font-bold mb-md flex items-center gap-sm">
                    <Mail size={20} /> Email Support
                  </h3>
                  <p className="text-muted mb-lg">
                    For technical issues, license questions, or general inquiries, email us at:
                  </p>
                  <a href={`mailto:${supportEmail}`} className="btn btn-primary">
                    {supportEmail}
                  </a>
                  <p className="text-sm text-muted mt-md">
                    We typically respond within 24 hours on business days.
                  </p>
                </div>

                <div className="card">
                  <h3 className="text-xl font-bold mb-md flex items-center gap-sm">
                    <BookOpen size={20} /> Documentation
                  </h3>
                  <p className="text-muted mb-lg">
                    Learn how to use Carvd Studio with our comprehensive documentation and tutorials.
                  </p>
                  <a href="/docs" className="btn btn-outline">
                    View Documentation
                  </a>
                </div>
              </div>

              <div className="accent-box mt-xl">
                <h3 className="text-lg font-bold mb-sm">When contacting support, please include:</h3>
                <ul className="contact-checklist">
                  <li>Your operating system (macOS/Windows) and version</li>
                  <li>Carvd Studio version (found in Help → About)</li>
                  <li>A description of the issue and steps to reproduce it</li>
                  <li>Any error messages you see</li>
                  <li>Screenshots if applicable</li>
                </ul>
              </div>
            </section>

            {/* CTA */}
            <section className="cta-section">
              <h2 className="cta-title">Didn't find what you need?</h2>
              <p className="cta-description">
                Our support team is here to help. Reach out and we'll get back to you as soon as possible.
              </p>
              <a href={`mailto:${supportEmail}`} className="btn btn-highlight btn-lg">
                Contact Support
              </a>
            </section>
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
            <a href="/changelog" className="nav-link">Changelog</a>
          </div>
        </div>
        <p>&copy; 2026 Carvd Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
