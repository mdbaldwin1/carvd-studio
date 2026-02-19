import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const supportFAQs = [
  {
    question: "What is Carvd Studio?",
    answer:
      "Carvd Studio is a desktop application for designing furniture and generating optimized cut lists. It helps woodworkers plan projects in 3D, minimize material waste, and track costs — all without requiring an internet connection.",
  },
  {
    question: "Do I need internet to use Carvd Studio?",
    answer:
      "No. Carvd Studio works completely offline. Internet is only needed for license activation and checking for updates.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. You get a 14-day free trial with full access to all features. No credit card required.",
  },
  {
    question: "Is this a subscription?",
    answer:
      "No. Carvd Studio is a one-time purchase. Pay once, own it forever.",
  },
  {
    question: "How many computers can I use my license on?",
    answer: "Your license can be activated on up to 3 computers at once.",
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="mt-16 mb-16">
      <h2 className="mb-12 text-3xl font-bold">Frequently Asked Questions</h2>

      {/* General */}
      <div className="mb-12 last:mb-0">
        <h3 className="mb-4 text-xl font-bold">General</h3>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="what-is">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              What is Carvd Studio?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              Carvd Studio is a desktop application for designing furniture and
              generating optimized cut lists. It helps woodworkers and furniture
              makers plan their projects in 3D, minimize material waste, and
              track costs - all without requiring an internet connection.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="internet">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              Do I need internet to use Carvd Studio?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              No! Carvd Studio is designed to work completely offline. Your
              projects are saved locally on your computer. Internet is only
              needed for license activation and checking for updates.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="export">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              What file formats can I export?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              You can export cut lists and project summaries as PDF files.
              Project files use our .carvd format which preserves all your 3D
              design data, materials, and settings.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Pricing & Licensing */}
      <div className="mb-12 last:mb-0">
        <h3 className="mb-4 text-xl font-bold">Pricing & Licensing</h3>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="trial">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              Is there a free trial?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              Yes! You get a 14-day free trial with full access to all features.
              No credit card required. After the trial, you can purchase a
              license or continue with the free version which has some feature
              limitations.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="subscription">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              Is this a subscription?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              No, Carvd Studio is a one-time purchase. Pay once, own it forever.
              You'll also receive free updates for the lifetime of version 1.x.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="computers">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              How many computers can I use my license on?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              Your license can be activated on up to 3 computers at once. This
              is per license, not per household, so a single license works great
              for your workshop computer, laptop, and home office.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="free-version">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              What's included in the free version?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              The free version includes basic 3D design with up to 10 parts and
              5 stock materials per project. The paid version adds unlimited
              parts and stocks, cut list optimization with cutting diagrams, PDF
              exports, groups, grain direction, templates, and assemblies.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="refunds">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              Do you offer refunds?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              Yes, we offer a 30-day money-back guarantee. If Carvd Studio
              doesn't meet your needs,{" "}
              <a href="#contact" className="text-primary-text hover:underline">
                contact us
              </a>{" "}
              for a full refund.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Features */}
      <div className="mb-12 last:mb-0">
        <h3 className="mb-4 text-xl font-bold">Features</h3>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="import">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              Can I import designs from other software?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              Currently, Carvd Studio uses its own project format. We're
              exploring import options for future versions. For now, you can
              recreate designs using our intuitive 3D tools.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="units">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              Does it support metric and imperial units?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              Yes! You can work in inches, feet, millimeters, or centimeters.
              Switch between unit systems at any time in your project settings.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="templates">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              Can I create custom templates?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              Yes, with a paid license you can save any project as a template
              for future use. You can also create reusable assemblies (like
              drawer boxes or cabinet carcasses) to speed up your workflow.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="optimizer">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              How does the cut list optimizer work?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              Our optimizer uses advanced algorithms to arrange your parts on
              stock material with minimal waste. It considers grain direction,
              part dimensions, kerf width, and your stock inventory to find the
              most efficient cutting layout.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Technical */}
      <div className="last:mb-0">
        <h3 className="mb-4 text-xl font-bold">Technical</h3>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="requirements">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              What are the system requirements?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              <strong className="text-text">macOS:</strong> 10.15 (Catalina) or
              later, Intel or Apple Silicon
              <br />
              <strong className="text-text">Windows:</strong> Windows 10 or
              later (64-bit)
              <br />
              <strong className="text-text">RAM:</strong> 4 GB minimum (8 GB
              recommended for large projects)
              <br />
              <strong className="text-text">Storage:</strong> 200 MB available
              space
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="saved">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              Where are my projects saved?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              Projects are saved wherever you choose when you save them. By
              default, Carvd Studio suggests your Documents folder.
              Auto-recovery files are stored in your system's application data
              folder.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="update">
            <AccordionTrigger className="text-left text-lg font-bold max-md:text-base max-sm:text-sm">
              How do I update to a new version?
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-text-muted max-sm:text-sm">
              Carvd Studio will notify you when updates are available. You can
              also manually check by going to Help → Check for Updates. Updates
              are downloaded in the background and installed when you restart
              the app.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
