import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,#2d2d2d_0%,#1a1a1a_50%,#0a0a0a_100%)]">
      <SEO
        title="Page Not Found"
        description="The page you're looking for doesn't exist."
        noindex
      />
      <Header />

      {/* Main Content */}
      <main id="main-content" className="container flex-1">
        <div className="py-16 max-md:py-12 max-sm:py-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 text-[128px] leading-none">🪵</div>
            <h1 className="mb-6 text-6xl font-bold max-md:text-4xl max-sm:text-3xl">
              404
            </h1>
            <h2 className="mb-4 text-3xl font-bold text-text-muted max-md:text-xl max-sm:text-lg">
              Page Not Found
            </h2>
            <p className="mb-16 text-xl text-text-muted max-md:mb-12 max-sm:mb-8">
              Looks like this board got cut a little short. The page you're
              looking for doesn't exist.
            </p>
            <div className="flex justify-center gap-4 max-sm:flex-col max-sm:items-center">
              <Button asChild size="lg">
                <a href="/">Back to Home</a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="/docs">View Documentation</a>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
