import { Mail, BookOpen } from "lucide-react";

const SUPPORT_EMAIL = "support@carvd-studio.com";

export default function ContactSection() {
  return (
    <section id="contact" className="mt-3xl mb-3xl">
      <h2 className="text-3xl font-bold mb-xl">Contact Us</h2>

      <div className="grid grid-cols-2 gap-xl">
        <div className="card">
          <h3 className="text-xl font-bold mb-md flex items-center gap-sm">
            <Mail size={20} /> Email Support
          </h3>
          <p className="text-muted mb-lg">
            For technical issues, license questions, or general inquiries, email
            us at:
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-primary">
            {SUPPORT_EMAIL}
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
            Learn how to use Carvd Studio with our comprehensive documentation
            and tutorials.
          </p>
          <a href="/docs" className="btn btn-outline">
            View Documentation
          </a>
        </div>
      </div>

      <div className="accent-box mt-xl">
        <h3 className="text-lg font-bold mb-sm">
          When contacting support, please include:
        </h3>
        <ul className="contact-checklist">
          <li>Your operating system (macOS/Windows) and version</li>
          <li>Carvd Studio version (found in Help → About)</li>
          <li>A description of the issue and steps to reproduce it</li>
          <li>Any error messages you see</li>
          <li>Screenshots if applicable</li>
        </ul>
      </div>
    </section>
  );
}
