import { Mail, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "support@carvd-studio.com";

const accentBoxStyle = {
  background:
    "linear-gradient(135deg, rgba(74,144,226,0.1) 0%, rgba(74,144,226,0.05) 100%)",
  borderColor: "rgba(74,144,226,0.3)",
};

export default function ContactSection() {
  return (
    <section id="contact" className="mt-16 mb-16">
      <h2 className="mb-12 text-3xl font-bold">Contact Us</h2>

      <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1">
        <Card className="p-8 max-md:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Mail size={20} /> Email Support
          </h3>
          <p className="mb-6 text-text-muted">
            For technical issues, license questions, or general inquiries, email
            us at:
          </p>
          <Button asChild>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </Button>
          <p className="mt-4 text-sm text-text-muted">
            We typically respond within 24 hours on business days.
          </p>
        </Card>

        <Card className="p-8 max-md:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <BookOpen size={20} /> Documentation
          </h3>
          <p className="mb-6 text-text-muted">
            Learn how to use Carvd Studio with our comprehensive documentation
            and tutorials.
          </p>
          <Button variant="outline" asChild>
            <a href="/docs">View Documentation</a>
          </Button>
        </Card>
      </div>

      <div
        className="mt-12 rounded-lg border p-8 max-sm:p-6"
        style={accentBoxStyle}
      >
        <h3 className="mb-2 text-lg font-bold">
          When contacting support, please include:
        </h3>
        <ul className="m-0 list-none p-0">
          <li className="relative mb-2 pl-8 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•'] last:mb-0">
            Your operating system (macOS/Windows) and version
          </li>
          <li className="relative mb-2 pl-8 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•'] last:mb-0">
            Carvd Studio version (found in Help → About)
          </li>
          <li className="relative mb-2 pl-8 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•'] last:mb-0">
            A description of the issue and steps to reproduce it
          </li>
          <li className="relative mb-2 pl-8 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•'] last:mb-0">
            Any error messages you see
          </li>
          <li className="relative pl-8 text-text-muted before:absolute before:left-0 before:text-accent before:content-['•']">
            Screenshots if applicable
          </li>
        </ul>
      </div>
    </section>
  );
}
