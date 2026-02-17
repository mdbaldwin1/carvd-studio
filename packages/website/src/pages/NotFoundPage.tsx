import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function NotFoundPage() {
  return (
    <div className="page bg-gradient-radial">
      <SEO
        title="Page Not Found"
        description="The page you're looking for doesn't exist."
        noindex
      />
      <Header />

      {/* Main Content */}
      <main className="page-content container">
        <div className="py-3xl">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-9xl mb-lg">🪵</div>
            <h1 className="text-6xl font-bold mb-lg">404</h1>
            <h2 className="text-3xl font-bold mb-md text-muted">
              Page Not Found
            </h2>
            <p className="text-xl text-muted mb-3xl">
              Looks like this board got cut a little short. The page you're
              looking for doesn't exist.
            </p>
            <div className="flex gap-md justify-center">
              <a href="/" className="btn btn-highlight btn-lg">
                Back to Home
              </a>
              <a href="/docs" className="btn btn-outline btn-lg">
                View Documentation
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
