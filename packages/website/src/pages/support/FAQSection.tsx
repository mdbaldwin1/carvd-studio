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
    <section id="faq" className="mt-3xl mb-3xl">
      <h2 className="text-3xl font-bold mb-xl">Frequently Asked Questions</h2>

      <div className="faq-category">
        <h3 className="text-xl font-bold mb-md">General</h3>

        <div className="faq-item">
          <h4 className="faq-question">What is Carvd Studio?</h4>
          <p className="faq-answer">
            Carvd Studio is a desktop application for designing furniture and
            generating optimized cut lists. It helps woodworkers and furniture
            makers plan their projects in 3D, minimize material waste, and track
            costs - all without requiring an internet connection.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">
            Do I need internet to use Carvd Studio?
          </h4>
          <p className="faq-answer">
            No! Carvd Studio is designed to work completely offline. Your
            projects are saved locally on your computer. Internet is only needed
            for license activation and checking for updates.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">What file formats can I export?</h4>
          <p className="faq-answer">
            You can export cut lists and project summaries as PDF files. Project
            files use our .carvd format which preserves all your 3D design data,
            materials, and settings.
          </p>
        </div>
      </div>

      <div className="faq-category">
        <h3 className="text-xl font-bold mb-md">Pricing & Licensing</h3>

        <div className="faq-item">
          <h4 className="faq-question">Is there a free trial?</h4>
          <p className="faq-answer">
            Yes! You get a 14-day free trial with full access to all features.
            No credit card required. After the trial, you can purchase a license
            or continue with the free version which has some feature
            limitations.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">Is this a subscription?</h4>
          <p className="faq-answer">
            No, Carvd Studio is a one-time purchase. Pay once, own it forever.
            You'll also receive free updates for the lifetime of version 1.x.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">
            How many computers can I use my license on?
          </h4>
          <p className="faq-answer">
            Your license can be activated on up to 3 computers at once. This is
            per license, not per household, so a single license works great for
            your workshop computer, laptop, and home office.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">What's included in the free version?</h4>
          <p className="faq-answer">
            The free version includes basic 3D design with up to 10 parts and 5
            stock materials per project. The paid version adds unlimited parts
            and stocks, cut list optimization with cutting diagrams, PDF
            exports, groups, grain direction, templates, and assemblies.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">Do you offer refunds?</h4>
          <p className="faq-answer">
            Yes, we offer a 30-day money-back guarantee. If Carvd Studio doesn't
            meet your needs,
            <a href="#contact" className="text-primary">
              {" "}
              contact us
            </a>{" "}
            for a full refund.
          </p>
        </div>
      </div>

      <div className="faq-category">
        <h3 className="text-xl font-bold mb-md">Features</h3>

        <div className="faq-item">
          <h4 className="faq-question">
            Can I import designs from other software?
          </h4>
          <p className="faq-answer">
            Currently, Carvd Studio uses its own project format. We're exploring
            import options for future versions. For now, you can recreate
            designs using our intuitive 3D tools.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">
            Does it support metric and imperial units?
          </h4>
          <p className="faq-answer">
            Yes! You can work in inches, feet, millimeters, or centimeters.
            Switch between unit systems at any time in your project settings.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">Can I create custom templates?</h4>
          <p className="faq-answer">
            Yes, with a paid license you can save any project as a template for
            future use. You can also create reusable assemblies (like drawer
            boxes or cabinet carcasses) to speed up your workflow.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">
            How does the cut list optimizer work?
          </h4>
          <p className="faq-answer">
            Our optimizer uses advanced algorithms to arrange your parts on
            stock material with minimal waste. It considers grain direction,
            part dimensions, kerf width, and your stock inventory to find the
            most efficient cutting layout.
          </p>
        </div>
      </div>

      <div className="faq-category">
        <h3 className="text-xl font-bold mb-md">Technical</h3>

        <div className="faq-item">
          <h4 className="faq-question">What are the system requirements?</h4>
          <p className="faq-answer">
            <strong>macOS:</strong> 10.15 (Catalina) or later, Intel or Apple
            Silicon
            <br />
            <strong>Windows:</strong> Windows 10 or later (64-bit)
            <br />
            <strong>RAM:</strong> 4 GB minimum (8 GB recommended for large
            projects)
            <br />
            <strong>Storage:</strong> 200 MB available space
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">Where are my projects saved?</h4>
          <p className="faq-answer">
            Projects are saved wherever you choose when you save them. By
            default, Carvd Studio suggests your Documents folder. Auto-recovery
            files are stored in your system's application data folder.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">How do I update to a new version?</h4>
          <p className="faq-answer">
            Carvd Studio will notify you when updates are available. You can
            also manually check by going to Help → Check for Updates. Updates
            are downloaded in the background and installed when you restart the
            app.
          </p>
        </div>
      </div>
    </section>
  );
}
