import SEO from "../../components/SEO";
import { createBreadcrumbSchema, createFAQSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

const faqItems = [
  {
    question: "What's included in the free trial?",
    answer:
      "Everything! For 14 days, you get full access to all features: unlimited parts, cut list optimizer, PDF export, assemblies, groups, and custom templates. No credit card required.",
  },
  {
    question: "What happens after the trial expires?",
    answer:
      "You can purchase a license to keep all features, or continue using the free version. The free version is limited to 10 parts, 5 stock materials, and doesn't include the cut list optimizer, PDF export, groups, assemblies, or custom templates.",
  },
  {
    question: "Can I open projects I made during the trial?",
    answer:
      'Yes! You can always open and view your projects, even in free mode. You just can\'t add more parts beyond the free limit (10 parts, 5 stocks). This "grace mode" ensures you never lose access to your work.',
  },
  {
    question: "Do I need an internet connection?",
    answer:
      "No! Carvd Studio works 100% offline. Internet is only needed for license activation and checking for updates. All your designs and data stay on your computer.",
  },
  {
    question: "Can I use it on multiple computers?",
    answer:
      "Yes! Your license works on up to 3 devices — any combination of Mac and Windows. Use it in your shop, office, and laptop simultaneously. Manage activations in Settings > License.",
  },
  {
    question: "What file format does Carvd Studio use?",
    answer:
      "Projects are saved as .carvd files, which are JSON-based and human-readable. They include all your parts, stocks, settings, cut lists, and even project thumbnails. Easy to back up and share.",
  },
  {
    question: "Can I export my cut lists?",
    answer:
      'Yes! Use the "Download Project Report" button for a comprehensive PDF with everything — cover page, cut list, cutting diagrams, and shopping list. Or export individual tabs as PDF or CSV. PDF export requires a license.',
  },
  {
    question: "Does it work with metric measurements?",
    answer:
      'Yes! Carvd Studio fully supports metric (millimeters) and imperial (inches, including fractions like 2-3/4"). You can set your preferred units per project or as a global default.',
  },
  {
    question: "How do I transfer my license to a new computer?",
    answer:
      'Go to Settings > License on your old computer and click "Deactivate". Then activate on your new computer using the same license key. You can also manage this if your old computer is no longer available.',
  },
  {
    question: "Are future updates included?",
    answer:
      "Yes! All future updates are free forever. New features, improvements, and bug fixes are included automatically. The app will notify you when updates are available.",
  },
];

export default function FaqPage() {
  return (
    <section>
      <SEO
        title="FAQ - Docs"
        description="Frequently asked questions about Carvd Studio. Trial, licensing, offline use, file formats, exports, and more."
        path="/docs/faq"
        jsonLd={[
          createBreadcrumbSchema([
            { name: "Docs", path: "/docs" },
            { name: "FAQ", path: "/docs/faq" },
          ]),
          createFAQSchema(faqItems),
        ]}
      />
      <h2 className="text-4xl font-bold mb-xl">Frequently Asked Questions</h2>

      <div className="grid gap-xl">
        <div className="card">
          <h3 className="card-title">What's included in the free trial?</h3>
          <p className="card-description">
            Everything! For 14 days, you get full access to all features:
            unlimited parts, cut list optimizer, PDF export, assemblies, groups,
            and custom templates. No credit card required.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">What happens after the trial expires?</h3>
          <p className="card-description">
            You can purchase a license to keep all features, or continue using
            the free version. The free version is limited to 10 parts, 5 stock
            materials, and doesn't include the cut list optimizer, PDF export,
            groups, assemblies, or custom templates.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">
            Can I open projects I made during the trial?
          </h3>
          <p className="card-description">
            Yes! You can always open and view your projects, even in free mode.
            You just can't add more parts beyond the free limit (10 parts, 5
            stocks). This "grace mode" ensures you never lose access to your
            work.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">Do I need an internet connection?</h3>
          <p className="card-description">
            No! Carvd Studio works 100% offline. Internet is only needed for
            license activation and checking for updates. All your designs and
            data stay on your computer.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">Can I use it on multiple computers?</h3>
          <p className="card-description">
            Yes! Your license works on up to 3 devices&mdash;any combination of
            Mac and Windows. Use it in your shop, office, and laptop
            simultaneously. Manage activations in Settings &rarr; License.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">
            What file format does Carvd Studio use?
          </h3>
          <p className="card-description">
            Projects are saved as .carvd files, which are JSON-based and
            human-readable. They include all your parts, stocks, settings, cut
            lists, and even project thumbnails. Easy to back up and share.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">Can I export my cut lists?</h3>
          <p className="card-description">
            Yes! Use the "Download Project Report" button for a comprehensive
            PDF with everything&mdash;cover page, cut list, cutting diagrams,
            and shopping list. Or export individual tabs as PDF or CSV. Each
            export includes a "Generated by Carvd Studio" watermark. PDF export
            requires a license.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">Does it work with metric measurements?</h3>
          <p className="card-description">
            Yes! Carvd Studio fully supports metric (millimeters) and imperial
            (inches, including fractions like 2-3/4"). You can set your
            preferred units per project or as a global default.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">
            How do I transfer my license to a new computer?
          </h3>
          <p className="card-description">
            Go to Settings &rarr; License on your old computer and click
            "Deactivate". Then activate on your new computer using the same
            license key. You can also manage this if your old computer is no
            longer available.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">Are future updates included?</h3>
          <p className="card-description">
            Yes! All future updates are free forever. New features,
            improvements, and bug fixes are included automatically. The app will
            notify you when updates are available.
          </p>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
