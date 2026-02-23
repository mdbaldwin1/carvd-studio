import { useDownloadInfo } from "../utils/downloads";
import { AppleIcon, WindowsIcon } from "../components/BrandIcons";
import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const warningBoxStyle = {
  background: "rgba(255,210,31,0.12)",
  borderColor: "rgba(255,210,31,0.4)",
};

export default function DownloadPage() {
  const {
    version: appVersion,
    macDownload,
    windowsDownload,
  } = useDownloadInfo();

  return (
    <div className="site-shell">
      <SEO
        title="Download"
        description="Download Carvd Studio for macOS and Windows. Free 14-day trial with all features. No credit card required."
        path="/download"
      />
      <Header />

      {/* Main Content */}
      <main id="main-content" className="flex-1">
        {/* Hero Download Section */}
        <section className="container py-16 text-center max-md:py-12 max-sm:py-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex justify-center">
              <img
                src="/branding/CarvdStudio-Horizontal-WHT.svg"
                alt="Carvd Studio"
                className="h-20 w-auto max-md:h-16 max-sm:h-12"
              />
            </div>
            <h1 className="mb-6 text-5xl font-bold max-md:text-4xl max-sm:text-3xl">
              Download Carvd Studio
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-xl text-text-muted max-md:text-lg max-sm:text-base">
              Free to download. Try all features for 14 days. No credit card
              required.
            </p>
            <p className="mb-12 text-center">
              <Badge variant="outline" className="hero-kicker">
                Version {appVersion}
              </Badge>
            </p>
            <div className="flex flex-wrap justify-center gap-8 max-sm:flex-col max-sm:items-center">
              <a
                href={macDownload.url}
                className="flex min-w-[200px] flex-col items-center gap-2 feature-card px-8 py-8 text-text no-underline max-sm:w-full max-sm:max-w-[280px] max-sm:px-6 max-sm:py-6"
              >
                <span>
                  <AppleIcon size={32} />
                </span>
                <span className="text-xl font-bold">macOS</span>
                <span className="text-sm text-text-muted">
                  {macDownload.fileExtension} installer
                </span>
                <span className="mt-1 text-xs text-accent">
                  {macDownload.minOsVersion}
                </span>
              </a>
              <a
                href={windowsDownload.url}
                className="flex min-w-[200px] flex-col items-center gap-2 feature-card px-8 py-8 text-text no-underline max-sm:w-full max-sm:max-w-[280px] max-sm:px-6 max-sm:py-6"
              >
                <span>
                  <WindowsIcon size={32} />
                </span>
                <span className="text-xl font-bold">Windows</span>
                <span className="text-sm text-text-muted">
                  {windowsDownload.fileExtension} installer
                </span>
                <span className="mt-1 text-xs text-accent">
                  {windowsDownload.minOsVersion}
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* Installation Instructions */}
        <section id="requirements" className="container mt-16">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Installation Instructions
          </h2>

          <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1">
            {/* macOS Instructions */}
            <Card className="p-8 max-md:p-6">
              <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold">
                <AppleIcon size={24} /> macOS Installation
              </h3>
              <ol className="m-0 list-none p-0">
                <li className="mb-6 flex items-start gap-4 last:mb-0 max-md:gap-2">
                  <span className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-full bg-accent text-sm font-bold text-bg max-md:h-7 max-md:w-7 max-md:min-w-[28px] max-md:text-xs">
                    1
                  </span>
                  <div className="flex-1">
                    <strong className="mb-1 block">
                      Download the installer
                    </strong>
                    <p className="m-0 text-sm text-text-muted">
                      Click the macOS download button above to get the .dmg
                      file.
                    </p>
                  </div>
                </li>
                <li className="mb-6 flex items-start gap-4 last:mb-0 max-md:gap-2">
                  <span className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-full bg-accent text-sm font-bold text-bg max-md:h-7 max-md:w-7 max-md:min-w-[28px] max-md:text-xs">
                    2
                  </span>
                  <div className="flex-1">
                    <strong className="mb-1 block">Open the DMG file</strong>
                    <p className="m-0 text-sm text-text-muted">
                      Double-click the downloaded file to mount the disk image.
                    </p>
                  </div>
                </li>
                <li className="mb-6 flex items-start gap-4 last:mb-0 max-md:gap-2">
                  <span className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-full bg-accent text-sm font-bold text-bg max-md:h-7 max-md:w-7 max-md:min-w-[28px] max-md:text-xs">
                    3
                  </span>
                  <div className="flex-1">
                    <strong className="mb-1 block">Drag to Applications</strong>
                    <p className="m-0 text-sm text-text-muted">
                      Drag the Carvd Studio icon to your Applications folder.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4 max-md:gap-2">
                  <span className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-full bg-accent text-sm font-bold text-bg max-md:h-7 max-md:w-7 max-md:min-w-[28px] max-md:text-xs">
                    4
                  </span>
                  <div className="flex-1">
                    <strong className="mb-1 block">Launch the app</strong>
                    <p className="m-0 text-sm text-text-muted">
                      Open Carvd Studio from your Applications folder or
                      Launchpad.
                    </p>
                  </div>
                </li>
              </ol>
              <div
                className="mt-6 rounded-lg border p-6 max-sm:p-4"
                style={warningBoxStyle}
              >
                <strong>First launch on macOS</strong>
                <p className="mt-2 text-sm text-text-muted">
                  If you see "Carvd Studio can't be opened because Apple cannot
                  check it for malicious software", right-click the app and
                  select "Open", then click "Open" in the dialog.
                </p>
              </div>
            </Card>

            {/* Windows Instructions */}
            <Card className="p-8 max-md:p-6">
              <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold">
                <WindowsIcon size={24} /> Windows Installation
              </h3>
              <ol className="m-0 list-none p-0">
                <li className="mb-6 flex items-start gap-4 last:mb-0 max-md:gap-2">
                  <span className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-full bg-accent text-sm font-bold text-bg max-md:h-7 max-md:w-7 max-md:min-w-[28px] max-md:text-xs">
                    1
                  </span>
                  <div className="flex-1">
                    <strong className="mb-1 block">
                      Download the installer
                    </strong>
                    <p className="m-0 text-sm text-text-muted">
                      Click the Windows download button above to get the .exe
                      file.
                    </p>
                  </div>
                </li>
                <li className="mb-6 flex items-start gap-4 last:mb-0 max-md:gap-2">
                  <span className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-full bg-accent text-sm font-bold text-bg max-md:h-7 max-md:w-7 max-md:min-w-[28px] max-md:text-xs">
                    2
                  </span>
                  <div className="flex-1">
                    <strong className="mb-1 block">Run the installer</strong>
                    <p className="m-0 text-sm text-text-muted">
                      Double-click the downloaded .exe file to start
                      installation.
                    </p>
                  </div>
                </li>
                <li className="mb-6 flex items-start gap-4 last:mb-0 max-md:gap-2">
                  <span className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-full bg-accent text-sm font-bold text-bg max-md:h-7 max-md:w-7 max-md:min-w-[28px] max-md:text-xs">
                    3
                  </span>
                  <div className="flex-1">
                    <strong className="mb-1 block">Follow the prompts</strong>
                    <p className="m-0 text-sm text-text-muted">
                      Accept the license agreement and choose your installation
                      location.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4 max-md:gap-2">
                  <span className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-full bg-accent text-sm font-bold text-bg max-md:h-7 max-md:w-7 max-md:min-w-[28px] max-md:text-xs">
                    4
                  </span>
                  <div className="flex-1">
                    <strong className="mb-1 block">Launch the app</strong>
                    <p className="m-0 text-sm text-text-muted">
                      Find Carvd Studio in your Start menu or desktop shortcut.
                    </p>
                  </div>
                </li>
              </ol>
              <div
                className="mt-6 rounded-lg border p-6 max-sm:p-4"
                style={warningBoxStyle}
              >
                <strong>Windows SmartScreen</strong>
                <p className="mt-2 text-sm text-text-muted">
                  If Windows SmartScreen appears, click "More info" then "Run
                  anyway". This happens because the app is new and building
                  trust with Microsoft.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Version History */}
        <section id="changelog" className="container mt-16">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Version History
          </h2>

          <div className="mx-auto max-w-3xl">
            <Card className="p-8 max-md:p-6 max-sm:p-4">
              <div className="mb-4 flex flex-wrap items-center gap-4 max-md:flex-col max-md:items-start max-md:gap-2">
                <span className="text-xl font-bold text-accent">
                  v{appVersion}
                </span>
                <span className="text-sm text-text-muted">Current Release</span>
                <Badge variant="outline" className="hero-kicker">
                  Latest
                </Badge>
              </div>
              <div>
                <h3 className="mb-2 font-bold">Initial Release</h3>
                <ul className="m-0 list-none p-0">
                  <li className="relative mb-2 pl-6 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•'] last:mb-0">
                    3D furniture design workspace with intuitive controls
                  </li>
                  <li className="relative mb-2 pl-6 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•'] last:mb-0">
                    Smart cut list optimizer to minimize material waste
                  </li>
                  <li className="relative mb-2 pl-6 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•'] last:mb-0">
                    Cost tracking with custom pricing per material
                  </li>
                  <li className="relative mb-2 pl-6 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•'] last:mb-0">
                    Project templates and reusable assemblies
                  </li>
                  <li className="relative mb-2 pl-6 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•'] last:mb-0">
                    PDF export for cut lists and project summaries
                  </li>
                  <li className="relative mb-2 pl-6 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•'] last:mb-0">
                    Stock library management with custom materials
                  </li>
                  <li className="relative pl-6 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•']">
                    Offline-first architecture - no internet required
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </section>

        {/* System Requirements */}
        <section className="container mt-16">
          <h2 className="mb-12 text-center text-3xl font-bold">
            System Requirements
          </h2>

          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 max-md:grid-cols-1">
            <Card className="p-8 max-md:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <AppleIcon size={20} /> macOS
              </h3>
              <ul className="m-0 list-none p-0">
                <li className="border-b border-border py-2 text-text-muted last:border-b-0">
                  <strong className="text-text">OS:</strong> macOS 10.15
                  (Catalina) or later
                </li>
                <li className="border-b border-border py-2 text-text-muted last:border-b-0">
                  <strong className="text-text">Processor:</strong> Intel or
                  Apple Silicon
                </li>
                <li className="border-b border-border py-2 text-text-muted last:border-b-0">
                  <strong className="text-text">Memory:</strong> 4 GB RAM
                  minimum
                </li>
                <li className="border-b border-border py-2 text-text-muted last:border-b-0">
                  <strong className="text-text">Storage:</strong> 200 MB
                  available space
                </li>
                <li className="py-2 text-text-muted">
                  <strong className="text-text">Display:</strong> 1280x720
                  minimum resolution
                </li>
              </ul>
            </Card>
            <Card className="p-8 max-md:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <WindowsIcon size={20} /> Windows
              </h3>
              <ul className="m-0 list-none p-0">
                <li className="border-b border-border py-2 text-text-muted last:border-b-0">
                  <strong className="text-text">OS:</strong> Windows 10 or later
                  (64-bit)
                </li>
                <li className="border-b border-border py-2 text-text-muted last:border-b-0">
                  <strong className="text-text">Processor:</strong> Intel Core
                  i3 or equivalent
                </li>
                <li className="border-b border-border py-2 text-text-muted last:border-b-0">
                  <strong className="text-text">Memory:</strong> 4 GB RAM
                  minimum
                </li>
                <li className="border-b border-border py-2 text-text-muted last:border-b-0">
                  <strong className="text-text">Storage:</strong> 200 MB
                  available space
                </li>
                <li className="py-2 text-text-muted">
                  <strong className="text-text">Display:</strong> 1280x720
                  minimum resolution
                </li>
              </ul>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mt-16 mb-16">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Frequently Asked Questions
          </h2>

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="safe">
                <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
                  Is the download safe?
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-text-muted">
                  Yes! Carvd Studio is built with Electron, the same framework
                  used by VS Code, Slack, and Discord. Our installers are
                  code-signed and verified. The security warnings you may see
                  are standard for new apps that haven't yet built up reputation
                  with OS vendors.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="trial">
                <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
                  What's included in the free trial?
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-text-muted">
                  Everything! For 14 days, you get full access to all features
                  including the cut list optimizer, unlimited projects, PDF
                  exports, and all templates. After the trial, you can purchase
                  a license or continue with the free version which has some
                  feature limitations.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="internet">
                <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
                  Do I need an internet connection?
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-text-muted">
                  No! Carvd Studio is designed to work completely offline. Your
                  projects are saved locally on your computer. The only time
                  internet is needed is for license activation and checking for
                  updates.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="update">
                <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
                  How do I update to a new version?
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-text-muted">
                  Carvd Studio will notify you when updates are available. You
                  can also manually check by going to Help → Check for Updates
                  in the app menu. Updates are downloaded in the background and
                  installed when you restart the app.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="transfer">
                <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
                  Can I transfer my license to a new computer?
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-text-muted">
                  Yes. You can activate on multiple computers up to your
                  activation limit. If you need to move to a new machine, you
                  can deactivate your license in app settings before activating
                  on the new computer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="container mb-16">
          <div className="site-section my-16 p-16 text-center max-md:p-12 max-sm:my-8 max-sm:p-8">
            <h2 className="mb-4 text-4xl font-bold max-md:text-2xl max-sm:text-xl">
              Ready to start designing?
            </h2>
            <p className="mx-auto mb-8 max-w-[600px] text-xl text-text-muted max-md:text-lg max-sm:text-base">
              Download Carvd Studio and start your 14-day free trial today.
            </p>
            <div className="mb-6 flex justify-center gap-4 max-sm:flex-col max-sm:items-center">
              <Button size="lg" asChild>
                <a href={macDownload.url}>Download for macOS</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={windowsDownload.url}>Download for Windows</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
